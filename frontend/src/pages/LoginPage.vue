<template>
  <div class="login-container">
    <el-card class="login-card" shadow="always">
      <template #header>
        <div class="login-header">
          <h1>📸 Smart Photo Manager</h1>
          <p>AI-Powered Photo Management System</p>
        </div>
      </template>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        label-position="top"
        class="login-form"
      >
        <el-form-item label="Username" prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="Enter your username"
            size="large"
            prefix-icon="User"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item label="Password" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="Enter your password"
            size="large"
            prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleLogin"
            class="login-button"
          >
            {{ loading ? 'Logging in...' : 'Login' }}
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="demo-accounts">
        <el-divider>Demo Accounts</el-divider>
        <div class="demo-buttons">
          <el-button
            size="small"
            @click="loginAsDemo('admin')"
            :loading="loading"
          >
            Login as Admin
          </el-button>
          <el-button
            size="small"
            @click="loginAsDemo('user')"
            :loading="loading"  
          >
            Login as User
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

const loginFormRef = ref<FormInstance>()
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const loginRules: FormRules = {
  username: [
    { required: true, message: 'Please enter username', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Please enter password', trigger: 'blur' },
    { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    loading.value = true
    try {
      const result = await authStore.login(loginForm.username, loginForm.password)
      
      ElMessage.success('Login successful!')
      
      // Redirect based on role
      if (result.user.role === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/user/dashboard')
      }
    } catch (error: any) {
      ElMessage.error(error.message || 'Login failed')
    } finally {
      loading.value = false
    }
  })
}

const loginAsDemo = async (role: 'admin' | 'user') => {
  const demoAccounts = {
    admin: { username: 'admin', password: 'admin123' },
    user: { username: 'user', password: 'user123' }
  }
  
  loginForm.username = demoAccounts[role].username
  loginForm.password = demoAccounts[role].password
  
  await handleLogin()
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
}

.login-header {
  text-align: center;
  margin-bottom: 20px;
}

.login-header h1 {
  color: #409EFF;
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
}

.login-header p {
  color: #666;
  margin: 0;
  font-size: 14px;
}

.login-form {
  margin-top: 20px;
}

.login-button {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
}

.demo-accounts {
  margin-top: 20px;
}

.demo-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
}

:deep(.el-card__header) {
  padding: 20px 20px 0 20px;
}

:deep(.el-divider__text) {
  font-size: 12px;
  color: #999;
}
</style> 