<template>
  <el-container class="admin-layout">
    <el-aside width="250px" class="sidebar" :class="{ 'collapsed': isCollapsed }">
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
        :collapse="isCollapsed"
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
        
        <el-menu-item index="/admin/drive">
          <el-icon><Folder /></el-icon>
          <span>Drive Explorer</span>
        </el-menu-item>
      </el-menu>
      
      <div class="sidebar-toggler" @click="toggleSidebar">
        <el-icon v-if="isCollapsed"><DArrowRight /></el-icon>
        <el-icon v-else><DArrowLeft /></el-icon>
      </div>
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
          <el-tooltip content="Notifications" placement="bottom">
            <el-badge :value="3" class="notification-badge">
              <el-icon size="20"><Bell /></el-icon>
            </el-badge>
          </el-tooltip>
          
          <el-dropdown @command="handleCommand" trigger="click">
            <span class="user-dropdown">
              <el-avatar :size="32" class="user-avatar">{{ user?.username?.charAt(0).toUpperCase() }}</el-avatar>
              <span class="username">{{ user?.username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon> Profile
                </el-dropdown-item>
                <el-dropdown-item command="settings">
                  <el-icon><Setting /></el-icon> Settings
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon> Logout
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main class="main-content">
        <transition name="fade-transform" mode="out-in">
          <router-view />
        </transition>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Folder } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const isCollapsed = ref(false)

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const currentPageTitle = computed(() => {
  const titleMap: Record<string, string> = {
    '/admin/dashboard': 'Dashboard',
    '/admin/users': 'User Management',
    '/admin/workflows': 'Workflow Management',
    '/admin/config': 'System Configuration',
    '/admin/drive': 'Drive Explorer'
  }
  return titleMap[route.path] || 'Admin'
})

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

const handleCommand = async (command: string) => {
  if (command === 'logout') {
    try {
      await authStore.logout()
      ElMessage({
        message: 'Logged out successfully',
        type: 'success',
        duration: 2000
      })
      router.push('/login')
    } catch (error) {
      ElMessage.error('Logout failed')
    }
  } else if (command === 'profile') {
    ElMessage({
      message: 'Profile feature coming soon',
      type: 'info',
      duration: 2000
    })
  } else if (command === 'settings') {
    ElMessage({
      message: 'Settings feature coming soon',
      type: 'info',
      duration: 2000
    })
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
  position: relative;
  transition: all 0.3s;
  overflow: hidden;
  z-index: 10;
  box-shadow: 2px 0 6px rgba(0, 21, 41, 0.35);
}

.sidebar.collapsed {
  width: 64px !important;
}

.logo {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #434a50;
  margin-bottom: 20px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.logo h2 {
  color: #409EFF;
  margin: 0;
  font-size: 18px;
  white-space: nowrap;
  transition: all 0.3s;
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
  height: 60px;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: all 0.3s;
}

.user-dropdown:hover {
  background-color: #f5f5f5;
}

.username {
  font-weight: 500;
  color: #333;
  margin: 0 4px;
}

.main-content {
  background-color: #f0f2f5;
  padding: 24px;
  overflow-y: auto;
}

.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.3s;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

.sidebar-toggler {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  text-align: center;
  cursor: pointer;
  color: #bfcbd9;
  background-color: #263445;
  padding: 8px 0;
  border-radius: 4px;
  transition: all 0.3s;
  margin: 0 10px;
}

.sidebar-toggler:hover {
  color: #409EFF;
  background-color: #1f2d3d;
}

.user-avatar {
  background: linear-gradient(135deg, #42b983, #33a06f);
  color: #fff;
}

.notification-badge {
  margin-right: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.notification-badge:hover {
  transform: translateY(-2px);
}

.header-left, .header-right {
  display: flex;
  align-items: center;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    height: 100%;
    z-index: 1001;
    transform: translateX(0);
  }
  
  .sidebar.collapsed {
    transform: translateX(-100%);
  }
  
  .username {
    display: none;
  }
}
</style> 