import { MouseHandler } from './MouseHandler'
import { TouchHandler } from './TouchHandler'
import { GestureHandler } from './GestureHandler'
import { InteractionEventType, InteractionEvent } from '@/utils/types/interaction'
import { Logger } from '@/utils/Logger'
import { InteractionCallback } from './InteractionHandler'

/**
 * 交互管理器
 * 统一管理所有交互处理器
 */
export class InteractionManager {
  private static instance: InteractionManager | null = null
  private readonly logger = Logger.create('InteractionManager')
  private mouseHandler: MouseHandler | null = null
  private touchHandler: TouchHandler | null = null
  private gestureHandler: GestureHandler | null = null
  private callbacks: Map<InteractionEventType, InteractionCallback[]> = new Map()
  private element: HTMLElement | null = null

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): InteractionManager {
    if (!InteractionManager.instance) {
      InteractionManager.instance = new InteractionManager()
    }
    return InteractionManager.instance
  }

  /**
   * 初始化交互管理器
   */
  initialize(element: HTMLElement): void {
    if (this.element) {
      this.logger.warn('Interaction manager already initialized, disposing old handlers')
      this.dispose()
    }

    this.element = element

    // 创建交互处理器
    this.mouseHandler = new MouseHandler()
    this.touchHandler = new TouchHandler()
    this.gestureHandler = new GestureHandler()

    // 初始化处理器
    this.mouseHandler.initialize(element)
    this.touchHandler.initialize(element)
    this.gestureHandler.initialize(element)

    // 注册事件回调
    this.registerCallbacks()

    this.logger.info('Interaction manager initialized')
  }

  /**
   * 注册事件回调
   */
  private registerCallbacks(): void {
    const eventTypes: InteractionEventType[] = [
      InteractionEventType.MOUSE_MOVE,
      InteractionEventType.MOUSE_DOWN,
      InteractionEventType.MOUSE_UP,
      InteractionEventType.TOUCH_START,
      InteractionEventType.TOUCH_MOVE,
      InteractionEventType.TOUCH_END,
      InteractionEventType.GESTURE_PINCH,
      InteractionEventType.GESTURE_ROTATE,
      InteractionEventType.GESTURE_PAN
    ]

    eventTypes.forEach(eventType => {
      this.mouseHandler?.on(eventType, this.handleEvent.bind(this))
      this.touchHandler?.on(eventType, this.handleEvent.bind(this))
      this.gestureHandler?.on(eventType, this.handleEvent.bind(this))
    })
  }

  /**
   * 处理事件
   */
  private handleEvent(event: InteractionEvent): void {
    const callbacks = this.callbacks.get(event.type)
    if (callbacks) {
      callbacks.forEach(callback => callback(event))
    }
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
   * 启用所有交互
   */
  enable(): void {
    this.mouseHandler?.enable()
    this.touchHandler?.enable()
    this.gestureHandler?.enable()
    this.logger.debug('All interactions enabled')
  }

  /**
   * 禁用所有交互
   */
  disable(): void {
    this.mouseHandler?.disable()
    this.touchHandler?.disable()
    this.gestureHandler?.disable()
    this.logger.debug('All interactions disabled')
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.mouseHandler?.dispose()
    this.touchHandler?.dispose()
    this.gestureHandler?.dispose()

    this.mouseHandler = null
    this.touchHandler = null
    this.gestureHandler = null

    this.callbacks.clear()
    this.element = null

    this.logger.info('Interaction manager disposed')
  }
}