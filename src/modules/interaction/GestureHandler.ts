import Hammer from 'hammerjs'
import { InteractionHandler } from './InteractionHandler'
import { Vector3 } from '@/utils/types/common'
import { InteractionEventType } from '@/utils/types/interaction'
import { Logger } from '@/utils/Logger'

/**
 * 手势交互处理器
 * 使用 Hammer.js 处理复杂手势（缩放、旋转、拖拽）
 */
export class GestureHandler extends InteractionHandler {
  private hammer: HammerManager | null = null
  private readonly logger = Logger.create('GestureHandler')

  /**
   * 初始化手势处理器
   */
  initialize(element: HTMLElement): void {
    super.initialize(element)

    if (!this.element) return

    // 创建 Hammer 实例
    this.hammer = new Hammer(this.element)

    // 启用手势识别
    this.hammer.get('pinch').set({ enable: true })
    this.hammer.get('rotate').set({ enable: true })
    this.hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL })

    // 注册手势事件
    this.hammer.on('pinchstart', this.handlePinchStart.bind(this))
    this.hammer.on('pinchmove', this.handlePinchMove.bind(this))
    this.hammer.on('pinchend', this.handlePinchEnd.bind(this))

    this.hammer.on('rotatestart', this.handleRotateStart.bind(this))
    this.hammer.on('rotatemove', this.handleRotateMove.bind(this))
    this.hammer.on('rotateend', this.handleRotateEnd.bind(this))

    this.hammer.on('panstart', this.handlePanStart.bind(this))
    this.hammer.on('panmove', this.handlePanMove.bind(this))
    this.hammer.on('panend', this.handlePanEnd.bind(this))

    this.logger.info('Gesture handler initialized')
  }

  /**
   * 释放资源
   */
  dispose(): void {
    if (this.hammer) {
      this.hammer.destroy()
      this.hammer = null
    }

    super.dispose()
  }

  /**
   * 处理捏合开始
   */
  private handlePinchStart(event: HammerInput): void {
    if (!this.enabled) return

    const position: Vector3 = {
      x: event.center.x,
      y: event.center.y,
      z: 0
    }

    this.emit(InteractionEventType.GESTURE_PINCH, {
      type: InteractionEventType.GESTURE_PINCH,
      position,
      delta: { x: 0, y: 0, z: event.scale - 1 },
      timestamp: Date.now()
    })
  }

  /**
   * 处理捏合移动
   */
  private handlePinchMove(event: HammerInput): void {
    if (!this.enabled) return

    const position: Vector3 = {
      x: event.center.x,
      y: event.center.y,
      z: 0
    }

    this.emit(InteractionEventType.GESTURE_PINCH, {
      type: InteractionEventType.GESTURE_PINCH,
      position,
      delta: { x: 0, y: 0, z: event.scale - 1 },
      timestamp: Date.now()
    })
  }

  /**
   * 处理捏合结束
   */
  private handlePinchEnd(event: HammerInput): void {
    if (!this.enabled) return

    const position: Vector3 = {
      x: event.center.x,
      y: event.center.y,
      z: 0
    }

    this.emit(InteractionEventType.GESTURE_PINCH, {
      type: InteractionEventType.GESTURE_PINCH,
      position,
      delta: { x: 0, y: 0, z: 0 },
      timestamp: Date.now()
    })
  }

  /**
   * 处理旋转开始
   */
  private handleRotateStart(event: HammerInput): void {
    if (!this.enabled) return

    const position: Vector3 = {
      x: event.center.x,
      y: event.center.y,
      z: 0
    }

    this.emit(InteractionEventType.GESTURE_ROTATE, {
      type: InteractionEventType.GESTURE_ROTATE,
      position,
      delta: { x: 0, y: 0, z: event.rotation },
      timestamp: Date.now()
    })
  }

  /**
   * 处理旋转移动
   */
  private handleRotateMove(event: HammerInput): void {
    if (!this.enabled) return

    const position: Vector3 = {
      x: event.center.x,
      y: event.center.y,
      z: 0
    }

    this.emit(InteractionEventType.GESTURE_ROTATE, {
      type: InteractionEventType.GESTURE_ROTATE,
      position,
      delta: { x: 0, y: 0, z: event.rotation },
      timestamp: Date.now()
    })
  }

  /**
   * 处理旋转结束
   */
  private handleRotateEnd(event: HammerInput): void {
    if (!this.enabled) return

    const position: Vector3 = {
      x: event.center.x,
      y: event.center.y,
      z: 0
    }

    this.emit(InteractionEventType.GESTURE_ROTATE, {
      type: InteractionEventType.GESTURE_ROTATE,
      position,
      delta: { x: 0, y: 0, z: 0 },
      timestamp: Date.now()
    })
  }

  /**
   * 处理拖拽开始
   */
  private handlePanStart(event: HammerInput): void {
    if (!this.enabled) return

    const position: Vector3 = {
      x: event.center.x,
      y: event.center.y,
      z: 0
    }

    this.emit(InteractionEventType.GESTURE_PAN, {
      type: InteractionEventType.GESTURE_PAN,
      position,
      delta: { x: 0, y: 0, z: 0 },
      timestamp: Date.now()
    })
  }

  /**
   * 处理拖拽移动
   */
  private handlePanMove(event: HammerInput): void {
    if (!this.enabled) return

    const position: Vector3 = {
      x: event.center.x,
      y: event.center.y,
      z: 0
    }

    this.emit(InteractionEventType.GESTURE_PAN, {
      type: InteractionEventType.GESTURE_PAN,
      position,
      delta: { x: event.deltaX, y: event.deltaY, z: 0 },
      timestamp: Date.now()
    })
  }

  /**
   * 处理拖拽结束
   */
  private handlePanEnd(event: HammerInput): void {
    if (!this.enabled) return

    const position: Vector3 = {
      x: event.center.x,
      y: event.center.y,
      z: 0
    }

    this.emit(InteractionEventType.GESTURE_PAN, {
      type: InteractionEventType.GESTURE_PAN,
      position,
      delta: { x: 0, y: 0, z: 0 },
      timestamp: Date.now()
    })
  }
}