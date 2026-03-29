import { InteractionHandler } from './InteractionHandler'
import { Vector3 } from '@/utils/types/common'
import { InteractionEventType } from '@/utils/types/interaction'

/**
 * 鼠标交互处理器
 * 处理鼠标移动、点击等交互
 */
export class MouseHandler extends InteractionHandler {
  private lastPosition: Vector3 | null = null
  private mouseDownPosition: Vector3 | null = null
  private mouseDownTime: number = 0

  /**
   * 初始化鼠标处理器
   */
  initialize(element: HTMLElement): void {
    super.initialize(element)

    if (!this.element) return

    // 注册鼠标事件
    this.element.addEventListener('mousemove', this.handleMouseMove.bind(this))
    this.element.addEventListener('mousedown', this.handleMouseDown.bind(this))
    this.element.addEventListener('mouseup', this.handleMouseUp.bind(this))
    this.element.addEventListener('mouseleave', this.handleMouseLeave.bind(this))
    this.element.addEventListener('wheel', this.handleWheel.bind(this), { passive: false })

    this.logger.info('Mouse handler initialized')
  }

  /**
   * 释放资源
   */
  dispose(): void {
    if (!this.element) return

    this.element.removeEventListener('mousemove', this.handleMouseMove.bind(this))
    this.element.removeEventListener('mousedown', this.handleMouseDown.bind(this))
    this.element.removeEventListener('mouseup', this.handleMouseUp.bind(this))
    this.element.removeEventListener('mouseleave', this.handleMouseLeave.bind(this))
    this.element.removeEventListener('wheel', this.handleWheel.bind(this))

    super.dispose()
  }

  /**
   * 处理鼠标移动
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.enabled) return

    const mouseEvent = this.createMouseEvent(InteractionEventType.MOUSE_MOVE, event, this.lastPosition || undefined)
    this.emit(InteractionEventType.MOUSE_MOVE, mouseEvent)

    this.lastPosition = {
      x: event.clientX,
      y: event.clientY,
      z: 0
    }
  }

  /**
   * 处理鼠标按下
   */
  private handleMouseDown(event: MouseEvent): void {
    if (!this.enabled) return

    this.mouseDownPosition = {
      x: event.clientX,
      y: event.clientY,
      z: 0
    }
    this.mouseDownTime = Date.now()

    const mouseEvent = this.createMouseEvent(InteractionEventType.MOUSE_DOWN, event)
    this.emit(InteractionEventType.MOUSE_DOWN, mouseEvent)
  }

  /**
   * 处理鼠标释放
   */
  private handleMouseUp(event: MouseEvent): void {
    if (!this.enabled) return

    const mouseEvent = this.createMouseEvent(InteractionEventType.MOUSE_UP, event)
    this.emit(InteractionEventType.MOUSE_UP, mouseEvent)

    this.mouseDownPosition = null
    this.mouseDownTime = 0
  }

  /**
   * 处理鼠标离开
   */
  private handleMouseLeave(event: MouseEvent): void {
    if (!this.enabled) return

    this.lastPosition = null
    this.mouseDownPosition = null
    this.mouseDownTime = 0
  }

  /**
   * 处理鼠标滚轮
   */
  private handleWheel(event: WheelEvent): void {
    if (!this.enabled) return

    event.preventDefault()

    const position: Vector3 = {
      x: event.clientX,
      y: event.clientY,
      z: 0
    }

    const delta: Vector3 = {
      x: 0,
      y: 0,
      z: event.deltaY
    }

    this.emit(InteractionEventType.MOUSE_MOVE, {
      type: InteractionEventType.MOUSE_MOVE,
      position,
      delta,
      timestamp: Date.now()
    })
  }
}