import * as THREE from 'three'
import { Logger } from '@/utils/Logger'

/**
 * 纹理管理器
 * 管理所有纹理资源的加载和缓存
 */
export class TextureManager {
  private static instance: TextureManager | null = null
  private readonly logger = Logger.create('TextureManager')
  private textures: Map<string, THREE.Texture> = new Map()

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): TextureManager {
    if (!TextureManager.instance) {
      TextureManager.instance = new TextureManager()
    }
    return TextureManager.instance
  }

  /**
   * 加载纹理
   */
  async loadTexture(url: string): Promise<THREE.Texture> {
    if (this.textures.has(url)) {
      this.logger.debug(`Texture ${url} already cached`)
      return this.textures.get(url)!
    }

    try {
      this.logger.info(`Loading texture: ${url}`)
      const texture = await this.loadTextureFromURL(url)
      this.textures.set(url, texture)
      return texture
    } catch (error) {
      this.logger.error(`Failed to load texture ${url}:`, error)
      throw error
    }
  }

  /**
   * 从 URL 加载纹理
   */
  private async loadTextureFromURL(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader()
      loader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace
          this.logger.info(`Texture loaded successfully: ${url}`)
          resolve(texture)
        },
        undefined,
        (error) => {
          reject(error)
        }
      )
    })
  }

  /**
   * 创建程序化粒子纹理（带缓存）
   */
  createParticleTexture(size: number = 64): THREE.Texture {
    const cacheKey = `particle_${size}`

    // 检查缓存
    if (this.textures.has(cacheKey)) {
      this.logger.debug(`Particle texture (size=${size}) already cached`)
      return this.textures.get(cacheKey)!
    }

    // 创建新纹理
    const texture = this.createParticleTextureInternal(size)
    this.textures.set(cacheKey, texture)
    return texture
  }

  /**
   * 内部创建粒子纹理
   */
  private createParticleTextureInternal(size: number): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Failed to get 2D context')
    }

    // 创建径向渐变（圆形粒子）
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    )
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)')
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true

    this.logger.info(`Particle texture created programmatically (size=${size})`)

    return texture
  }

  /**
   * 获取纹理
   */
  getTexture(url: string): THREE.Texture | undefined {
    return this.textures.get(url)
  }

  /**
   * 释放纹理
   */
  releaseTexture(url: string): void {
    const texture = this.textures.get(url)
    if (texture) {
      texture.dispose()
      this.textures.delete(url)
      this.logger.debug(`Texture released: ${url}`)
    }
  }

  /**
   * 释放所有纹理
   */
  releaseAll(): void {
    this.textures.forEach((texture) => {
      texture.dispose()
    })
    this.textures.clear()
    this.logger.info('All textures released')
  }
}