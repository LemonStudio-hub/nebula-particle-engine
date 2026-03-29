import { Vector3, Color3, EmitterMode, Range, Vector3Range, ColorRange } from '@/utils/types/common'
import { ParticleData } from './ParticleData'
import { IParticleEmitter } from '@/utils/types/particle'
import { MathUtils } from '@/utils/MathUtils'
import { Logger } from '@/utils/Logger'

/**
 * 粒子发射器配置
 */
export interface ParticleEmitterConfig {
  mode: EmitterMode
  position: Vector3
  direction: Vector3
  spread: number
  rate: number
  burstCount?: number
  size: Range
  lifetime: Range
  velocity: Vector3Range
  color: ColorRange
  gravity?: Vector3
  drag?: number
}

/**
 * 粒子发射器类
 * 负责生成新粒子
 */
export class ParticleEmitter implements IParticleEmitter {
  private readonly logger = Logger.create('ParticleEmitter')
  private config: ParticleEmitterConfig
  private emitTimer: number = 0

  constructor(config: ParticleEmitterConfig) {
    this.config = config
    this.logger.info('Particle emitter created')
  }

  /**
   * 发射指定数量的粒子
   */
  emit(count: number): ParticleData[] {
    const particles: ParticleData[] = []

    for (let i = 0; i < count; i++) {
      const particle = this.createParticle()
      particles.push(particle)
    }

    return particles
  }

  /**
   * 更新发射器
   */
  update(deltaTime: number): void {
    this.emitTimer += deltaTime
  }

  /**
   * 重置发射器
   */
  reset(): void {
    this.emitTimer = 0
  }

  /**
   * 获取需要发射的粒子数量
   */
  getEmitCount(): number {
    if (this.config.rate <= 0) {
      return 0
    }

    const count = Math.floor(this.emitTimer / (1 / this.config.rate))
    this.emitTimer = this.emitTimer % (1 / this.config.rate)
    return count
  }

  /**
   * 创建单个粒子
   */
  private createParticle(): ParticleData {
    const particle = new ParticleData()

    // 设置位置
    particle.position = this.generatePosition()

    // 设置速度
    particle.velocity = this.generateVelocity()

    // 设置加速度（重力）
    if (this.config.gravity) {
      particle.acceleration = { ...this.config.gravity }
    }

    // 设置大小
    particle.size = MathUtils.randomRange(this.config.size)

    // 设置生命周期
    particle.lifetime = MathUtils.randomRange(this.config.lifetime)

    // 设置颜色
    particle.color = this.generateColor()

    // 激活粒子
    particle.activate()

    return particle
  }

  /**
   * 生成位置
   */
  private generatePosition(): Vector3 {
    const basePosition = { ...this.config.position }

    switch (this.config.mode) {
      case EmitterMode.Point:
        return basePosition

      case EmitterMode.Line:
        const lineLength = 10
        const t = Math.random() * 2 - 1
        return {
          x: basePosition.x + t * lineLength,
          y: basePosition.y,
          z: basePosition.z
        }

      case EmitterMode.Plane:
        const planeSize = 10
        return {
          x: basePosition.x + (Math.random() * 2 - 1) * planeSize,
          y: basePosition.y,
          z: basePosition.z + (Math.random() * 2 - 1) * planeSize
        }

      case EmitterMode.Sphere:
        const sphereRadius = 5
        const spherePoint = MathUtils.randomPointInSphere(sphereRadius)
        return {
          x: basePosition.x + spherePoint.x,
          y: basePosition.y + spherePoint.y,
          z: basePosition.z + spherePoint.z
        }

      default:
        return basePosition
    }
  }

  /**
   * 生成速度
   */
  private generateVelocity(): Vector3 {
    const baseVelocity = MathUtils.randomVector3(this.config.velocity)

    // 应用扩散角度
    if (this.config.spread > 0) {
      const spreadAngle = this.config.spread * (Math.PI / 180)
      const spreadX = (Math.random() * 2 - 1) * spreadAngle
      const spreadY = (Math.random() * 2 - 1) * spreadAngle
      const spreadZ = (Math.random() * 2 - 1) * spreadAngle

      baseVelocity.x += spreadX
      baseVelocity.y += spreadY
      baseVelocity.z += spreadZ
    }

    // 应用方向
    const direction = MathUtils.normalize(this.config.direction)
    const speed = MathUtils.length(baseVelocity)

    return {
      x: direction.x * speed,
      y: direction.y * speed,
      z: direction.z * speed
    }
  }

  /**
   * 生成颜色
   */
  private generateColor(): Color3 {
    const t = Math.random()
    return {
      r: MathUtils.lerp(this.config.color.start.r, this.config.color.end.r, t),
      g: MathUtils.lerp(this.config.color.start.g, this.config.color.end.g, t),
      b: MathUtils.lerp(this.config.color.start.b, this.config.color.end.b, t)
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ParticleEmitterConfig>): void {
    this.config = { ...this.config, ...config }
    this.logger.debug('Emitter config updated')
  }

  /**
   * 获取配置
   */
  getConfig(): ParticleEmitterConfig {
    return { ...this.config }
  }
}