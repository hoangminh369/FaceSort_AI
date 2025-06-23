import { createPinia, setActivePinia } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { authApi } from '@/services/api'
import { mockAuthApi } from '@/services/mockApi'

// Check localStorage for mock API preference
const useMockApi = localStorage.getItem('useMockApi') !== 'false' // Default to mock API if not set
const api = useMockApi ? mockAuthApi : authApi

// Create the pinia instance
export const pinia = createPinia()

// Make sure pinia is active
setActivePinia(pinia)

// Define the auth store
export const authStore = {
  user: ref<User | null>(null),
  token: ref<string | null>(typeof window !== 'undefined' ? localStorage.getItem('token') : null),
  loading: ref(false),
  
  isAuthenticated: computed(() => !!authStore.token.value),
  isAdmin: computed(() => authStore.user.value?.role === 'admin'),
  isUser: computed(() => authStore.user.value?.role === 'user'),
  
  login: async (username: string, password: string) => {
    authStore.loading.value = true
    try {
      const response = await api.login({ username, password })
      authStore.token.value = response.token
      authStore.user.value = response.user
      localStorage.setItem('token', response.token)
      localStorage.setItem('userRole', response.user.role)
      return response
    } catch (error) {
      throw error
    } finally {
      authStore.loading.value = false
    }
  },
  
  logout: async () => {
    try {
      await api.logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    authStore.user.value = null
    authStore.token.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userRole')
  },
  
  fetchProfile: async () => {
    if (!authStore.token.value) return
    
    try {
      const response = await api.getProfile()
      authStore.user.value = response.user
    } catch (error) {
      console.error('Fetch profile error:', error)
      authStore.logout()
    }
  }
} 