<template>
  <div class="chatbot-interface">
    <div class="chat-header">
      <h1>Chatbot Interface</h1>
      <div class="platform-selector">
        <el-radio-group v-model="selectedPlatform">
          <el-radio-button label="zalo">Zalo</el-radio-button>
          <el-radio-button label="facebook">Facebook</el-radio-button>
        </el-radio-group>
      </div>
    </div>
    
    <el-row :gutter="24">
      <!-- Chat Messages -->
      <el-col :span="16">
        <el-card class="chat-card">
          <template #header>
            <div class="chat-card-header">
              <span>{{ selectedPlatform === 'zalo' ? 'Zalo' : 'Facebook' }} Messages</span>
              <el-button size="small" @click="refreshMessages">
                <el-icon><Refresh /></el-icon>
                Refresh
              </el-button>
            </div>
          </template>
          
          <div class="chat-container" ref="chatContainer">
            <div
              v-for="message in filteredMessages"
              :key="message.id"
              :class="['message', message.response ? 'bot-message' : 'user-message']"
            >
              <div class="message-content">
                <div class="message-text">
                  {{ message.response || message.message }}
                </div>
                <div class="message-meta">
                  <span class="message-platform">
                    {{ message.platform }}
                  </span>
                  <span class="message-time">
                    {{ formatTime(message.createdAt) }}
                  </span>
                </div>
              </div>
            </div>
            
            <div v-if="filteredMessages.length === 0" class="empty-chat">
              <el-empty description="No messages yet">
                <el-button type="primary" @click="sendTestMessage">
                  Send Test Message
                </el-button>
              </el-empty>
            </div>
          </div>
          
          <!-- Send Message Form -->
          <div class="message-input">
            <el-input
              v-model="newMessage"
              placeholder="Type your message..."
              @keyup.enter="sendMessage"
              :disabled="sending"
            >
              <template #append>
                <el-button
                  type="primary"
                  @click="sendMessage"
                  :loading="sending"
                  :disabled="!newMessage.trim()"
                >
                  <el-icon><Promotion /></el-icon>
                </el-button>
              </template>
            </el-input>
          </div>
        </el-card>
      </el-col>
      
      <!-- Sidebar -->
      <el-col :span="8">
        <!-- Quick Actions -->
        <el-card class="action-card" header="Quick Actions">
          <div class="quick-actions">
            <el-button
              type="primary"
              @click="requestPhotoProcessing"
              :loading="processing"
              class="action-button"
            >
              <el-icon><Picture /></el-icon>
              Request Photo Processing
            </el-button>
            
            <el-button
              type="success"
              @click="requestBestPhotos"
              class="action-button"
            >
              <el-icon><Star /></el-icon>
              Get Best Photos
            </el-button>
            
            <el-button
              type="info"
              @click="requestStatus"
              class="action-button"
            >
              <el-icon><InfoFilled /></el-icon>
              Check Status
            </el-button>
            
            <el-button
              type="warning"
              @click="requestHelp"
              class="action-button"
            >
              <el-icon><QuestionFilled /></el-icon>
              Get Help
            </el-button>
          </div>
        </el-card>
        
        <!-- Platform Status -->
        <el-card header="Platform Status" class="status-card">
          <div class="platform-status">
            <div class="status-item">
              <div class="status-info">
                <div class="platform-name">
                  <el-icon><ChatLineRound /></el-icon>
                  Zalo Bot
                </div>
                <el-tag :type="botStatus.zalo ? 'success' : 'danger'" size="small">
                  {{ botStatus.zalo ? 'Connected' : 'Disconnected' }}
                </el-tag>
              </div>
              <div class="status-stats">
                <span>{{ messageStats.zalo }} messages</span>
              </div>
            </div>
            
            <div class="status-item">
              <div class="status-info">
                <div class="platform-name">
                  <el-icon><ChatLineRound /></el-icon>
                  Facebook Bot
                </div>
                <el-tag :type="botStatus.facebook ? 'success' : 'danger'" size="small">
                  {{ botStatus.facebook ? 'Connected' : 'Disconnected' }}
                </el-tag>
              </div>
              <div class="status-stats">
                <span>{{ messageStats.facebook }} messages</span>
              </div>
            </div>
          </div>
        </el-card>
        
        <!-- Recent Activity -->
        <el-card header="Recent Activity" class="activity-card">
          <el-timeline>
            <el-timeline-item
              v-for="activity in recentActivity"
              :key="activity.id"
              :timestamp="formatTime(activity.timestamp)"
              size="small"
            >
              {{ activity.description }}
            </el-timeline-item>
          </el-timeline>
          
          <div v-if="recentActivity.length === 0" class="empty-activity">
            <p>No recent activity</p>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- Message Templates Modal -->
    <el-dialog
      v-model="templatesVisible"
      title="Message Templates"
      width="600px"
    >
      <div class="message-templates">
        <div
          v-for="template in messageTemplates"
          :key="template.id"
          class="template-item"
          @click="useTemplate(template.content)"
        >
          <div class="template-title">{{ template.title }}</div>
          <div class="template-content">{{ template.content }}</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Promotion, Picture, Star, InfoFilled, QuestionFilled, ChatLineRound } from '@element-plus/icons-vue'
import { chatbotApi } from '@/services/api'
import type { ChatMessage } from '@/types'

const selectedPlatform = ref<'zalo' | 'facebook'>('zalo')
const messages = ref<ChatMessage[]>([])
const newMessage = ref('')
const sending = ref(false)
const processing = ref(false)
const templatesVisible = ref(false)
const chatContainer = ref<HTMLElement>()

const botStatus = ref({
  zalo: true,
  facebook: false
})

const messageStats = ref({
  zalo: 0,
  facebook: 0
})

const recentActivity = ref([
  {
    id: '1',
    description: 'Photo processing completed',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    description: 'Best photos selected and sent',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    description: 'User requested help via Zalo',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  }
])

const messageTemplates = [
  {
    id: '1',
    title: 'Processing Request',
    content: 'Please process my uploaded photos with face detection.'
  },
  {
    id: '2',
    title: 'Best Photos Request',
    content: 'Send me the best photos from my recent uploads.'
  },
  {
    id: '3',
    title: 'Status Check',
    content: 'What is the current status of my photo processing?'
  },
  {
    id: '4',
    title: 'Help Request',
    content: 'I need help with using the photo management system.'
  }
]

const filteredMessages = computed(() => {
  return messages.value
    .filter(msg => msg.platform === selectedPlatform.value)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
})

const loadMessages = async () => {
  try {
    const response = await chatbotApi.getChatMessages(1, 100)
    messages.value = response.data
    
    // Update message stats
    messageStats.value = {
      zalo: messages.value.filter(msg => msg.platform === 'zalo').length,
      facebook: messages.value.filter(msg => msg.platform === 'facebook').length
    }
  } catch (error) {
    // Use demo data if API fails
    messages.value = generateDemoMessages()
    messageStats.value = {
      zalo: messages.value.filter(msg => msg.platform === 'zalo').length,
      facebook: messages.value.filter(msg => msg.platform === 'facebook').length
    }
  }
}

const generateDemoMessages = (): ChatMessage[] => {
  return [
    {
      id: '1',
      userId: '1',
      message: 'Hi, I want to process my photos',
      response: 'Hello! I can help you process your photos with AI face detection. Please upload your photos first, then I can start processing them.',
      platform: 'zalo',
      type: 'text',
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      userId: '1',
      message: 'How long does it take?',
      response: 'Processing time depends on the number of photos and their size. Typically, it takes 2-5 minutes for 10-20 photos.',
      platform: 'zalo',
      type: 'text',
      createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      userId: '1',
      message: 'Send me the best photos from yesterday',
      response: 'I found 5 high-quality photos from yesterday with good face detection scores. Here are the links: [Photo links would be here]',
      platform: 'facebook',
      type: 'text',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    }
  ]
}

const sendMessage = async () => {
  if (!newMessage.value.trim()) return
  
  sending.value = true
  try {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: '1',
      message: newMessage.value,
      platform: selectedPlatform.value,
      type: 'text',
      createdAt: new Date().toISOString()
    }
    
    messages.value.push(userMessage)
    
    await chatbotApi.sendChatbotMessage('1', newMessage.value, selectedPlatform.value)
    
    // Simulate bot response
    setTimeout(() => {
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        userId: '1',
        message: newMessage.value,
        response: generateBotResponse(newMessage.value),
        platform: selectedPlatform.value,
        type: 'text',
        createdAt: new Date().toISOString()
      }
      
      messages.value.push(botResponse)
      newMessage.value = ''
      scrollToBottom()
    }, 1500)
    
    scrollToBottom()
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to send message')
  } finally {
    sending.value = false
  }
}

const generateBotResponse = (message: string) => {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('process') || lowerMessage.includes('photo')) {
    return 'I\'ll start processing your photos right away. This may take a few minutes depending on the number of photos.'
  } else if (lowerMessage.includes('best') || lowerMessage.includes('good')) {
    return 'I\'ve selected the best photos based on face detection quality and image clarity. Would you like me to send them to you?'
  } else if (lowerMessage.includes('status') || lowerMessage.includes('how')) {
    return 'Your current processing status: 15 photos uploaded, 12 processed, 8 faces detected. Processing is 80% complete.'
  } else if (lowerMessage.includes('help')) {
    return 'I can help you with:\n1. Processing photos with AI\n2. Finding best photos\n3. Checking processing status\n4. Downloading processed photos\n\nWhat would you like to do?'
  } else {
    return 'I understand your request. Let me help you with that. You can also use the quick action buttons for common tasks.'
  }
}

const sendTestMessage = () => {
  newMessage.value = 'Hello, can you help me process my photos?'
  sendMessage()
}

const requestPhotoProcessing = async () => {
  processing.value = true
  newMessage.value = 'Please process my uploaded photos with face detection.'
  await sendMessage()
  processing.value = false
}

const requestBestPhotos = () => {
  newMessage.value = 'Send me the best photos from my recent uploads.'
  sendMessage()
}

const requestStatus = () => {
  newMessage.value = 'What is the current status of my photo processing?'
  sendMessage()
}

const requestHelp = () => {
  newMessage.value = 'I need help with using the photo management system.'
  sendMessage()
}

const refreshMessages = () => {
  loadMessages()
  ElMessage.success('Messages refreshed')
}

const useTemplate = (content: string) => {
  newMessage.value = content
  templatesVisible.value = false
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h ago`
  } else {
    return date.toLocaleDateString()
  }
}

onMounted(() => {
  loadMessages()
  scrollToBottom()
})
</script>

<style scoped>
.chatbot-interface {
  max-width: 1200px;
  margin: 0 auto;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.chat-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.chat-card {
  height: 600px;
  display: flex;
  flex-direction: column;
}

.chat-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.message {
  margin-bottom: 16px;
  display: flex;
}

.user-message {
  justify-content: flex-end;
}

.bot-message {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  position: relative;
}

.user-message .message-content {
  background: #409EFF;
  color: white;
}

.bot-message .message-content {
  background: white;
  color: #333;
  border: 1px solid #e4e7ed;
}

.message-text {
  margin-bottom: 4px;
  white-space: pre-wrap;
}

.message-meta {
  font-size: 12px;
  opacity: 0.7;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.message-platform {
  text-transform: capitalize;
  font-weight: 500;
}

.empty-chat {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.message-input {
  border-top: 1px solid #e4e7ed;
  padding-top: 16px;
}

.action-card,
.status-card,
.activity-card {
  margin-bottom: 20px;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-button {
  width: 100%;
  justify-content: flex-start;
}

.platform-status {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-item {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.status-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.platform-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.status-stats {
  font-size: 12px;
  color: #666;
}

.empty-activity {
  text-align: center;
  color: #666;
  font-size: 14px;
}

.message-templates {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.template-item {
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.template-item:hover {
  border-color: #409EFF;
  background: #f0f9ff;
}

.template-title {
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
}

.template-content {
  font-size: 14px;
  color: #666;
}

:deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .chat-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .chat-card {
    height: 400px;
  }

  .message-content {
    max-width: 85%;
  }
}
</style> 