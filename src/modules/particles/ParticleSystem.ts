import { Vector3, Color3, Range, Vector3Range, ColorRange } from '@/utils/types/common'
import { ParticleSystemConfig } from '@/utils/types/particle'
import { ParticleData } from './ParticleData'
import { ParticleEmitter } from './ParticleEmitter'
import { Logger } from '@/utils/Logger'

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

    // 更新所有粒子
    this.activeCount = 0
    for (const particle of this.particles) {
      if (particle.active) {
        particle.update(deltaTime)
        if (particle.active) {
          this.activeCount++
        }
      }
    }
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
    this.config = { ...this.config, ...config }

    // 更新发射器配置
    if (config.emitter) {
      this.emitter.updateConfig({
        rate: config.emitter.rate || this.config.emitRate,
        size: config.emitter.size || this.config.size,
        lifetime: config.emitter.lifetime || this.config.lifetime,
        velocity: config.emitter.velocity || this.config.velocity,
        color: config.emitter.color || this.config.color,
        gravity: config.emitter.gravity || this.config.gravity,
        drag: config.emitter.drag || this.config.drag
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
   * 释放资源
   */
  dispose(): void {
    this.particles = []
    this.activeCount = 0
    this.logger.info('Particle system disposed')
  }
}