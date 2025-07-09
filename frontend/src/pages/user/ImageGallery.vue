<template>
  <div class="image-gallery">
    <div class="gallery-header fade-in-down">
      <h1>My Photo Gallery</h1>
      <div class="gallery-controls">
        <el-input
          v-model="searchQuery"
          placeholder="Search photos..."
          :prefix-icon="Search"
          style="width: 200px"
          @input="handleSearch"
          class="search-input"
        />
        <el-select v-model="statusFilter" placeholder="Filter by status" style="width: 150px" class="filter-select">
          <el-option label="All Photos" value="" />
          <el-option label="Uploaded" value="uploaded" />
          <el-option label="Processing" value="processing" />
          <el-option label="Processed" value="processed" />
          <el-option label="Selected" value="selected" />
        </el-select>
        <el-switch
          v-model="showOnlyWithFaces"
          active-text="With Faces"
          inactive-text="All Photos"
          class="face-switch"
        />
      </div>
    </div>
    
    <!-- Stats Bar -->
    <div class="stats-bar animate-card" :style="{ animationDelay: '0.1s' }">
      <div class="stat-item">
        <span class="stat-icon">🖼️</span>
        <span class="stat-label">Total:</span>
        <span class="stat-value">{{ filteredImages.length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">😊</span>
        <span class="stat-label">With Faces:</span>
        <span class="stat-value">{{ imagesWithFaces }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">⭐</span>
        <span class="stat-label">High Quality:</span>
        <span class="stat-value">{{ highQualityImages }}</span>
      </div>
    </div>
    
    <!-- Image Grid -->
    <div class="image-grid animate-card" :style="{ animationDelay: '0.2s' }" v-loading="loading">
      <transition-group name="image-fade">
        <div
          v-for="image in paginatedImages"
          :key="image.id"
          class="image-item"
          @click="openLightbox(image)"
        >
          <div class="image-container">
            <img
              :src="image.thumbnailUrl || image.url"
              :alt="image.originalName"
              @load="onImageLoad"
              @error="onImageError"
              loading="lazy"
            />
            
            <!-- Image Overlay -->
            <div class="image-overlay">
              <div class="image-actions">
                <el-button size="small" type="primary" @click.stop="downloadImage(image)" class="action-btn">
                  <el-icon><Download /></el-icon>
                </el-button>
                <el-button size="small" type="danger" @click.stop="deleteImage(image.id)" class="action-btn">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
            
            <!-- Status Badge -->
            <div class="status-badge">
              <el-tag :type="getStatusColor(image.status)" size="small" effect="light">
                {{ image.status }}
              </el-tag>
            </div>
            
            <!-- Face Count Badge -->
            <div v-if="image.faceDetected" class="face-badge">
              <el-tag type="success" size="small" effect="light">
                <el-icon><User /></el-icon>
                {{ image.faceCount }}
              </el-tag>
            </div>
            
            <!-- Quality Score -->
            <div v-if="image.qualityScore" class="quality-score">
              <el-tag :type="getQualityColor(image.qualityScore)" size="small" effect="light">
                {{ image.qualityScore }}%
              </el-tag>
            </div>
          </div>
          
          <div class="image-info">
            <div class="image-name" :title="image.originalName">
              {{ image.originalName }}
            </div>
            <div class="image-meta">
              {{ formatFileSize(image.size) }} • {{ formatDate(image.createdAt) }}
            </div>
          </div>
        </div>
      </transition-group>
      
      <!-- Empty state -->
      <div v-if="paginatedImages.length === 0 && !loading" class="empty-gallery">
        <el-empty description="No images found" :image-size="200">
          <template #description>
            <span>No images matching your current filters</span>
          </template>
          <el-button type="primary" @click="resetFilters">Reset Filters</el-button>
        </el-empty>
      </div>
    </div>
    
    <!-- Pagination -->
    <div class="pagination-container animate-card" :style="{ animationDelay: '0.3s' }">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[12, 24, 48, 96]"
        :total="filteredImages.length"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>
    
    <!-- Lightbox Modal -->
    <el-dialog
      v-model="lightboxVisible"
      :title="selectedImage?.originalName"
      width="80%"
      center
      class="lightbox-dialog"
      destroy-on-close
    >
      <div v-if="selectedImage" class="lightbox-content">
        <div class="lightbox-image">
          <img :src="selectedImage.url" :alt="selectedImage.originalName" />
        </div>
        
        <div class="lightbox-info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="Filename">
              {{ selectedImage.originalName }}
            </el-descriptions-item>
            <el-descriptions-item label="Size">
              {{ formatFileSize(selectedImage.size) }}
            </el-descriptions-item>
            <el-descriptions-item label="Type">
              {{ selectedImage.mimeType }}
            </el-descriptions-item>
            <el-descriptions-item label="Status">
              <el-tag :type="getStatusColor(selectedImage.status)" effect="light">
                {{ selectedImage.status }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="Faces Detected">
              {{ selectedImage.faceDetected ? selectedImage.faceCount : 'None' }}
            </el-descriptions-item>
            <el-descriptions-item label="Quality Score">
              {{ selectedImage.qualityScore ? selectedImage.qualityScore + '%' : 'N/A' }}
            </el-descriptions-item>
            <el-descriptions-item label="Upload Date">
              {{ formatDate(selectedImage.createdAt) }}
            </el-descriptions-item>
          </el-descriptions>
          
          <div class="lightbox-actions">
            <el-button type="primary" @click="downloadImage(selectedImage)" class="pulse-on-hover">
              <el-icon><Download /></el-icon>
              Download
            </el-button>
            <el-button type="success" @click="processSelectedImage" class="pulse-on-hover">
              <el-icon><Magic-stick /></el-icon>
              Reprocess
            </el-button>
            <el-button type="danger" @click="deleteImage(selectedImage.id)">
              <el-icon><Delete /></el-icon>
              Delete
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>
    
    <!-- Toast notification for successful actions -->
    <div class="action-toast" :class="{ 'show-toast': showToast }">
      <el-icon :size="20" :class="toastIcon"></el-icon>
      <span>{{ toastMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Download, Delete, User } from '@element-plus/icons-vue'
import { imageApi } from '@/services/api'
import type { ImageFile } from '@/types'

const loading = ref(false)
const images = ref<ImageFile[]>([])
const searchQuery = ref('')
const statusFilter = ref('')
const showOnlyWithFaces = ref(false)
const currentPage = ref(1)
const pageSize = ref(24)
const lightboxVisible = ref(false)
const selectedImage = ref<ImageFile | null>(null)
const showToast = ref(false)
const toastMessage = ref('')
const toastIcon = ref('')

const filteredImages = computed(() => {
  let filtered = images.value

  // Search filter
  if (searchQuery.value) {
    filtered = filtered.filter(img =>
      img.originalName.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  // Status filter
  if (statusFilter.value) {
    filtered = filtered.filter(img => img.status === statusFilter.value)
  }

  // Face detection filter
  if (showOnlyWithFaces.value) {
    filtered = filtered.filter(img => img.faceDetected)
  }

  return filtered
})

const paginatedImages = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredImages.value.slice(start, end)
})

const imagesWithFaces = computed(() => {
  return images.value.filter(img => img.faceDetected).length
})

const highQualityImages = computed(() => {
  return images.value.filter(img => img.qualityScore && img.qualityScore >= 80).length
})

const loadImages = async () => {
  loading.value = true
  try {
    const response = await imageApi.getImages(1, 1000) // Load all for demo
    images.value = response.data
  } catch (error) {
    // Use demo data if API fails
    images.value = generateDemoImages()
  } finally {
    setTimeout(() => {
      loading.value = false
    }, 500) // Add small delay for animation effect
  }
}

const generateDemoImages = (): ImageFile[] => {
  const demoImages: ImageFile[] = []
  const statuses: Array<'uploaded' | 'processing' | 'processed' | 'selected'> = ['uploaded', 'processing', 'processed', 'selected']
  
  for (let i = 1; i <= 50; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const faceDetected = Math.random() > 0.3
    const faceCount = faceDetected ? Math.floor(Math.random() * 5) + 1 : 0
    const qualityScore = status === 'processed' ? Math.floor(Math.random() * 40) + 60 : undefined
    
    demoImages.push({
      id: i.toString(),
      filename: `photo${i}.jpg`,
      originalName: `photo_${i}_${['family', 'vacation', 'party', 'nature', 'portrait'][Math.floor(Math.random() * 5)]}.jpg`,
      url: `https://picsum.photos/800/600?random=${i}`,
      thumbnailUrl: `https://picsum.photos/300/200?random=${i}`,
      size: Math.floor(Math.random() * 5000000) + 500000, // 0.5-5MB
      mimeType: 'image/jpeg',
      faceDetected,
      faceCount,
      qualityScore,
      userId: '1',
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      status
    })
  }
  
  return demoImages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

const handleSearch = () => {
  currentPage.value = 1 // Reset to first page when searching
}

const resetFilters = () => {
  searchQuery.value = ''
  statusFilter.value = ''
  showOnlyWithFaces.value = false
  currentPage.value = 1
  
  // Show toast notification
  showToastNotification('Filters reset', 'Check')
}

const openLightbox = (image: ImageFile) => {
  selectedImage.value = image
  lightboxVisible.value = true
}

const downloadImage = async (image: ImageFile) => {
  try {
    // Create download link
    const link = document.createElement('a')
    link.href = image.url
    link.download = image.originalName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Show toast notification
    showToastNotification('Download started', 'Download')
  } catch (error) {
    ElMessage.error('Download failed')
  }
}

const deleteImage = async (imageId: string) => {
  try {
    await ElMessageBox.confirm('Are you sure you want to delete this image?', 'Confirm Delete', {
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
      cancelButtonText: 'Cancel',
      confirmButtonText: 'Yes, Delete'
    })
    
    await imageApi.deleteImage(imageId)
    
    // Remove from local array
    images.value = images.value.filter(img => img.id !== imageId)
    
    // Show toast notification
    showToastNotification('Image deleted successfully', 'Delete')
    
    lightboxVisible.value = false
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || 'Delete failed')
    }
  }
}

const processSelectedImage = async () => {
  if (!selectedImage.value) return
  
  try {
    // Show toast notification
    showToastNotification('Processing image...', 'Loading')
    
    // Simulate processing
    selectedImage.value.status = 'processing'
    
    setTimeout(() => {
      if (selectedImage.value) {
        selectedImage.value.status = 'processed'
        selectedImage.value.faceDetected = Math.random() > 0.2
        selectedImage.value.faceCount = selectedImage.value.faceDetected ? Math.floor(Math.random() * 5) + 1 : 0
        selectedImage.value.qualityScore = Math.floor(Math.random() * 40) + 60
        
        // Show success notification
        showToastNotification('Image processed successfully', 'SuccessFilled')
      }
    }, 3000)
  } catch (error: any) {
    ElMessage.error(error.message || 'Processing failed')
  }
}

const showToastNotification = (message: string, icon: string) => {
  toastMessage.value = message
  toastIcon.value = icon
  showToast.value = true
  
  setTimeout(() => {
    showToast.value = false
  }, 3000)
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

const getQualityColor = (score: number) => {
  if (score >= 90) return 'success'
  if (score >= 70) return 'warning'
  return 'danger'
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const onImageLoad = () => {
  // Handle successful image load
}

const onImageError = (event: Event) => {
  // Handle image load error
  const img = event.target as HTMLImageElement
  img.src = 'https://via.placeholder.com/300x200/f0f0f0/666?text=Image+Not+Found'
}

// Watch for filter changes to reset pagination
watch([statusFilter, showOnlyWithFaces], () => {
  currentPage.value = 1
})

onMounted(() => {
  loadImages()
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

@keyframes toastIn {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

.image-gallery {
  max-width: 1400px;
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
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.gallery-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: #333;
  letter-spacing: -0.5px;
}

.gallery-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 20px;
  transition: all 0.3s ease;
}

.search-input:focus-within :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #409EFF !important;
  transform: translateY(-2px);
}

.filter-select :deep(.el-input__wrapper) {
  border-radius: 20px;
  transition: all 0.3s ease;
}

.filter-select:focus-within :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #409EFF !important;
  transform: translateY(-2px);
}

.face-switch {
  transition: all 0.3s ease;
}

.stats-bar {
  display: flex;
  gap: 24px;
  padding: 16px 24px;
  background: linear-gradient(135deg, #f8f9fa, #f0f2f5);
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.stat-item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
}

.stat-icon {
  font-size: 20px;
}

.stat-label {
  color: #666;
  font-weight: 500;
}

.stat-value {
  color: #333;
  font-weight: 600;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
  min-height: 300px;
}

.image-fade-enter-active,
.image-fade-leave-active {
  transition: all 0.3s ease;
}

.image-fade-enter-from,
.image-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.image-item {
  cursor: pointer;
  transition: all 0.3s ease;
}

.image-item:hover {
  transform: translateY(-8px);
}

.image-container {
  position: relative;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  aspect-ratio: 4/3;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.image-item:hover .image-container img {
  transform: scale(1.05);
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(2px);
}

.image-item:hover .image-overlay {
  opacity: 1;
}

.image-actions {
  display: flex;
  gap: 12px;
  transform: translateY(20px);
  transition: transform 0.3s ease;
}

.image-item:hover .image-actions {
  transform: translateY(0);
}

.action-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.action-btn:hover {
  transform: scale(1.1);
}

.status-badge {
  position: absolute;
  top: 12px;
  left: 12px;
}

.face-badge {
  position: absolute;
  top: 12px;
  right: 12px;
}

.quality-score {
  position: absolute;
  bottom: 12px;
  right: 12px;
}

.image-info {
  padding: 16px;
  background: #fff;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.image-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-meta {
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
}

.empty-gallery {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 50px 0;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 32px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
}

.lightbox-dialog {
  max-width: 1200px;
  border-radius: 12px;
  overflow: hidden;
}

.lightbox-dialog :deep(.el-dialog) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.lightbox-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  max-height: 80vh;
  opacity: 0;
  animation: fadeIn 0.3s ease-out forwards;
}

.lightbox-image {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border-radius: 12px;
  overflow: hidden;
}

.lightbox-image img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 8px;
}

.lightbox-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.lightbox-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.pulse-on-hover:hover {
  animation: pulse 1s infinite;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.action-toast {
  position: fixed;
  bottom: -60px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 12px 20px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 9999;
  transition: all 0.3s ease;
}

.show-toast {
  bottom: 30px;
  animation: toastIn 0.3s ease-out forwards;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-tag) {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 500;
}

:deep(.el-pagination) {
  justify-content: center;
}

:deep(.el-pagination .el-pagination__total) {
  margin-right: 16px;
}

:deep(.el-descriptions .el-descriptions__label) {
  width: 120px;
}

@media (max-width: 768px) {
  .gallery-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .gallery-controls {
    flex-direction: column;
    gap: 8px;
  }

  .stats-bar {
    flex-direction: column;
    gap: 8px;
  }

  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }

  .lightbox-content {
    grid-template-columns: 1fr;
  }
}
</style> 