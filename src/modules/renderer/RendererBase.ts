import { IRenderer, RendererType, RendererConfig } from '@/utils/types/renderer'

/**
 * 渲染器抽象基类
 * 提供渲染器的通用接口和基础功能
 */
export abstract class RendererBase implements IRenderer {
  protected readonly config: RendererConfig
  protected _canvas: HTMLCanvasElement | null = null
  protected _width: number = 0
  protected _height: number = 0

  constructor(config: RendererConfig) {
    this.config = config
  }

  /**
   * 获取渲染器类型
   */
  abstract get type(): RendererType

  /**
   * 是否为 WebGPU 渲染器
   */
  get isWebGPU(): boolean {
    return this.type === RendererType.WebGPU
  }

  /**
   * 获取画布元素
   */
  get canvas(): HTMLCanvasElement {
    if (!this._canvas) {
      throw new Error('Renderer not initialized')
    }
    return this._canvas
  }

  /**
   * 初始化渲染器
   */
  abstract initialize(canvas: HTMLCanvasElement): Promise<void>

  /**
   * 调整渲染器尺寸
   */
  resize(width: number, height: number): void {
    this._width = width
    this._height = height
    this.onResize(width, height)
  }

  /**
   * 渲染一帧
   */
  abstract render(): void

  /**
   * 释放渲染器资源
   */
  abstract dispose(): void

  /**
   * 子类实现的具体尺寸调整逻辑
   */
  protected abstract onResize(width: number, height: number): void

  /**
   * 计算像素比
   */
  protected calculatePixelRatio(): number {
    const maxPixelRatio = this.config.pixelRatio
    const devicePixelRatio = window.devicePixelRatio || 1
    return Math.min(maxPixelRatio, devicePixelRatio)
  }

  /**
   * 验证画布尺寸
   */
  protected validateSize(width: number, height: number): boolean {
    return width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height)
  }
}