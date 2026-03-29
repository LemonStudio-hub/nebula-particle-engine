/**
 * 全局错误处理器
 * 统一处理应用中的各种错误
 */

export enum ErrorSeverity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical'
}

export enum ErrorCategory {
  Initialization = 'initialization',
  Rendering = 'rendering',
  WebGPU = 'webgpu',
  WebGL = 'webgl',
  Performance = 'performance',
  UserInput = 'user_input',
  Network = 'network',
  Unknown = 'unknown'
}

export interface ErrorInfo {
  id: string
  timestamp: number
  category: ErrorCategory
  severity: ErrorSeverity
  message: string
  details?: string
  stack?: string
  recoverable: boolean
  recoveryAction?: string
  context?: Record<string, any>
}

export type ErrorCallback = (error: ErrorInfo) => void

export class ErrorHandler {
  private static instance: ErrorHandler | null = null
  private callbacks: ErrorCallback[] = []
  private errorHistory: ErrorInfo[] = []
  private maxHistorySize = 50
  private logger = console

  private constructor() {
    this.setupGlobalHandlers()
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  /**
   * 设置全局错误处理器
   */
  private setupGlobalHandlers(): void {
    // 捕获未处理的错误
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.handleError(
          event.message || 'Unknown error',
          ErrorCategory.Unknown,
          ErrorSeverity.High,
          {
            stack: event.error?.stack,
            context: {
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno
            }
          }
        )
      })

      // 捕获未处理的 Promise 拒绝
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(
          event.reason?.message || 'Unhandled promise rejection',
          ErrorCategory.Unknown,
          ErrorSeverity.High,
          {
            stack: event.reason?.stack,
            context: { reason: event.reason }
          }
        )
      })
    }
  }

  /**
   * 注册错误回调
   */
  onError(callback: ErrorCallback): () => void {
    this.callbacks.push(callback)

    // 返回取消注册的函数
    return () => {
      const index = this.callbacks.indexOf(callback)
      if (index > -1) {
        this.callbacks.splice(index, 1)
      }
    }
  }

  /**
   * 处理错误
   */
  handleError(
    message: string,
    category: ErrorCategory = ErrorCategory.Unknown,
    severity: ErrorSeverity = ErrorSeverity.Medium,
    options?: {
      details?: string
      stack?: string
      recoverable?: boolean
      recoveryAction?: string
      context?: Record<string, any>
    }
  ): ErrorInfo {
    const errorInfo: ErrorInfo = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      category,
      severity,
      message,
      details: options?.details,
      stack: options?.stack,
      recoverable: options?.recoverable ?? true,
      recoveryAction: options?.recoveryAction,
      context: options?.context
    }

    // 添加到历史记录
    this.addToHistory(errorInfo)

    // 记录错误
    this.logError(errorInfo)

    // 通知回调
    this.notifyCallbacks(errorInfo)

    return errorInfo
  }

  /**
   * 处理初始化错误
   */
  handleInitializationError(error: Error, context?: Record<string, any>): ErrorInfo {
    return this.handleError(
      `Initialization failed: ${error.message}`,
      ErrorCategory.Initialization,
      ErrorSeverity.Critical,
      {
        details: error.message,
        stack: error.stack,
        recoverable: false,
        recoveryAction: 'Please refresh the page or try a different browser',
        context
      }
    )
  }

  /**
   * 处理 WebGPU 错误
   */
  handleWebGPUError(error: Error, context?: Record<string, any>): ErrorInfo {
    return this.handleError(
      `WebGPU error: ${error.message}`,
      ErrorCategory.WebGPU,
      ErrorSeverity.High,
      {
        details: error.message,
        stack: error.stack,
        recoverable: true,
        recoveryAction: 'Automatically falling back to WebGL',
        context
      }
    )
  }

  /**
   * 处理 WebGL 错误
   */
  handleWebGLError(error: Error, context?: Record<string, any>): ErrorInfo {
    return this.handleError(
      `WebGL error: ${error.message}`,
      ErrorCategory.WebGL,
      ErrorSeverity.Critical,
      {
        details: error.message,
        stack: error.stack,
        recoverable: false,
        recoveryAction: 'Please update your browser or graphics drivers',
        context
      }
    )
  }

  /**
   * 处理渲染错误
   */
  handleRenderingError(error: Error, context?: Record<string, any>): ErrorInfo {
    return this.handleError(
      `Rendering error: ${error.message}`,
      ErrorCategory.Rendering,
      ErrorSeverity.High,
      {
        details: error.message,
        stack: error.stack,
        recoverable: true,
        recoveryAction: 'Try reducing particle count or quality settings',
        context
      }
    )
  }

  /**
   * 处理性能错误
   */
  handlePerformanceError(message: string, context?: Record<string, any>): ErrorInfo {
    return this.handleError(
      `Performance issue: ${message}`,
      ErrorCategory.Performance,
      ErrorSeverity.Medium,
      {
        recoverable: true,
        recoveryAction: 'Reduce particle count or lower quality settings',
        context
      }
    )
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(): ErrorInfo[] {
    return [...this.errorHistory]
  }

  /**
   * 清除错误历史
   */
  clearHistory(): void {
    this.errorHistory = []
  }

  /**
   * 获取最近的错误
   */
  getRecentErrors(count: number = 10): ErrorInfo[] {
    return this.errorHistory.slice(-count)
  }

  /**
   * 生成错误 ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(errorInfo: ErrorInfo): void {
    this.errorHistory.push(errorInfo)

    // 限制历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift()
    }
  }

  /**
   * 记录错误
   */
  private logError(errorInfo: ErrorInfo): void {
    const logMessage = `[${errorInfo.severity.toUpperCase()}] [${errorInfo.category}] ${errorInfo.message}`

    switch (errorInfo.severity) {
      case ErrorSeverity.Low:
        this.logger.info(logMessage)
        break
      case ErrorSeverity.Medium:
        this.logger.warn(logMessage)
        break
      case ErrorSeverity.High:
      case ErrorSeverity.Critical:
        this.logger.error(logMessage, errorInfo)
        break
    }

    if (errorInfo.stack) {
      this.logger.error('Stack trace:', errorInfo.stack)
    }
  }

  /**
   * 通知回调
   */
  private notifyCallbacks(errorInfo: ErrorInfo): void {
    this.callbacks.forEach(callback => {
      try {
        callback(errorInfo)
      } catch (error) {
        this.logger.error('Error in error callback:', error)
      }
    })
  }

  /**
   * 清除所有回调
   */
  clearCallbacks(): void {
    this.callbacks = []
  }
}

// 导出单例实例
export const errorHandler = ErrorHandler.getInstance()