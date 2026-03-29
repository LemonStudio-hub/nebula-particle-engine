import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
app.mount('#app')

// 移除 loading 指示器
const loading = document.getElementById('loading')
if (loading) {
  loading.remove()
}