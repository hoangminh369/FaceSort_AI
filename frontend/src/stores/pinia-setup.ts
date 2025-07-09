import { createPinia, setActivePinia } from 'pinia'
import { ref, computed, type ComputedRef } from 'vue'
import type { User } from '@/types'
import { authApi } from '@/services/api'

// Create the pinia instance
export const pinia = createPinia()

// Make sure pinia is active
setActivePinia(pinia)

interface AuthStore {
  user: ReturnType<typeof ref<User | null>>,
  token: ReturnType<typeof ref<string | null>>,
  loading: ReturnType<typeof ref<boolean>>,
  isAuthenticated: ComputedRef<boolean>,
  isAdmin: ComputedRef<boolean>,
  isUser: ComputedRef<boolean>,
  login: (username: string, password: string) => Promise<any>,
  logout: () => Promise<void>,
  fetchProfile: () => Promise<void>
}

export const authStore: AuthStore = {
  user: ref<User | null>(null),
  token: ref<string | null>(typeof window !== 'undefined' ? localStorage.getItem('token') : null),
  loading: ref(false),
  
  isAuthenticated: computed(() => !!authStore.token.value),
  isAdmin: computed(() => authStore.user.value?.role === 'admin'),
  isUser: computed(() => authStore.user.value?.role === 'user'),
  
  async login(username: string, password: string) {
    authStore.loading.value = true
    try {
      const response = await authApi.login({ username, password })
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
  
  async logout() {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    authStore.user.value = null
    authStore.token.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userRole')
  },
  
  async fetchProfile() {
    if (!authStore.token.value) return
    
    try {
      const response = await authApi.getProfile()
      authStore.user.value = response.user
    } catch (error) {
      console.error('Fetch profile error:', error)
      authStore.logout()
    }
  }
} 