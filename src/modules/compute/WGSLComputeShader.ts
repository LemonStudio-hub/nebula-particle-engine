import { IComputeShader, ComputeShaderConfig, ShaderLanguage } from '@/utils/types/compute'
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
    if (!this.device || !this.pipeline || !this.uniformBuffer) {
      throw new Error('Resources not initialized')
    }

    const inputPosition = this.pingPong ? this.positionBuffer2 : this.positionBuffer1
    const outputPosition = this.pingPong ? this.positionBuffer1 : this.positionBuffer2

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: inputPosition } },
        { binding: 2, resource: { buffer: outputPosition! } },
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

    const uniformData = new Float32Array([
      deltaTime,
      gravity.x,
      gravity.y,
      gravity.z,
      drag,
      lifetime,
      0,
      0
    ])

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData)
  }

  /**
   * 更新粒子数据
   */
  updateParticleData(positions: Float32Array, velocities: Float32Array, ages: Float32Array): void {
    if (!this.device || !this.positionBuffer1 || !this.velocityBuffer || !this.ageBuffer) {
      return
    }

    const inputPosition = this.pingPong ? this.positionBuffer2 : this.positionBuffer1

    this.device.queue.writeBuffer(inputPosition, 0, positions)
    this.device.queue.writeBuffer(this.velocityBuffer, 0, velocities)
    this.device.queue.writeBuffer(this.ageBuffer, 0, ages)
  }

  /**
   * 获取输出数据
   */
  getOutputData(particleCount: number): { positions: Float32Array; velocities: Float32Array; ages: Float32Array } {
    if (!this.device || !this.positionBuffer1 || !this.positionBuffer2 || !this.velocityBuffer || !this.ageBuffer) {
      throw new Error('Resources not initialized')
    }

    const outputPosition = this.pingPong ? this.positionBuffer1 : this.positionBuffer2

    // 读取位置数据
    const positionsData = new Float32Array(particleCount * 3)
    this.device.queue.readBuffer(outputPosition, 0, positionsData.buffer)

    // 读取速度数据
    const velocitiesData = new Float32Array(particleCount * 3)
    this.device.queue.readBuffer(this.velocityBuffer, 0, velocitiesData.buffer)

    // 读取年龄数据
    const agesData = new Float32Array(particleCount)
    this.device.queue.readBuffer(this.ageBuffer, 0, agesData.buffer)

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