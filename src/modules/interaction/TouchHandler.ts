import { InteractionHandler } from './InteractionHandler'
import { Vector3 } from '@/utils/types/common'
import { InteractionEventType } from '@/utils/types/interaction'

/**
 * 触摸交互处理器
 * 处理触摸移动、点击等交互
 */
export class TouchHandler extends InteractionHandler {
  // @ts-expect-error - reserved for future multi-touch support
  private lastTouchId: number | null = null
  private lastPosition: Vector3 | null = null
  // @ts-expect-error - reserved for future gesture detection
  private touchStartTime: number = 0

  /**
   * 初始化触摸处理器
   */
  initialize(element: HTMLElement): void {
    super.initialize(element)

    if (!this.element) return

    // 注册触摸事件
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false })

    this.logger.info('Touch handler initialized')
  }

  /**
   * 释放资源
   */
  dispose(): void {
    if (!this.element) return

    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this))
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this))
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this))
    this.element.removeEventListener('touchcancel', this.handleTouchCancel.bind(this))

    super.dispose()
  }

  /**
   * 处理触摸开始
   */
  private handleTouchStart(event: TouchEvent): void {
    if (!this.enabled) return

    event.preventDefault()

    const touch = event.touches[0]
    this.lastTouchId = touch.identifier
    this.touchStartTime = Date.now()

    const position: Vector3 = {
      x: touch.clientX,
      y: touch.clientY,
      z: 0
    }

    this.lastPosition = position

    const touchEvent = this.createTouchEvent(InteractionEventType.TOUCH_START, event)
    this.emit(InteractionEventType.TOUCH_START, touchEvent)
  }

  /**
   * 处理触摸移动
   */
  private handleTouchMove(event: TouchEvent): void {
    if (!this.enabled) return

    event.preventDefault()

    const touchEvent = this.createTouchEvent(InteractionEventType.TOUCH_MOVE, event, this.lastPosition || undefined)
    this.emit(InteractionEventType.TOUCH_MOVE, touchEvent)

    const touch = event.touches[0]
    this.lastPosition = {
      x: touch.clientX,
      y: touch.clientY,
      z: 0
    }
  }

  /**
   * 处理触摸结束
   */
  private handleTouchEnd(event: TouchEvent): void {
    if (!this.enabled) return

    event.preventDefault()

    const touchEvent = this.createTouchEvent(InteractionEventType.TOUCH_END, event)
    this.emit(InteractionEventType.TOUCH_END, touchEvent)

    this.lastTouchId = null
    this.lastPosition = null
  }

  /**
   * 处理触摸取消
   */
  private handleTouchCancel(event: TouchEvent): void {
    if (!this.enabled) return

    event.preventDefault()

    this.lastTouchId = null
    this.lastPosition = null
  }
}