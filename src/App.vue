<template>
  <div class="nebula-app">
    <NebulaCanvas 
      ref="canvasComponent" 
      @engine-ready="handleEngineReady"
    />
    <ControlPanel v-if="engine" :engine="engine" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import NebulaCanvas from './components/NebulaCanvas.vue'
import ControlPanel from './components/ControlPanel.vue'
import { NebulaEngine } from './modules'

const canvasComponent = ref<InstanceType<typeof NebulaCanvas> | null>(null)
const engine = ref<NebulaEngine | null>(null)

onMounted(async () => {
  // 等待引擎就绪
  // 引擎将通过 emit 事件传递
})

const handleEngineReady = (nebulaEngine: NebulaEngine) => {
  engine.value = nebulaEngine
  console.log('Engine ready:', nebulaEngine)
}

onUnmounted(() => {
  if (engine.value) {
    engine.value.dispose()
    engine.value = null
  }
})
</script>

<style scoped>
.nebula-app {
  width: 100%;
  height: 100%;
}
</style>