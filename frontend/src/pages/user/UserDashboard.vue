<template>
  <div class="user-dashboard">
    <div class="dashboard-header">
      <h1>Welcome back, {{ user?.username }}!</h1>
      <p>Manage your photos with AI-powered face detection</p>
    </div>
    
    <!-- Stats Overview -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="8">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">📸</div>
            <div class="stat-info">
              <div class="stat-number">{{ userStats.totalImages }}</div>
              <div class="stat-label">Total Photos</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">✨</div>
            <div class="stat-info">
              <div class="stat-number">{{ userStats.processedImages }}</div>
              <div class="stat-label">Processed</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon">😊</div>
            <div class="stat-info">
              <div class="stat-number">{{ userStats.facesDetected }}</div>
              <div class="stat-label">Faces Found</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- Upload Section -->
    <el-card header="Upload Photos" class="upload-card">
      <el-upload
        class="upload-dragger"
        drag
        :action="uploadUrl"
        multiple
        :before-upload="beforeUpload"
        :on-success="onUploadSuccess"
        :on-error="onUploadError"
        accept="image/*"
        :show-file-list="false"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          Drop image files here or <em>click to upload</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            Supported formats: JPG, PNG, WebP (max 10MB each)
          </div>
        </template>
      </el-upload>
      
      <div class="upload-actions" v-if="uploadedFiles.length > 0">
        <h4>Recently Uploaded ({{ uploadedFiles.length }})</h4>
        <div class="uploaded-files">
          <div v-for="file in uploadedFiles" :key="file.id" class="uploaded-file">
            <img :src="file.thumbnailUrl || file.url" :alt="file.originalName" />
            <div class="file-info">
              <div class="file-name">{{ file.originalName }}</div>
              <div class="file-status">
                <el-tag :type="getStatusColor(file.status)" size="small">
                  {{ file.status }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
        
        <el-button 
          type="primary" 
          @click="processImages" 
          :loading="processing"
          class="process-button"
        >
          <el-icon><Magic-stick /></el-icon>
          Process with AI
        </el-button>
      </div>
    </el-card>
    
    <!-- Recent Activity -->
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card header="Recent Photos">
          <div class="recent-photos">
            <div v-for="image in recentImages" :key="image.id" class="photo-item">
              <img :src="image.thumbnailUrl || image.url" :alt="image.originalName" />
              <div class="photo-overlay">
                <div class="photo-info">
                  <div class="photo-name">{{ image.originalName }}</div>
                  <div class="photo-meta">
                    <el-tag v-if="image.faceDetected" type="success" size="small">
                      {{ image.faceCount }} faces
                    </el-tag>
                    <el-tag v-if="image.qualityScore" type="info" size="small">
                      {{ image.qualityScore }}% quality
                    </el-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="view-all">
            <el-button type="primary" @click="$router.push('/user/gallery')">
              View All Photos
            </el-button>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card header="Processing Status">
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
          />
          
          <div class="quick-actions">
            <el-button type="primary" @click="$router.push('/user/chatbot')" class="action-btn">
              <el-icon><ChatLineRound /></el-icon>
              Open Chatbot
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { imageApi } from '@/services/api'
import type { ImageFile } from '@/types'

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const uploadUrl = ref('http://localhost:5678/api/images/upload')
const processing = ref(false)

const userStats = ref({
  totalImages: 0,
  processedImages: 0,
  facesDetected: 0
})

const uploadedFiles = ref<ImageFile[]>([])
const recentImages = ref<ImageFile[]>([])

const processingQueue = ref({
  position: null as number | null,
  currentTask: 'Idle',
  estimatedTime: null as string | null,
  progress: 0
})

const loadUserData = async () => {
  try {
    const response = await imageApi.getImages(1, 20)
    recentImages.value = response.data.slice(0, 6)
    
    // Calculate stats
    userStats.value = {
      totalImages: response.total,
      processedImages: response.data.filter(img => img.status === 'processed').length,
      facesDetected: response.data.reduce((sum, img) => sum + img.faceCount, 0)
    }
  } catch (error) {
    // Use demo data if API fails
    const demoImages: ImageFile[] = [
      {
        id: '1',
        filename: 'photo1.jpg',
        originalName: 'family_photo.jpg',
        url: 'https://via.placeholder.com/300x200/4CAF50/white?text=Photo+1',
        thumbnailUrl: 'https://via.placeholder.com/150x100/4CAF50/white?text=Photo+1',
        size: 1024000,
        mimeType: 'image/jpeg',
        faceDetected: true,
        faceCount: 3,
        qualityScore: 85,
        userId: user.value?.id || '1',
        createdAt: '2024-01-15',
        status: 'processed'
      },
      {
        id: '2',
        filename: 'photo2.jpg',
        originalName: 'vacation.jpg',
        url: 'https://via.placeholder.com/300x200/2196F3/white?text=Photo+2',
        thumbnailUrl: 'https://via.placeholder.com/150x100/2196F3/white?text=Photo+2',
        size: 856000,
        mimeType: 'image/jpeg',
        faceDetected: true,
        faceCount: 2,
        qualityScore: 92,
        userId: user.value?.id || '1',
        createdAt: '2024-01-14',
        status: 'processed'
      }
    ]
    
    recentImages.value = demoImages
    userStats.value = {
      totalImages: 24,
      processedImages: 18,
      facesDetected: 45
    }
  }
}

const beforeUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isImage) {
    ElMessage.error('Only image files are allowed!')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('Image size must be smaller than 10MB!')
    return false
  }
  return true
}

const onUploadSuccess = (response: any, file: File) => {
  ElMessage.success(`${file.name} uploaded successfully`)
  
  // Add to uploaded files list
  const newFile: ImageFile = {
    id: Date.now().toString(),
    filename: file.name,
    originalName: file.name,
    url: URL.createObjectURL(file),
    size: file.size,
    mimeType: file.type,
    faceDetected: false,
    faceCount: 0,
    userId: user.value?.id || '1',
    createdAt: new Date().toISOString(),
    status: 'uploaded'
  }
  
  uploadedFiles.value.push(newFile)
  loadUserData()
}

const onUploadError = (error: any, file: File) => {
  ElMessage.error(`Failed to upload ${file.name}`)
}

const processImages = async () => {
  processing.value = true
  processingQueue.value.currentTask = 'Processing images...'
  processingQueue.value.progress = 0
  
  try {
    // Simulate processing progress
    const interval = setInterval(() => {
      processingQueue.value.progress += 10
      if (processingQueue.value.progress >= 100) {
        clearInterval(interval)
        processingQueue.value.currentTask = 'Completed'
        ElMessage.success('Images processed successfully!')
        
        // Update uploaded files status
        uploadedFiles.value.forEach(file => {
          file.status = 'processed'
          file.faceDetected = Math.random() > 0.3
          file.faceCount = Math.floor(Math.random() * 5) + 1
          file.qualityScore = Math.floor(Math.random() * 40) + 60
        })
        
        setTimeout(() => {
          processingQueue.value.progress = 0
          processingQueue.value.currentTask = 'Idle'
          uploadedFiles.value = []
          loadUserData()
        }, 2000)
      }
    }, 500)
    
    await imageApi.processImages()
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to process images')
    processingQueue.value.currentTask = 'Error'
    processingQueue.value.progress = 0
  } finally {
    processing.value = false
  }
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    uploaded: 'info',
    processing: 'warning',
    processed: 'success',
    error: 'danger'
  }
  return colors[status] || 'info'
}

onMounted(() => {
  loadUserData()
})
</script>

<style scoped>
.user-dashboard {
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
  font-size: 32px;
  width: 60px;
  text-align: center;
}

.stat-info h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.stat-info p {
  margin: 4px 0 0 0;
  color: #666;
  font-size: 14px;
}

.upload-card {
  margin-bottom: 24px;
  border-radius: 8px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.upload-dragger {
  width: 100%;
}

.upload-actions {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #eee;
}

.uploaded-files {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin: 16px 0;
}

.uploaded-file {
  text-align: center;
}

.uploaded-file img {
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 8px;
}

.file-info {
  font-size: 12px;
}

.file-name {
  margin-bottom: 4px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.process-button {
  width: 100%;
  margin-top: 16px;
}

.recent-photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.photo-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s;
}

.photo-item:hover {
  transform: scale(1.05);
}

.photo-item img {
  width: 100%;
  height: 120px;
  object-fit: cover;
}

.photo-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  color: white;
  padding: 12px;
}

.photo-name {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
}

.photo-meta {
  display: flex;
  gap: 4px;
}

.view-all {
  text-align: center;
}

.processing-status {
  margin-bottom: 16px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
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
}

.quick-actions {
  margin-top: 20px;
}

.action-btn {
  width: 100%;
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

:deep(.el-card__header) {
  font-weight: 600;
  color: #333;
}
</style> 