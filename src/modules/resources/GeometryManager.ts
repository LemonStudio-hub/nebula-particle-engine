import * as THREE from 'three'
import { Logger } from '@/utils/Logger'

/**
 * 几何体管理器
 * 管理所有几何体资源的创建和缓存
 */
export class GeometryManager {
  private static instance: GeometryManager | null = null
  private readonly logger = Logger.create('GeometryManager')
  private geometries: Map<string, THREE.BufferGeometry> = new Map()

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): GeometryManager {
    if (!GeometryManager.instance) {
      GeometryManager.instance = new GeometryManager()
    }
    return GeometryManager.instance
  }

  /**
   * 创建粒子几何体
   */
  createParticleGeometry(particleCount: number): THREE.BufferGeometry {
    const key = `particle_${particleCount}`

    if (this.geometries.has(key)) {
      this.logger.debug(`Particle geometry ${key} already cached`)
      return this.geometries.get(key)!
    }

    this.logger.info(`Creating particle geometry for ${particleCount} particles`)

    const geometry = new THREE.BufferGeometry()

    // 创建顶点数组（每个粒子一个顶点）
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)

    // 初始化数组
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0

      colors[i * 3 + 0] = 1
      colors[i * 3 + 1] = 1
      colors[i * 3 + 2] = 1

      sizes[i] = 1
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    this.geometries.set(key, geometry)

    return geometry
  }

  /**
   * 更新粒子几何体属性
   */
  updateParticleGeometry(
    geometry: THREE.BufferGeometry,
    positions: Float32Array,
    colors?: Float32Array,
    sizes?: Float32Array
  ): void {
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    positionAttr.array.set(positions)
    positionAttr.needsUpdate = true

    if (colors) {
      const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute
      colorAttr.array.set(colors)
      colorAttr.needsUpdate = true
    }

    if (sizes) {
      const sizeAttr = geometry.getAttribute('size') as THREE.BufferAttribute
      sizeAttr.array.set(sizes)
      sizeAttr.needsUpdate = true
    }
  }

  /**
   * 创建圆形几何体
   */
  createCircleGeometry(radius: number = 1, segments: number = 32): THREE.BufferGeometry {
    const key = `circle_${radius}_${segments}`

    if (this.geometries.has(key)) {
      this.logger.debug(`Circle geometry ${key} already cached`)
      return this.geometries.get(key)!
    }

    const geometry = new THREE.CircleGeometry(radius, segments)
    this.geometries.set(key, geometry)

    return geometry
  }

  /**
   * 获取几何体
   */
  getGeometry(key: string): THREE.BufferGeometry | undefined {
    return this.geometries.get(key)
  }

  /**
   * 释放几何体
   */
  releaseGeometry(key: string): void {
    const geometry = this.geometries.get(key)
    if (geometry) {
      geometry.dispose()
      this.geometries.delete(key)
      this.logger.debug(`Geometry released: ${key}`)
    }
  }

  /**
   * 释放所有几何体
   */
  releaseAll(): void {
    this.geometries.forEach((geometry) => {
      geometry.dispose()
    })
    this.geometries.clear()
    this.logger.info('All geometries released')
  }
}