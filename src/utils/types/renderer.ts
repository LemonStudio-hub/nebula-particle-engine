import { RendererConfig } from './common'

// 重新导出 RendererConfig
export type { RendererConfig } from './common'

/**
 * 渲染器类型常量对象
 */
export const RendererType = {
  WebGPU: 'webgpu' as const,
  WebGL: 'webgl' as const
} as const

export type RendererType = typeof RendererType[keyof typeof RendererType]

/**
 * 渲染器接口
 */
export interface IRenderer {
  readonly type: RendererType
  readonly isWebGPU: boolean
  readonly canvas: HTMLCanvasElement

  initialize(canvas: HTMLCanvasElement): Promise<void>
  resize(width: number, height: number): void
  render(): void
  dispose(): void
}

/**
 * 渲染器创建配置
 */
export interface RendererCreateConfig extends RendererConfig {
  canvas: HTMLCanvasElement
}

/**
 * 渲染器工厂接口
 */
export interface IRendererFactory {
  create(config: RendererCreateConfig): Promise<IRenderer>
  detectBestRenderer(): Promise<RendererType>
}