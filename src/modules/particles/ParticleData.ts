import { Vector3, Color3 } from '@/utils/types/common'

/**
 * 粒子数据类
 * 存储单个粒子的所有属性
 */
export class ParticleData {
  public position: Vector3
  public velocity: Vector3
  public acceleration: Vector3
  public color: Color3
  public size: number
  public lifetime: number
  public age: number
  public opacity: number
  public active: boolean

  constructor() {
    this.position = { x: 0, y: 0, z: 0 }
    this.velocity = { x: 0, y: 0, z: 0 }
    this.acceleration = { x: 0, y: 0, z: 0 }
    this.color = { r: 1, g: 1, b: 1 }
    this.size = 1
    this.lifetime = 1
    this.age = 0
    this.opacity = 1
    this.active = false
  }

  /**
   * 重置粒子到初始状态
   */
  reset(): void {
    this.position = { x: 0, y: 0, z: 0 }
    this.velocity = { x: 0, y: 0, z: 0 }
    this.acceleration = { x: 0, y: 0, z: 0 }
    this.color = { r: 1, g: 1, b: 1 }
    this.size = 1
    this.lifetime = 1
    this.age = 0
    this.opacity = 1
    this.active = false
  }

  /**
   * 激活粒子
   */
  activate(): void {
    this.active = true
    this.age = 0
    this.opacity = 1
  }

  /**
   * 停用粒子
   */
  deactivate(): void {
    this.active = false
  }

  /**
   * 更新粒子
   */
  update(deltaTime: number): void {
    if (!this.active) {
      return
    }

    // 更新年龄
    this.age += deltaTime

    // 检查生命周期（使用 > 而不是 >=，添加小缓冲区）
    if (this.age > this.lifetime) {
      this.deactivate()
      return
    }

    // 更新速度（v = v + a * dt）
    this.velocity.x += this.acceleration.x * deltaTime
    this.velocity.y += this.acceleration.y * deltaTime
    this.velocity.z += this.acceleration.z * deltaTime

    // 更新位置（p = p + v * dt）
    this.position.x += this.velocity.x * deltaTime
    this.position.y += this.velocity.y * deltaTime
    this.position.z += this.velocity.z * deltaTime
  }

  /**
   * 获取生命周期进度（0-1）
   */
  getLifeProgress(): number {
    return this.lifetime > 0 ? this.age / this.lifetime : 0
  }

  /**
   * 克隆粒子数据
   */
  clone(): ParticleData {
    const clone = new ParticleData()
    clone.position = { ...this.position }
    clone.velocity = { ...this.velocity }
    clone.acceleration = { ...this.acceleration }
    clone.color = { ...this.color }
    clone.size = this.size
    clone.lifetime = this.lifetime
    clone.age = this.age
    clone.opacity = this.opacity
    clone.active = this.active
    return clone
  }
}