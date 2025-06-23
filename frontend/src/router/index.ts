import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// Layouts
import AdminLayout from '@/layouts/AdminLayout.vue'
import UserLayout from '@/layouts/UserLayout.vue'

// Pages
import LoginPage from '@/pages/LoginPage.vue'
import AdminDashboard from '@/pages/admin/AdminDashboard.vue'
import UserManagement from '@/pages/admin/UserManagement.vue'
import WorkflowManagement from '@/pages/admin/WorkflowManagement.vue'
import SystemConfig from '@/pages/admin/SystemConfig.vue'
import UserDashboard from '@/pages/user/UserDashboard.vue'
import ImageGallery from '@/pages/user/ImageGallery.vue'
import ChatbotInterface from '@/pages/user/ChatbotInterface.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, role: 'admin' },
    children: [
      {
        path: '',
        redirect: '/admin/dashboard'
      },
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: AdminDashboard
      },
      {
        path: 'users',
        name: 'UserManagement',
        component: UserManagement
      },
      {
        path: 'workflows',
        name: 'WorkflowManagement',
        component: WorkflowManagement
      },
      {
        path: 'config',
        name: 'SystemConfig',
        component: SystemConfig
      }
    ]
  },
  {
    path: '/user',
    component: UserLayout,
    meta: { requiresAuth: true, role: 'user' },
    children: [
      {
        path: '',
        redirect: '/user/dashboard'
      },
      {
        path: 'dashboard',
        name: 'UserDashboard',
        component: UserDashboard
      },
      {
        path: 'gallery',
        name: 'ImageGallery',
        component: ImageGallery
      },
      {
        path: 'chatbot',
        name: 'ChatbotInterface',
        component: ChatbotInterface
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const userRole = localStorage.getItem('userRole')
  
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.meta.role && to.meta.role !== userRole) {
    next('/login')
  } else {
    next()
  }
})

export default router 