<template>
  <div class="login-container">
    <el-card class="login-card fade-in-up" shadow="always">
      <template #header>
        <div class="login-header">
          <h1 class="logo-animate">📸 Smart Photo Manager</h1>
          <p class="subtitle-animate">AI-Powered Photo Management System</p>
        </div>
      </template>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        label-position="top"
        class="login-form"
      >
        <transition-group name="form-item" appear>
          <el-form-item key="username" label="Username" prop="username">
            <el-input
              v-model="loginForm.username"
              placeholder="Enter your username"
              size="large"
              prefix-icon="User"
              class="input-animate"
              @keyup.enter="handleLogin"
              @focus="handleFocus"
              @blur="handleBlur"
            />
          </el-form-item>
          
          <el-form-item key="password" label="Password" prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="Enter your password"
              size="large"
              prefix-icon="Lock"
              show-password
              class="input-animate"
              @keyup.enter="handleLogin"
              @focus="handleFocus"
              @blur="handleBlur"
            />
          </el-form-item>
          
          <el-form-item key="button">
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              @click="handleLogin"
              class="login-button pulse-on-hover"
            >
              {{ loading ? 'Logging in...' : 'Login' }}
            </el-button>
          </el-form-item>
        </transition-group>
      </el-form>
      
      <div class="register-link fade-in-up">
        <el-divider>Or</el-divider>
        <el-button type="success" class="register-btn" @click="goToRegister" plain block>
          Create a new account
        </el-button>
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

const handleFocus = (event: Event) => {
  const target = event.target as HTMLElement
  const parent = target.closest('.el-form-item') as HTMLElement
  if (parent) {
    parent.classList.add('input-focused')
  }
}

const handleBlur = (event: Event) => {
  const target = event.target as HTMLElement
  const parent = target.closest('.el-form-item') as HTMLElement
  if (parent) {
    parent.classList.remove('input-focused')
  }
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    loading.value = true
    try {
      const result = await authStore.login(loginForm.username, loginForm.password)
      
      ElMessage({
        message: 'Login successful!',
        type: 'success',
        duration: 2000
      })
      
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

const goToRegister = () => {
  router.push('/register')
}
</script>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes logoAnimation {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes subtitleAnimation {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  overflow: hidden;
}

.login-card {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2) !important;
  transition: all 0.3s ease;
  overflow: hidden;
}

.login-card:hover {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
  transform: translateY(-5px);
}

.fade-in-up {
  animation: fadeInUp 0.8s ease forwards;
}

.login-header {
  text-align: center;
  margin-bottom: 20px;
}

.logo-animate {
  color: #409EFF;
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  animation: logoAnimation 0.8s ease-out 0.3s forwards;
  opacity: 0;
}

.subtitle-animate {
  color: #666;
  margin: 0;
  font-size: 14px;
  animation: subtitleAnimation 0.8s ease-out 0.6s forwards;
  opacity: 0;
}

.login-form {
  margin-top: 20px;
}

.form-item-enter-active,
.form-item-leave-active {
  transition: all 0.5s ease;
}

.form-item-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.form-item-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.form-item-move {
  transition: transform 0.5s ease;
}

.input-animate {
  transition: all 0.3s ease;
  border-radius: 8px;
}

.input-animate:hover {
  transform: translateY(-1px);
}

.input-focused {
  transform: translateY(-2px);
}

.input-focused .el-input__wrapper {
  box-shadow: 0 0 0 1px #409EFF !important;
}

.login-button {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  background: linear-gradient(45deg, #4d83fb, #3b6af8);
  border: none;
  transition: all 0.3s ease;
}

.pulse-on-hover:hover {
  animation: pulse 0.5s infinite;
  background: linear-gradient(to right, #4d83fb, #3b6af8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 106, 248, 0.3);
}

.register-link {
  margin-top: 24px;
  text-align: center;
}

.register-btn {
  width: 100%;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  margin-top: 8px;
}
</style> 