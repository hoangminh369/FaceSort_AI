<template>
  <div class="register-container">
    <el-card class="register-card fade-in-up" shadow="always">
      <template #header>
        <div class="register-header">
          <h1 class="logo-animate">📸 Smart Photo Manager</h1>
          <p class="subtitle-animate">Create your account</p>
        </div>
      </template>
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        label-position="top"
        class="register-form"
      >
        <el-form-item label="Username" prop="username">
          <el-input v-model="registerForm.username" placeholder="Enter your username" size="large" prefix-icon="User" />
        </el-form-item>
        <el-form-item label="Email" prop="email">
          <el-input v-model="registerForm.email" placeholder="Enter your email" size="large" prefix-icon="Message" />
        </el-form-item>
        <el-form-item label="Password" prop="password">
          <el-input v-model="registerForm.password" type="password" placeholder="Enter your password" size="large" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item label="Confirm Password" prop="confirmPassword">
          <el-input v-model="registerForm.confirmPassword" type="password" placeholder="Confirm your password" size="large" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" :loading="loading" @click="handleRegister" class="register-button pulse-on-hover">
            {{ loading ? 'Registering...' : 'Register' }}
          </el-button>
        </el-form-item>
      </el-form>
      <div class="login-link fade-in-up">
        <el-divider>Or</el-divider>
        <el-button type="info" class="login-btn" @click="goToLogin" plain block>
          Back to Login
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { authApi } from '@/services/api'

const router = useRouter()
const registerFormRef = ref<FormInstance>()
const loading = ref(false)

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const registerRules: FormRules = {
  username: [
    { required: true, message: 'Please enter username', trigger: 'blur' },
    { min: 3, message: 'Username must be at least 3 characters', trigger: 'blur' }
  ],
  email: [
    { required: true, message: 'Please enter email', trigger: 'blur' },
    { type: 'email', message: 'Please enter a valid email', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Please enter password', trigger: 'blur' },
    { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: 'Please confirm your password', trigger: 'blur' },
    { validator: (rule: any, value: string, callback: any) => {
      if (value !== registerForm.password) {
        callback(new Error('Passwords do not match'))
      } else {
        callback()
      }
    }, trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  if (!registerFormRef.value) return
  await registerFormRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      await authApi.register({
        username: registerForm.username,
        email: registerForm.email,
        password: registerForm.password
      })
      ElMessage({
        message: 'Registration successful! Please login.',
        type: 'success',
        duration: 2000
      })
      router.push('/login')
    } catch (error: any) {
      ElMessage.error(error.response?.data?.error || error.message || 'Registration failed')
    } finally {
      loading.value = false
    }
  })
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes logoAnimation {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes subtitleAnimation {
  0% { opacity: 0; transform: translateY(-10px); }
  100% { opacity: 1; transform: translateY(0); }
}
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  overflow: hidden;
}
.register-card {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2) !important;
  transition: all 0.3s ease;
  overflow: hidden;
}
.fade-in-up {
  animation: fadeInUp 0.8s ease forwards;
}
.register-header {
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
.register-form {
  margin-top: 20px;
}
.register-button {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.3s ease;
}
.pulse-on-hover:hover {
  animation: pulse 0.5s infinite;
  background: linear-gradient(to right, #4d83fb, #3b6af8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 106, 248, 0.3);
}
.login-link {
  margin-top: 24px;
  text-align: center;
}
.login-btn {
  width: 100%;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  margin-top: 8px;
}
@media (max-width: 480px) {
  .register-card {
    max-width: 95%;
  }
}
</style> 