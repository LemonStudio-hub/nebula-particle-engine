import { IComputeShader, ComputeShaderConfig } from '@/utils/types/compute'
import { Logger } from '@/utils/Logger'

/**
 * WGSL 计算着色器类
 * 用于 WebGPU 后端的粒子更新计算
 */
export class WGSLComputeShader implements IComputeShader {
  private readonly logger = Logger.create('WGSLComputeShader')
  private device: GPUDevice | null = null
  private pipeline: GPUComputePipeline | null = null
  private bindGroup: GPUBindGroup | null = null
  private uniformBuffer: GPUBuffer | null = null
  private positionBuffer1: GPUBuffer | null = null
  private positionBuffer2: GPUBuffer | null = null
  private velocityBuffer: GPUBuffer | null = null
  private ageBuffer: GPUBuffer | null = null
  private initialized: boolean = false
  private config: ComputeShaderConfig
  private pingPong: boolean = false

  constructor(config: ComputeShaderConfig) {
    this.config = config
  }

  /**
   * 初始化计算着色器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Compute shader already initialized')
      return
    }

    try {
      this.logger.info('Initializing WGSL compute shader...')

      // 获取 GPU 设备
      const adapter = await navigator.gpu.requestAdapter()
      if (!adapter) {
        throw new Error('Failed to get GPU adapter')
      }

      this.device = await adapter.requestDevice()

      // 创建计算管线
      this.pipeline = this.device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: this.device.createShaderModule({
            code: this.config.code
          }),
          entryPoint: this.config.entryPoint
        }
      })

      this.initialized = true
      this.logger.info('WGSL compute shader initialized successfully')
    } catch (error) {
      this.logger.error('Failed to initialize WGSL compute shader:', error)
      throw error
    }
  }

  /**
   * 分配缓冲区
   */
  allocateBuffers(particleCount: number): void {
    if (!this.device) {
      throw new Error('Device not initialized')
    }

    this.logger.info(`Allocating buffers for ${particleCount} particles`)

    // Uniform 缓冲区（32 字节）
    this.uniformBuffer = this.device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })

    // 位置缓冲区（双缓冲，各 3 * 4 * particleCount 字节）
    const positionBufferSize = 3 * 4 * particleCount
    this.positionBuffer1 = this.device.createBuffer({
      size: positionBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    })
    this.positionBuffer2 = this.device.createBuffer({
      size: positionBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    })

    // 速度缓冲区（3 * 4 * particleCount 字节）
    const velocityBufferSize = 3 * 4 * particleCount
    this.velocityBuffer = this.device.createBuffer({
      size: velocityBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    })

    // 年龄缓冲区（4 * particleCount 字节）
    const ageBufferSize = 4 * particleCount
    this.ageBuffer = this.device.createBuffer({
      size: ageBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    })

    this.logger.info('Buffers allocated successfully')
  }

  /**
   * 创建绑定组
   */
  private createBindGroup(): void {
    if (!this.device || !this.pipeline || !this.uniformBuffer || !this.positionBuffer1 || !this.positionBuffer2 || !this.velocityBuffer || !this.ageBuffer) {
      throw new Error('Resources not initialized')
    }

    const inputPosition = this.pingPong ? this.positionBuffer2! : this.positionBuffer1!
    const outputPosition = this.pingPong ? this.positionBuffer1! : this.positionBuffer2!

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: inputPosition } },
        { binding: 2, resource: { buffer: outputPosition } },
        { binding: 3, resource: { buffer: this.velocityBuffer } },
        { binding: 4, resource: { buffer: this.ageBuffer } }
      ]
    })
  }

  /**
   * 更新 Uniform 数据
   */
  updateUniforms(deltaTime: number, gravity: { x: number; y: number; z: number }, drag: number, lifetime: number): void {
    if (!this.uniformBuffer || !this.device) {
      return
    }

    const uniformData = new Float32Array(new ArrayBuffer(32))
    uniformData[0] = deltaTime
    uniformData[1] = gravity.x
    uniformData[2] = gravity.y
    uniformData[3] = gravity.z
    uniformData[4] = drag
    uniformData[5] = lifetime
    uniformData[6] = 0
    uniformData[7] = 0

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData as any)
  }

  /**
   * 更新粒子数据
   */
  updateParticleData(positions: Float32Array, velocities: Float32Array, ages: Float32Array): void {
    if (!this.device || !this.positionBuffer1 || !this.positionBuffer2 || !this.velocityBuffer || !this.ageBuffer) {
      return
    }

    const inputPosition = this.pingPong ? this.positionBuffer2! : this.positionBuffer1!

    this.device.queue.writeBuffer(inputPosition, 0, positions as any)
    this.device.queue.writeBuffer(this.velocityBuffer!, 0, velocities as any)
    this.device.queue.writeBuffer(this.ageBuffer!, 0, ages as any)
  }

  /**
   * 获取输出数据
   */
  async getOutputData(particleCount: number): Promise<{ positions: Float32Array; velocities: Float32Array; ages: Float32Array }> {
    if (!this.device || !this.positionBuffer1 || !this.positionBuffer2 || !this.velocityBuffer || !this.ageBuffer) {
      throw new Error('Resources not initialized')
    }

    const outputPosition = this.pingPong ? this.positionBuffer1! : this.positionBuffer2!

    // 创建读取缓冲区
    const positionsReadBuffer = this.device.createBuffer({
      size: particleCount * 3 * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    })
    const velocitiesReadBuffer = this.device.createBuffer({
      size: particleCount * 3 * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    })
    const agesReadBuffer = this.device.createBuffer({
      size: particleCount * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    })

    // 复制命令
    const commandEncoder = this.device.createCommandEncoder()
    commandEncoder.copyBufferToBuffer(outputPosition, 0, positionsReadBuffer, 0, particleCount * 3 * 4)
    commandEncoder.copyBufferToBuffer(this.velocityBuffer!, 0, velocitiesReadBuffer, 0, particleCount * 3 * 4)
    commandEncoder.copyBufferToBuffer(this.ageBuffer!, 0, agesReadBuffer, 0, particleCount * 4)
    this.device.queue.submit([commandEncoder.finish()])

    // 读取数据
    await positionsReadBuffer.mapAsync(GPUMapMode.READ)
    await velocitiesReadBuffer.mapAsync(GPUMapMode.READ)
    await agesReadBuffer.mapAsync(GPUMapMode.READ)

    const positionsData = new Float32Array(positionsReadBuffer.getMappedRange().slice(0))
    const velocitiesData = new Float32Array(velocitiesReadBuffer.getMappedRange().slice(0))
    const agesData = new Float32Array(agesReadBuffer.getMappedRange().slice(0))

    positionsReadBuffer.unmap()
    velocitiesReadBuffer.unmap()
    agesReadBuffer.unmap()

    positionsReadBuffer.destroy()
    velocitiesReadBuffer.destroy()
    agesReadBuffer.destroy()

    return {
      positions: positionsData,
      velocities: velocitiesData,
      ages: agesData
    }
  }

  /**
   * 分发计算
   */
  async dispatch(workgroups: [number, number, number]): Promise<void> {
    if (!this.device || !this.pipeline) {
      throw new Error('Resources not initialized')
    }

    this.createBindGroup()

    const commandEncoder = this.device.createCommandEncoder()
    const passEncoder = commandEncoder.beginComputePass()
    passEncoder.setPipeline(this.pipeline)
    passEncoder.setBindGroup(0, this.bindGroup)
    passEncoder.dispatchWorkgroups(workgroups[0], workgroups[1], workgroups[2])
    passEncoder.end()

    this.device.queue.submit([commandEncoder.finish()])

    // 切换 ping-pong
    this.pingPong = !this.pingPong
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.logger.info('Disposing WGSL compute shader...')

    if (this.uniformBuffer) {
      this.uniformBuffer.destroy()
      this.uniformBuffer = null
    }

    if (this.positionBuffer1) {
      this.positionBuffer1.destroy()
      this.positionBuffer1 = null
    }

    if (this.positionBuffer2) {
      this.positionBuffer2.destroy()
      this.positionBuffer2 = null
    }

    if (this.velocityBuffer) {
      this.velocityBuffer.destroy()
      this.velocityBuffer = null
    }

    if (this.ageBuffer) {
      this.ageBuffer.destroy()
      this.ageBuffer = null
    }

    this.pipeline = null
    this.bindGroup = null
    this.initialized = false

    this.logger.info('WGSL compute shader disposed')
  }
}