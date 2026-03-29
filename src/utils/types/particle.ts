import { Vector3, Color3, ColorRange, Range, Vector3Range } from './common'

/**
 * 粒子数据结构
 */
export interface ParticleData {
  position: Vector3
  velocity: Vector3
  acceleration: Vector3
  color: Color3
  size: number
  lifetime: number
  age: number
  active: boolean
}

/**
 * 粒子发射器接口
 */
export interface IParticleEmitter {
  emit(count: number): ParticleData[]
  update(deltaTime: number): void
  reset(): void
}

/**
 * 粒子更新策略接口
 */
export interface IParticleUpdateStrategy {
  update(particles: Float32Array, deltaTime: number): void
  initialize(particleCount: number): void
  dispose(): void
}

/**
 * 粒子系统配置
 */
export interface ParticleSystemConfig {
  maxParticles: number
  initialParticles: number
  emitRate: number
  lifetime: Range
  size: Range
  velocity: Vector3Range
  color: ColorRange
  gravity?: Vector3
  drag?: number
}