import { IRenderer, RendererType } from '@/utils/types/renderer'
import { ParticleSystem, ParticleSystemConfig } from './particles'
import { RenderPipeline, RenderPipelineConfig } from './renderer/RenderPipeline'
import { RendererFactory } from './renderer/RendererFactory'
import { InteractionManager } from './interaction/InteractionManager'
import { PerformanceMonitor } from './performance/PerformanceMonitor'
import { FallbackManager } from './performance/FallbackManager'
import { AppConfig } from './config/AppConfig'
import { Logger } from '@/utils/Logger'
import * as THREE from 'three'

/**
 * Nebula 粒子引擎主类
 * 整合所有模块，提供统一的 API
 */
export class NebulaEngine {
  private readonly logger = Logger.create('NebulaEngine')
  private config: AppConfig
  private renderer: IRenderer | null = null
  private particleSystem: ParticleSystem | null = null
  private renderPipeline: RenderPipeline | null = null
  private interactionManager: InteractionManager | null = null
  private performanceMonitor: PerformanceMonitor | null = null
  private fallbackManager: FallbackManager | null = null
  private running: boolean = false
  private lastFrameTime: number = 0
  private canvas: HTMLCanvasElement | null = null

  // 预分配的粒子数据数组（避免每帧创建）
  private particlePositions: Float32Array | null = null
  private particleColors: Float32Array | null = null
  private particleSizes: Float32Array | null = null

  constructor() {
    this.config = AppConfig.getInstance()
    this.logger.info('Nebula engine created')
  }

  /**
   * 初始化引擎
   */
  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.logger.info('Initializing Nebula engine...')

    try {
      this.canvas = canvas

      // 创建渲染器
      const rendererFactory = RendererFactory.getInstance()
      this.renderer = await rendererFactory.create({
        canvas,
        ...this.config.getRendererConfig()
      })

      // 创建粒子系统
      const particleConfig = this.config.getParticleConfig()
      this.particleSystem = new ParticleSystem({
        maxParticles: particleConfig.maxCount,
        initialParticles: particleConfig.initialCount,
        emitRate: 100,
        size: particleConfig.size,
        lifetime: particleConfig.lifetime,
        velocity: particleConfig.velocity,
        color: particleConfig.color,
        gravity: particleConfig.gravity,
        drag: particleConfig.drag
      })

      // 调整发射器位置和方向，使粒子可见
      const emitterConfig = {
        mode: 'point' as any,
        position: { x: 0, y: -10, z: 0 },
        direction: { x: 0, y: 1, z: 0 },
        spread: 45,
        rate: 100,
        size: particleConfig.size,
        lifetime: particleConfig.lifetime,
        velocity: {
          x: { min: -5, max: 5 },
          y: { min: 5, max: 15 },
          z: { min: -5, max: 5 }
        },
        color: particleConfig.color,
        gravity: particleConfig.gravity || { x: 0, y: -2, z: 0 },
        drag: particleConfig.drag
      }

      // 更新粒子系统的发射器配置
      if (this.particleSystem.updateConfig) {
        this.particleSystem.updateConfig({
          ...particleConfig,
          emitter: emitterConfig
        })
      }

      // 创建渲染管线
      this.renderPipeline = new RenderPipeline({
        particleCount: particleConfig.maxCount,
        enableColors: true,
        enableSizeAttenuation: true,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
      })

      await this.renderPipeline.initialize(this.renderer)

      // 预分配粒子数据数组
      this.particlePositions = new Float32Array(particleConfig.maxCount * 3)
      this.particleColors = new Float32Array(particleConfig.maxCount * 3)
      this.particleSizes = new Float32Array(particleConfig.maxCount)

      // 创建交互管理器
      this.interactionManager = InteractionManager.getInstance()
      this.interactionManager.initialize(canvas)

      // 创建性能监控器
      this.performanceMonitor = new PerformanceMonitor()

      // 创建降级管理器
      const perfConfig = this.config.getPerformanceConfig()
      this.fallbackManager = new FallbackManager(perfConfig)
      this.fallbackManager.onFallback(this.handleFallback.bind(this))

      this.logger.info('Nebula engine initialized successfully')
    } catch (error) {
      this.logger.error('Failed to initialize Nebula engine:', error)
      throw error
    }
  }

  /**
   * 处理降级
   */
  private handleFallback(strategy: string): void {
    this.logger.warn(`Fallback triggered: ${strategy}`)

    if (!this.particleSystem || !this.config) return

    const currentConfig = this.config.getParticleConfig()

    switch (strategy) {
      case 'reduce_particles':
        // 减少粒子数量
        const newMaxParticles = Math.floor(currentConfig.maxCount * 0.7)
        this.config.setParticleConfig({ maxCount: newMaxParticles })
        this.logger.info(`Reduced particle count to ${newMaxParticles}`)
        break

      case 'switch_renderer':
        // 切换渲染器（需要重新初始化）
        this.logger.info('Switching renderer (requires re-initialization)')
        break
    }
  }

  /**
   * 启动引擎
   */
  start(): void {
    if (this.running) {
      this.logger.warn('Engine already running')
      return
    }

    this.running = true
    this.lastFrameTime = performance.now()
    this.performanceMonitor?.start()

    this.logger.info('Nebula engine started')
    this.renderLoop()
  }

  /**
   * 停止引擎
   */
  stop(): void {
    if (!this.running) {
      this.logger.warn('Engine not running')
      return
    }

    this.running = false
    this.performanceMonitor?.stop()

    this.logger.info('Nebula engine stopped')
  }

  /**
   * 渲染循环
   */
  private renderLoop = (): void => {
    if (!this.running) return

    const currentTime = performance.now()
    const deltaTime = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1) // 限制最大帧时间
    this.lastFrameTime = currentTime

    // 更新粒子系统
    this.particleSystem?.update(deltaTime)

    // 更新渲染数据
    if (this.particleSystem && this.renderPipeline && this.particlePositions && this.particleColors && this.particleSizes) {
      const maxParticles = this.particleSystem.getMaxParticles()
      const particles = this.particleSystem.getActiveParticles()

      // 清空数组
      this.particlePositions.fill(0)
      this.particleColors.fill(0)
      this.particleSizes.fill(0)

      // 填充活跃粒子数据
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        this.particlePositions[i * 3 + 0] = p.position.x
        this.particlePositions[i * 3 + 1] = p.position.y
        this.particlePositions[i * 3 + 2] = p.position.z
        this.particleColors[i * 3 + 0] = p.color.r
        this.particleColors[i * 3 + 1] = p.color.g
        this.particleColors[i * 3 + 2] = p.color.b
        this.particleSizes[i] = p.size
      }

      // 将不活跃粒子移到视野外
      for (let i = particles.length; i < maxParticles; i++) {
        this.particlePositions[i * 3 + 0] = 0
        this.particlePositions[i * 3 + 1] = -1000
        this.particlePositions[i * 3 + 2] = 0
      }

      this.renderPipeline.updateRenderData(this.particlePositions, this.particleColors, this.particleSizes)
    }

    // 渲染
    this.renderer?.render()

    // 更新性能监控
    const particleCount = this.particleSystem?.getActiveCount() || 0
    this.performanceMonitor?.update(particleCount)

    // 检查性能并执行降级
    if (this.performanceMonitor && this.fallbackManager) {
      const metrics = this.performanceMonitor.getCurrentMetrics()
      this.fallbackManager.checkPerformance(metrics)
    }

    // 请求下一帧
    requestAnimationFrame(this.renderLoop)
  }

  /**
   * 获取渲染器
   */
  getRenderer(): IRenderer | null {
    return this.renderer
  }

  /**
   * 获取粒子系统
   */
  getParticleSystem(): ParticleSystem | null {
    return this.particleSystem
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return this.performanceMonitor?.getCurrentMetrics()
  }

  /**
   * 获取渲染器类型
   */
  getRendererType(): RendererType | null {
    return this.renderer?.type || null
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.logger.info('Disposing Nebula engine...')

    this.stop()

    this.renderPipeline?.dispose()
    this.particleSystem?.dispose()
    this.interactionManager?.dispose()
    this.performanceMonitor?.dispose()
    this.renderer?.dispose()

    // 释放预分配的数组
    this.particlePositions = null
    this.particleColors = null
    this.particleSizes = null

    this.renderPipeline = null
    this.particleSystem = null
    this.interactionManager = null
    this.performanceMonitor = null
    this.renderer = null
    this.canvas = null

    this.logger.info('Nebula engine disposed')
  }
}