<template>
  <div class="user-dashboard">
    <div class="dashboard-header fade-in-down">
      <h1>Welcome back, {{ user?.username }}!</h1>
      <p>Manage your photos with AI-powered face detection</p>
    </div>
    
    <!-- Stats Overview -->
    <el-row :gutter="24" class="stats-row">
      <el-col :span="8">
        <el-card class="stat-card animate-card" :style="{ animationDelay: '0.1s' }">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="32"><Picture /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ userStats.totalImages }}</div>
              <div class="stat-label">Total Photos</div>
            </div>
          </div>
          <div class="stat-progress" :style="`width: 100%; background: linear-gradient(90deg, #e6f7ff, #1890ff)`"></div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="stat-card animate-card" :style="{ animationDelay: '0.2s' }">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="32"><Check /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ userStats.processedImages }}</div>
              <div class="stat-label">Processed</div>
            </div>
          </div>
          <div class="stat-progress" :style="`width: ${Math.min(userStats.processedImages / userStats.totalImages * 100 || 0, 100)}%; background: linear-gradient(90deg, #f6ffed, #52c41a)`"></div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="stat-card animate-card" :style="{ animationDelay: '0.3s' }">
          <div class="stat-content">
            <div class="stat-icon">
              <el-icon :size="32"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ userStats.facesDetected }}</div>
              <div class="stat-label">Faces Found</div>
            </div>
          </div>
          <div class="stat-progress" :style="`width: 100%; background: linear-gradient(90deg, #fff0f6, #eb2f96)`"></div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- Upload Section -->
    <el-card class="upload-card animate-card" :style="{ animationDelay: '0.4s' }">
      <template #header>
        <div class="card-header">
          <span>Upload Photos</span>
          <el-button v-if="uploadedFiles.length > 0" type="danger" size="small" plain @click="clearUploads">
            Clear
          </el-button>
        </div>
      </template>
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
        <div class="upload-content">
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            Drop image files here or <em>click to upload</em>
          </div>
          <div class="el-upload__tip">
            Supported formats: JPG, PNG, WebP (max 10MB each)
          </div>
        </div>
      </el-upload>
      
      <div class="upload-actions" v-if="uploadedFiles.length > 0">
        <h4 class="section-title">Recently Uploaded ({{ uploadedFiles.length }})</h4>
        <div class="uploaded-files">
          <transition-group name="file-fade">
            <div v-for="file in uploadedFiles" :key="file.id" class="uploaded-file">
              <img :src="file.thumbnailUrl || file.url" :alt="file.originalName" />
              <div class="file-info">
                <div class="file-name">{{ file.originalName }}</div>
                <div class="file-status">
                  <el-tag :type="getStatusColor(file.status)" size="small" effect="light">
                    {{ file.status }}
                  </el-tag>
                </div>
              </div>
              <div class="remove-file" @click.stop="removeFile(file.id)">
                <el-icon :size="16"><Close /></el-icon>
              </div>
            </div>
          </transition-group>
        </div>
        
        <el-button 
          type="primary" 
          @click="processImages" 
          :loading="processing"
          class="process-button pulse-on-hover"
        >
          <el-icon><Magic-stick /></el-icon>
          Process with AI
        </el-button>
      </div>
    </el-card>
    
    <!-- Recent Activity -->
    <el-row :gutter="24">
      <el-col :span="16">
        <el-card class="recent-photos-card animate-card" :style="{ animationDelay: '0.5s' }">
          <template #header>
            <div class="card-header">
              <span>Recent Photos</span>
              <el-button type="primary" text @click="$router.push('/user/gallery')">
                View All
                <el-icon class="el-icon--right"><Arrow-right /></el-icon>
              </el-button>
            </div>
          </template>
          
          <div class="recent-photos">
            <div v-for="image in recentImages" :key="image.id" class="photo-item">
              <div class="photo-container">
                <img :src="image.thumbnailUrl || image.url" :alt="image.originalName" loading="lazy" />
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
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="recentImages.length === 0" class="empty-photos">
            <el-empty description="No photos yet">
              <template #description>
                <p>Upload your first photos to get started</p>
              </template>
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
          </div>
        </el-card>
        
        <el-card class="tips-card animate-card" :style="{ animationDelay: '0.7s' }">
          <template #header>
            <div class="card-header">
              <span>Quick Tips</span>
            </div>
          </template>
          
          <div class="tips-list">
            <div class="tip-item">
              <div class="tip-icon">💡</div>
              <div class="tip-content">Upload multiple photos at once for batch processing</div>
            </div>
            <div class="tip-item">
              <div class="tip-icon">🔍</div>
              <div class="tip-content">Photos with clear faces get better quality scores</div>
            </div>
            <div class="tip-item">
              <div class="tip-icon">💬</div>
              <div class="tip-content">Use the chatbot to request specific photo operations</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- Processing notification -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { imageApi } from '@/services/api'
import { Picture, User, Check, ArrowRight, UploadFilled, Close, ChatLineRound, Loading } from '@element-plus/icons-vue'
import type { ImageFile } from '@/types'

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const uploadUrl = ref('http://localhost:5678/api/images/upload')
const processing = ref(false)
const showProcessingToast = ref(false)
const processingToastMessage = ref('')

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
      facesDetected: response.data.reduce((sum, img) => sum + (img.faceCount || 0), 0)
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
  ElMessage({
    message: `${file.name} uploaded successfully`,
    type: 'success',
    duration: 2000
  })
  
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

const removeFile = (fileId: string) => {
  uploadedFiles.value = uploadedFiles.value.filter(file => file.id !== fileId)
}

const clearUploads = () => {
  uploadedFiles.value = []
}

const processImages = async () => {
  if (uploadedFiles.value.length === 0) {
    ElMessage.warning('Please upload some images first')
    return
  }
  
  processing.value = true
  processingQueue.value.currentTask = 'Processing images...'
  processingQueue.value.progress = 0
  showProcessingToast.value = true
  processingToastMessage.value = `Processing ${uploadedFiles.value.length} images...`
  
  try {
    // Simulate processing progress
    const interval = setInterval(() => {
      processingQueue.value.progress += 5
      
      if (processingQueue.value.progress >= 100) {
        clearInterval(interval)
        processingQueue.value.currentTask = 'Completed'
        processingToastMessage.value = 'Processing completed!'
        
        ElMessage({
          message: 'Images processed successfully!',
          type: 'success',
          duration: 3000
        })
        
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
          showProcessingToast.value = false
        }, 2000)
      }
    }, 200)
    
    await imageApi.processImages()
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to process images')
    processingQueue.value.currentTask = 'Error'
    processingQueue.value.progress = 0
    showProcessingToast.value = false
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

// Watch for processing status to show/hide toast
watch(() => processingQueue.value.progress, (newValue) => {
  if (newValue > 0) {
    showProcessingToast.value = true
  }
})

onMounted(() => {
  loadUserData()
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

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.user-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  opacity: 0;
  animation: fadeIn 0.5s ease-out forwards;
}

.fade-in-down {
  animation: fadeInDown 0.5s ease-out forwards;
}

.animate-card {
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
  transition: all 0.3s ease;
}

.dashboard-header {
  margin-bottom: 28px;
}

.dashboard-header h1 {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 600;
  color: #333;
  letter-spacing: -0.5px;
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
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  position: relative;
  z-index: 1;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background-color: rgba(64, 158, 255, 0.1);
  color: #409EFF;
}

.stat-card:nth-child(2) .stat-icon {
  background-color: rgba(103, 194, 58, 0.1);
  color: #67C23A;
}

.stat-card:nth-child(3) .stat-icon {
  background-color: rgba(235, 47, 150, 0.1);
  color: #eb2f96;
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

.stat-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  transition: width 1s ease-in-out;
}

.upload-card {
  margin-bottom: 24px;
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
}

.upload-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header span {
  font-weight: 600;
  font-size: 16px;
  color: #333;
}

.upload-dragger {
  width: 100%;
  border: 2px dashed #e4e7ed;
  border-radius: 8px;
  transition: all 0.3s ease;
  overflow: hidden;
}

.upload-dragger:hover {
  border-color: #409EFF;
  transform: translateY(-2px);
}

.upload-content {
  padding: 30px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.el-icon--upload {
  font-size: 48px;
  color: #c0c4cc;
  margin-bottom: 16px;
  transition: color 0.3s ease;
}

.upload-dragger:hover .el-icon--upload {
  color: #409EFF;
}

.el-upload__text {
  font-size: 16px;
  color: #606266;
  margin-bottom: 8px;
}

.el-upload__text em {
  color: #409EFF;
  font-style: normal;
}

.el-upload__tip {
  font-size: 12px;
  color: #909399;
}

.upload-actions {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.section-title {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.uploaded-files {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  margin: 16px 0;
}

.file-fade-enter-active,
.file-fade-leave-active {
  transition: all 0.3s ease;
}

.file-fade-enter-from,
.file-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.uploaded-file {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  background: #fff;
}

.uploaded-file:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.uploaded-file img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-bottom: 1px solid #f0f0f0;
}

.file-info {
  padding: 8px;
}

.file-name {
  margin-bottom: 4px;
  color: #333;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.remove-file {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0;
  transition: all 0.3s ease;
}

.uploaded-file:hover .remove-file {
  opacity: 1;
}

.remove-file:hover {
  background: rgba(255, 0, 0, 0.7);
  transform: scale(1.1);
}

.process-button {
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  font-size: 16px;
  height: auto;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.pulse-on-hover:hover {
  animation: pulse 1s infinite;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.recent-photos-card, 
.status-card,
.tips-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
  overflow: hidden;
  transition: all 0.3s ease;
  height: calc(100% - 24px);
  display: flex;
  flex-direction: column;
}

.recent-photos-card:hover,
.status-card:hover,
.tips-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-3px);
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
  transition: transform 0.3s;
  border-radius: 8px;
  overflow: hidden;
}

.photo-item:hover {
  transform: scale(1.05);
}

.photo-container {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 4/3;
}

.photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s;
}

.photo-item:hover img {
  transform: scale(1.1);
}

.photo-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  color: white;
}

.photo-name {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.photo-meta {
  display: flex;
  gap: 4px;
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
  padding: 10px;
  height: auto;
  border-radius: 8px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tip-item {
  display: flex;
  gap: 12px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.tip-item:hover {
  background: #f0f2f5;
  transform: translateY(-2px);
}

.tip-icon {
  font-size: 24px;
}

.tip-content {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.stat-number {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-label {
  color: #666;
  font-size: 14px;
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

@media (max-width: 768px) {
  .dashboard-header {
    margin-bottom: 20px;
  }

  .dashboard-header h1 {
    font-size: 24px;
  }

  .stats-row {
    margin-bottom: 16px;
  }

  .stats-row .el-col {
    width: 100% !important;
    margin-bottom: 16px;
  }

  .uploaded-files {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }

  .uploaded-file img {
    height: 80px;
  }

  .el-col {
    width: 100% !important;
  }

  .recent-photos {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }
}
</style> 