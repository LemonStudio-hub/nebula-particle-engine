import { Logger } from '@/utils/Logger'
import { RendererConfig, ParticleConfig, PerformanceConfig } from '@/utils/types/common'

/**
 * 应用配置类
 * 集中管理所有应用配置
 */
export class AppConfig {
  private static instance: AppConfig | null = null
  private readonly logger = Logger.create('AppConfig')

  // 默认渲染器配置
  private rendererConfig: RendererConfig = {
    type: 'webgpu' as any,
    antialias: true,
    pixelRatio: 2,
    alpha: false
  }

  // 默认粒子配置
  private particleConfig: ParticleConfig = {
    maxCount: 100000,
    initialCount: 10000,
    size: { min: 1, max: 3 },
    lifetime: { min: 2, max: 5 },
    velocity: {
      x: { min: -10, max: 10 },
      y: { min: -10, max: 10 },
      z: { min: -10, max: 10 }
    },
    color: {
      start: { r: 0.5, g: 0.5, b: 1.0 },
      end: { r: 0.0, g: 0.5, b: 1.0 }
    },
    gravity: { x: 0, y: -9.8, z: 0 },
    drag: 0.01
  }

  // 默认性能配置
  private performanceConfig: PerformanceConfig = {
    targetFPS: 60,
    minFPS: 30,
    enableAutoFallback: true,
    fallbackStrategies: ['reduce_particles' as any, 'switch_renderer' as any]
  }

  private constructor() {
    this.loadFromStorage()
  }

  /**
   * 获取单例实例
   */
  static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig()
    }
    return AppConfig.instance
  }

  /**
   * 从 localStorage 加载配置
   */
  private loadFromStorage(): void {
    try {
      const savedConfig = localStorage.getItem('nebula_config')
      if (savedConfig) {
        const config = JSON.parse(savedConfig)
        
        // 验证配置格式
        if (this.validateConfig(config)) {
          this.rendererConfig = { ...this.rendererConfig, ...config.renderer }
          this.particleConfig = { ...this.particleConfig, ...config.particle }
          this.performanceConfig = { ...this.performanceConfig, ...config.performance }
          this.logger.info('Configuration loaded from storage')
        } else {
          this.logger.warn('Invalid configuration format, using defaults')
          this.clearStorage()
        }
      }
    } catch (error) {
      this.logger.error('Failed to load configuration from storage:', error)
      // 清除损坏的配置
      this.clearStorage()
    }
  }

  /**
   * 验证配置格式
   */
  private validateConfig(config: any): boolean {
    if (!config || typeof config !== 'object') {
      return false
    }

    // 验证 renderer 配置
    if (config.renderer) {
      if (typeof config.renderer.type !== 'string' ||
          typeof config.renderer.antialias !== 'boolean' ||
          typeof config.renderer.pixelRatio !== 'number' ||
          typeof config.renderer.alpha !== 'boolean') {
        return false
      }
    }

    // 验证 particle 配置
    if (config.particle) {
      if (typeof config.particle.maxCount !== 'number' ||
          typeof config.particle.initialCount !== 'number' ||
          !config.particle.size || typeof config.particle.size.min !== 'number' ||
          !config.particle.lifetime || typeof config.particle.lifetime.min !== 'number') {
        return false
      }
    }

    // 验证 performance 配置
    if (config.performance) {
      if (typeof config.performance.targetFPS !== 'number' ||
          typeof config.performance.minFPS !== 'number' ||
          typeof config.performance.enableAutoFallback !== 'boolean') {
        return false
      }
    }

    return true
  }

  /**
   * 清除存储的配置
   */
  private clearStorage(): void {
    try {
      localStorage.removeItem('nebula_config')
      this.logger.info('Cleared invalid configuration from storage')
    } catch (error) {
      this.logger.error('Failed to clear configuration from storage:', error)
    }
  }

  /**
   * 保存配置到 localStorage
   */
  saveToStorage(): void {
    try {
      const config = {
        renderer: this.rendererConfig,
        particle: this.particleConfig,
        performance: this.performanceConfig
      }
      localStorage.setItem('nebula_config', JSON.stringify(config))
      this.logger.info('Configuration saved to storage')
    } catch (error) {
      this.logger.error('Failed to save configuration to storage:', error)
    }
  }

  /**
   * 重置为默认配置
   */
  resetToDefaults(): void {
    this.rendererConfig = {
      type: 'webgpu' as any,
      antialias: true,
      pixelRatio: 2,
      alpha: false
    }
    this.particleConfig = {
      maxCount: 100000,
      initialCount: 10000,
      size: { min: 1, max: 3 },
      lifetime: { min: 2, max: 5 },
      velocity: {
        x: { min: -10, max: 10 },
        y: { min: -10, max: 10 },
        z: { min: -10, max: 10 }
      },
      color: {
        start: { r: 0.5, g: 0.5, b: 1.0 },
        end: { r: 0.0, g: 0.5, b: 1.0 }
      },
      gravity: { x: 0, y: -9.8, z: 0 },
      drag: 0.01
    }
    this.performanceConfig = {
      targetFPS: 60,
      minFPS: 30,
      enableAutoFallback: true,
      fallbackStrategies: ['reduce_particles' as any, 'switch_renderer' as any]
    }
    this.saveToStorage()
    this.logger.info('Configuration reset to defaults')
  }

  /**
   * 获取渲染器配置
   */
  getRendererConfig(): RendererConfig {
    return { ...this.rendererConfig }
  }

  /**
   * 设置渲染器配置
   */
  setRendererConfig(config: Partial<RendererConfig>): void {
    this.rendererConfig = { ...this.rendererConfig, ...config }
    this.saveToStorage()
  }

  /**
   * 获取粒子配置
   */
  getParticleConfig(): ParticleConfig {
    return JSON.parse(JSON.stringify(this.particleConfig))
  }

  /**
   * 设置粒子配置
   */
  setParticleConfig(config: Partial<ParticleConfig>): void {
    this.particleConfig = { ...this.particleConfig, ...config }
    this.saveToStorage()
  }

  /**
   * 获取性能配置
   */
  getPerformanceConfig(): PerformanceConfig {
    return { ...this.performanceConfig }
  }

  /**
   * 设置性能配置
   */
  setPerformanceConfig(config: Partial<PerformanceConfig>): void {
    this.performanceConfig = { ...this.performanceConfig, ...config }
    this.saveToStorage()
  }

  /**
   * 导出配置
   */
  exportConfig(): string {
    return JSON.stringify({
      renderer: this.rendererConfig,
      particle: this.particleConfig,
      performance: this.performanceConfig
    }, null, 2)
  }

  /**
   * 导入配置
   */
  importConfig(configJson: string): void {
    try {
      const config = JSON.parse(configJson)
      if (config.renderer) {
        this.rendererConfig = { ...this.rendererConfig, ...config.renderer }
      }
      if (config.particle) {
        this.particleConfig = { ...this.particleConfig, ...config.particle }
      }
      if (config.performance) {
        this.performanceConfig = { ...this.performanceConfig, ...config.performance }
      }
      this.saveToStorage()
      this.logger.info('Configuration imported successfully')
    } catch (error) {
      this.logger.error('Failed to import configuration:', error)
      throw error
    }
  }
}