import { IRenderer, IRendererFactory, RendererCreateConfig, RendererType } from '@/utils/types/renderer'
import { WebGPURenderer } from './WebGPURenderer'
import { WebGLRenderer } from './WebGLRenderer'
import { Logger } from '@/utils/Logger'

/**
 * 渲染器工厂
 * 负责自动检测最佳渲染器并创建相应实例
 */
export class RendererFactory implements IRendererFactory {
  private static instance: RendererFactory | null = null
  private readonly logger = Logger.create('RendererFactory')

  private constructor() {}

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
    // 检查 WebGPU 支持
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      try {
        const adapter = await navigator.gpu.requestAdapter()
        if (adapter) {
          // 验证适配器功能
          const features = adapter.features
          const hasTimestampQuery = features.has('timestamp-query')
          
          this.logger.info('WebGPU detected and available', {
            hasTimestampQuery,
            vendor: adapter.info.vendor
          })
          
          return RendererType.WebGPU
        }
      } catch (error) {
        this.logger.warn('WebGPU adapter request failed:', error)
      }
    }

    this.logger.info('WebGPU not available, falling back to WebGL')
    return RendererType.WebGL
  }

  /**
   * 创建渲染器实例
   * 自动检测并创建最适合的渲染器
   */
  async create(config: RendererCreateConfig): Promise<IRenderer> {
    const bestType = await this.detectBestRenderer()

    // 如果配置指定了类型，使用配置的类型
    const rendererType = config.type || bestType

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