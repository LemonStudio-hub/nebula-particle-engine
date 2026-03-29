<template>
  <div class="nebula-canvas" ref="canvasContainer">
    <canvas ref="canvas" v-show="!error"></canvas>
    <div class="info-panel" v-if="!error">
      <div>Renderer: {{ rendererType }}</div>
      <div>FPS: {{ fps }}</div>
      <div>Particles: {{ particleCount }}</div>
    </div>
    <div class="error-panel" v-if="error">
      <h3>初始化失败</h3>
      <p>{{ errorMessage }}</p>
      <p v-if="recoveryAction" class="recovery-hint">💡 {{ recoveryAction }}</p>
      <button @click="retry" class="retry-btn">🔄 重试</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineExpose, defineEmits } from 'vue'
import { NebulaEngine } from '@/modules'
import { errorHandler, ErrorCategory } from '@/utils/ErrorHandler'

// Emits
const emit = defineEmits<{
  'engine-ready': [engine: NebulaEngine]
  'error': [error: { message: string; recoverable: boolean; recoveryAction?: string }]
}>()

// Props
const props = defineProps<{
  modelValue?: boolean // 是否显示
}>()

const canvasContainer = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()
const engine = ref<NebulaEngine | null>(null)
const rendererType = ref<string>('Unknown')
const fps = ref<number>(0)
const particleCount = ref<number>(0)
const rafId = ref<number | null>(null)
const error = ref<boolean>(false)
const errorMessage = ref<string>('')
const recoveryAction = ref<string>('')

onMounted(async () => {
  if (!canvas.value) return

  try {
    console.log('[NebulaCanvas] Initializing Nebula engine...')

    // 创建引擎实例
    engine.value = new NebulaEngine()

    // 初始化引擎
    await engine.value.initialize(canvas.value)

    // 启动引擎
    engine.value.start()

    // 更新渲染器类型
    rendererType.value = engine.value.getRendererType() || 'Unknown'

    // 通知父组件引擎已就绪
    emit('engine-ready', engine.value)

    console.log('[NebulaCanvas] Engine initialized successfully')

    // 定期更新性能指标
    const updateMetrics = () => {
      if (!engine.value) return

      try {
        const metrics = engine.value.getPerformanceMetrics()
        if (metrics) {
          fps.value = metrics.fps
          particleCount.value = metrics.particleCount
        }

        rafId.value = requestAnimationFrame(updateMetrics)
      } catch (err) {
        console.error('[NebulaCanvas] Error updating metrics:', err)
        // 继续运行，不因为性能指标更新失败而停止
      }
    }

    rafId.value = requestAnimationFrame(updateMetrics)
  } catch (err) {
    console.error('[NebulaCanvas] Failed to initialize:', err)

    // 使用错误处理器处理错误
    const errorInfo = errorHandler.handleInitializationError(
      err instanceof Error ? err : new Error('Unknown initialization error'),
      { component: 'NebulaCanvas' }
    )

    error.value = true
    errorMessage.value = errorInfo.message
    recoveryAction.value = errorInfo.recoveryAction || 'Please refresh the page'

    // 通知父组件
    emit('error', {
      message: errorInfo.message,
      recoverable: errorInfo.recoverable,
      recoveryAction: errorInfo.recoveryAction
    })
  }
})

const retry = async () => {
  console.log('[NebulaCanvas] Retrying initialization...')

  error.value = false
  errorMessage.value = ''
  recoveryAction.value = ''
  engine.value = null
  rendererType.value = 'Unknown'
  fps.value = 0
  particleCount.value = 0

  if (rafId.value !== null) {
    cancelAnimationFrame(rafId.value)
    rafId.value = null
  }

  // 清除之前的引擎实例
  if (engine.value) {
    try {
      engine.value.dispose()
    } catch (err) {
      console.error('[NebulaCanvas] Error disposing engine:', err)
    }
  }

  await onMounted()
}

onUnmounted(() => {
  // 取消 RAF 循环
  if (rafId.value !== null) {
    cancelAnimationFrame(rafId.value)
    rafId.value = null
  }

  // 释放引擎
  if (engine.value) {
    engine.value.dispose()
    engine.value = null
  }
  console.log('Nebula Canvas disposed')
})

// 暴露给父组件
defineExpose({
  getEngine: () => engine.value,
  getRendererType: () => rendererType.value,
  getFPS: () => fps.value,
  getParticleCount: () => particleCount.value
})
</script>

<style scoped>
.nebula-canvas {
  width: 100%;
  height: 100%;
  position: relative;
}

.nebula-canvas canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.info-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  pointer-events: none;
}

.info-panel div {
  margin: 2px 0;
}

.error-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 0, 0, 0.9);
  color: #fff;
  padding: 20px;
  border-radius: 8px;
  font-family: Arial, sans-serif;
  font-size: 14px;
  text-align: center;
  max-width: 400px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.error-panel h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
}

.error-panel p {
  margin: 0 0 15px 0;
  color: #ffcccc;
}

.error-panel .recovery-hint {
  background: rgba(255, 255, 255, 0.1);
  padding: 8px;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 13px;
}

.error-panel .retry-btn {
  background: #fff;
  color: #ff0000;
  border: none;
  padding: 10px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.2s;
}

.error-panel .retry-btn:hover {
  background: #ffcccc;
  transform: scale(1.05);
}
</style>