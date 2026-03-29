import { ParticleSystemConfig } from '@/utils/types/particle'
import { ParticleData } from './ParticleData'
import { ParticleEmitter } from './ParticleEmitter'
import { Logger } from '@/utils/Logger'
import { IComputeShader, ShaderLanguage } from '@/utils/types/compute'
import { WGSLComputeShader } from '@/modules/compute/WGSLComputeShader'
import { GLSLComputeShader } from '@/modules/compute/GLSLComputeShader'
import wgslCode from '@/modules/compute/ParticleComputeShader.wgsl?raw'
import glslCode from '@/modules/compute/ParticleComputeShader.glsl?raw'

/**
 * 粒子系统类
 * 管理所有粒子的生命周期和更新
 */
export class ParticleSystem {
  private readonly logger = Logger.create('ParticleSystem')
  private config: ParticleSystemConfig
  private particles: ParticleData[]
  private activeCount: number = 0
  private emitter: ParticleEmitter

  // GPU 计算着色器支持
  private computeShader: IComputeShader | null = null
  private useGPU: boolean = false
  private gpuBuffers: {
    positions: Float32Array
    velocities: Float32Array
    ages: Float32Array
  } | null = null

  constructor(config: ParticleSystemConfig) {
    this.config = config
    this.particles = []
    this.activeCount = 0

    // 创建发射器
    this.emitter = new ParticleEmitter({
      mode: 'point' as any,
      position: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 1, z: 0 },
      spread: 30,
      rate: config.emitRate,
      size: config.size,
      lifetime: config.lifetime,
      velocity: config.velocity,
      color: config.color,
      gravity: config.gravity,
      drag: config.drag
    })

    // 初始化粒子池
    this.initializeParticlePool()

    this.logger.info(`Particle system created with max ${config.maxParticles} particles`)
  }

  /**
   * 初始化粒子池
   */
  private initializeParticlePool(): void {
    this.particles = []
    this.activeCount = 0

    for (let i = 0; i < this.config.maxParticles; i++) {
      const particle = new ParticleData()
      this.particles.push(particle)

      // 初始激活部分粒子
      if (i < this.config.initialParticles) {
        this.activateParticle(particle)
      }
    }
  }

  /**
   * 激活粒子
   */
  private activateParticle(particle: ParticleData): void {
    const emittedParticles = this.emitter.emit(1)
    if (emittedParticles.length > 0) {
      const emitted = emittedParticles[0]
      particle.position = { ...emitted.position }
      particle.velocity = { ...emitted.velocity }
      particle.acceleration = { ...emitted.acceleration }
      particle.color = { ...emitted.color }
      particle.size = emitted.size
      particle.lifetime = emitted.lifetime
      particle.age = 0
      particle.activate()
      this.activeCount++
    }
  }

  /**
   * 更新粒子系统
   */
  update(deltaTime: number): void {
    // 更新发射器
    this.emitter.update(deltaTime)

    // 获取需要发射的粒子数量
    const emitCount = this.emitter.getEmitCount()

    // 发射新粒子
    for (let i = 0; i < emitCount && this.activeCount < this.config.maxParticles; i++) {
      const particle = this.findInactiveParticle()
      if (particle) {
        this.activateParticle(particle)
      }
    }

    // 使用 GPU 或 CPU 更新
    if (this.useGPU && this.computeShader && this.gpuBuffers) {
      this.updateWithGPU(deltaTime)
    } else {
      this.updateWithCPU(deltaTime)
    }
  }

  /**
   * 使用 GPU 更新粒子
   */
  private async updateWithGPU(deltaTime: number): Promise<void> {
    if (!this.computeShader || !this.gpuBuffers) {
      this.logger.warn('GPU compute shader not initialized, falling back to CPU')
      this.updateWithCPU(deltaTime)
      return
    }

    // 准备 GPU 缓冲区数据
    const { positions, velocities, ages } = this.gpuBuffers

    // 从粒子数据填充缓冲区
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i]
      positions[i * 3 + 0] = particle.position.x
      positions[i * 3 + 1] = particle.position.y
      positions[i * 3 + 2] = particle.position.z
      velocities[i * 3 + 0] = particle.velocity.x
      velocities[i * 3 + 1] = particle.velocity.y
      velocities[i * 3 + 2] = particle.velocity.z
      ages[i] = particle.active ? particle.age : -1
    }

    // 更新 Uniform 数据
    const gravity = this.config.gravity || { x: 0, y: -9.8, z: 0 }
    const drag = this.config.drag || 0
    const lifetime = (this.config.lifetime.max + this.config.lifetime.min) / 2

    this.computeShader.updateUniforms(deltaTime, gravity, drag, lifetime)

    // 更新粒子数据
    this.computeShader.updateParticleData(positions, velocities, ages)

    // 分发计算
    const workgroups = [
      Math.ceil(this.config.maxParticles / 64),
      1,
      1
    ] as [number, number, number]

    await this.computeShader.dispatch(workgroups)

    // 获取输出数据
    const output = await this.computeShader.getOutputData(this.config.maxParticles)

    // 将 GPU 结果写回粒子数据
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i]
      particle.position.x = output.positions[i * 3 + 0]
      particle.position.y = output.positions[i * 3 + 1]
      particle.position.z = output.positions[i * 3 + 2]
      particle.velocity.x = output.velocities[i * 3 + 0]
      particle.velocity.y = output.velocities[i * 3 + 1]
      particle.velocity.z = output.velocities[i * 3 + 2]
      particle.age = output.ages[i]

      // 更新活跃状态
      if (particle.age >= 0) {
        particle.activate()
        // 应用粒子效果
        this.applyParticleEffects(particle)
      } else {
        particle.deactivate()
      }
    }

    // 更新活跃计数
    this.activeCount = this.particles.filter(p => p.active).length
  }

  /**
   * 使用 CPU 更新粒子
   */
  private updateWithCPU(deltaTime: number): void {
    // 更新所有粒子
    this.activeCount = 0
    for (const particle of this.particles) {
      if (particle.active) {
        particle.update(deltaTime)

        // 应用粒子效果
        this.applyParticleEffects(particle)

        if (particle.active) {
          this.activeCount++
        }
      }
    }
  }

  /**
   * 应用粒子效果
   */
  private applyParticleEffects(particle: ParticleData): void {
    const lifeProgress = particle.getLifeProgress()

    // 颜色渐变效果
    if (this.config.colorOverLifetime) {
      particle.color = {
        r: this.lerp(this.config.colorOverLifetime.start.r, this.config.colorOverLifetime.end.r, lifeProgress),
        g: this.lerp(this.config.colorOverLifetime.start.g, this.config.colorOverLifetime.end.g, lifeProgress),
        b: this.lerp(this.config.colorOverLifetime.start.b, this.config.colorOverLifetime.end.b, lifeProgress)
      }
    }

    // 大小衰减效果
    if (this.config.sizeOverLifetime?.enabled) {
      particle.size *= (1 - lifeProgress * this.config.sizeOverLifetime.factor)
    }

    // 透明度变化效果
    if (this.config.opacityOverLifetime?.enabled) {
      particle.opacity = this.lerp(this.config.opacityOverLifetime.start, this.config.opacityOverLifetime.end, lifeProgress)
    }
  }

  /**
   * 线性插值
   */
  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t
  }

  /**
   * 查找不活跃的粒子
   */
  private findInactiveParticle(): ParticleData | null {
    for (const particle of this.particles) {
      if (!particle.active) {
        return particle
      }
    }
    return null
  }

  /**
   * 获取所有活跃粒子
   */
  getActiveParticles(): ParticleData[] {
    return this.particles.filter(p => p.active)
  }

  /**
   * 获取粒子数据数组（用于 GPU 渲染）
   */
  getParticleData(): Float32Array {
    const data = new Float32Array(this.particles.length * 7) // position(3) + velocity(3) + age(1)

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i]
      const offset = i * 7

      if (particle.active) {
        data[offset + 0] = particle.position.x
        data[offset + 1] = particle.position.y
        data[offset + 2] = particle.position.z
        data[offset + 3] = particle.velocity.x
        data[offset + 4] = particle.velocity.y
        data[offset + 5] = particle.velocity.z
        data[offset + 6] = particle.age
      } else {
        // 不活跃粒子使用默认值
        data[offset + 0] = 0
        data[offset + 1] = -1000
        data[offset + 2] = 0
        data[offset + 3] = 0
        data[offset + 4] = 0
        data[offset + 5] = 0
        data[offset + 6] = 0
      }
    }

    return data
  }

  /**
   * 获取活跃粒子数量
   */
  getActiveCount(): number {
    return this.activeCount
  }

  /**
   * 获取最大粒子数量
   */
  getMaxParticles(): number {
    return this.config.maxParticles
  }

  /**
   * 获取发射器
   */
  getEmitter(): ParticleEmitter {
    return this.emitter
  }

  /**
   * 重置粒子系统
   */
  reset(): void {
    for (const particle of this.particles) {
      particle.reset()
    }
    this.activeCount = 0
    this.emitter.reset()

    // 重新激活初始粒子
    for (let i = 0; i < this.config.initialParticles && i < this.particles.length; i++) {
      this.activateParticle(this.particles[i])
    }

    this.logger.info('Particle system reset')
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ParticleSystemConfig & { emitter?: any }>): void {
    const oldMaxParticles = this.config.maxParticles
    this.config = { ...this.config, ...config }

    // 如果最大粒子数量发生变化，重新初始化粒子池
    if (config.maxParticles !== undefined && config.maxParticles !== oldMaxParticles) {
      this.logger.info(`Max particles changed from ${oldMaxParticles} to ${config.maxParticles}, reinitializing particle pool`)
      this.initializeParticlePool()

      // 如果 GPU 计算已启用，重新分配 GPU 缓冲区
      if (this.computeShader) {
        this.computeShader.allocateBuffers(this.config.maxParticles)
        this.gpuBuffers = {
          positions: new Float32Array(this.config.maxParticles * 3),
          velocities: new Float32Array(this.config.maxParticles * 3),
          ages: new Float32Array(this.config.maxParticles)
        }
      }
    }

    // 更新发射器配置
    if (config.emitter) {
      this.emitter.updateConfig({
        // 传递所有发射器相关属性
        position: config.emitter.position,
        direction: config.emitter.direction,
        spread: config.emitter.spread,
        rate: config.emitter.rate !== undefined ? config.emitter.rate : this.config.emitRate,
        size: config.emitter.size || this.config.size,
        lifetime: config.emitter.lifetime || this.config.lifetime,
        velocity: config.emitter.velocity || this.config.velocity,
        color: config.emitter.color || this.config.color,
        gravity: config.emitter.gravity || this.config.gravity,
        drag: config.emitter.drag !== undefined ? config.emitter.drag : this.config.drag,
        burstCount: config.emitter.burstCount
      })
    } else {
      // 更新发射器配置
      this.emitter.updateConfig({
        rate: config.emitRate,
        size: config.size,
        lifetime: config.lifetime,
        velocity: config.velocity,
        color: config.color,
        gravity: config.gravity,
        drag: config.drag
      })
    }

    this.logger.debug('Particle system config updated')
  }

  /**
   * 获取配置
   */
  getConfig(): ParticleSystemConfig {
    return { ...this.config }
  }

  /**
   * 初始化 GPU 计算着色器
   */
  async initializeGPUCompute(): Promise<void> {
    if (this.computeShader) {
      this.logger.warn('GPU compute shader already initialized')
      return
    }

    try {
      this.logger.info('Initializing GPU compute shader...')

      // 检测最佳着色器语言
      const language = this.detectBestShaderLanguage()

      // 创建计算着色器
      if (language === ShaderLanguage.WGSL) {
        this.computeShader = new WGSLComputeShader({
          language: ShaderLanguage.WGSL,
          code: wgslCode,
          entryPoint: 'main',
          workgroupSize: [64, 1, 1]
        })
      } else {
        this.computeShader = new GLSLComputeShader({
          language: ShaderLanguage.GLSL,
          code: glslCode,
          entryPoint: 'main',
          workgroupSize: [64, 1, 1]
        })
      }

      // 初始化着色器
      await this.computeShader.initialize()

      // 分配缓冲区
      this.computeShader.allocateBuffers(this.config.maxParticles)

      // 分配 CPU 缓冲区（用于数据传输）
      this.gpuBuffers = {
        positions: new Float32Array(this.config.maxParticles * 3),
        velocities: new Float32Array(this.config.maxParticles * 3),
        ages: new Float32Array(this.config.maxParticles)
      }

      this.logger.info('GPU compute shader initialized successfully')
    } catch (error) {
      this.logger.error('Failed to initialize GPU compute shader:', error)
      this.computeShader = null
      this.useGPU = false
    }
  }

  /**
   * 启用 GPU 计算
   */
  enableGPUCompute(): void {
    this.useGPU = true
    this.logger.info('GPU compute enabled')
  }

  /**
   * 禁用 GPU 计算
   */
  disableGPUCompute(): void {
    this.useGPU = false
    this.logger.info('GPU compute disabled')
  }

  /**
   * 检测最佳着色器语言
   */
  private detectBestShaderLanguage(): ShaderLanguage {
    // 检查 WebGPU 支持
    if ('gpu' in navigator) {
      this.logger.info('WebGPU detected, using WGSL')
      return ShaderLanguage.WGSL
    }

    // 检查 WebGL2 支持
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    if (gl) {
      this.logger.info('WebGL2 detected, using GLSL')
      return ShaderLanguage.GLSL
    }

    // 默认使用 GLSL（更广泛的支持）
    this.logger.warn('No GPU compute detected, falling back to GLSL')
    return ShaderLanguage.GLSL
  }

  /**
   * 释放资源
   */
  dispose(): void {
    // 释放 GPU 计算着色器
    if (this.computeShader) {
      this.computeShader.dispose()
      this.computeShader = null
    }

    this.particles = []
    this.activeCount = 0
    this.gpuBuffers = null
    this.logger.info('Particle system disposed')
  }
}