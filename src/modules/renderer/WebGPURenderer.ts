import * as THREE from 'three'
import { RendererBase } from './RendererBase'
import { RendererType, RendererConfig } from '@/utils/types/renderer'
import { Logger } from '@/utils/Logger'

/**
 * WebGPU 渲染器实现
 * 使用 Three.js 的 WebGL 渲染器作为降级方案
 * 注意：Three.js 的 WebGPURenderer 还在实验阶段，这里使用 WebGL 实现
 */
export class WebGPURenderer extends RendererBase {
  private readonly logger = Logger.create('WebGPURenderer')
  private renderer: THREE.WebGLRenderer | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null

  constructor(config: RendererConfig) {
    super(config)
  }

  get type(): RendererType {
    return RendererType.WebGPU
  }

  /**
   * 初始化 WebGPU 渲染器
   */
  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    try {
      this.logger.info('Initializing WebGPU renderer (using WebGL fallback)...')

      this._canvas = canvas

      // 创建 WebGL 渲染器（WebGPURenderer 的降级方案）
      this.renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: this.config.antialias,
        alpha: this.config.alpha,
        powerPreference: 'high-performance'
      })

      // 配置渲染器
      const pixelRatio = this.calculatePixelRatio()
      this.renderer.setPixelRatio(pixelRatio)
      this.renderer.setSize(canvas.clientWidth, canvas.clientHeight)
      this.renderer.setPixelRatio(pixelRatio)

      // 创建场景
      this.scene = new THREE.Scene()
      this.scene.background = new THREE.Color(0x000000)

      // 创建相机
      const aspect = canvas.clientWidth / canvas.clientHeight
      this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000)
      this.camera.position.set(0, 0, 50)
      this.camera.lookAt(0, 0, 0)

      this.logger.info('WebGPU renderer initialized successfully')
    } catch (error) {
      this.logger.error('Failed to initialize WebGPU renderer:', error)
      throw error
    }
  }

  /**
   * 调整尺寸
   */
  protected onResize(width: number, height: number): void {
    if (!this.renderer || !this.camera || !this.validateSize(width, height)) {
      return
    }

    const pixelRatio = this.calculatePixelRatio()
    this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(width, height)

    const aspect = width / height
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()

    this.logger.debug(`Renderer resized to ${width}x${height}`)
  }

  /**
   * 渲染一帧
   */
  render(): void {
    if (!this.renderer || !this.scene || !this.camera) {
      this.logger.warn('Renderer not initialized')
      return
    }

    this.renderer.render(this.scene, this.camera)
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.logger.info('Disposing WebGPU renderer...')

    if (this.renderer) {
      this.renderer.dispose()
      this.renderer = null
    }

    if (this.scene) {
      this.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose())
          } else {
            object.material.dispose()
          }
        }
      })
      this.scene = null
    }

    this.camera = null
    this._canvas = null

    this.logger.info('WebGPU renderer disposed')
  }

  /**
   * 获取 Three.js 渲染器实例
   */
  getRenderer(): THREE.WebGLRenderer | null {
    return this.renderer
  }

  /**
   * 获取场景
   */
  getScene(): THREE.Scene | null {
    return this.scene
  }

  /**
   * 获取相机
   */
  getCamera(): THREE.PerspectiveCamera | null {
    return this.camera
  }

  /**
   * 设置背景颜色
   */
  setBackground(color: THREE.Color): void {
    if (this.scene) {
      this.scene.background = color
    }
  }

  /**
   * 添加到场景
   */
  addToScene(object: THREE.Object3D): void {
    if (this.scene) {
      this.scene.add(object)
    }
  }

  /**
   * 从场景移除
   */
  removeFromScene(object: THREE.Object3D): void {
    if (this.scene) {
      this.scene.remove(object)
    }
  }
}