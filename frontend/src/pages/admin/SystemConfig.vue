<template>
  <div class="system-config">
    <div class="page-header">
      <h1>System Configuration</h1>
      <p>Configure Google Drive, Chatbot, and AI settings</p>
    </div>
    
    <el-row :gutter="24">
      <el-col :span="12">
        <!-- Google Drive Config -->
        <el-card header="Google Drive Configuration" class="config-card">
          <el-form :model="driveConfig" label-width="120px">
            <el-form-item label="Client ID">
              <el-input v-model="driveConfig.clientId" />
            </el-form-item>
            <el-form-item label="Client Secret">
              <el-input v-model="driveConfig.clientSecret" type="password" show-password />
            </el-form-item>
            <el-form-item label="Folder ID">
              <el-input v-model="driveConfig.folderId" />
            </el-form-item>
            <el-form-item label="Scan Interval">
              <el-input-number v-model="driveConfig.scanInterval" :min="5" :max="1440" />
              <span class="input-help">minutes</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveDriveConfig" :loading="saving.drive">
                Save Drive Config
              </el-button>
              <el-button @click="testDriveConnection" :loading="testing.drive">
                Test Connection
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <!-- Chatbot Config -->
        <el-card header="Chatbot Configuration" class="config-card">
          <el-tabs v-model="activeChatbotTab">
            <el-tab-pane label="Zalo" name="zalo">
              <el-form :model="chatbotConfig.zalo" label-width="120px">
                <el-form-item>
                  <el-switch
                    v-model="chatbotConfig.zalo.enabled"
                    active-text="Enabled"
                    inactive-text="Disabled"
                  />
                </el-form-item>
                <el-form-item label="Access Token">
                  <el-input v-model="chatbotConfig.zalo.accessToken" type="password" show-password />
                </el-form-item>
                <el-form-item label="Webhook URL">
                  <el-input v-model="chatbotConfig.zalo.webhookUrl" />
                </el-form-item>
              </el-form>
            </el-tab-pane>
            
            <el-tab-pane label="Facebook" name="facebook">
              <el-form :model="chatbotConfig.facebook" label-width="120px">
                <el-form-item>
                  <el-switch
                    v-model="chatbotConfig.facebook.enabled"
                    active-text="Enabled" 
                    inactive-text="Disabled"
                  />
                </el-form-item>
                <el-form-item label="Access Token">
                  <el-input v-model="chatbotConfig.facebook.pageAccessToken" type="password" show-password />
                </el-form-item>
                <el-form-item label="Verify Token">
                  <el-input v-model="chatbotConfig.facebook.verifyToken" />
                </el-form-item>
                <el-form-item label="Webhook URL">
                  <el-input v-model="chatbotConfig.facebook.webhookUrl" />
                </el-form-item>
              </el-form>
            </el-tab-pane>
          </el-tabs>
          
          <div class="config-actions">
            <el-button type="primary" @click="saveChatbotConfig" :loading="saving.chatbot">
              Save Chatbot Config
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- AI Configuration -->
    <el-card header="AI Configuration" class="config-card">
      <el-row :gutter="24">
        <el-col :span="12">
          <el-form label-width="150px">
            <el-form-item label="DeepFace Model">
              <el-select v-model="aiConfig.deepfaceModel" style="width: 100%">
                <el-option label="VGG-Face" value="VGG-Face" />
                <el-option label="Facenet" value="Facenet" />
                <el-option label="OpenFace" value="OpenFace" />
                <el-option label="DeepFace" value="DeepFace" />
              </el-select>
            </el-form-item>
            <el-form-item label="Detection Backend">
              <el-select v-model="aiConfig.detectionBackend" style="width: 100%">
                <el-option label="OpenCV" value="opencv" />
                <el-option label="MTCNN" value="mtcnn" />
                <el-option label="RetinaFace" value="retinaface" />
              </el-select>
            </el-form-item>
            <el-form-item label="Quality Threshold">
              <el-slider v-model="aiConfig.qualityThreshold" :min="0" :max="100" />
            </el-form-item>
            <el-form-item label="Face Count Limit">
              <el-input-number v-model="aiConfig.faceCountLimit" :min="1" :max="50" />
            </el-form-item>
          </el-form>
        </el-col>
        
        <el-col :span="12">
          <div class="ai-status">
            <h4>AI Service Status</h4>
            <div class="status-items">
              <div class="status-item">
                <span>DeepFace API:</span>
                <el-tag type="success">Online</el-tag>
              </div>
              <div class="status-item">
                <span>Processing Queue:</span>
                <el-tag type="info">3 pending</el-tag>
              </div>
              <div class="status-item">
                <span>Last Processing:</span>
                <span>2 minutes ago</span>
              </div>
            </div>
            
            <el-button type="primary" @click="saveAiConfig" :loading="saving.ai" class="save-button">
              Save AI Config
            </el-button>
          </div>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { driveApi, chatbotApi } from '@/services/api'
import type { DriveConfig, ChatbotConfig } from '@/types'

const activeChatbotTab = ref('zalo')

const driveConfig = ref<DriveConfig>({
  clientId: '',
  clientSecret: '',
  refreshToken: '',
  folderId: '',
  scanInterval: 60
})

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

const loadConfigs = async () => {
  try {
    const [driveData, chatbotData] = await Promise.all([
      driveApi.getDriveConfig().catch(() => null),
      chatbotApi.getChatbotConfig().catch(() => null)
    ])
    
    if (driveData) {
      driveConfig.value = driveData
    }
    
    if (chatbotData) {
      chatbotConfig.value = chatbotData
    }
  } catch (error) {
    console.error('Failed to load configs:', error)
  }
}

const saveDriveConfig = async () => {
  saving.drive = true
  try {
    await driveApi.updateDriveConfig(driveConfig.value)
    ElMessage.success('Google Drive configuration saved successfully')
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to save Drive configuration')
  } finally {
    saving.drive = false
  }
}

const testDriveConnection = async () => {
  testing.drive = true
  try {
    // Mock test - in real app would test actual connection
    await new Promise(resolve => setTimeout(resolve, 2000))
    ElMessage.success('Google Drive connection test successful')
  } catch (error: any) {
    ElMessage.error('Google Drive connection test failed')
  } finally {
    testing.drive = false
  }
}

const saveChatbotConfig = async () => {
  saving.chatbot = true
  try {
    await chatbotApi.updateChatbotConfig(chatbotConfig.value)
    ElMessage.success('Chatbot configuration saved successfully')
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to save Chatbot configuration')
  } finally {
    saving.chatbot = false
  }
}

const saveAiConfig = async () => {
  saving.ai = true
  try {
    // Mock save - in real app would save to API
    await new Promise(resolve => setTimeout(resolve, 1500))
    ElMessage.success('AI configuration saved successfully')
  } catch (error: any) {
    ElMessage.error('Failed to save AI configuration')
  } finally {
    saving.ai = false
  }
}

onMounted(() => {
  loadConfigs()
})
</script>

<style scoped>
.system-config {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.page-header p {
  margin: 0;
  color: #666;
}

.config-card {
  margin-bottom: 24px;
  border-radius: 8px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.config-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.input-help {
  margin-left: 8px;
  color: #666;
  font-size: 12px;
}

.ai-status {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.ai-status h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.status-items {
  margin-bottom: 20px;
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

.save-button {
  width: 100%;
}

:deep(.el-card__header) {
  font-weight: 600;
  color: #333;
}
</style> 