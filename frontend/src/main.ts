import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Import pre-initialized pinia instance
import { pinia } from './stores/pinia-setup'

// Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)

// Register Element Plus Icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// Install Pinia FIRST before router
app.use(pinia)
app.use(router)
app.use(ElementPlus)

app.mount('#app') 