import * as THREE from 'three'
import { Logger } from '@/utils/Logger'
import { TextureManager } from '../resources/TextureManager'
import { GeometryManager } from '../resources/GeometryManager'
import { MaterialManager } from '../resources/MaterialManager'
import { IRenderer } from '@/utils/types/renderer'

/**
 * 渲染管线配置
 */
export interface RenderPipelineConfig {
  particleCount: number
  enableColors: boolean
  enableSizeAttenuation: boolean
  transparent: boolean
  opacity: number
  blending?: THREE.Blending
}

/**
 * 渲染管线类
 * 管理粒子渲染的完整流程
 */
export class RenderPipeline {
  private readonly logger = Logger.create('RenderPipeline')
  private config: RenderPipelineConfig
  private textureManager: TextureManager
  private geometryManager: GeometryManager
  private materialManager: MaterialManager
  private particleSystem: THREE.Points | null = null
  private particleTexture: THREE.Texture | null = null

  constructor(config: RenderPipelineConfig) {
    this.config = config
    this.textureManager = TextureManager.getInstance()
    this.geometryManager = GeometryManager.getInstance()
    this.materialManager = MaterialManager.getInstance()
  }

  /**
   * 初始化渲染管线
   */
  async initialize(renderer: IRenderer): Promise<void> {
    this.logger.info('Initializing render pipeline...')

    try {
      // 创建粒子纹理
      this.particleTexture = this.textureManager.createParticleTexture()

      // 创建粒子几何体
      const geometry = this.geometryManager.createParticleGeometry(this.config.particleCount)

      // 创建粒子材质
      const material = this.materialManager.createParticleMaterial({
        vertexColors: this.config.enableColors,
        sizeAttenuation: this.config.enableSizeAttenuation,
        transparent: this.config.transparent,
        opacity: this.config.opacity,
        blending: this.config.blending,
        map: this.particleTexture
      })

      // 创建粒子系统
      this.particleSystem = new THREE.Points(geometry, material)

      // 添加到渲染器场景
      if (renderer instanceof Object && 'addToScene' in renderer) {
        ;(renderer as any).addToScene(this.particleSystem)
      }

      this.logger.info('Render pipeline initialized successfully')
    } catch (error) {
      this.logger.error('Failed to initialize render pipeline:', error)
      throw error
    }
  }

  /**
   * 更新粒子渲染数据
   */
  updateRenderData(
    positions: Float32Array,
    colors?: Float32Array,
    sizes?: Float32Array
  ): void {
    if (!this.particleSystem) {
      this.logger.warn('Particle system not initialized')
      return
    }

    const geometry = this.particleSystem.geometry
    this.geometryManager.updateParticleGeometry(geometry, positions, colors, sizes)
  }

  /**
   * 更新材质属性
   */
  updateMaterial(options: {
    opacity?: number
    size?: number
  }): void {
    if (!this.particleSystem) {
      this.logger.warn('Particle system not initialized')
      return
    }

    const material = this.particleSystem.material as THREE.PointsMaterial

    if (options.opacity !== undefined) {
      material.opacity = options.opacity
    }

    if (options.size !== undefined) {
      material.size = options.size
    }
  }

  /**
   * 获取粒子系统
   */
  getParticleSystem(): THREE.Points | null {
    return this.particleSystem
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<RenderPipelineConfig>): void {
    this.config = { ...this.config, ...config }
    this.logger.debug('Render pipeline config updated')
  }

  /**
   * 获取配置
   */
  getConfig(): RenderPipelineConfig {
    return { ...this.config }
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.logger.info('Disposing render pipeline...')

    if (this.particleSystem) {
      this.particleSystem.geometry.dispose()
      ;(this.particleSystem.material as THREE.Material).dispose()
      this.particleSystem = null
    }

    if (this.particleTexture) {
      this.textureManager.releaseTexture('particle_texture')
      this.particleTexture = null
    }

    this.logger.info('Render pipeline disposed')
  }
}