import { IPerformanceMonitor, PerformanceMetrics, PerformanceCallback } from '@/utils/types/performance'
import { Logger } from '@/utils/Logger'

/**
 * 性能监控器类
 * 实时监控帧率、帧时间、粒子数量等性能指标
 */
export class PerformanceMonitor implements IPerformanceMonitor {
  private readonly logger = Logger.create('PerformanceMonitor')
  private callbacks: PerformanceCallback[] = []
  private frameCount: number = 0
  private lastTime: number = 0
  private frameTimes: number[] = []
  private currentMetrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    particleCount: 0,
    memoryUsage: 0,
    gpuMemoryUsage: 0
  }
  private running: boolean = false
  private updateInterval: number = 100 // 更新间隔（毫秒）- 降低到 100ms
  private lastUpdateTime: number = 0

  constructor() {
    this.lastTime = performance.now()
  }

  /**
   * 启动性能监控
   */
  start(): void {
    if (this.running) {
      this.logger.warn('Performance monitor already running')
      return
    }

    this.running = true
    this.frameCount = 0
    this.lastTime = performance.now()
    this.frameTimes = []
    this.logger.info('Performance monitor started')
  }

  /**
   * 停止性能监控
   */
  stop(): void {
    if (!this.running) {
      this.logger.warn('Performance monitor not running')
      return
    }

    this.running = false
    this.logger.info('Performance monitor stopped')
  }

  /**
   * 更新性能指标
   */
  update(particleCount: number): void {
    if (!this.running) return

    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime

    this.frameCount++
    this.frameTimes.push(deltaTime)

    // 保持最近的 60 帧数据
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift()
    }

    // 计算性能指标
    const avgFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length
    const fps = 1000 / avgFrameTime

    this.currentMetrics = {
      fps: Math.round(fps),
      frameTime: Math.round(avgFrameTime * 100) / 100,
      particleCount,
      memoryUsage: this.getMemoryUsage(),
      gpuMemoryUsage: 0 // WebGL/WebGPU 暂不支持获取
    }

    // 定期更新回调
    if (currentTime - this.lastUpdateTime >= this.updateInterval) {
      this.notifyCallbacks()
      this.lastUpdateTime = currentTime
    }
  }

  /**
   * 获取当前性能指标
   */
  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.currentMetrics }
  }

  /**
   * 注册性能更新回调
   */
  onMetricsUpdate(callback: PerformanceCallback): void {
    this.callbacks.push(callback)
  }

  /**
   * 移除性能更新回调
   */
  offMetricsUpdate(callback: PerformanceCallback): void {
    const index = this.callbacks.indexOf(callback)
    if (index !== -1) {
      this.callbacks.splice(index, 1)
    }
  }

  /**
   * 通知所有回调
   */
  private notifyCallbacks(): void {
    const metrics = this.getCurrentMetrics()
    this.callbacks.forEach(callback => {
      try {
        callback(metrics)
      } catch (error) {
        this.logger.error('Error in performance callback:', error)
      }
    })
  }

  /**
   * 获取内存使用量
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return Math.round(memory.usedJSHeapSize / 1024 / 1024) // MB
    }
    return 0
  }

  /**
   * 设置更新间隔
   */
  setUpdateInterval(interval: number): void {
    this.updateInterval = Math.max(100, interval)
  }

  /**
   * 重置性能监控
   */
  reset(): void {
    this.frameCount = 0
    this.frameTimes = []
    this.lastTime = performance.now()
    this.currentMetrics = {
      fps: 0,
      frameTime: 0,
      particleCount: 0,
      memoryUsage: 0,
      gpuMemoryUsage: 0
    }
    this.logger.info('Performance monitor reset')
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.stop()
    this.callbacks = []
    this.logger.info('Performance monitor disposed')
  }
}