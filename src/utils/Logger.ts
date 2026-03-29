/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

/**
 * 日志配置
 */
export interface LoggerConfig {
  level: LogLevel
  enableTimestamp: boolean
  enableModulePrefix: boolean
}

/**
 * 日志工具类
 * 提供统一的日志输出接口
 */
export class Logger {
  private static config: LoggerConfig = {
    level: LogLevel.INFO,
    enableTimestamp: true,
    enableModulePrefix: true
  }

  private static moduleColors: Map<string, string> = new Map()
  private static isProduction = import.meta.env.MODE === 'production'

  /**
   * 配置日志系统
   */
  static configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 设置日志级别
   */
  static setLevel(level: LogLevel): void {
    this.config.level = level
  }

  /**
   * 获取模块颜色
   */
  private static getModuleColor(module: string): string {
    if (!this.moduleColors.has(module)) {
      const colors = [
        '#00ff00', '#00ffff', '#ff00ff', '#ffff00', '#ff8800', '#8800ff'
      ]
      const colorIndex = this.moduleColors.size % colors.length
      this.moduleColors.set(module, colors[colorIndex])
    }
    return this.moduleColors.get(module)!
  }

  /**
   * 格式化日志消息
   */
  private static formatMessage(module: string, message: string): string {
    let formatted = ''

    if (this.config.enableTimestamp) {
      const timestamp = new Date().toISOString()
      formatted += `[${timestamp}] `
    }

    if (this.config.enableModulePrefix) {
      const color = this.getModuleColor(module)
      formatted += `%c[${module}]%c `
      return [formatted + message, `color: ${color}`, 'color: inherit']
    }

    return formatted + message
  }

  /**
   * 调试日志
   */
  static debug(module: string, message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.DEBUG && typeof console !== 'undefined' && console.debug) {
      const formatted = this.formatMessage(module, message)
      console.debug(formatted, ...args)
    }
  }

  /**
   * 信息日志
   */
  static info(module: string, message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.INFO && typeof console !== 'undefined' && console.info) {
      const formatted = this.formatMessage(module, message)
      console.info(formatted, ...args)
    }
  }

  /**
   * 警告日志
   */
  static warn(module: string, message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.WARN && typeof console !== 'undefined' && console.warn) {
      const formatted = this.formatMessage(module, message)
      console.warn(formatted, ...args)
    }
  }

  /**
   * 错误日志
   */
  static error(module: string, message: string, ...args: any[]): void {
    if (this.config.level <= LogLevel.ERROR && typeof console !== 'undefined' && console.error) {
      const formatted = this.formatMessage(module, message)
      console.error(formatted, ...args)
    }
  }

  /**
   * 创建模块特定的日志器
   */
  static create(module: string): ModuleLogger {
    return new ModuleLogger(module)
  }
}

/**
 * 模块特定的日志器
 */
export class ModuleLogger {
  constructor(private readonly module: string) {}

  debug(message: string, ...args: any[]): void {
    try {
      Logger.debug(this.module, message, ...args)
    } catch (error) {
      // 静默失败，避免日志错误导致应用崩溃
    }
  }

  info(message: string, ...args: any[]): void {
    try {
      Logger.info(this.module, message, ...args)
    } catch (error) {
      // 静默失败，避免日志错误导致应用崩溃
    }
  }

  warn(message: string, ...args: any[]): void {
    try {
      Logger.warn(this.module, message, ...args)
    } catch (error) {
      // 静默失败，避免日志错误导致应用崩溃
    }
  }

  error(message: string, ...args: any[]): void {
    try {
      Logger.error(this.module, message, ...args)
    } catch (error) {
      // 静默失败，避免日志错误导致应用崩溃
    }
  }
}