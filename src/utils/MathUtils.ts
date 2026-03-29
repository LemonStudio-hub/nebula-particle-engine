import { Vector3, Range, Vector3Range } from '@/utils/types/common'

/**
 * 数学工具类
 * 提供常用的数学计算函数
 */
export class MathUtils {
  /**
   * 生成随机数
   */
  static random(min: number, max: number): number {
    return Math.random() * (max - min) + min
  }

  /**
   * 从范围中随机选择
   */
  static randomRange(range: Range): number {
    return this.random(range.min, range.max)
  }

  /**
   * 生成随机向量
   */
  static randomVector3(range: Vector3Range): Vector3 {
    return {
      x: this.randomRange(range.x),
      y: this.randomRange(range.y),
      z: this.randomRange(range.z)
    }
  }

  /**
   * 归一化向量
   */
  static normalize(v: Vector3): Vector3 {
    const length = this.length(v)
    if (length === 0) {
      return { x: 0, y: 0, z: 0 }
    }
    return {
      x: v.x / length,
      y: v.y / length,
      z: v.z / length
    }
  }

  /**
   * 计算向量长度
   */
  static length(v: Vector3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
  }

  /**
   * 向量加法
   */
  static add(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.x + b.x,
      y: a.y + b.y,
      z: a.z + b.z
    }
  }

  /**
   * 向量减法
   */
  static subtract(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.x - b.x,
      y: a.y - b.y,
      z: a.z - b.z
    }
  }

  /**
   * 向量乘法（标量）
   */
  static multiplyScalar(v: Vector3, scalar: number): Vector3 {
    return {
      x: v.x * scalar,
      y: v.y * scalar,
      z: v.z * scalar
    }
  }

  /**
   * 向量点积
   */
  static dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z
  }

  /**
   * 向量叉积
   */
  static cross(a: Vector3, b: Vector3): Vector3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    }
  }

  /**
   * 线性插值
   */
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  /**
   * 向量线性插值
   */
  static lerpVector3(a: Vector3, b: Vector3, t: number): Vector3 {
    return {
      x: this.lerp(a.x, b.x, t),
      y: this.lerp(a.y, b.y, t),
      z: this.lerp(a.z, b.z, t)
    }
  }

  /**
   * 限制范围
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  /**
   * 角度转弧度
   */
  static degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  /**
   * 弧度转角度
   */
  static radiansToDegrees(radians: number): number {
    return radians * (180 / Math.PI)
  }

  /**
   * 生成球面上的随机点
   */
  static randomPointOnSphere(radius: number): Vector3 {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)
    return { x, y, z }
  }

  /**
   * 生成球体内的随机点
   */
  static randomPointInSphere(radius: number): Vector3 {
    const u = Math.random()
    const v = Math.random()
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    const r = radius * Math.cbrt(Math.random())
    const x = r * Math.sin(phi) * Math.cos(theta)
    const y = r * Math.sin(phi) * Math.sin(theta)
    const z = r * Math.cos(phi)
    return { x, y, z }
  }

  /**
   * 欧拉距离
   */
  static distance(a: Vector3, b: Vector3): number {
    return this.length(this.subtract(b, a))
  }
}