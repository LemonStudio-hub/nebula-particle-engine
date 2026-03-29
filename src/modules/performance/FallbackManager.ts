import { PerformanceMetrics, FallbackStrategy, PerformanceConfig } from '@/utils/types/performance'
import { Logger } from '@/utils/Logger'

/**
 * 降级回调
 */
export type FallbackCallback = (strategy: FallbackStrategy) => void

/**
 * 降级管理器
 * 根据性能指标自动执行降级策略
 */
export class FallbackManager {
  private readonly logger = Logger.create('FallbackManager')
  private config: PerformanceConfig
  private callbacks: FallbackCallback[] = []
  private lowFPSCount: number = 0
  private currentStrategy: FallbackStrategy | null = null

  constructor(config: PerformanceConfig) {
    this.config = config
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config }
    this.logger.debug('Fallback manager config updated')
  }

  /**
   * 注册降级回调
   */
  onFallback(callback: FallbackCallback): void {
    this.callbacks.push(callback)
  }

  /**
   * 移除降级回调
   */
  offFallback(callback: FallbackCallback): void {
    const index = this.callbacks.indexOf(callback)
    if (index !== -1) {
      this.callbacks.splice(index, 1)
    }
  }

  /**
   * 检查性能并执行降级
   */
  checkPerformance(metrics: PerformanceMetrics): void {
    if (!this.config.enableAutoFallback) {
      return
    }

    // 检查 FPS 是否过低
    if (metrics.fps < this.config.minFPS) {
      this.lowFPSCount++

      // 连续 3 帧低于阈值，执行降级
      if (this.lowFPSCount >= 3) {
        this.executeFallback()
        this.lowFPSCount = 0
      }
    } else {
      this.lowFPSCount = 0
    }
  }

  /**
   * 执行降级策略
   */
  private executeFallback(): void {
    const strategies = this.config.fallbackStrategies

    // 找到下一个可用的降级策略
    let nextStrategy: FallbackStrategy | null = null

    for (const strategy of strategies) {
      if (strategy !== this.currentStrategy) {
        nextStrategy = strategy
        break
      }
    }

    if (nextStrategy) {
      this.currentStrategy = nextStrategy
      this.logger.warn(`Executing fallback strategy: ${nextStrategy}`)

      // 通知所有回调
      this.callbacks.forEach(callback => {
        try {
          callback(nextStrategy!)
        } catch (error) {
          this.logger.error('Error in fallback callback:', error)
        }
      })
    }
  }

  /**
   * 重置降级策略
   */
  reset(): void {
    this.currentStrategy = null
    this.lowFPSCount = 0
    this.logger.info('Fallback manager reset')
  }

  /**
   * 获取当前降级策略
   */
  getCurrentStrategy(): FallbackStrategy | null {
    return this.currentStrategy
  }
}