<template>
  <el-container class="admin-layout">
    <el-aside width="250px" class="sidebar">
      <div class="logo">
        <h2>📸 Smart Photo Admin</h2>
      </div>
      
      <el-menu
        :default-active="$route.path"
        router
        class="admin-menu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/admin/dashboard">
          <el-icon><DataBoard /></el-icon>
          <span>Dashboard</span>
        </el-menu-item>
        
        <el-menu-item index="/admin/users">
          <el-icon><User /></el-icon>
          <span>User Management</span>
        </el-menu-item>
        
        <el-menu-item index="/admin/workflows">
          <el-icon><Setting /></el-icon>
          <span>Workflows</span>
        </el-menu-item>
        
        <el-menu-item index="/admin/config">
          <el-icon><Tools /></el-icon>
          <span>System Config</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item to="/admin">Admin</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentPageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
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
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authStore } from '@/stores/pinia-setup'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()

const user = computed(() => authStore.user.value)

const currentPageTitle = computed(() => {
  const titleMap: Record<string, string> = {
    '/admin/dashboard': 'Dashboard',
    '/admin/users': 'User Management',
    '/admin/workflows': 'Workflow Management',
    '/admin/config': 'System Configuration'
  }
  return titleMap[route.path] || 'Admin'
})

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
.admin-layout {
  height: 100vh;
}

.sidebar {
  background-color: #304156;
  color: #bfcbd9;
}

.logo {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #434a50;
  margin-bottom: 20px;
}

.logo h2 {
  color: #409EFF;
  margin: 0;
  font-size: 18px;
}

.admin-menu {
  border: none;
}

.header {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
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
  background-color: #f0f2f5;
  padding: 24px;
}
</style> 