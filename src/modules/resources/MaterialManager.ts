import * as THREE from 'three'
import { Logger } from '@/utils/Logger'

/**
 * 材质管理器
 * 管理所有材质资源的创建和缓存
 */
export class MaterialManager {
  private static instance: MaterialManager | null = null
  private readonly logger = Logger.create('MaterialManager')
  private materials: Map<string, THREE.Material> = new Map()

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): MaterialManager {
    if (!MaterialManager.instance) {
      MaterialManager.instance = new MaterialManager()
    }
    return MaterialManager.instance
  }

  /**
   * 创建粒子材质
   */
  createParticleMaterial(options?: {
    vertexColors?: boolean
    sizeAttenuation?: boolean
    transparent?: boolean
    opacity?: number
    blending?: THREE.Blending
    depthWrite?: boolean
    map?: THREE.Texture
    size?: number
  }): THREE.PointsMaterial {
    const key = `particle_${JSON.stringify(options)}`

    if (this.materials.has(key)) {
      this.logger.debug(`Particle material ${key} already cached`)
      return this.materials.get(key)! as THREE.PointsMaterial
    }

    this.logger.info('Creating particle material')

    const material = new THREE.PointsMaterial({
      vertexColors: options?.vertexColors ?? true,
      sizeAttenuation: options?.sizeAttenuation ?? true,
      transparent: options?.transparent ?? true,
      opacity: options?.opacity ?? 1,
      blending: options?.blending ?? THREE.AdditiveBlending,
      depthWrite: options?.depthWrite ?? false,
      map: options?.map,
      size: options?.size ?? 5
    })

    this.materials.set(key, material)

    return material
  }

  /**
   * 创建精灵材质
   */
  createSpriteMaterial(options?: {
    color?: THREE.ColorRepresentation
    map?: THREE.Texture
    transparent?: boolean
    opacity?: number
    blending?: THREE.Blending
    depthWrite?: boolean
  }): THREE.SpriteMaterial {
    const key = `sprite_${JSON.stringify(options)}`

    if (this.materials.has(key)) {
      this.logger.debug(`Sprite material ${key} already cached`)
      return this.materials.get(key)! as THREE.SpriteMaterial
    }

    this.logger.info('Creating sprite material')

    const material = new THREE.SpriteMaterial({
      color: options?.color ?? 0xffffff,
      map: options?.map,
      transparent: options?.transparent ?? true,
      opacity: options?.opacity ?? 1,
      blending: options?.blending ?? THREE.AdditiveBlending,
      depthWrite: options?.depthWrite ?? false
    })

    this.materials.set(key, material)

    return material
  }

  /**
   * 创建发光材质
   */
  createGlowMaterial(options?: {
    color?: THREE.ColorRepresentation
    intensity?: number
  }): THREE.ShaderMaterial {
    const key = `glow_${JSON.stringify(options)}`

    if (this.materials.has(key)) {
      this.logger.debug(`Glow material ${key} already cached`)
      return this.materials.get(key)! as THREE.ShaderMaterial
    }

    this.logger.info('Creating glow material')

    const vertexShader = `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `

    const fragmentShader = `
      uniform vec3 color;
      uniform float intensity;
      varying vec3 vNormal;
      void main() {
        float glow = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
        gl_FragColor = vec4(color, glow * intensity);
      }
    `

    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(options?.color ?? 0xffffff) },
        intensity: { value: options?.intensity ?? 1.0 }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide
    })

    this.materials.set(key, material)

    return material
  }

  /**
   * 获取材质
   */
  getMaterial(key: string): THREE.Material | undefined {
    return this.materials.get(key)
  }

  /**
   * 释放材质
   */
  releaseMaterial(key: string): void {
    const material = this.materials.get(key)
    if (material) {
      material.dispose()
      this.materials.delete(key)
      this.logger.debug(`Material released: ${key}`)
    }
  }

  /**
   * 释放所有材质
   */
  releaseAll(): void {
    this.materials.forEach((material) => {
      material.dispose()
    })
    this.materials.clear()
    this.logger.info('All materials released')
  }
}