/**
 * WebGPU 兼容性检测工具类
 * 用于检测 WebGPU 的可用性和功能支持情况
 */

export interface WebGPUCompatResult {
  available: boolean
  supported: boolean
  reason?: string
  adapterInfo?: {
    vendor: string
    architecture: string
    device: string
    description: string
  }
  features: string[]
  limits: {
    maxTextureDimension2D: number
    maxBufferSize: number
    maxStorageBuffersPerShaderStage: number
  }
}

export class WebGPUCompatChecker {
  private static instance: WebGPUCompatChecker | null = null
  private logger = console

  private constructor() {}

  static getInstance(): WebGPUCompatChecker {
    if (!WebGPUCompatChecker.instance) {
      WebGPUCompatChecker.instance = new WebGPUCompatChecker()
    }
    return WebGPUCompatChecker.instance
  }

  /**
   * 检查 WebGPU 是否可用
   */
  async checkCompatibility(): Promise<WebGPUCompatResult> {
    this.logger.info('[WebGPUCompatChecker] Checking WebGPU compatibility...')

    // 检查基本可用性
    const availabilityCheck = this.checkBasicAvailability()
    if (!availabilityCheck.available) {
      return {
        available: false,
        supported: false,
        reason: availabilityCheck.reason,
        features: [],
        limits: {
          maxTextureDimension2D: 0,
          maxBufferSize: 0,
          maxStorageBuffersPerShaderStage: 0
        }
      }
    }

    try {
      // 尝试获取 GPU 适配器
      const adapter = await this.requestAdapter()
      if (!adapter) {
        return {
          available: true,
          supported: false,
          reason: 'Failed to request GPU adapter',
          features: [],
          limits: {
            maxTextureDimension2D: 0,
            maxBufferSize: 0,
            maxStorageBuffersPerShaderStage: 0
          }
        }
      }

      // 获取适配器信息
      let adapterInfo: {
        vendor?: string
        architecture?: string
        device?: string
        description?: string
      } = {}

      if ('requestAdapterInfo' in adapter) {
        try {
          // @ts-expect-error - requestAdapterInfo is a newer API
          adapterInfo = await adapter.requestAdapterInfo()
        } catch (error) {
          this.logger.warn('[WebGPUCompatChecker] Failed to get adapter info:', error)
        }
      }

      // 获取功能支持
      const features = this.getSupportedFeatures(adapter)

      // 获取限制
      const limits = this.getAdapterLimits(adapter)

      // 尝试创建设备
      const device = await adapter.requestDevice()
      if (!device) {
        return {
          available: true,
          supported: false,
          reason: 'Failed to request GPU device',
          adapterInfo: {
            vendor: adapterInfo.vendor || 'Unknown',
            architecture: adapterInfo.architecture || 'Unknown',
            device: adapterInfo.device || 'Unknown',
            description: adapterInfo.description || 'Unknown'
          },
          features,
          limits
        }
      }

      // 测试基本操作
      const canExecute = await this.testBasicOperations(device)
      device.destroy()

      if (!canExecute) {
        return {
          available: true,
          supported: false,
          reason: 'Basic operations test failed',
          adapterInfo: {
            vendor: adapterInfo.vendor || 'Unknown',
            architecture: adapterInfo.architecture || 'Unknown',
            device: adapterInfo.device || 'Unknown',
            description: adapterInfo.description || 'Unknown'
          },
          features,
          limits
        }
      }

      this.logger.info('[WebGPUCompatChecker] WebGPU is fully supported')
      return {
        available: true,
        supported: true,
        adapterInfo: {
          vendor: adapterInfo.vendor || 'Unknown',
          architecture: adapterInfo.architecture || 'Unknown',
          device: adapterInfo.device || 'Unknown',
          description: adapterInfo.description || 'Unknown'
        },
        features,
        limits
      }
    } catch (error) {
      this.logger.error('[WebGPUCompatChecker] Compatibility check failed:', error)
      return {
        available: true,
        supported: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
        features: [],
        limits: {
          maxTextureDimension2D: 0,
          maxBufferSize: 0,
          maxStorageBuffersPerShaderStage: 0
        }
      }
    }
  }

  /**
   * 检查基本可用性
   */
  private checkBasicAvailability(): { available: boolean; reason?: string } {
    if (typeof navigator === 'undefined') {
      return { available: false, reason: 'Navigator API is not available' }
    }

    if (!('gpu' in navigator)) {
      return { available: false, reason: 'WebGPU is not supported in this browser' }
    }

    return { available: true }
  }

  /**
   * 请求 GPU 适配器
   */
  private async requestAdapter(): Promise<GPUAdapter | null> {
    try {
      return await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      })
    } catch (error) {
      this.logger.error('[WebGPUCompatChecker] Failed to request adapter:', error)
      return null
    }
  }

  /**
   * 获取支持的功能
   */
  private getSupportedFeatures(adapter: GPUAdapter): string[] {
    const features: string[] = []

    // 常用功能检查
    const commonFeatures = [
      'timestamp-query',
      'pipeline-statistics-query',
      'texture-compression-bc',
      'texture-compression-etc2',
      'texture-compression-astc',
      'indirect-first-instance'
    ]

    for (const feature of commonFeatures) {
      if (adapter.features.has(feature as GPUFeatureName)) {
        features.push(feature)
      }
    }

    return features
  }

  /**
   * 获取适配器限制
   */
  private getAdapterLimits(adapter: GPUAdapter) {
    const limits = adapter.limits

    return {
      maxTextureDimension2D: limits.maxTextureDimension2D,
      maxBufferSize: limits.maxBufferSize,
      maxStorageBuffersPerShaderStage: limits.maxStorageBuffersPerShaderStage
    }
  }

  /**
   * 测试基本操作
   */
  private async testBasicOperations(device: GPUDevice): Promise<boolean> {
    try {
      // 创建简单的计算管线
      const shaderModule = device.createShaderModule({
        code: `
          @group(0) @binding(0) var<storage, read> input : array<f32>;
          @group(0) @binding(1) var<storage, read_write> output : array<f32>;

          @compute @workgroup_size(1)
          fn main(@builtin(global_invocation_id) id : vec3<u32>) {
            output[id.x] = input[id.x] * 2.0;
          }
        `
      })

      const computePipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: shaderModule,
          entryPoint: 'main'
        }
      })

      // 创建缓冲区
      const inputData = new Float32Array([1, 2, 3, 4])
      const inputBuffer = device.createBuffer({
        size: inputData.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      })

      const outputBuffer = device.createBuffer({
        size: inputData.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_READ
      })

      device.queue.writeBuffer(inputBuffer, 0, inputData)

      // 创建绑定组
      const bindGroup = device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: inputBuffer } },
          { binding: 1, resource: { buffer: outputBuffer } }
        ]
      })

      // 执行计算
      const commandEncoder = device.createCommandEncoder()
      const passEncoder = commandEncoder.beginComputePass()
      passEncoder.setPipeline(computePipeline)
      passEncoder.setBindGroup(0, bindGroup)
      passEncoder.dispatchWorkgroups(4)
      passEncoder.end()
      device.queue.submit([commandEncoder.finish()])

      // 清理
      inputBuffer.destroy()
      outputBuffer.destroy()

      return true
    } catch (error) {
      this.logger.error('[WebGPUCompatChecker] Basic operations test failed:', error)
      return false
    }
  }

  /**
   * 获取推荐的渲染器类型
   */
  async getRecommendedRenderer(): Promise<'webgpu' | 'webgl'> {
    const result = await this.checkCompatibility()

    if (result.supported) {
      return 'webgpu'
    }

    return 'webgl'
  }
}