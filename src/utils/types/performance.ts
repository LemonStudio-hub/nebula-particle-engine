import { PerformanceMetrics } from './common'

// 重新导出 PerformanceMetrics
export type { PerformanceMetrics } from './common'

/**
 * 性能监控回调
 */
export type PerformanceCallback = (metrics: PerformanceMetrics) => void

/**
 * 性能监控器接口
 */
export interface IPerformanceMonitor {
  start(): void
  stop(): void
  getCurrentMetrics(): PerformanceMetrics
  onMetricsUpdate(callback: PerformanceCallback): void
  dispose(): void
}

/**
 * 性能降级策略
 */
export enum FallbackStrategy {
  None = 'none',
  ReduceParticles = 'reduce_particles',
  LowerQuality = 'lower_quality',
  SwitchRenderer = 'switch_renderer'
}

/**
 * 性能配置
 */
export interface PerformanceConfig {
  targetFPS: number
  minFPS: number
  enableAutoFallback: boolean
  fallbackStrategies: FallbackStrategy[]
}