<template>
  <el-container class="user-layout">
    <el-header class="header">
      <div class="header-left">
        <h2 class="logo">📸 Smart Photo Manager</h2>
      </div>
      
      <div class="header-center">
        <el-menu
          :default-active="$route.path"
          router
          mode="horizontal"
          class="user-menu"
        >
          <el-menu-item index="/user/dashboard">
            <el-icon><House /></el-icon>
            <span>Dashboard</span>
          </el-menu-item>
          
          <el-menu-item index="/user/gallery">
            <el-icon><Picture /></el-icon>
            <span>My Gallery</span>
          </el-menu-item>
          
          <el-menu-item index="/user/chatbot">
            <el-icon><ChatLineRound /></el-icon>
            <span>Chatbot</span>
          </el-menu-item>
        </el-menu>
      </div>
      
      <div class="header-right">
        <el-dropdown @command="handleCommand">
          <span class="user-dropdown">
            <el-avatar :size="32">{{ user?.username?.charAt(0).toUpperCase() }}</el-avatar>
            <span class="username">{{ user?.username }}</span>
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">Profile</el-dropdown-item>
              <el-dropdown-item command="logout" divided>Logout</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>
    
    <el-main class="main-content">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { authStore } from '@/stores/pinia-setup'
import { ElMessage } from 'element-plus'

const router = useRouter()

const user = computed(() => authStore.user.value)

const handleCommand = async (command: string) => {
  if (command === 'logout') {
    try {
      await authStore.logout()
      ElMessage.success('Logged out successfully')
      router.push('/login')
    } catch (error) {
      ElMessage.error('Logout failed')
    }
  } else if (command === 'profile') {
    // TODO: Open profile modal
    ElMessage.info('Profile feature coming soon')
  }
}
</script>

<style scoped>
.user-layout {
  height: 100vh;
}

.header {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.logo {
  color: #409EFF;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.user-menu {
  border: none;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-dropdown:hover {
  background-color: #f5f5f5;
}

.username {
  font-weight: 500;
  color: #333;
}

.main-content {
  background-color: #f8f9fa;
  padding: 24px;
}
</style> 