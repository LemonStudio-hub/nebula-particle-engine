import { IRenderer, IRendererFactory, RendererCreateConfig, RendererType } from '@/utils/types/renderer'
import { WebGPURenderer } from './WebGPURenderer'
import { WebGLRenderer } from './WebGLRenderer'
import { WebGPUCompatChecker } from '@/utils/WebGPUCompatChecker'
import { Logger } from '@/utils/Logger'

/**
 * 渲染器工厂
 * 负责自动检测最佳渲染器并创建相应实例
 */
export class RendererFactory implements IRendererFactory {
  private static instance: RendererFactory | null = null
  private readonly logger = Logger.create('RendererFactory')
  private readonly compatChecker: WebGPUCompatChecker
  private cachedRendererType: RendererType | null = null

  private constructor() {
    this.compatChecker = WebGPUCompatChecker.getInstance()
  }

  /**
   * 获取单例实例
   */
  static getInstance(): RendererFactory {
    if (!RendererFactory.instance) {
      RendererFactory.instance = new RendererFactory()
    }
    return RendererFactory.instance
  }

  /**
   * 检测最佳渲染器类型
   * 优先使用 WebGPU，如果不支持则降级到 WebGL
   */
  async detectBestRenderer(): Promise<RendererType> {
    // 如果已经缓存了结果，直接返回
    if (this.cachedRendererType) {
      this.logger.info(`Using cached renderer type: ${this.cachedRendererType}`)
      return this.cachedRendererType
    }

    try {
      this.logger.info('Detecting best renderer...')

      // 使用 WebGPU 兼容性检查器
      const result = await this.compatChecker.checkCompatibility()

      if (result.supported) {
        this.logger.info('WebGPU is available and supported')
        this.logger.info(`GPU Info: ${result.adapterInfo?.vendor} ${result.adapterInfo?.device}`)
        this.cachedRendererType = RendererType.WebGPU
      } else {
        this.logger.warn('WebGPU is not available, falling back to WebGL')
        if (result.reason) {
          this.logger.warn(`Reason: ${result.reason}`)
        }
        this.cachedRendererType = RendererType.WebGL
      }

      return this.cachedRendererType
    } catch (error) {
      this.logger.error('Failed to detect best renderer:', error)
      // 发生错误时默认使用 WebGL
      this.logger.info('Defaulting to WebGL due to error')
      this.cachedRendererType = RendererType.WebGL
      return this.cachedRendererType
    }
  }

  /**
   * 创建渲染器实例
   * 自动检测并创建最适合的渲染器
   */
  async create(config: RendererCreateConfig): Promise<IRenderer> {
    const bestType = await this.detectBestRenderer()

    // 如果配置指定了类型，使用配置的类型
    const rendererType = config.type || bestType

    this.logger.info(`Creating ${rendererType} renderer...`)

    try {
      switch (rendererType) {
        case RendererType.WebGPU:
          console.log('[RendererFactory] Creating WebGPU renderer')
          const webgpuRenderer = new WebGPURenderer({
            type: RendererType.WebGPU,
            antialias: config.antialias,
            pixelRatio: config.pixelRatio,
            alpha: config.alpha
          })
          await webgpuRenderer.initialize(config.canvas)
          return webgpuRenderer

        case RendererType.WebGL:
          console.log('[RendererFactory] Creating WebGL renderer')
          const webglRenderer = new WebGLRenderer({
            type: RendererType.WebGL,
            antialias: config.antialias,
            pixelRatio: config.pixelRatio,
            alpha: config.alpha
          })
          await webglRenderer.initialize(config.canvas)
          return webglRenderer

        default:
          throw new Error(`Unknown renderer type: ${rendererType}`)
      }
    } catch (error) {
      console.error('[RendererFactory] Failed to create renderer:', error)

      // 如果是 WebGPU 创建失败，尝试降级到 WebGL
      if (rendererType === RendererType.WebGPU) {
        console.log('[RendererFactory] Falling back to WebGL due to error')
        const webglRenderer = new WebGLRenderer({
          type: RendererType.WebGL,
          antialias: config.antialias,
          pixelRatio: config.pixelRatio,
          alpha: config.alpha
        })
        await webglRenderer.initialize(config.canvas)
        return webglRenderer
      }

      throw error
    }
  }
}