<template>
  <div class="system-config">
    <div class="page-header fade-in-down">
      <h1>System Configuration</h1>
      <p>Configure Google Drive, Chatbot, and AI settings</p>
    </div>
    
    <!-- Error alert for API errors -->
    <el-alert
      v-if="apiError"
      type="error"
      :title="apiError"
      description="Please check your connection and try again."
      show-icon
      :closable="true"
      @close="apiError = ''"
      class="mb-4"
    />
    
    <el-row :gutter="24">
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <!-- Google Drive Config -->
        <el-card header="Google Drive Configuration" class="config-card animate-card" :style="{ animationDelay: '0.1s' }" v-loading="configLoading">
          <el-alert
            v-if="driveSetupGuide"
            type="info"
            title="Google Drive API Setup Required"
            description="Follow these steps to set up Google Drive API integration"
            show-icon
            :closable="true"
            @close="driveSetupGuide = false"
            class="mb-4"
          >
            <div class="setup-guide">
              <ol>
                <li>Go to <a href="https://console.cloud.google.com" target="_blank">Google Cloud Console</a></li>
                <li>Create a new project or select an existing one</li>
                <li>Enable the Google Drive API</li>
                <li>Create OAuth 2.0 credentials (Web application type)</li>
                <li>Add http://localhost:5000/api/drive/oauth2callback to authorized redirect URIs</li>
                <li>Copy the Client ID and Client Secret below</li>
                <li>Enter the root folder ID from your Google Drive</li>
              </ol>
            </div>
          </el-alert>
          
          <div class="guide-toggle">
            <el-button type="text" @click="driveSetupGuide = !driveSetupGuide">
              {{ driveSetupGuide ? 'Hide setup guide' : 'Show setup guide' }}
            </el-button>
          </div>

          <el-form :model="driveConfig" label-position="top">
            <el-form-item label="Client ID" required>
              <el-input 
                v-model="driveConfig.clientId" 
                placeholder="Enter your Google Cloud OAuth Client ID"
                class="input-animate"
                @focus="handleFocus"
                @blur="handleBlur"
              />
            </el-form-item>
            <el-form-item label="Client Secret" required>
              <el-input 
                v-model="driveConfig.clientSecret" 
                type="password" 
                show-password 
                placeholder="Enter your Google Cloud OAuth Client Secret"
                class="input-animate"
                @focus="handleFocus"
                @blur="handleBlur"
              />
            </el-form-item>
            <el-form-item label="Folder ID" required>
              <el-input 
                v-model="driveConfig.folderId" 
                placeholder="Enter your Google Drive folder ID to scan"
                class="input-animate"
                @focus="handleFocus"
                @blur="handleBlur"
              />
              <div class="input-help">Find in your Drive URL when viewing a folder</div>
            </el-form-item>
            <el-form-item label="Scan Interval">
              <el-input-number 
                v-model="driveConfig.scanInterval" 
                :min="5" 
                :max="1440" 
                class="input-animate"
                style="width: 100%"
              />
              <div class="input-help">Minutes between automatic scans</div>
            </el-form-item>
            <el-form-item>
              <div class="button-group">
                <el-button 
                  type="primary" 
                  @click="saveDriveConfig" 
                  :loading="saving.drive"
                  class="pulse-on-hover"
                >
                  Save Drive Config
                </el-button>
                <el-button 
                  @click="authorizeGoogleDrive" 
                  :loading="authorizing"
                  class="pulse-on-hover"
                  :disabled="!driveConfig.clientId || !driveConfig.clientSecret || !driveConfig.folderId"
                  :type="driveConfig.refreshToken ? 'default' : 'success'"
                >
                  {{ driveConfig.refreshToken ? 'Re-authorize' : 'Authorize Drive' }}
                </el-button>
                <el-button 
                  @click="testDriveConnection" 
                  :loading="testing.drive"
                  class="pulse-on-hover"
                  :disabled="!driveConfig.refreshToken"
                >
                  Test Connection
                </el-button>
              </div>
              <div v-if="driveConfig.refreshToken" class="mt-3">
                <el-alert
                  type="success"
                  title="Google Drive Connected"
                  show-icon
                  :closable="false"
                >
                  <template #default>
                    <p class="mt-2">Your Google Drive account is connected and ready to use.</p>
                  </template>
                </el-alert>
              </div>
              <div v-else-if="driveConfig.clientId && driveConfig.clientSecret && driveConfig.folderId" class="mt-3">
                <el-alert
                  type="warning"
                  title="Authorization Required"
                  show-icon
                  :closable="false"
                >
                  <template #default>
                    <p class="mt-2">Please click "Authorize Drive" to connect your Google Drive account.</p>
                  </template>
                </el-alert>
              </div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
        <!-- Chatbot Config -->
        <el-card header="Chatbot Configuration" class="config-card animate-card" :style="{ animationDelay: '0.2s' }" v-loading="configLoading">
          <el-tabs v-model="activeChatbotTab" class="animated-tabs">
            <el-tab-pane label="Zalo" name="zalo">
              <el-form :model="chatbotConfig.zalo" label-position="top">
                <el-form-item>
                  <el-switch
                    v-model="chatbotConfig.zalo.enabled"
                    active-text="Enabled"
                    inactive-text="Disabled"
                    class="switch-animate"
                  />
                </el-form-item>
                <el-form-item label="Access Token">
                  <el-input 
                    v-model="chatbotConfig.zalo.accessToken" 
                    type="password" 
                    show-password
                    class="input-animate"
                    @focus="handleFocus"
                    @blur="handleBlur"
                  />
                </el-form-item>
                <el-form-item label="Webhook URL">
                  <el-input 
                    v-model="chatbotConfig.zalo.webhookUrl"
                    class="input-animate"
                    @focus="handleFocus"
                    @blur="handleBlur"
                  />
                </el-form-item>
              </el-form>
            </el-tab-pane>
            
            <el-tab-pane label="Facebook" name="facebook">
              <el-form :model="chatbotConfig.facebook" label-position="top">
                <el-form-item>
                  <el-switch
                    v-model="chatbotConfig.facebook.enabled"
                    active-text="Enabled" 
                    inactive-text="Disabled"
                    class="switch-animate"
                  />
                </el-form-item>
                <el-form-item label="Access Token">
                  <el-input 
                    v-model="chatbotConfig.facebook.pageAccessToken" 
                    type="password" 
                    show-password
                    class="input-animate"
                    @focus="handleFocus"
                    @blur="handleBlur"
                  />
                </el-form-item>
                <el-form-item label="Verify Token">
                  <el-input 
                    v-model="chatbotConfig.facebook.verifyToken"
                    class="input-animate"
                    @focus="handleFocus"
                    @blur="handleBlur"
                  />
                </el-form-item>
                <el-form-item label="Webhook URL">
                  <el-input 
                    v-model="chatbotConfig.facebook.webhookUrl"
                    class="input-animate"
                    @focus="handleFocus"
                    @blur="handleBlur"
                  />
                </el-form-item>
              </el-form>
            </el-tab-pane>
          </el-tabs>
          
          <div class="config-actions">
            <el-button 
              type="primary" 
              @click="saveChatbotConfig" 
              :loading="saving.chatbot"
              class="pulse-on-hover"
            >
              Save Chatbot Config
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- AI Configuration -->
    <el-card header="AI Configuration" class="config-card animate-card" :style="{ animationDelay: '0.3s' }">
      <el-row :gutter="24">
        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
          <el-form label-position="top">
            <el-form-item label="DeepFace Model">
              <el-select 
                v-model="aiConfig.deepfaceModel" 
                style="width: 100%"
                class="select-animate"
              >
                <el-option label="VGG-Face" value="VGG-Face" />
                <el-option label="Facenet" value="Facenet" />
                <el-option label="OpenFace" value="OpenFace" />
                <el-option label="DeepFace" value="DeepFace" />
              </el-select>
            </el-form-item>
            <el-form-item label="Detection Backend">
              <el-select 
                v-model="aiConfig.detectionBackend" 
                style="width: 100%"
                class="select-animate"
              >
                <el-option label="OpenCV" value="opencv" />
                <el-option label="MTCNN" value="mtcnn" />
                <el-option label="RetinaFace" value="retinaface" />
              </el-select>
            </el-form-item>
            <el-form-item label="Quality Threshold">
              <el-slider 
                v-model="aiConfig.qualityThreshold" 
                :min="0" 
                :max="100"
                class="slider-animate" 
              />
            </el-form-item>
            <el-form-item label="Face Count Limit">
              <el-input-number 
                v-model="aiConfig.faceCountLimit" 
                :min="1" 
                :max="50" 
                class="input-animate"
                style="width: 100%"
              />
            </el-form-item>
          </el-form>
        </el-col>
        
        <el-col :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
          <div class="ai-status">
            <h4>AI Service Status</h4>
            <div class="status-items">
              <div class="status-item status-active">
                <span>DeepFace API:</span>
                <el-tag type="success" effect="light">Online</el-tag>
              </div>
              <div class="status-item">
                <span>Processing Queue:</span>
                <el-tag type="info" effect="light">3 pending</el-tag>
              </div>
              <div class="status-item">
                <span>Last Processing:</span>
                <span>2 minutes ago</span>
              </div>
            </div>
            
            <el-button 
              type="primary" 
              @click="saveAiConfig" 
              :loading="saving.ai" 
              class="save-button pulse-on-hover"
            >
              Save AI Config
            </el-button>
          </div>
        </el-col>
      </el-row>
    </el-card>
    
    <!-- Notification for successful save -->
    <div class="save-notification" :class="{ 'show-notification': showNotification }">
      <el-icon size="20"><Check /></el-icon>
      <span>Settings saved successfully</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { driveApi, chatbotApi } from '@/services/api'
import type { DriveConfig, ChatbotConfig } from '@/types'
import { Check } from '@element-plus/icons-vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeChatbotTab = ref('zalo')
const showNotification = ref(false)
const driveSetupGuide = ref(false)
const authorizing = ref(false)
const configLoading = ref(true)
const apiError = ref('')

const driveConfig = ref<DriveConfig>({
  clientId: '',
  clientSecret: '',
  refreshToken: '',
  folderId: '',
  scanInterval: 60
})

// Keep a copy of the original config to detect changes that require re-authorize
const originalDriveConfig = ref<DriveConfig | null>(null)

const chatbotConfig = ref<ChatbotConfig>({
  zalo: {
    enabled: false,
    accessToken: '',
    webhookUrl: ''
  },
  facebook: {
    enabled: false,
    pageAccessToken: '',
    verifyToken: '',
    webhookUrl: ''
  }
})

const aiConfig = reactive({
  deepfaceModel: 'VGG-Face',
  detectionBackend: 'opencv',
  qualityThreshold: 80,
  faceCountLimit: 10
})

const saving = reactive({
  drive: false,
  chatbot: false,
  ai: false
})

const testing = reactive({
  drive: false
})

// Check for OAuth callback parameters
const checkOAuthCallback = () => {
  const auth = route.query.auth
  const message = route.query.message
  
  if (auth === 'success') {
    ElMessage({
      message: 'Google Drive authorization successful',
      type: 'success',
      duration: 5000
    })
    // Reload drive config to get the new refresh token
    loadDriveConfig()
  } else if (auth === 'error') {
    ElMessage({
      message: message ? String(message) : 'Google Drive authorization failed',
      type: 'error',
      duration: 5000
    })
  }

  // If this page is opened inside the OAuth popup, notify the opener then close
  if (window.opener && (auth === 'success' || auth === 'error')) {
    window.opener.postMessage({
      type: 'driveAuth',
      auth,
      message: message ? String(message) : ''
    }, '*')
    // Give the message a little time to send before closing
    setTimeout(() => window.close(), 300)
  }
}

// Handle messages coming from the OAuth popup
const driveAuthListener = (event: MessageEvent) => {
  if (!event.data || event.data.type !== 'driveAuth') return

  const { auth, message } = event.data

  if (auth === 'success') {
    ElMessage({
      message: 'Google Drive authorization successful',
      type: 'success',
      duration: 5000
    })
    loadDriveConfig()
  } else if (auth === 'error') {
    ElMessage({
      message: message || 'Google Drive authorization failed',
      type: 'error',
      duration: 5000
    })
  }
}

const handleFocus = (event: Event) => {
  const target = event.target as HTMLElement
  const parent = target.closest('.el-form-item') as HTMLElement
  if (parent) {
    parent.classList.add('input-focused')
  }
}

const handleBlur = (event: Event) => {
  const target = event.target as HTMLElement
  const parent = target.closest('.el-form-item') as HTMLElement
  if (parent) {
    parent.classList.remove('input-focused')
  }
}

const loadDriveConfig = async () => {
  try {
    apiError.value = ''
    const driveData = await driveApi.getDriveConfig()
    if (driveData) {
      driveConfig.value = driveData
      // Store a deep copy for later comparison
      originalDriveConfig.value = JSON.parse(JSON.stringify(driveData))
    }
  } catch (error: any) {
    console.error('Failed to load drive config:', error)
    apiError.value = error.message || 'Failed to load Drive configuration'
  }
}

const loadChatbotConfig = async () => {
  try {
    const chatbotData = await chatbotApi.getChatbotConfig()
    if (chatbotData) {
      chatbotConfig.value = chatbotData
    }
  } catch (error) {
    console.error('Failed to load chatbot config:', error)
    // Don't set API error here as Drive is the main focus
  }
}

const loadConfigs = async () => {
  configLoading.value = true
  try {
    await Promise.all([
      loadDriveConfig().catch(err => {
        console.error('Drive config loading error:', err)
        // Continue loading other configs even if this one fails
      }),
      loadChatbotConfig().catch(err => {
        console.error('Chatbot config loading error:', err)
        // Continue loading other configs even if this one fails
      })
    ])
  } catch (error: any) {
    console.error('Failed to load configs:', error)
    apiError.value = error.message || 'Failed to load configurations'
  } finally {
    configLoading.value = false
  }
}

const showSuccessNotification = () => {
  showNotification.value = true
  setTimeout(() => {
    showNotification.value = false
  }, 3000)
}

const saveDriveConfig = async () => {
  saving.drive = true
  try {
    apiError.value = ''

    // If user leaves Folder ID blank, default to 'root'
    if (!driveConfig.value.folderId) {
      driveConfig.value.folderId = 'root'
    }

    // Determine if critical fields changed; if so, clear refreshToken to force new OAuth
    if (originalDriveConfig.value) {
      const changed = (
        driveConfig.value.clientId !== originalDriveConfig.value.clientId ||
        driveConfig.value.clientSecret !== originalDriveConfig.value.clientSecret ||
        driveConfig.value.folderId !== originalDriveConfig.value.folderId
      )
      if (changed) {
        driveConfig.value.refreshToken = ''
      }
    }

    await driveApi.updateDriveConfig(driveConfig.value)
    showSuccessNotification()

    // Refresh original snapshot after successful save
    originalDriveConfig.value = JSON.parse(JSON.stringify(driveConfig.value))
  } catch (error: any) {
    apiError.value = error.message || 'Failed to save Drive configuration'
    ElMessage({
      message: error.message || 'Failed to save Drive configuration',
      type: 'error',
      duration: 5000
    })
  } finally {
    saving.drive = false
  }
}

const testDriveConnection = async () => {
  testing.drive = true
  try {
    apiError.value = ''
    if (!driveConfig.value.clientId || !driveConfig.value.clientSecret || !driveConfig.value.refreshToken) {
      throw new Error('Google Drive not properly configured')
    }
    
    // Try to list folders as a connection test using configured folderId
    await driveApi.listDriveFolders(driveConfig.value.folderId)
    
    ElMessage({
      message: 'Google Drive connection test successful',
      type: 'success',
      duration: 3000
    })
  } catch (error: any) {
    apiError.value = error.message || 'Google Drive connection test failed'
    ElMessage({
      message: error.message || 'Google Drive connection test failed',
      type: 'error',
      duration: 5000
    })
  } finally {
    testing.drive = false
  }
}

const authorizeGoogleDrive = async () => {
  authorizing.value = true
  try {
    apiError.value = ''
    // Save the config first to ensure client ID and secret are stored
    await driveApi.updateDriveConfig(driveConfig.value)
    
    // Get the OAuth URL from the backend
    const authUrl = await driveApi.getDriveAuthUrl()
    
    // Open in a new window for OAuth flow
    window.open(authUrl, 'googleOAuth', 'width=600,height=700')
    
    ElMessage({
      message: 'Please complete the authorization in the popup window',
      type: 'info',
      duration: 5000
    })
  } catch (error: any) {
    apiError.value = error.message || 'Google Drive authorization failed'
    ElMessage({
      message: error.message || 'Google Drive authorization failed',
      type: 'error',
      duration: 5000
    })
  } finally {
    authorizing.value = false
  }
}

const saveChatbotConfig = async () => {
  saving.chatbot = true
  try {
    apiError.value = ''
    await chatbotApi.updateChatbotConfig(chatbotConfig.value)
    showSuccessNotification()
  } catch (error: any) {
    apiError.value = error.message || 'Failed to save Chatbot configuration'
    ElMessage({
      message: error.message || 'Failed to save Chatbot configuration',
      type: 'error',
      duration: 5000
    })
  } finally {
    saving.chatbot = false
  }
}

const saveAiConfig = async () => {
  saving.ai = true
  try {
    apiError.value = ''
    // Mock save - in real app would save to API
    await new Promise(resolve => setTimeout(resolve, 1500))
    showSuccessNotification()
  } catch (error: any) {
    apiError.value = error.message || 'Failed to save AI configuration'
    ElMessage({
      message: 'Failed to save AI configuration',
      type: 'error',
      duration: 5000
    })
  } finally {
    saving.ai = false
  }
}

// Watch for route query changes to detect OAuth callback
watch(() => route.query, () => {
  checkOAuthCallback()
}, { immediate: true })

onMounted(() => {
  loadConfigs()
  checkOAuthCallback()
  window.addEventListener('message', driveAuthListener)
})

onUnmounted(() => {
  window.removeEventListener('message', driveAuthListener)
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

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.system-config {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  opacity: 0;
  animation: fadeIn 0.5s ease-out forwards;
}

.page-header {
  margin-bottom: 32px;
  animation: fadeInDown 0.5s ease-out forwards;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #333;
  letter-spacing: -0.5px;
}

.page-header p {
  margin: 0;
  color: #666;
}

.animate-card {
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
  transition: all 0.3s ease;
}

.config-card {
  margin-bottom: 24px;
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
}

.config-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-3px);
}

.config-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.button-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.input-animate {
  transition: all 0.3s ease;
  border-radius: 8px;
  width: 100%;
}

.input-animate:hover {
  transform: translateY(-1px);
}

.input-focused {
  transform: translateY(-2px);
}

.input-focused .el-input__wrapper {
  box-shadow: 0 0 0 1px #409EFF !important;
}

.input-help {
  margin-top: 4px;
  color: #666;
  font-size: 12px;
}

.ai-status {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  transition: all 0.3s ease;
  animation: slideIn 0.6s ease-out forwards;
  animation-delay: 0.4s;
  opacity: 0;
}

.ai-status:hover {
  background: #f0f2f5;
}

.ai-status h4 {
  margin: 0 0 16px 0;
  color: #333;
  font-weight: 600;
}

.status-items {
  margin-bottom: 20px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
  transition: all 0.3s ease;
}

.status-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
  padding-left: 8px;
  padding-right: 8px;
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

.save-button {
  width: 100%;
  margin-top: 16px;
  height: 44px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.pulse-on-hover:hover {
  animation: pulse 1s infinite;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.animated-tabs {
  opacity: 0;
  animation: fadeIn 0.6s ease-out 0.3s forwards;
}

.switch-animate {
  transition: all 0.3s ease;
}

.switch-animate:hover {
  transform: scale(1.05);
}

.select-animate {
  transition: all 0.3s ease;
}

.select-animate:hover :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.5) !important;
}

.slider-animate :deep(.el-slider__button) {
  transition: transform 0.3s ease;
}

.slider-animate:hover :deep(.el-slider__button) {
  transform: scale(1.2);
}

.save-notification {
  position: fixed;
  bottom: -60px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #67C23A;
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  z-index: 9999;
}

.show-notification {
  bottom: 20px;
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

:deep(.el-form-item) {
  margin-bottom: 22px;
  transition: all 0.3s ease;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-tabs__item) {
  transition: all 0.3s ease;
}

:deep(.el-tabs__item:hover) {
  color: #409EFF;
  transform: translateY(-1px);
}

:deep(.el-tabs__item.is-active) {
  font-weight: 600;
}

:deep(.el-input-number) {
  width: 100%;
}

.setup-guide {
  margin-top: 12px;
  margin-bottom: 12px;
}

.setup-guide ol {
  padding-left: 20px;
}

.setup-guide li {
  margin-bottom: 6px;
}

.guide-toggle {
  margin-bottom: 16px;
}

.mt-2 {
  margin-top: 8px;
}

.mt-3 {
  margin-top: 12px;
}

.mb-4 {
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .button-group {
    flex-direction: column;
  }
  
  .button-group .el-button {
    width: 100%;
  }
}
</style> 