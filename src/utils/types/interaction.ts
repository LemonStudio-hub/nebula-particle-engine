import { Vector3 } from './common'

/**
 * 交互事件类型
 */
export enum InteractionEventType {
  MOUSE_MOVE = 'mousemove',
  MOUSE_DOWN = 'mousedown',
  MOUSE_UP = 'mouseup',
  TOUCH_START = 'touchstart',
  TOUCH_MOVE = 'touchmove',
  TOUCH_END = 'touchend',
  GESTURE_PINCH = 'pinch',
  GESTURE_ROTATE = 'rotate',
  GESTURE_PAN = 'pan'
}

/**
 * 交互事件数据
 */
export interface InteractionEvent {
  type: InteractionEventType
  position: Vector3
  delta: Vector3
  timestamp: number
}

/**
 * 交互处理器接口
 */
export interface IInteractionHandler {
  initialize(element: HTMLElement): void
  dispose(): void
  enable(): void
  disable(): void
}