<template>
  <div class="admin-dashboard">
    <div class="dashboard-header fade-in-down">
      <div class="header-content">
        <h1>Admin Dashboard</h1>
        <p>System Overview and Management</p>
      </div>
      <div class="welcome-message">
        <span>Welcome back, <strong>Admin</strong>! 👋</span>
      </div>
    </div>
    
    <!-- Statistics Cards -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6" v-for="(stat, index) in statCards" :key="stat.label">
        <el-card 
          class="stat-card animate-card" 
          :style="{ animationDelay: `${index * 0.1}s` }"
        >
          <div class="stat-content">
            <div class="stat-icon" :class="stat.iconClass">
              <el-icon size="24"><component :is="stat.icon" /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats[stat.key] }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- Quick Actions -->
    <el-card class="actions-card animate-up" header="Quick Actions">
      <el-row :gutter="16">
        <el-col :span="6" v-for="(action, index) in quickActions" :key="action.label">
          <el-button
            :type="action.type"
            size="large"
            @click="action.handler"
            :loading="action.loading"
            class="action-button pulse-on-hover"
            :style="{ animationDelay: `${0.2 + index * 0.1}s` }"
          >
            <el-icon><component :is="action.icon" /></el-icon>
            {{ action.label }}
          </el-button>
        </el-col>
      </el-row>
    </el-card>
    
    <!-- Recent Activity -->
    <el-row :gutter="20" class="activity-row">
      <el-col :span="12">
        <el-card class="animate-up" header="Recent Workflows" :style="{ animationDelay: '0.4s' }">
          <el-table :data="recentWorkflows" style="width: 100%" :show-header="false" class="hover-table">
            <el-table-column prop="name" label="Workflow">
              <template #default="{ row }">
                <div class="workflow-item">
                  <span class="workflow-name">{{ row.name }}</span>
                  <el-tag
                    :type="getStatusType(row.status)"
                    size="small"
                    effect="light"
                  >
                    {{ row.status }}
                  </el-tag>
                </div>
                <div class="workflow-time">{{ row.lastRun }}</div>
              </template>
            </el-table-column>
          </el-table>
          <div class="view-all-link">
            <el-button text type="primary" @click="router.push('/admin/workflows')">
              View all workflows
              <el-icon class="el-icon--right"><ArrowRight /></el-icon>
            </el-button>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card class="animate-up" header="System Status" :style="{ animationDelay: '0.5s' }">
          <div class="system-status">
            <div v-for="(status, index) in systemStatuses" :key="index" class="status-item" :class="{'status-active': status.active}">
              <span class="status-label">{{ status.label }}:</span>
              <el-tag :type="status.type" size="small" effect="light">{{ status.value }}</el-tag>
            </div>
          </div>
          <div class="storage-progress">
            <div class="storage-header">
              <span>Storage Used:</span>
              <span class="storage-info">{{ formatBytes(stats.storageUsed) }}</span>
            </div>
            <el-progress 
              :percentage="storagePercentage" 
              :stroke-width="10"
              :color="storageProgressColor" 
            ></el-progress>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { systemApi, driveApi, imageApi, workflowApi } from '@/services/api'
import type { SystemStats, Workflow } from '@/types'
import { useRouter } from 'vue-router'
import { 
  UserFilled, 
  Setting, 
  FolderOpened, 
  Picture, 
  User, 
  Check, 
  View, 
  ArrowRight 
} from '@element-plus/icons-vue'

const router = useRouter()

const stats = ref<SystemStats>({
  totalUsers: 0,
  totalImages: 0,
  totalProcessed: 0,
  totalFacesDetected: 0,
  storageUsed: 0
})

const recentWorkflows = ref<Workflow[]>([])
const scanning = ref(false)
const processing = ref(false)

const statCards = [
  { key: 'totalUsers', label: 'Total Users', icon: 'User', iconClass: 'user-icon' },
  { key: 'totalImages', label: 'Total Images', icon: 'Picture', iconClass: 'image-icon' },
  { key: 'totalProcessed', label: 'Processed', icon: 'Check', iconClass: 'processed-icon' },
  { key: 'totalFacesDetected', label: 'Faces Detected', icon: 'View', iconClass: 'face-icon' }
]

const quickActions = computed(() => [
  { 
    label: 'Manage Users', 
    type: 'primary', 
    icon: 'UserFilled', 
    loading: false,
    handler: () => router.push('/admin/users')
  },
  { 
    label: 'System Config', 
    type: 'warning', 
    icon: 'Setting', 
    loading: false,
    handler: () => router.push('/admin/config')
  },
  { 
    label: 'Drive Explorer', 
    type: 'success', 
    icon: 'FolderOpened', 
    loading: false,
    handler: () => router.push('/admin/drive')
  }
])

const systemStatuses = ref([
  { label: 'Google Drive', value: 'Connected', type: 'success', active: true },
  { label: 'DeepFace API', value: 'Online', type: 'success', active: true },
  { label: 'Chatbot (Zalo)', value: 'Configuring', type: 'warning', active: false }
])

// Calculate storage percentage (for demo, assuming 10GB total)
const storagePercentage = computed(() => {
  const totalStorage = 10 * 1024 * 1024 * 1024; // 10GB in bytes
  return Math.min(100, Math.round((stats.value.storageUsed / totalStorage) * 100));
})

// Dynamic color based on storage usage
const storageProgressColor = computed(() => {
  if (storagePercentage.value < 50) return '#67C23A';
  if (storagePercentage.value < 80) return '#E6A23C';
  return '#F56C6C';
})

const loadDashboardData = async () => {
  try {
    const statsData = await systemApi.getSystemStats()
    stats.value = statsData

    const workflows = await workflowApi.getWorkflows()
    // Sort by updatedAt/ lastRun if present and take latest 5
    recentWorkflows.value = workflows
      .sort((a: any, b: any) => {
        const dateA = new Date(a.updatedAt || a.lastRun || a.createdAt || 0).getTime()
        const dateB = new Date(b.updatedAt || b.lastRun || b.createdAt || 0).getTime()
        return dateB - dateA
      })
      .slice(0, 5)
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  }
}

const handleScanDrive = async () => {
  scanning.value = true
  try {
    await driveApi.scanDrive()
    ElMessage({
      message: 'Google Drive scan started successfully',
      type: 'success',
      duration: 3000
    })
    // Refresh data after scan
    setTimeout(() => {
      loadDashboardData()
    }, 2000)
  } catch (error: any) {
    ElMessage({
      message: error.message || 'Failed to start drive scan',
      type: 'error',
      duration: 5000
    })
  } finally {
    scanning.value = false
  }
}

const handleProcessImages = async () => {
  processing.value = true
  try {
    await imageApi.processImages()
    ElMessage({
      message: 'Image processing started successfully',
      type: 'success',
      duration: 3000
    })
    // Refresh data after processing
    setTimeout(() => {
      loadDashboardData()
    }, 2000)
  } catch (error: any) {
    ElMessage({
      message: error.message || 'Failed to start image processing',
      type: 'error',
      duration: 5000
    })
  } finally {
    processing.value = false
  }
}

const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    active: 'success',
    completed: 'success', 
    running: 'warning',
    inactive: 'info',
    error: 'danger'
  }
  return statusMap[status] || 'info'
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

onMounted(() => {
  loadDashboardData()
})
</script>

<style scoped>
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

@keyframes statusPulse {
  0% { box-shadow: 0 0 0 0 rgba(103, 194, 58, 0.4); }
  70% { box-shadow: 0 0 0 5px rgba(103, 194, 58, 0); }
  100% { box-shadow: 0 0 0 0 rgba(103, 194, 58, 0); }
}

.admin-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  opacity: 0;
  animation: fadeIn 0.5s ease-out forwards;
}

.dashboard-header {
  margin-bottom: 32px;
  animation: fadeInDown 0.5s ease-out forwards;
  background: linear-gradient(135deg, #ffffff, #f9f9f9);
  padding: 20px 30px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h1 {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 600;
  color: #333;
  letter-spacing: -0.5px;
}

.header-content p {
  margin: 0;
  color: #666;
  font-size: 16px;
}

.welcome-message {
  font-size: 16px;
  color: #555;
  background-color: #f0f7ff;
  padding: 8px 16px;
  border-radius: 30px;
  border-left: 4px solid #409EFF;
}

.stats-row {
  margin-bottom: 32px;
}

.animate-card {
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
  transition: all 0.3s ease;
}

.animate-up {
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
  transition: all 0.3s ease;
}

.fade-in-down {
  animation: fadeInDown 0.5s ease-out forwards;
}

.stat-card {
  border-radius: 16px;
  border: none;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
}

.stat-card:hover .stat-icon {
  transform: scale(1.1) rotate(5deg);
}

.user-icon { background: linear-gradient(135deg, #409EFF, #2980b9); }
.image-icon { background: linear-gradient(135deg, #67C23A, #27ae60); }
.processed-icon { background: linear-gradient(135deg, #E6A23C, #d35400); }
.face-icon { background: linear-gradient(135deg, #F56C6C, #c0392b); }

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.3s ease;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  line-height: 1;
}

.stat-label {
  color: #666;
  font-size: 14px;
  margin-top: 4px;
}

.actions-card {
  margin-bottom: 32px;
  border-radius: 16px;
  border: none;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  background: linear-gradient(135deg, #ffffff, #f9f9f9);
}

.action-button {
  width: 100%;
  height: 64px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 12px;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.action-button .el-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.pulse-on-hover:hover {
  animation: pulse 1s infinite;
  transform: translateY(-3px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
}

.activity-row {
  margin-bottom: 24px;
}

.workflow-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.workflow-name {
  font-weight: 500;
}

.workflow-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.hover-table :deep(.el-table__row) {
  cursor: pointer;
  transition: all 0.2s ease;
}

.hover-table :deep(.el-table__row:hover) {
  background-color: #f5f7fa;
  transform: translateX(5px);
}

.system-status {
  margin-bottom: 24px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.3s ease;
}

.status-active {
  position: relative;
}

.status-active::before {
  content: '';
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #67C23A;
  position: absolute;
  left: -16px;
  top: 50%;
  transform: translateY(-50%);
  animation: statusPulse 2s infinite;
}

.status-item:last-child {
  border-bottom: none;
}

.status-label {
  font-weight: 500;
  color: #333;
}

.storage-info {
  color: #666;
  font-weight: 500;
}

.storage-progress {
  padding: 12px 0;
}

.storage-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-weight: 500;
}

.view-all-link {
  text-align: center;
  margin-top: 16px;
}

:deep(.el-card__header) {
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
  padding: 16px 20px;
}

:deep(.el-card) {
  border-radius: 12px;
  overflow: hidden;
}

:deep(.el-button.is-text) {
  border-radius: 6px;
  padding: 6px 12px;
  transition: all 0.3s ease;
}

:deep(.el-button.is-text:hover) {
  background: rgba(64, 158, 255, 0.1);
  transform: translateY(-1px);
}

:deep(.el-progress-bar__inner) {
  transition: all 0.8s ease;
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .welcome-message {
    align-self: stretch;
  }
  .stats-row .el-col,
  .actions-card .el-col {
    width: 50%;
    margin-bottom: 16px;
  }
  
  .activity-row .el-col {
    width: 100%;
    margin-bottom: 24px;
  }
}

@media (max-width: 480px) {
  .stats-row .el-col,
  .actions-card .el-col {
    width: 100%;
  }
}
</style> 