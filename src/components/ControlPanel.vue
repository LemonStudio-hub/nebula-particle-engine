<template>
  <div class="control-panel" :class="{ 'minimized': isMinimized }">
    <div class="panel-header" @click="toggleMinimize">
      <h3>Nebula Controls</h3>
      <button class="toggle-btn" :aria-expanded="!isMinimized">
        {{ isMinimized ? '▼' : '▲' }}
      </button>
    </div>
    
    <div class="panel-content" v-show="!isMinimized">
      <!-- 粒子数量控制 -->
      <div class="control-group">
        <label>
          粒子数量
          <span class="value">{{ particleCount }}</span>
        </label>
        <input
          type="range"
          min="100"
          max="100000"
          step="100"
          v-model.number="particleCount"
          @input="updateParticleCount"
        >
      </div>

      <!-- 发射器位置 X -->
      <div class="control-group">
        <label>
          发射器 X
          <span class="value">{{ emitterPosition.x }}</span>
        </label>
        <input
          type="range"
          min="-50"
          max="50"
          step="1"
          v-model.number="emitterPosition.x"
          @input="updateEmitterPosition"
        >
      </div>

      <!-- 发射器位置 Y -->
      <div class="control-group">
        <label>
          发射器 Y
          <span class="value">{{ emitterPosition.y }}</span>
        </label>
        <input
          type="range"
          min="-50"
          max="50"
          step="1"
          v-model.number="emitterPosition.y"
          @input="updateEmitterPosition"
        >
      </div>

      <!-- 发射器位置 Z -->
      <div class="control-group">
        <label>
          发射器 Z
          <span class="value">{{ emitterPosition.z }}</span>
        </label>
        <input
          type="range"
          min="-50"
          max="50"
          step="1"
          v-model.number="emitterPosition.z"
          @input="updateEmitterPosition"
        >
      </div>

      <!-- 粒子大小 -->
      <div class="control-group">
        <label>
          粒子大小
          <span class="value">{{ particleSize }}</span>
        </label>
        <input
          type="range"
          min="0.5"
          max="10"
          step="0.1"
          v-model.number="particleSize"
          @input="updateParticleSize"
        >
      </div>

      <!-- 发射速率 -->
      <div class="control-group">
        <label>
          发射速率
          <span class="value">{{ emitRate }}</span>
        </label>
        <input
          type="range"
          min="0"
          max="1000"
          step="10"
          v-model.number="emitRate"
          @input="updateEmitRate"
        >
      </div>

      <!-- 操作按钮 -->
      <div class="button-group">
        <button
          class="btn btn-primary"
          @click="togglePause"
          :class="{ 'paused': isPaused }"
        >
          {{ isPaused ? '▶ 继续' : '⏸ 暂停' }}
        </button>
        <button class="btn btn-secondary" @click="reset">
          🔄 重置
        </button>
      </div>

      <!-- 性能信息 -->
      <div class="performance-info">
        <div class="perf-item">
          <span>FPS:</span>
          <span class="perf-value">{{ fps }}</span>
        </div>
        <div class="perf-item">
          <span>渲染器:</span>
          <span class="perf-value">{{ rendererType }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// Props
interface Props {
  engine?: any
}

const props = defineProps<Props>()

// 状态
const isMinimized = ref(false)
const isPaused = ref(false)
const particleCount = ref(10000)
const emitterPosition = ref({ x: 0, y: -10, z: 0 })
const particleSize = ref(3)
const emitRate = ref(100)
const fps = ref(0)
const rendererType = ref('Unknown')

// 方法
const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value
}

const updateParticleCount = () => {
  if (!props.engine) {
    console.warn('[ControlPanel] Engine not available')
    return
  }

  const particleSystem = props.engine.getParticleSystem()
  if (!particleSystem) {
    console.warn('[ControlPanel] Particle system not available')
    return
  }

  try {
    // 更新粒子系统配置
    const currentConfig = particleSystem.getConfig()
    particleSystem.updateConfig({
      maxParticles: particleCount.value,
      initialParticles: Math.min(particleCount.value, currentConfig.initialParticles)
    })

    // 重置粒子系统以应用新配置
    particleSystem.reset()

    console.log(`[ControlPanel] Particle count updated to ${particleCount.value}`)
  } catch (error) {
    console.error('[ControlPanel] Failed to update particle count:', error)
  }
}

const updateEmitterPosition = () => {
  if (!props.engine) {
    console.warn('[ControlPanel] Engine not available')
    return
  }

  const particleSystem = props.engine.getParticleSystem()
  if (!particleSystem) {
    console.warn('[ControlPanel] Particle system not available')
    return
  }

  try {
    // 更新发射器位置
    particleSystem.updateConfig({
      emitter: {
        position: { ...emitterPosition.value }
      }
    })

    console.log('[ControlPanel] Emitter position updated:', emitterPosition.value)
  } catch (error) {
    console.error('[ControlPanel] Failed to update emitter position:', error)
  }
}

const updateParticleSize = () => {
  if (!props.engine) {
    console.warn('[ControlPanel] Engine not available')
    return
  }

  const particleSystem = props.engine.getParticleSystem()
  if (!particleSystem) {
    console.warn('[ControlPanel] Particle system not available')
    return
  }

  try {
    // 更新粒子大小
    particleSystem.updateConfig({
      size: { min: particleSize.value * 0.5, max: particleSize.value },
      emitter: {
        size: { min: particleSize.value * 0.5, max: particleSize.value }
      }
    })

    console.log(`[ControlPanel] Particle size updated to ${particleSize.value}`)
  } catch (error) {
    console.error('[ControlPanel] Failed to update particle size:', error)
  }
}

const updateEmitRate = () => {
  if (!props.engine) {
    console.warn('[ControlPanel] Engine not available')
    return
  }

  const particleSystem = props.engine.getParticleSystem()
  if (!particleSystem) {
    console.warn('[ControlPanel] Particle system not available')
    return
  }

  try {
    // 更新发射速率
    particleSystem.updateConfig({
      emitRate: emitRate.value,
      emitter: {
        rate: emitRate.value
      }
    })

    console.log(`[ControlPanel] Emit rate updated to ${emitRate.value}`)
  } catch (error) {
    console.error('[ControlPanel] Failed to update emit rate:', error)
  }
}

const togglePause = () => {
  isPaused.value = !isPaused.value
  if (props.engine) {
    if (isPaused.value) {
      props.engine.stop()
    } else {
      props.engine.start()
    }
  }
}

const reset = () => {
  console.log('[ControlPanel] Resetting configuration...')

  // 重置所有参数到默认值
  particleCount.value = 10000
  emitterPosition.value = { x: 0, y: -10, z: 0 }
  particleSize.value = 3
  emitRate.value = 100
  isPaused.value = false

  // 重置引擎状态并应用默认配置
  if (props.engine) {
    try {
      const particleSystem = props.engine.getParticleSystem()
      if (particleSystem) {
        // 应用默认配置到粒子系统
        particleSystem.updateConfig({
          maxParticles: 10000,
          initialParticles: 10000,
          emitter: {
            position: { x: 0, y: -10, z: 0 },
            direction: { x: 0, y: 1, z: 0 },
            spread: 45,
            rate: 100,
            size: { min: 1.5, max: 3 }
          }
        })
        // 重置粒子系统
        particleSystem.reset()
      }

      // 停止并重新启动引擎
      props.engine.stop()
      props.engine.start()

      console.log('[ControlPanel] Configuration reset successfully')
    } catch (error) {
      console.error('[ControlPanel] Failed to reset engine:', error)
    }
  }
}

// 性能监控
let perfInterval: number | null = null

onMounted(() => {
  if (props.engine) {
    // 获取渲染器类型
    rendererType.value = props.engine.getRendererType() || 'Unknown'

    // 从引擎获取当前配置
    const particleSystem = props.engine.getParticleSystem()
    if (particleSystem) {
      const config = particleSystem.getConfig()

      // 更新控制面板的值
      particleCount.value = config.maxParticles
      emitRate.value = config.emitRate
      particleSize.value = (config.size.max + config.size.min) / 2

      // 获取发射器配置
      const emitterConfig = particleSystem.emitter?.getConfig()
      if (emitterConfig) {
        emitterPosition.value = { ...emitterConfig.position }
      }
    }

    // 性能监控（优化到 1000ms）
    perfInterval = window.setInterval(() => {
      const metrics = props.engine.getPerformanceMetrics()
      if (metrics) {
        fps.value = Math.round(metrics.fps)
      }
    }, 1000)
  }
})

onUnmounted(() => {
  if (perfInterval) {
    clearInterval(perfInterval)
  }
})
</script>

<style scoped>
.control-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 300px;
  background: rgba(15, 15, 35, 0.95);
  border-radius: 12px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  color: #fff;
  font-family: 'Segoe UI', system-ui, sans-serif;
  z-index: 1000;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.control-panel.minimized {
  width: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  user-select: none;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #8B5CF6;
}

.toggle-btn {
  background: transparent;
  border: none;
  color: #8B5CF6;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: rgba(139, 92, 246, 0.1);
}

.panel-content {
  padding: 16px;
}

.control-group {
  margin-bottom: 20px;
}

.control-group label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #E0E7FF;
}

.control-group .value {
  color: #8B5CF6;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.control-group input[type="range"] {
  width: 100%;
  height: 6px;
  background: rgba(139, 92, 246, 0.2);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.control-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #8B5CF6;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.control-group input[type="range"]::-webkit-slider-thumb:hover {
  background: #A78BFA;
  transform: scale(1.2);
}

.button-group {
  display: flex;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #8B5CF6;
  color: white;
}

.btn-primary:hover {
  background: #7C3AED;
}

.btn-primary.paused {
  background: #F59E0B;
}

.btn-primary.paused:hover {
  background: #FBBF24;
}

.btn-secondary {
  background: rgba(139, 92, 246, 0.2);
  color: #E0E7FF;
}

.btn-secondary:hover {
  background: rgba(139, 92, 246, 0.3);
}

.performance-info {
  margin-top: 16px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.perf-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 11px;
  color: #94A3B8;
}

.perf-item:last-child {
  margin-bottom: 0;
}

.perf-value {
  color: #E0E7FF;
  font-family: 'Courier New', monospace;
  font-weight: 500;
}
</style>