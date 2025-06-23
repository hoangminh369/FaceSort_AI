<template>
  <div class="mock-api-toggle">
    <el-switch
      v-model="useMockApi"
      active-text="Using Mock API"
      inactive-text="Using Real API"
      inline-prompt
      @change="toggleMockApi"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const useMockApi = ref(true) // Default to mock API

onMounted(() => {
  // Check if there's a stored preference
  const stored = localStorage.getItem('useMockApi')
  if (stored !== null) {
    useMockApi.value = stored === 'true'
  }
})

const toggleMockApi = (value: boolean) => {
  // Store preference
  localStorage.setItem('useMockApi', String(value))
  
  // Reload page to apply changes
  window.location.reload()
}
</script>

<style scoped>
.mock-api-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}
</style> 