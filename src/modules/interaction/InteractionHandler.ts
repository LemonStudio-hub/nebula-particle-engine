import { Vector3 } from '@/utils/types/common'
import { InteractionEventType, InteractionEvent, IInteractionHandler } from '@/utils/types/interaction'
import { Logger } from '@/utils/Logger'

/**
 * 交互事件回调
 */
export type InteractionCallback = (event: InteractionEvent) => void

/**
 * 交互处理器基类
 * 提供交互处理的通用接口
 */
export abstract class InteractionHandler implements IInteractionHandler {
  protected readonly logger = Logger.create('InteractionHandler')
  protected element: HTMLElement | null = null
  protected enabled: boolean = true
  protected callbacks: Map<InteractionEventType, InteractionCallback[]> = new Map()

  /**
   * 初始化交互处理器
   */
  initialize(element: HTMLElement): void {
    this.element = element
    this.logger.info('Interaction handler initialized')
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.element = null
    this.callbacks.clear()
    this.logger.info('Interaction handler disposed')
  }

  /**
   * 启用交互
   */
  enable(): void {
    this.enabled = true
    this.logger.debug('Interaction handler enabled')
  }

  /**
   * 禁用交互
   */
  disable(): void {
    this.enabled = false
    this.logger.debug('Interaction handler disabled')
  }

  /**
   * 注册事件回调
   */
  on(eventType: InteractionEventType, callback: InteractionCallback): void {
    if (!this.callbacks.has(eventType)) {
      this.callbacks.set(eventType, [])
    }
    this.callbacks.get(eventType)!.push(callback)
  }

  /**
   * 移除事件回调
   */
  off(eventType: InteractionEventType, callback: InteractionCallback): void {
    const callbacks = this.callbacks.get(eventType)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index !== -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  /**
   * 触发事件
   */
  protected emit(eventType: InteractionEventType, event: InteractionEvent): void {
    const callbacks = this.callbacks.get(eventType)
    if (callbacks) {
      callbacks.forEach(callback => callback(event))
    }
  }

  /**
   * 从鼠标事件创建交互事件
   */
  protected createMouseEvent(
    eventType: InteractionEventType,
    mouseEvent: MouseEvent,
    lastPosition?: Vector3
  ): InteractionEvent {
    const position: Vector3 = {
      x: mouseEvent.clientX,
      y: mouseEvent.clientY,
      z: 0
    }

    const delta: Vector3 = lastPosition
      ? {
          x: position.x - lastPosition.x,
          y: position.y - lastPosition.y,
          z: 0
        }
      : { x: 0, y: 0, z: 0 }

    return {
      type: eventType,
      position,
      delta,
      timestamp: Date.now()
    }
  }

  /**
   * 从触摸事件创建交互事件
   */
  protected createTouchEvent(
    eventType: InteractionEventType,
    touchEvent: TouchEvent,
    lastPosition?: Vector3
  ): InteractionEvent {
    const touch = touchEvent.touches[0]
    const position: Vector3 = {
      x: touch.clientX,
      y: touch.clientY,
      z: 0
    }

    const delta: Vector3 = lastPosition
      ? {
          x: position.x - lastPosition.x,
          y: position.y - lastPosition.y,
          z: 0
        }
      : { x: 0, y: 0, z: 0 }

    return {
      type: eventType,
      position,
      delta,
      timestamp: Date.now()
    }
  }
}