import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'

// Import real API
import { authApi } from '@/services/api'

const api = authApi

console.log(`Using REAL API`)

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const loading = ref(false)
  
  // Initialize token from localStorage safely
  if (typeof window !== 'undefined') {
    token.value = localStorage.getItem('token')
  }

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isUser = computed(() => user.value?.role === 'user')

  const login = async (username: string, password: string) => {
    loading.value = true
    try {
      const response = await api.login({ username, password })
      token.value = response.token
      user.value = response.user
      localStorage.setItem('token', response.token)
      localStorage.setItem('userRole', response.user.role)
      return response
    } catch (error) {
      throw error
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
    
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userRole')
  }

  const fetchProfile = async () => {
    if (!token.value) return
    
    try {
      const response = await api.getProfile()
      user.value = response.user
    } catch (error) {
      console.error('Fetch profile error:', error)
      logout()
    }
  }

  return {
    user,
    token,
    loading,
    isAuthenticated,
    isAdmin,
    isUser,
    login,
    logout,
    fetchProfile
  }
}) 