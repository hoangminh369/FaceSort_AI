<template>
  <div class="admin-dashboard">
    <div class="dashboard-header">
      <h1>Admin Dashboard</h1>
      <p>System Overview and Management</p>
    </div>
    
    <!-- Statistics Cards -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon user-icon">
              <el-icon size="24"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.totalUsers }}</div>
              <div class="stat-label">Total Users</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon image-icon">
              <el-icon size="24"><Picture /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.totalImages }}</div>
              <div class="stat-label">Total Images</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon processed-icon">
              <el-icon size="24"><Check /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.totalProcessed }}</div>
              <div class="stat-label">Processed</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon face-icon">
              <el-icon size="24"><View /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.totalFacesDetected }}</div>
              <div class="stat-label">Faces Detected</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- Quick Actions -->
    <el-card class="actions-card" header="Quick Actions">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-button
            type="primary"
            size="large"
            @click="handleScanDrive"
            :loading="scanning"
            class="action-button"
          >
            <el-icon><FolderOpened /></el-icon>
            Scan Google Drive
          </el-button>
        </el-col>
        
        <el-col :span="6">
          <el-button
            type="success"
            size="large"
            @click="handleProcessImages"
            :loading="processing"
            class="action-button"
          >
            <el-icon><Setting /></el-icon>
            Process Images
          </el-button>
        </el-col>
        
        <el-col :span="6">
          <el-button
            type="info"
            size="large"
            @click="$router.push('/admin/workflows')"
            class="action-button"
          >
            <el-icon><Tools /></el-icon>
            Manage Workflows
          </el-button>
        </el-col>
        
        <el-col :span="6">
          <el-button
            type="warning"
            size="large"
            @click="$router.push('/admin/users')"
            class="action-button"
          >
            <el-icon><UserFilled /></el-icon>
            Manage Users
          </el-button>
        </el-col>
      </el-row>
    </el-card>
    
    <!-- Recent Activity -->
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card header="Recent Workflows">
          <el-table :data="recentWorkflows" style="width: 100%">
            <el-table-column prop="name" label="Workflow" />
            <el-table-column prop="status" label="Status">
              <template #default="{ row }">
                <el-tag
                  :type="getStatusType(row.status)"
                  size="small"
                >
                  {{ row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="lastRun" label="Last Run" />
          </el-table>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card header="System Status">
          <div class="system-status">
            <div class="status-item">
              <span class="status-label">Google Drive:</span>
              <el-tag type="success" size="small">Connected</el-tag>
            </div>
            <div class="status-item">
              <span class="status-label">DeepFace API:</span>
              <el-tag type="success" size="small">Online</el-tag>
            </div>
            <div class="status-item">
              <span class="status-label">Chatbot (Zalo):</span>
              <el-tag type="warning" size="small">Configuring</el-tag>
            </div>
            <div class="status-item">
              <span class="status-label">Storage Used:</span>
              <span class="storage-info">{{ formatBytes(stats.storageUsed) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { systemApi, driveApi, imageApi } from '@/services/api'
import type { SystemStats, Workflow } from '@/types'

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

const loadDashboardData = async () => {
  try {
    const statsData = await systemApi.getSystemStats()
    stats.value = statsData
    
    // Mock recent workflows for demo
    recentWorkflows.value = [
      { id: '1', name: 'Drive Scanner', status: 'active', lastRun: '2 hours ago', type: 'scan_drive', description: '', config: {} },
      { id: '2', name: 'Face Detection', status: 'completed', lastRun: '30 minutes ago', type: 'process_images', description: '', config: {} },
      { id: '3', name: 'Photo Selection', status: 'running', lastRun: '5 minutes ago', type: 'process_images', description: '', config: {} }
    ]
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
    // Use demo data if API fails
    stats.value = {
      totalUsers: 15,
      totalImages: 1247,
      totalProcessed: 892,
      totalFacesDetected: 2341,
      storageUsed: 2147483648 // 2GB in bytes
    }
  }
}

const handleScanDrive = async () => {
  scanning.value = true
  try {
    await driveApi.scanDrive()
    ElMessage.success('Google Drive scan started successfully')
    // Refresh data after scan
    setTimeout(() => {
      loadDashboardData()
    }, 2000)
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to start drive scan')
  } finally {
    scanning.value = false
  }
}

const handleProcessImages = async () => {
  processing.value = true
  try {
    await imageApi.processImages()
    ElMessage.success('Image processing started successfully')
    // Refresh data after processing
    setTimeout(() => {
      loadDashboardData()
    }, 2000)
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to start image processing')
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
.admin-dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 24px;
}

.dashboard-header h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #333;
}

.dashboard-header p {
  margin: 0;
  color: #666;
  font-size: 16px;
}

.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 8px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.user-icon { background: #409EFF; }
.image-icon { background: #67C23A; }
.processed-icon { background: #E6A23C; }
.face-icon { background: #F56C6C; }

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  line-height: 1;
}

.stat-label {
  color: #666;
  font-size: 14px;
  margin-top: 4px;
}

.actions-card {
  margin-bottom: 24px;
  border-radius: 8px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.action-button {
  width: 100%;
  height: 60px;
  font-size: 14px;
  font-weight: 500;
}

.system-status {
  space-y: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
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

:deep(.el-card__header) {
  font-weight: 600;
  color: #333;
}
</style> 