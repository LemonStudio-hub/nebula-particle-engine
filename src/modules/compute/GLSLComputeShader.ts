import { IComputeShader, ComputeShaderConfig } from '@/utils/types/compute'
import { Logger } from '@/utils/Logger'

/**
 * GLSL Transform Feedback 计算着色器类
 * 用于 WebGL 后端的粒子更新计算
 */
export class GLSLComputeShader implements IComputeShader {
  private readonly logger = Logger.create('GLSLComputeShader')
  private gl: WebGL2RenderingContext | null = null
  private program: WebGLProgram | null = null
  private vao1: WebGLVertexArrayObject | null = null
  private vao2: WebGLVertexArrayObject | null = null
  private transformFeedback: WebGLTransformFeedback | null = null
  private initialized: boolean = false
  private config: ComputeShaderConfig
  private pingPong: boolean = false

  // 缓冲区
  private positionBuffer1: WebGLBuffer | null = null
  private positionBuffer2: WebGLBuffer | null = null
  private velocityBuffer: WebGLBuffer | null = null
  private ageBuffer: WebGLBuffer | null = null

  // Uniform 位置
  private deltaTimeLocation: WebGLUniformLocation | null = null
  private gravityLocation: WebGLUniformLocation | null = null
  private dragLocation: WebGLUniformLocation | null = null
  private lifetimeLocation: WebGLUniformLocation | null = null

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
      this.logger.info('Initializing GLSL compute shader...')

      // 获取 WebGL 上下文
      const canvas = document.createElement('canvas')
      this.gl = canvas.getContext('webgl2')
      if (!this.gl) {
        throw new Error('Failed to get WebGL2 context')
      }

      // 创建着色器程序
      this.program = this.createProgram(this.config.code)
      if (!this.program) {
        throw new Error('Failed to create shader program')
      }

      // 获取 Uniform 位置
      this.deltaTimeLocation = this.gl.getUniformLocation(this.program, 'uDeltaTime')
      this.gravityLocation = this.gl.getUniformLocation(this.program, 'uGravity')
      this.dragLocation = this.gl.getUniformLocation(this.program, 'uDrag')
      this.lifetimeLocation = this.gl.getUniformLocation(this.program, 'uLifetime')

      this.initialized = true
      this.logger.info('GLSL compute shader initialized successfully')
    } catch (error) {
      this.logger.error('Failed to initialize GLSL compute shader:', error)
      throw error
    }
  }

  /**
   * 创建着色器程序
   */
  private createProgram(vsSource: string): WebGLProgram | null {
    if (!this.gl) return null

    const vs = this.gl.createShader(this.gl.VERTEX_SHADER)
    if (!vs) return null

    this.gl.shaderSource(vs, vsSource)
    this.gl.compileShader(vs)

    if (!this.gl.getShaderParameter(vs, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(vs)
      this.logger.error('Vertex shader compile error:', info)
      this.gl.deleteShader(vs)
      return null
    }

    const program = this.gl.createProgram()
    if (!program) return null

    this.gl.attachShader(program, vs)
    this.gl.linkProgram(program)

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(program)
      this.logger.error('Program link error:', info)
      this.gl.deleteProgram(program)
      return null
    }

    return program
  }

  /**
   * 分配缓冲区
   */
  allocateBuffers(particleCount: number): void {
    if (!this.gl || !this.program) {
      throw new Error('Resources not initialized')
    }

    this.logger.info(`Allocating buffers for ${particleCount} particles`)

    // 位置缓冲区（双缓冲）
    const positionBufferSize = 3 * 4 * particleCount
    this.positionBuffer1 = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer1)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positionBufferSize, this.gl.DYNAMIC_COPY)

    this.positionBuffer2 = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer2)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positionBufferSize, this.gl.DYNAMIC_COPY)

    // 速度缓冲区
    const velocityBufferSize = 3 * 4 * particleCount
    this.velocityBuffer = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.velocityBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, velocityBufferSize, this.gl.DYNAMIC_COPY)

    // 年龄缓冲区
    const ageBufferSize = 4 * particleCount
    this.ageBuffer = this.gl.createBuffer()
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.ageBuffer)
    this.gl.bufferData(this.gl.ARRAY_BUFFER, ageBufferSize, this.gl.DYNAMIC_COPY)

    // 创建 Transform Feedback 对象
    this.transformFeedback = this.gl.createTransformFeedback()

    // 创建 VAO
    this.vao1 = this.gl.createVertexArray()
    this.vao2 = this.gl.createVertexArray()

    this.logger.info('Buffers allocated successfully')
  }

  /**
   * 设置 VAO
   */
  private setupVAO(vao: WebGLVertexArrayObject | null, positionBuffer: WebGLBuffer | null, velocityBuffer: WebGLBuffer | null, ageBuffer: WebGLBuffer | null): void {
    if (!this.gl || !vao || !this.program) return

    this.gl.bindVertexArray(vao)

    // 位置属性
    if (positionBuffer) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer)
      const positionLoc = this.gl.getAttribLocation(this.program, 'inPosition')
      this.gl.enableVertexAttribArray(positionLoc)
      this.gl.vertexAttribPointer(positionLoc, 3, this.gl.FLOAT, false, 0, 0)
    }

    // 速度属性
    if (velocityBuffer) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, velocityBuffer)
      const velocityLoc = this.gl.getAttribLocation(this.program, 'inVelocity')
      this.gl.enableVertexAttribArray(velocityLoc)
      this.gl.vertexAttribPointer(velocityLoc, 3, this.gl.FLOAT, false, 0, 0)
    }

    // 年龄属性
    if (ageBuffer) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, ageBuffer)
      const ageLoc = this.gl.getAttribLocation(this.program, 'inAge')
      this.gl.enableVertexAttribArray(ageLoc)
      this.gl.vertexAttribPointer(ageLoc, 1, this.gl.FLOAT, false, 0, 0)
    }

    this.gl.bindVertexArray(null)
  }

  /**
   * 更新 Uniform 数据
   */
  updateUniforms(deltaTime: number, gravity: { x: number; y: number; z: number }, drag: number, lifetime: number): void {
    if (!this.gl || !this.program) return

    this.gl.useProgram(this.program)

    if (this.deltaTimeLocation) {
      this.gl.uniform1f(this.deltaTimeLocation, deltaTime)
    }

    if (this.gravityLocation) {
      this.gl.uniform3f(this.gravityLocation, gravity.x, gravity.y, gravity.z)
    }

    if (this.dragLocation) {
      this.gl.uniform1f(this.dragLocation, drag)
    }

    if (this.lifetimeLocation) {
      this.gl.uniform1f(this.lifetimeLocation, lifetime)
    }
  }

  /**
   * 更新粒子数据
   */
  updateParticleData(positions: Float32Array, velocities: Float32Array, ages: Float32Array): void {
    if (!this.gl) return

    const inputPosition = this.pingPong ? this.positionBuffer2 : this.positionBuffer1

    // 更新位置缓冲区
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, inputPosition!)
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, positions)

    // 更新速度缓冲区
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.velocityBuffer!)
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, velocities)

    // 更新年龄缓冲区
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.ageBuffer!)
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, ages)
  }

  /**
   * 分发计算
   */
  async dispatch(workgroups: [number, number, number]): Promise<void> {
    if (!this.gl || !this.program || !this.transformFeedback) {
      throw new Error('Resources not initialized')
    }

    const particleCount = workgroups[0] * 64
    const inputVAO = this.pingPong ? this.vao2 : this.vao1
    const outputPosition = this.pingPong ? this.positionBuffer1 : this.positionBuffer2

    // 设置输入 VAO
    this.setupVAO(inputVAO, this.pingPong ? this.positionBuffer2 : this.positionBuffer1, this.velocityBuffer, this.ageBuffer)

    // 设置 Transform Feedback
    this.gl.bindTransformFeedback(this.gl.TRANSFORM_FEEDBACK, this.transformFeedback)
    this.gl.bindBufferBase(this.gl.TRANSFORM_FEEDBACK_BUFFER, 0, outputPosition!)

    // 设置 Transform Feedback 变量
    const varyings = ['outPosition', 'outVelocity', 'outAge']
    this.gl.transformFeedbackVaryings(this.program, varyings, this.gl.SEPARATE_ATTRIBS)
    this.gl.linkProgram(this.program)

    // 禁用光栅化
    this.gl.enable(this.gl.RASTERIZER_DISCARD)

    // 执行计算
    this.gl.useProgram(this.program)
    this.gl.bindVertexArray(inputVAO)
    this.gl.beginTransformFeedback(this.gl.POINTS)
    this.gl.drawArrays(this.gl.POINTS, 0, particleCount)
    this.gl.endTransformFeedback()

    // 恢复光栅化
    this.gl.disable(this.gl.RASTERIZER_DISCARD)

    // 解绑
    this.gl.bindTransformFeedback(this.gl.TRANSFORM_FEEDBACK, null)
    this.gl.bindVertexArray(null)

    // 切换 ping-pong
    this.pingPong = !this.pingPong
  }

  /**
   * 获取输出数据
   */
  async getOutputData(particleCount: number): Promise<{ positions: Float32Array; velocities: Float32Array; ages: Float32Array }> {
    if (!this.gl || !this.positionBuffer1 || !this.positionBuffer2 || !this.velocityBuffer || !this.ageBuffer) {
      throw new Error('Resources not initialized')
    }

    const outputPosition = this.pingPong ? this.positionBuffer1 : this.positionBuffer2

    // 读取位置数据
    const positionsData = new Float32Array(particleCount * 3)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, outputPosition)
    this.gl.getBufferSubData(this.gl.ARRAY_BUFFER, 0, positionsData)

    // 读取速度数据
    const velocitiesData = new Float32Array(particleCount * 3)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.velocityBuffer)
    this.gl.getBufferSubData(this.gl.ARRAY_BUFFER, 0, velocitiesData)

    // 读取年龄数据
    const agesData = new Float32Array(particleCount)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.ageBuffer)
    this.gl.getBufferSubData(this.gl.ARRAY_BUFFER, 0, agesData)

    return {
      positions: positionsData,
      velocities: velocitiesData,
      ages: agesData
    }
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.logger.info('Disposing GLSL compute shader...')

    if (this.positionBuffer1) {
      this.gl?.deleteBuffer(this.positionBuffer1)
      this.positionBuffer1 = null
    }

    if (this.positionBuffer2) {
      this.gl?.deleteBuffer(this.positionBuffer2)
      this.positionBuffer2 = null
    }

    if (this.velocityBuffer) {
      this.gl?.deleteBuffer(this.velocityBuffer)
      this.velocityBuffer = null
    }

    if (this.ageBuffer) {
      this.gl?.deleteBuffer(this.ageBuffer)
      this.ageBuffer = null
    }

    if (this.vao1) {
      this.gl?.deleteVertexArray(this.vao1)
      this.vao1 = null
    }

    if (this.vao2) {
      this.gl?.deleteVertexArray(this.vao2)
      this.vao2 = null
    }

    if (this.transformFeedback) {
      this.gl?.deleteTransformFeedback(this.transformFeedback)
      this.transformFeedback = null
    }

    if (this.program) {
      this.gl?.deleteProgram(this.program)
      this.program = null
    }

    this.initialized = false

    this.logger.info('GLSL compute shader disposed')
  }
}