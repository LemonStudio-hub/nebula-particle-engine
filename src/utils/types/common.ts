/**
 * 粒子发射模式
 */
export enum EmitterMode {
  Point = 'point',      // 点发射
  Line = 'line',        // 线发射
  Plane = 'plane',      // 面发射
  Sphere = 'sphere'     // 球体发射
}

/**
 * 粒子渐变类型
 */
export enum GradientType {
  Linear = 'linear',
  Radial = 'radial',
  Random = 'random',
  Speed = 'speed',
  Position = 'position'
}

/**
 * 向量类型
 */
export interface Vector3 {
  x: number
  y: number
  z: number
}

/**
 * 颜色类型
 */
export interface Color3 {
  r: number
  g: number
  b: number
}

/**
 * 颜色4（带透明度）
 */
export interface Color4 extends Color3 {
  a: number
}

/**
 * 粒子属性范围
 */
export interface Range {
  min: number
  max: number
}

/**
 * 向量范围
 */
export interface Vector3Range {
  x: Range
  y: Range
  z: Range
}

/**
 * 颜色范围
 */
export interface ColorRange {
  start: Color3
  end: Color3
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  fps: number
  frameTime: number
  particleCount: number
  memoryUsage?: number
  gpuMemoryUsage?: number
}

import type { RendererType } from './renderer'

/**
 * 渲染器配置
 */
export interface RendererConfig {
  type: RendererType
  antialias: boolean
  pixelRatio: number
  alpha: boolean
}

/**
 * 粒子配置
 */
export interface ParticleConfig {
  maxCount: number
  initialCount: number
  size: Range
  lifetime: Range
  velocity: Vector3Range
  color: ColorRange
  gravity?: Vector3
  drag?: number
}

/**
 * 发射器配置
 */
export interface EmitterConfig {
  mode: EmitterMode
  position: Vector3
  direction: Vector3
  spread: number
  rate: number
  burstCount?: number
}