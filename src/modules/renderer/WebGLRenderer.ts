import * as THREE from 'three'
import { RendererBase } from './RendererBase'
import { RendererType, RendererConfig } from '@/utils/types/renderer'
import { Logger } from '@/utils/Logger'

/**
 * WebGL 渲染器实现
 * 使用 Three.js 的 WebGLRenderer 进行渲染
 * 作为 WebGPU 的降级方案
 */
export class WebGLRenderer extends RendererBase {
  private readonly logger = Logger.create('WebGLRenderer')
  private renderer: THREE.WebGLRenderer | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null

  constructor(config: RendererConfig) {
    super(config)
  }

  get type(): RendererType {
    return RendererType.WebGL
  }

  /**
   * 初始化 WebGL 渲染器
   */
  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    try {
      this.logger.info('Initializing WebGL renderer...')

      this._canvas = canvas

      // 创建 WebGL 渲染器
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

      // 启用对数深度缓冲
      this.renderer.capabilities.isWebGL2 = true
      this.renderer.setClearColor(0x000000, 1)

      // 创建场景
      this.scene = new THREE.Scene()
      this.scene.background = new THREE.Color(0x000000)

      // 创建相机
      const aspect = canvas.clientWidth / canvas.clientHeight
      this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000)
      this.camera.position.set(0, 0, 50)
      this.camera.lookAt(0, 0, 0)

      this.logger.info('WebGL renderer initialized successfully')
    } catch (error) {
      this.logger.error('Failed to initialize WebGL renderer:', error)
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
    this.logger.info('Disposing WebGL renderer...')

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

    this.logger.info('WebGL renderer disposed')
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
   * 设置清除颜色
   */
  setClearColor(color: number, alpha?: number): void {
    if (this.renderer) {
      this.renderer.setClearColor(color, alpha)
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

  /**
   * 启用自动清除
   */
  setAutoClear(autoClear: boolean): void {
    if (this.renderer) {
      this.renderer.autoClear = autoClear
    }
  }

  /**
   * 获取 WebGL 上下文
   */
  getContext(): WebGL2RenderingContext | null {
    if (this.renderer) {
      return this.renderer.getContext() as WebGL2RenderingContext
    }
    return null
  }
}