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
      <button @click="retry">重试</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { NebulaEngine } from '@/modules'

const canvasContainer = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()
const engine = ref<NebulaEngine | null>(null)
const rendererType = ref<string>('Unknown')
const fps = ref<number>(0)
const particleCount = ref<number>(0)
const rafId = ref<number | null>(null)
const error = ref<boolean>(false)
const errorMessage = ref<string>('')

onMounted(async () => {
  if (!canvas.value) return

  try {
    // 创建引擎实例
    engine.value = new NebulaEngine()

    // 初始化引擎
    await engine.value.initialize(canvas.value)

    // 启动引擎
    engine.value.start()

    // 更新渲染器类型
    rendererType.value = engine.value.getRendererType() || 'Unknown'

    // 定期更新性能指标
    const updateMetrics = () => {
      if (!engine.value) return

      const metrics = engine.value.getPerformanceMetrics()
      if (metrics) {
        fps.value = metrics.fps
        particleCount.value = metrics.particleCount
      }

      rafId.value = requestAnimationFrame(updateMetrics)
    }

    rafId.value = requestAnimationFrame(updateMetrics)

    console.log('Nebula Canvas initialized successfully')
  } catch (err) {
    error.value = true
    errorMessage.value = err instanceof Error ? err.message : 'Unknown error'
    console.error('Failed to initialize Nebula Canvas:', err)
  }
})

const retry = async () => {
  error.value = false
  errorMessage.value = ''
  engine.value = null
  rendererType.value = 'Unknown'
  fps.value = 0
  particleCount.value = 0

  if (rafId.value !== null) {
    cancelAnimationFrame(rafId.value)
    rafId.value = null
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
}

.error-panel h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
}

.error-panel p {
  margin: 0 0 15px 0;
  color: #ffcccc;
}

.error-panel button {
  background: #fff;
  color: #ff0000;
  border: none;
  padding: 8px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
}

.error-panel button:hover {
  background: #ffcccc;
}
</style>