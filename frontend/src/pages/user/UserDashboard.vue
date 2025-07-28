<template>
  <div class="user-dashboard">
    <div class="dashboard-header fade-in-down">
      <el-avatar :size="56" class="user-avatar-header">{{ user?.username?.charAt(0).toUpperCase() }}</el-avatar>
      <div class="header-info">
        <h1>Welcome, {{ user?.username }}!</h1>
        <p>Manage your photos with AI-powered face detection</p>
      </div>
    </div>
    <el-row :gutter="24" class="stats-row">
      <el-col :span="8" v-for="(stat, idx) in statCards" :key="stat.label">
        <el-card class="stat-card animate-card" :style="{ animationDelay: `${0.1 + idx * 0.1}s`, background: stat.bg }">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="36"><component :is="stat.icon" /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="24" class="main-row">
      <el-col :span="16">
        <el-card class="recent-photos-card animate-card" :style="{ animationDelay: '0.5s' }">
          <template #header>
            <div class="card-header">
              <span>Recent Photos</span>
              <el-button type="primary" text @click="$router.push('/user/gallery')">
                View All
                <el-icon class="el-icon--right"><ArrowRight /></el-icon>
              </el-button>
            </div>
          </template>
          <div class="recent-photos" v-loading="loadingImages">
            <div v-for="image in recentImages" :key="image.id" class="photo-item" @click="openImageDetail(image)">
              <div class="photo-container">
                <img :src="getImageUrl(image)" :alt="image.originalName" loading="lazy" @error="onImageError" />
                <div class="photo-overlay">
                  <div class="photo-info">
                    <div class="photo-name">{{ image.originalName }}</div>
                    <div class="photo-meta">
                      <el-tag v-if="image.faceDetected" type="success" size="small" effect="light">
                        {{ image.faceCount }} faces
                      </el-tag>
                      <el-tag v-if="image.qualityScore" type="info" size="small" effect="light">
                        {{ image.qualityScore }}% quality
                      </el-tag>
                      <el-tag :type="getStatusColor(image.status)" size="small" effect="light">
                        {{ image.status }}
                      </el-tag>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="recentImages.length === 0 && !loadingImages" class="empty-photos">
            <el-empty description="No photos yet">
              <template #description>
                <p>Start by uploading your first photos in the <b>Gallery</b>!</p>
              </template>
              <el-button type="primary" @click="$router.push('/user/gallery')">
                Go to Gallery
              </el-button>
            </el-empty>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card header="Processing Status" class="status-card animate-card" :style="{ animationDelay: '0.6s' }">
          <div class="processing-status">
            <div class="status-item">
              <div class="status-label">Queue Position:</div>
              <div class="status-value">{{ processingQueue.position || 'None' }}</div>
            </div>
            <div class="status-item">
              <div class="status-label">Current Task:</div>
              <div class="status-value">{{ processingQueue.currentTask || 'Idle' }}</div>
            </div>
            <div class="status-item">
              <div class="status-label">Estimated Time:</div>
              <div class="status-value">{{ processingQueue.estimatedTime || 'N/A' }}</div>
            </div>
          </div>
          <el-progress 
            v-if="processingQueue.progress > 0"
            :percentage="processingQueue.progress"
            :status="processingQueue.progress === 100 ? 'success' : 'active'"
            :stroke-width="12"
            class="progress-bar"
            :color="customProgressColor"
            :indeterminate="processingQueue.progress > 0 && processingQueue.progress < 100"
          />
          <div class="quick-actions">
            <el-button type="primary" @click="$router.push('/user/chatbot')" class="action-btn pulse-on-hover">
              <el-icon><ChatLineRound /></el-icon>
              Open Chatbot
            </el-button>
            <el-button type="success" @click="$router.push('/user/gallery')" class="action-btn pulse-on-hover">
              <el-icon><Picture /></el-icon>
              View Gallery
            </el-button>
            <el-button v-if="userStats.totalImages > userStats.processedImages" type="warning" @click="processExistingImages" :loading="processingQueue.progress > 0" class="action-btn pulse-on-hover">
              <el-icon><MagicStick /></el-icon>
              Process All
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <div class="processing-toast" :class="{ 'show-toast': showProcessingToast }">
      <div class="toast-content">
        <div class="toast-icon">
          <el-icon :size="24"><Loading /></el-icon>
        </div>
        <div class="toast-message">{{ processingToastMessage }}</div>
        <div class="toast-progress">
          <div class="progress-bar" :style="`width: ${processingQueue.progress}%`"></div>
        </div>
      </div>
    </div>
    <el-dialog
      v-model="imageDetailVisible"
      :title="selectedImage?.originalName"
      width="60%"
      center
      class="image-detail-dialog"
      destroy-on-close
      :modal-append-to-body="false"
      :show-close="true"
      :close-on-click-modal="true"
      :before-close="() => { imageDetailVisible = false }"
      transition="zoom-in-center"
    >
      <div v-if="selectedImage" class="image-detail-content">
        <div class="detail-image">
          <img :src="getImageUrl(selectedImage)" :alt="selectedImage.originalName" />
        </div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="Status">
            <el-tag :type="getStatusColor(selectedImage.status)" effect="light">
              {{ selectedImage.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Size">
            {{ formatFileSize(selectedImage.size) }}
          </el-descriptions-item>
          <el-descriptions-item label="Faces">
            {{ selectedImage.faceDetected ? selectedImage.faceCount : 'None' }}
          </el-descriptions-item>
          <el-descriptions-item label="Quality">
            {{ selectedImage.qualityScore ? selectedImage.qualityScore + '%' : 'N/A' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { imageApi } from '@/services/api'
import { Picture, User, Check, ArrowRight, ChatLineRound, Loading, MagicStick } from '@element-plus/icons-vue'
import type { ImageFile } from '@/types'

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const userStats = ref({
  totalImages: 0,
  processedImages: 0,
  facesDetected: 0
})

const statCards = computed(() => [
  {
    label: 'Total Photos',
    value: userStats.value.totalImages,
    icon: Picture,
    bg: 'linear-gradient(135deg, #e6f7ff, #409EFF 80%)'
  },
  {
    label: 'Processed',
    value: userStats.value.processedImages,
    icon: Check,
    bg: 'linear-gradient(135deg, #f6ffed, #67C23A 80%)'
  },
  {
    label: 'Faces Found',
    value: userStats.value.facesDetected,
    icon: User,
    bg: 'linear-gradient(135deg, #fff0f6, #eb2f96 80%)'
  }
])

const recentImages = ref<ImageFile[]>([])

const processingQueue = ref({
  position: null as number | null,
  currentTask: 'Idle',
  estimatedTime: null as string | null,
  progress: 0
})

const showProcessingToast = ref(false)
const processingToastMessage = ref('')
const imageDetailVisible = ref(false)
const selectedImage = ref<ImageFile | null>(null)
const loadingImages = ref(false)

const customProgressColor = (percentage: number) => {
  if (percentage < 50) return '#409EFF';
  if (percentage < 80) return '#67C23A';
  return '#eb2f96';
}

const loadUserData = async () => {
  loadingImages.value = true
  try {
    const response = await imageApi.getImages(1, 20)
    recentImages.value = (response.data || []).slice(0, 6)
    userStats.value = {
      totalImages: response.total || 0,
      processedImages: (response.data || []).filter(img => img.status === 'processed').length,
      facesDetected: (response.data || []).reduce((sum, img) => sum + (img.faceCount || 0), 0)
    }
  } catch (error: any) {
    ElMessage.error('Failed to load images: ' + (error.message || 'Unknown error'))
    recentImages.value = []
    userStats.value = {
      totalImages: 0,
      processedImages: 0,
      facesDetected: 0
    }
  } finally {
    loadingImages.value = false
  }
}

const getImageUrl = (image: ImageFile) => {
  if (image.url?.startsWith('http')) return image.url
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  return image.thumbnailUrl 
    ? `${baseUrl}${image.thumbnailUrl.startsWith('/') ? '' : '/'}${image.thumbnailUrl}`
    : `${baseUrl}${image.url?.startsWith('/') ? '' : '/'}${image.url}`
}

const openImageDetail = (image: ImageFile) => {
  selectedImage.value = image
  imageDetailVisible.value = true
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    uploaded: 'info',
    processing: 'warning',
    processed: 'success',
    selected: 'primary',
    error: 'danger'
  }
  return colors[status] || 'info'
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const onImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = 'https://via.placeholder.com/300x200/f0f0f0/666?text=Image+Not+Found'
}

const processExistingImages = async () => {
  processingQueue.value.currentTask = 'Processing existing images...'
  processingQueue.value.progress = 0
  showProcessingToast.value = true
  processingToastMessage.value = 'Processing all unprocessed images...'
  try {
    const interval = setInterval(() => {
      processingQueue.value.progress += 10
      if (processingQueue.value.progress >= 100) {
        clearInterval(interval)
        processingQueue.value.currentTask = 'Completed'
        processingToastMessage.value = 'Processing completed!'
        ElMessage.success('Images processing started!')
        setTimeout(() => {
          processingQueue.value.progress = 0
          processingQueue.value.currentTask = 'Idle'
          showProcessingToast.value = false
          loadUserData()
        }, 2000)
      }
    }, 300)
    await imageApi.processImages()
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to process images')
    processingQueue.value.currentTask = 'Error'
    processingQueue.value.progress = 0
    showProcessingToast.value = false
  }
}

onMounted(() => {
  loadUserData()
})
</script>

<style scoped>
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
.user-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 12px 32px 12px;
  opacity: 0;
  animation: fadeIn 0.5s ease-out forwards;
}
.dashboard-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 32px;
  background: linear-gradient(135deg, #f8fbff 60%, #e6f7ff 100%);
  border-radius: 18px;
  padding: 24px 32px;
  box-shadow: 0 2px 12px rgba(64,158,255,0.06);
}
.user-avatar-header {
  background: linear-gradient(135deg, #409EFF, #67C23A);
  color: #fff;
  font-size: 24px;
  font-weight: 700;
}
.header-info h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #333;
  letter-spacing: -0.5px;
}
.header-info p {
  margin: 0;
  color: #666;
  font-size: 15px;
}
.stats-row {
  margin-bottom: 24px;
}
.stat-card {
  border-radius: 16px;
  border: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
  min-height: 110px;
}
.stat-card:hover {
  transform: translateY(-6px) scale(1.03);
  box-shadow: 0 10px 28px rgba(64,158,255,0.13);
}
.stat-content {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 10px 18px 18px;
  position: relative;
  z-index: 1;
}
.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 14px;
  background: rgba(255,255,255,0.7);
  color: #409EFF;
  font-size: 32px;
  box-shadow: 0 2px 8px rgba(64,158,255,0.07);
}
.stat-info .stat-number {
  font-size: 26px;
  font-weight: 700;
  color: #222;
  margin-bottom: 2px;
}
.stat-info .stat-label {
  color: #666;
  font-size: 14px;
}
.main-row {
  margin-bottom: 24px;
}
.recent-photos-card, .status-card {
  border-radius: 16px;
  border: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
  overflow: hidden;
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.recent-photos-card:hover, .status-card:hover {
  box-shadow: 0 10px 28px rgba(64,158,255,0.13);
  transform: translateY(-4px);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 17px;
  font-weight: 600;
  color: #333;
  padding: 8px 0 8px 0;
}
.recent-photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.photo-item {
  position: relative;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.photo-item:hover {
  transform: scale(1.06);
  box-shadow: 0 8px 24px rgba(64,158,255,0.13);
}
.photo-container {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 4/3;
}
.photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s;
  border-radius: 12px;
}
.photo-item:hover img {
  transform: scale(1.12);
}
.photo-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px 8px 8px 8px;
  background: linear-gradient(transparent, rgba(0,0,0,0.75));
  color: white;
  border-radius: 0 0 12px 12px;
}
.photo-name {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.photo-meta {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.empty-photos {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}
.processing-status {
  margin-bottom: 16px;
}
.status-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}
.status-item:last-child {
  border-bottom: none;
}
.status-label {
  font-weight: 500;
  color: #666;
}
.status-value {
  color: #333;
  font-weight: 500;
}
.progress-bar {
  margin: 16px 0;
}
.quick-actions {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.action-btn {
  width: 100%;
  padding: 12px;
  height: auto;
  border-radius: 10px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  font-size: 15px;
  font-weight: 500;
}
.action-btn .el-icon {
  font-size: 20px;
}
.pulse-on-hover:hover {
  animation: pulse 1s infinite;
  transform: translateY(-2px);
  box-shadow: 0 8px 18px rgba(64,158,255,0.13);
}
.image-detail-dialog {
  border-radius: 18px;
  overflow: hidden;
  animation: fadeInUp 0.5s;
}
.image-detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
}
.detail-image {
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
}
.detail-image img {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(64,158,255,0.08);
}
.processing-toast {
  position: fixed;
  bottom: -100px;
  right: 30px;
  transition: all 0.3s ease;
  opacity: 0;
  z-index: 9999;
}
.show-toast {
  bottom: 30px;
  opacity: 1;
}
.toast-content {
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  max-width: 320px;
}
.toast-icon {
  margin-right: 12px;
  color: #409EFF;
}
.toast-message {
  flex: 1;
  font-size: 14px;
  color: #333;
  margin-right: 12px;
  font-weight: 500;
}
.toast-progress {
  width: 100%;
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
}
.toast-progress .progress-bar {
  height: 100%;
  background: #409EFF;
  transition: width 0.3s linear;
}
:deep(.el-card__header) {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}
:deep(.el-card__body) {
  padding: 20px;
  flex: 1;
}
:deep(.el-progress-bar__outer) {
  border-radius: 4px;
  background: #f0f2f5;
}
:deep(.el-progress-bar__inner) {
  border-radius: 4px;
}
:deep(.el-tag) {
  display: flex;
  align-items: center;
  gap: 4px;
}
@media (max-width: 900px) {
  .main-row { flex-direction: column; }
  .el-row.main-row > .el-col { width: 100% !important; margin-bottom: 18px; }
  .dashboard-header { flex-direction: column; align-items: flex-start; gap: 12px; padding: 18px 10px; }
  .recent-photos { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
}
@media (max-width: 600px) {
  .user-dashboard { padding: 8px 2px 16px 2px; }
  .dashboard-header { padding: 12px 4px; border-radius: 10px; }
  .stat-card { min-height: 80px; }
  .stat-content { gap: 10px; padding: 10px 4px 10px 10px; }
  .stat-icon { width: 40px; height: 40px; font-size: 18px; }
  .stat-info .stat-number { font-size: 18px; }
  .main-row { margin-bottom: 10px; }
  .recent-photos-card, .status-card { border-radius: 10px; }
  .photo-item { border-radius: 8px; }
  .photo-container { border-radius: 8px; }
  .photo-overlay { border-radius: 0 0 8px 8px; }
  .image-detail-dialog { border-radius: 10px; }
  .detail-image { padding: 8px; }
}
</style> 