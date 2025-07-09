<template>
  <div class="chatbot-container-layout">
    <!-- Conversation History Sidebar -->
    <div class="conversation-history">
      <div class="history-header">
        <h4><el-icon><ChatLineSquare /></el-icon> Conversations</h4>
        <el-button @click="startNewConversation" type="primary" size="small" plain><el-icon><Plus /></el-icon> New</el-button>
      </div>
      <el-scrollbar class="history-list">
        <div 
          v-for="convo in conversationHistory" 
          :key="convo._id"
          class="history-item"
          :class="{ active: activeConversationId === convo._id }"
          @click="switchConversation(convo._id)"
        >
          <div class="history-item-icon">
            <el-icon><ChatDotRound /></el-icon>
          </div>
          <div class="history-item-content">
            <div class="history-item-title">{{ convo.title }}</div>
            <div class="history-item-preview">{{ convo.lastMessage }}</div>
          </div>
          <div class="history-item-time">{{ formatTime(convo.updatedAt) }}</div>
          <!-- Add action buttons for conversation -->
          <div class="history-item-actions">
            <el-dropdown trigger="click" @command="handleConversationAction($event, convo._id)">
              <el-button type="text" size="small">
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">
                    <el-icon><Edit /></el-icon> Rename
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    <el-icon><Delete /></el-icon> Delete
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-scrollbar>
    </div>

    <!-- Main Chat Interface -->
    <div class="chatbot-interface">
      <div class="chat-header fade-in-down">
        <div class="header-content">
          <h1>AI Photo Assistant</h1>
          <p class="header-subtitle">Your personal AI for photo management</p>
        </div>
        <div class="platform-selector">
          <span class="platform-label">Platform:</span>
          <el-radio-group v-model="selectedPlatform" size="default">
            <el-radio-button label="web">Web</el-radio-button>
            <el-radio-button label="zalo">Zalo</el-radio-button>
            <el-radio-button label="facebook">Facebook</el-radio-button>
          </el-radio-group>
        </div>
      </div>
      
      <el-card class="chat-card animate-card">
        <template #header>
          <div class="chat-card-header">
            <div class="header-left">
              <el-icon :size="20" class="platform-icon" :class="selectedPlatform">
                <component :is="selectedPlatform === 'zalo' ? 'ChatLineRound' : selectedPlatform === 'facebook' ? 'ChatLineSquare' : 'ChatDotSquare'" />
              </el-icon>
              <span class="platform-name">{{ selectedPlatform === 'zalo' ? 'Zalo' : selectedPlatform === 'facebook' ? 'Facebook' : 'Web' }} Messages</span>
              <el-tag 
                size="small" 
                :type="botStatus[selectedPlatform] ? 'success' : 'danger'"
                class="status-tag"
              >
                {{ botStatus[selectedPlatform] ? 'Online' : 'Offline' }}
              </el-tag>
            </div>
            <div class="header-right">
              <el-button size="small" class="refresh-btn" @click="refreshMessages" type="primary" plain>
                <el-icon><Refresh /></el-icon>
                Refresh
              </el-button>
            </div>
          </div>
        </template>
        
        <div class="chat-body">
          <!-- Chat container -->
          <div class="chat-container" ref="chatContainer">
            <transition-group name="message-fade" tag="div" class="messages-wrapper">
              <div
                v-for="message in filteredMessages"
                :key="message._id"
                :class="['message', message.response ? 'bot-message' : 'user-message']"
              >
                <div class="message-avatar" v-if="message.response">
                  <el-avatar :size="36" src="https://avatars.githubusercontent.com/u/1?v=4" />
                </div>
                <div class="message-content">
                  <!-- Edit mode for message -->
                  <div v-if="editingMessageId === message._id" class="message-edit">
                    <el-input
                      v-model="editMessageText"
                      type="textarea"
                      :rows="2"
                      :autosize="{ minRows: 1, maxRows: 4 }"
                      placeholder="Edit your message..."
                    />
                    <div class="edit-actions">
                      <el-button size="small" @click="cancelEdit" plain>Cancel</el-button>
                      <el-button size="small" type="primary" @click="saveEdit(message._id)">Save</el-button>
                    </div>
                  </div>
                  <!-- Normal display mode -->
                  <div v-else class="message-text">
                    {{ message.response || message.message }}
                  </div>
                  
                  <!-- Display images if present with improved styling -->
                  <div v-if="message.imageUrl" class="message-image">
                    <el-image
                      :src="message.imageUrl"
                      fit="cover"
                      :preview-src-list="[message.imageUrl]"
                      :initial-index="0"
                      class="preview-image"
                    >
                      <template #error>
                        <div class="image-error">
                          <el-icon><Picture /></el-icon>
                          Image not available
                        </div>
                      </template>
                    </el-image>
                  </div>
                  
                  <!-- Display link to best photos with improved styling -->
                  <div v-if="message.folderLink" class="message-link">
                    <a :href="message.folderLink" target="_blank" class="folder-link">
                      <el-icon><Folder /></el-icon>
                      Open Best Photos Folder
                    </a>
                  </div>
                  
                  <div class="message-meta">
                    <span class="message-platform">
                      <el-icon :size="12"><component :is="message.platform === 'zalo' ? 'ChatLineRound' : message.platform === 'facebook' ? 'ChatLineSquare' : 'ChatDotSquare'" /></el-icon>
                      {{ message.platform }}
                    </span>
                    <span class="message-time">
                      {{ formatTime(message.createdAt) }}
                    </span>
                    
                    <!-- Message actions (only for user messages, not bot responses) -->
                    <div v-if="!message.response" class="message-actions">
                      <el-dropdown trigger="click" @command="handleMessageAction($event, message._id)">
                        <el-button type="text" size="small">
                          <el-icon><MoreFilled /></el-icon>
                        </el-button>
                        <template #dropdown>
                          <el-dropdown-menu>
                            <el-dropdown-item command="edit">
                              <el-icon><Edit /></el-icon> Edit
                            </el-dropdown-item>
                            <el-dropdown-item command="delete" divided>
                              <el-icon><Delete /></el-icon> Delete
                            </el-dropdown-item>
                          </el-dropdown-menu>
                        </template>
                      </el-dropdown>
                    </div>
                  </div>
                </div>
                <div class="message-avatar user-avatar" v-if="!message.response">
                  <el-avatar :size="36" src="https://avatars.githubusercontent.com/u/2?v=4" />
                </div>
              </div>
            </transition-group>
            
            <!-- Typing bubble when bot is generating answer -->
            <transition name="message-fade">
              <div
                v-if="sending"
                key="bot-typing-row"
                class="message bot-message typing-row"
              >
                <div class="message-avatar">
                  <el-avatar :size="36" src="https://avatars.githubusercontent.com/u/1?v=4" />
                </div>
                <div class="message-content typing-content">
                  <el-icon class="loading-icon"><Loading /></el-icon>
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                </div>
              </div>
            </transition>
            
            <!-- Scroll-to-bottom button -->
            <div
              v-if="showScrollButton"
              class="scroll-to-bottom"
              @click="scrollToBottom"
            >
              <el-icon><ArrowDown /></el-icon>
            </div>

            <!-- Empty state with improved design -->
            <div v-if="filteredMessages.length === 0" class="empty-chat">
              <el-empty description="No messages yet" :image-size="120">
                <template #image>
                  <div class="empty-chat-illustration">
                    <i class="el-icon-chat-round"></i>
                  </div>
                </template>
                <div class="empty-chat-text">
                  <p>Start your conversation with the AI photo assistant</p>
                </div>
                <el-button type="primary" @click="sendTestMessage" class="pulse-on-hover" size="large">
                  <el-icon><ChatLineRound /></el-icon>
                  Send Test Message
                </el-button>
              </el-empty>
            </div>
          </div>
          
          <!-- Improved message input with suggestions and emojis -->
          <div class="message-input">
            <el-input
              v-model="newMessage"
              placeholder="Type your message..."
              @keyup.enter="sendMessage"
              :disabled="sending"
              class="input-animate"
              :autosize="{ minRows: 1, maxRows: 4 }"
              type="textarea"
            >
              <template #prefix>
                <div class="input-tools">
                  <el-tooltip content="Message Templates" placement="top">
                    <el-icon v-if="!sending" @click="showTemplatesModal" class="template-icon"><Document /></el-icon>
                  </el-tooltip>
                  <el-tooltip content="Upload Image" placement="top">
                    <el-icon v-if="!sending" @click="showImageUpload" class="template-icon"><Upload /></el-icon>
                  </el-tooltip>
                </div>
              </template>
              <template #append>
                <el-button
                  type="primary"
                  @click="sendMessage"
                  :loading="sending"
                  :disabled="!newMessage.trim()"
                  class="send-btn"
                  size="large"
                >
                  <el-icon><Promotion /></el-icon>
                  Send
                </el-button>
              </template>
            </el-input>
            
            <!-- Quick reply suggestions -->
            <div class="quick-replies" v-if="!sending && filteredMessages.length > 0">
              <el-button v-for="(reply, index) in quickReplies" :key="index" 
                @click="useTemplate(reply)" size="small" class="reply-btn" plain>
                {{ reply }}
              </el-button>
            </div>
          </div>
        </div>
      </el-card>
    </div>
    
    <!-- Improved Message Templates Modal -->
    <el-dialog
      v-model="templatesVisible"
      title="Message Templates"
      width="700px"
      class="templates-dialog"
      destroy-on-close
      top="10vh"
    >
      <div class="dialog-content">
        <p class="dialog-description">Choose a template to quickly send common messages:</p>
        <div class="message-templates">
          <div
            v-for="template in messageTemplates"
            :key="template.id"
            class="template-item"
            @click="useTemplate(template.content)"
          >
            <div class="template-icon">
              <el-icon :size="24"><ChatDotSquare /></el-icon>
            </div>
            <div class="template-info">
              <div class="template-title">{{ template.title }}</div>
              <div class="template-content">{{ template.content }}</div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="templatesVisible = false" plain>Cancel</el-button>
          <el-button type="primary" @click="templatesVisible = false">OK</el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- Improved Image Upload Dialog -->
    <el-dialog
      v-model="imageUploadVisible"
      title="Upload Image for Analysis"
      width="700px"
      destroy-on-close
      top="10vh"
      class="upload-dialog"
    >
      <div class="dialog-content">
        <div class="upload-instruction">
          <el-icon :size="40" class="instruction-icon"><PictureRounded /></el-icon>
          <div class="instruction-text">
            <h3>Upload a photo for AI analysis</h3>
            <p>Our AI will analyze facial features, image quality, and other parameters to help you select the best photos.</p>
          </div>
        </div>
        
        <el-upload
          class="image-uploader"
          action="/api/images/upload"
          :headers="{ Authorization: `Bearer ${localStorage.getItem('token')}` }"
          :on-success="handleImageUploadSuccess"
          :on-error="handleImageUploadError"
          :before-upload="beforeImageUpload"
          :limit="1"
          :auto-upload="true"
          accept="image/*"
          drag
        >
          <div class="upload-content">
            <el-icon class="el-icon--upload" :size="40"><upload-filled /></el-icon>
            <div class="el-upload__text">Drop image here or <em>click to upload</em></div>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              <el-alert
                title="File requirements"
                type="info"
                :closable="false"
                show-icon
              >
                <ul class="upload-requirements">
                  <li>JPG or PNG format only</li>
                  <li>Maximum file size: 5MB</li>
                  <li>Good lighting recommended for best results</li>
                </ul>
              </el-alert>
            </div>
          </template>
        </el-upload>
        
        <div class="upload-preview" v-if="uploadedImageId">
          <div class="preview-badge">
            <el-badge value="Uploaded" type="success">
              <el-icon :size="24"><Check /></el-icon>
            </el-badge>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="imageUploadVisible = false" plain>Cancel</el-button>
          <el-button 
            type="primary" 
            :disabled="!uploadedImageId" 
            @click="analyzeUploadedImage"
            :loading="analyzing"
          >
            <el-icon><Crop /></el-icon>
            Analyze Image
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- Improved Photo Comparison Dialog -->
    <el-dialog
      v-model="photoComparisonVisible"
      title="Compare and Select Best Photos"
      width="800px"
      destroy-on-close
      top="5vh"
      class="comparison-dialog"
    >
      <div class="dialog-content">
        <div class="comparison-header">
          <el-steps :active="comparisonStep" finish-status="success" simple>
            <el-step title="Customer Info" icon="User" />
            <el-step title="Choose Source" icon="FolderOpened" />
            <el-step title="Select Photos" icon="PictureFilled" />
          </el-steps>
        </div>
        
        <el-form :model="comparisonForm" label-position="top" class="comparison-form">
          <!-- Step 1: Customer Info -->
          <div v-if="comparisonStep === 1" class="comparison-step">
            <div class="step-header">
              <h3>Enter Customer Information</h3>
              <p>This name will be used to create a custom folder for selected photos</p>
            </div>
            
            <el-form-item label="Customer Name" required>
              <el-input 
                v-model="comparisonForm.customerName" 
                placeholder="Enter customer name"
                prefix-icon="User"
                clearable
              ></el-input>
            </el-form-item>
            
            <el-form-item label="Additional Notes (Optional)">
              <el-input 
                v-model="comparisonForm.notes" 
                type="textarea" 
                placeholder="Add any special instructions or notes about this customer"
                :rows="3"
              ></el-input>
            </el-form-item>
          </div>
          
          <!-- Step 2: Choose Source -->
          <div v-if="comparisonStep === 2" class="comparison-step">
            <div class="step-header">
              <h3>Select Photo Source</h3>
              <p>Choose where to get photos for comparison</p>
            </div>
            
            <div class="source-options">
              <div 
                class="source-option" 
                :class="{ active: comparisonForm.source === 'drive' }"
                @click="comparisonForm.source = 'drive'"
              >
                <el-icon :size="40"><Folder /></el-icon>
                <div class="option-title">Google Drive</div>
                <div class="option-description">Process photos from your connected Google Drive account</div>
                <el-radio v-model="comparisonForm.source" label="drive"></el-radio>
              </div>
              
              <div 
                class="source-option"
                :class="{ active: comparisonForm.source === 'upload' }"
                @click="comparisonForm.source = 'upload'"
              >
                <el-icon :size="40"><Upload /></el-icon>
                <div class="option-title">Upload Photos</div>
                <div class="option-description">Upload new photos from your device for processing</div>
                <el-radio v-model="comparisonForm.source" label="upload"></el-radio>
              </div>
            </div>
          </div>
          
          <!-- Step 3: Select Photos -->
          <div v-if="comparisonStep === 3" class="comparison-step">
            <div class="step-header">
              <h3>{{ comparisonForm.source === 'drive' ? 'Google Drive Photos' : 'Upload Photos' }}</h3>
              <p>{{ comparisonForm.source === 'drive' ? 'All photos from your connected Google Drive will be processed' : 'Upload up to 10 photos for comparison' }}</p>
            </div>
            
            <template v-if="comparisonForm.source === 'drive'">
              <el-alert
                title="All photos from your connected Google Drive will be processed"
                type="info"
                :closable="false"
                class="mb-3"
                show-icon
              >
                <p>The AI will analyze all photos in your Drive account and select the best ones based on quality and face detection.</p>
              </el-alert>
              
              <div class="drive-status">
                <el-icon :size="40"><Connection /></el-icon>
                <div class="drive-status-text">
                  <div class="status-title">Google Drive Connected</div>
                  <div class="status-description">Ready to process photos</div>
                </div>
              </div>
            </template>
            
            <template v-else>
              <el-upload
                class="photo-comparison-uploader"
                action="/api/images/upload"
                :headers="{ Authorization: `Bearer ${localStorage.getItem('token')}` }"
                :on-success="handleComparisonUploadSuccess"
                :on-error="handleImageUploadError"
                :before-upload="beforeImageUpload"
                :limit="10"
                :auto-upload="true"
                accept="image/*"
                multiple
                list-type="picture-card"
              >
                <el-icon><Plus /></el-icon>
              </el-upload>
              
              <div class="upload-counter" v-if="uploadedImageIds.length > 0">
                <el-progress 
                  type="circle" 
                  :percentage="Math.min(100, uploadedImageIds.length * 10)" 
                  :width="80"
                  :stroke-width="10"
                  :format="() => `${uploadedImageIds.length}/10`"
                ></el-progress>
                <div class="counter-text">
                  <span>{{ uploadedImageIds.length }} {{ uploadedImageIds.length === 1 ? 'photo' : 'photos' }} uploaded</span>
                </div>
              </div>
            </template>
          </div>
        </el-form>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <div class="footer-left">
            <el-button @click="previousStep" v-if="comparisonStep > 1" plain>
              <el-icon><ArrowLeft /></el-icon> Previous
            </el-button>
          </div>
          
          <div class="footer-right">
            <el-button @click="photoComparisonVisible = false">Cancel</el-button>
            <el-button 
              v-if="comparisonStep < 3" 
              type="primary" 
              @click="nextStep" 
              :disabled="comparisonStep === 1 && !comparisonForm.customerName.trim()"
            >
              Next <el-icon><ArrowRight /></el-icon>
            </el-button>
            <el-button 
              v-else
              type="success" 
              :disabled="!canStartComparison" 
              :loading="processingComparison"
              @click="startPhotoComparison"
            >
              <el-icon><CameraFilled /></el-icon>
              Start Comparison
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <!-- New dialog for editing conversation title -->
    <el-dialog
      v-model="editConversationDialog"
      title="Rename Conversation"
      width="500px"
      destroy-on-close
    >
      <el-form>
        <el-form-item label="Title">
          <el-input v-model="editConversationTitle" placeholder="Enter conversation title" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editConversationDialog = false">Cancel</el-button>
          <el-button type="primary" @click="saveConversationTitle">Save</el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- Confirmation dialog for deletion -->
    <el-dialog
      v-model="confirmDeleteDialog"
      title="Confirm Delete"
      width="400px"
      destroy-on-close
    >
      <div class="delete-confirmation">
        <el-icon class="warning-icon"><WarningFilled /></el-icon>
        <p>{{ deleteConfirmMessage }}</p>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="confirmDeleteDialog = false">Cancel</el-button>
          <el-button type="danger" @click="confirmDelete">Delete</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Refresh, Promotion, Picture, Star, InfoFilled, QuestionFilled, 
  ChatLineRound, ChatLineSquare, Document, Folder, Upload, CameraFilled, 
  Plus, UploadFilled, Check, User, ArrowLeft, ArrowRight, ArrowDown, PictureRounded,
  FolderOpened, PictureFilled, Crop, Timer, Connection, Operation,
  DataAnalysis, ChatDotSquare, Loading, ChatDotRound, Edit, Delete, MoreFilled,
  WarningFilled
} from '@element-plus/icons-vue'
import { chatbotApi } from '@/services/api'
import type { ChatMessage, Conversation } from '@/types'

// Utility to clean markdown-like characters from bot responses
const sanitizeText = (text: string): string => text.replace(/[*#]+/g, '').trim()

const selectedPlatform = ref<'web' | 'zalo' | 'facebook'>('web')
const messages = ref<ChatMessage[]>([])
const newMessage = ref('')
const sending = ref(false)
const processing = ref(false)
const templatesVisible = ref(false)
const imageUploadVisible = ref(false)
const photoComparisonVisible = ref(false)
const processingComparison = ref(false)
const analyzing = ref(false)
const chatContainer = ref<HTMLElement>()
const uploadedImageId = ref<string | null>(null)
const uploadedImageIds = ref<string[]>([])

// Chat History
const activeConversationId = ref<string | null>(null);
const conversationHistory = ref<Conversation[]>([]);

const loadConversations = async () => {
  try {
    const response = await chatbotApi.getConversations();
    conversationHistory.value = response;
    // If no active conversation, set the first one as active
    if (!activeConversationId.value && response.length > 0) {
      await switchConversation(response[0]._id);
    } else if (response.length === 0) {
      // If no conversations exist, start a new one
      startNewConversation();
    }
  } catch (error) {
    ElMessage.error('Failed to load conversations');
  }
}

const switchConversation = async (id: string | null) => {
  if (id === null) {
    startNewConversation();
    return;
  }
  activeConversationId.value = id;
  messages.value = []; // Clear previous messages
  if (id) {
    try {
      const response = await chatbotApi.getMessagesByConversation(id);
      messages.value = response;
      scrollToBottom();
    } catch (error) {
      ElMessage.error('Failed to load messages for this conversation');
    }
  }
}

const startNewConversation = () => {
  activeConversationId.value = null;
  messages.value = [];
  newMessage.value = '';
}

// New variables
const comparisonStep = ref(1)
const isScrolling = ref(false)
const newMessageCount = ref(0)
const showScrollButton = ref(false)

const botStatus = ref({
  web: true,
  zalo: true,
  facebook: false
})

const messageStats = ref({
  web: 0,
  zalo: 0,
  facebook: 0
})

// New usage stats
const usageStats = ref({
  photos: 25,
  tasks: 8, 
  selected: 3
})

// Enhanced recent activity with more details
const recentActivity = ref([
  {
    id: '1',
    description: 'Photo processing completed for Customer A',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    type: 'success'
  },
  {
    id: '2',
    description: 'Best photos selected and shared via link',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    type: 'info'
  },
  {
    id: '3',
    description: 'User requested help via Zalo messenger',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    type: 'warning'
  }
])

// Quick reply suggestions
const quickReplies = [
  "Process my photos",
  "Show best photos",
  "How do I compare photos?",
  "Thank you!"
]

// Enhanced message templates with categories
const messageTemplates = [
  {
    id: '1',
    title: 'Processing Request',
    content: 'Please process my uploaded photos with face detection.',
    category: 'processing'
  },
  {
    id: '2',
    title: 'Best Photos Request',
    content: 'Send me the best photos from my recent uploads.',
    category: 'selection'
  },
  {
    id: '3',
    title: 'Compare Photos',
    content: 'I need to compare several photos and find the best ones for my customer named [Customer Name].',
    category: 'comparison'
  },
  {
    id: '4',
    title: 'Status Check',
    content: 'What is the current status of my photo processing?',
    category: 'status'
  },
  {
    id: '5',
    title: 'Help Request',
    content: 'I need help with using the photo management system.',
    category: 'help'
  },
  {
    id: '6',
    title: 'Share Photos',
    content: 'Can you create a shareable link for the selected photos?',
    category: 'sharing'
  },
  {
    id: '7',
    title: 'Quality Assessment',
    content: 'What factors determine the quality score of my photos?',
    category: 'help'
  }
]

// Enhanced comparison form with additional fields
const comparisonForm = ref({
  customerName: '',
  source: 'drive' as 'drive' | 'upload',
  notes: '',
  maxPhotos: 5,
  includeMetadata: true
})

const filteredMessages = computed(() => {
  return messages.value
    .filter(msg => msg.platform === selectedPlatform.value)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
})

const canStartComparison = computed(() => {
  return comparisonForm.value.customerName.trim() && 
    (comparisonForm.value.source === 'drive' || 
     (comparisonForm.value.source === 'upload' && uploadedImageIds.value.length > 0));
});

// New methods for enhanced functionality
const nextStep = () => {
  if (comparisonStep.value < 3) {
    comparisonStep.value++
  }
}

const previousStep = () => {
  if (comparisonStep.value > 1) {
    comparisonStep.value--
  }
}

const clearActivity = () => {
  ElMessage({
    message: 'Activity log cleared',
    type: 'success'
  })
  recentActivity.value = []
}

const getActivityType = (description: string) => {
  if (description.includes('processing')) return 'Processing'
  if (description.includes('selected')) return 'Selection'
  if (description.includes('uploaded')) return 'Upload'
  if (description.includes('help')) return 'Support'
  return 'Info'
}

const scrollToNewMessage = () => {
  showScrollButton.value = false
  scrollToBottom()
}

// Existing methods with improvements
const loadMessages = async () => {
  try {
    const response = await chatbotApi.getChatMessages(1, 100)
    messages.value = response.data
    
    // Update message stats
    messageStats.value = {
      web: messages.value.filter(msg => msg.platform === 'web').length,
      zalo: messages.value.filter(msg => msg.platform === 'zalo').length,
      facebook: messages.value.filter(msg => msg.platform === 'facebook').length
    }
  } catch (error) {
    // Use demo data if API fails
    messages.value = generateDemoMessages()
    messageStats.value = {
      web: messages.value.filter(msg => msg.platform === 'web').length,
      zalo: messages.value.filter(msg => msg.platform === 'zalo').length,
      facebook: messages.value.filter(msg => msg.platform === 'facebook').length
    }
  }
  
  scrollToBottom()
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
  const userMessageText = newMessage.value;
  newMessage.value = '';

  try {
    // Optimistically add user message to UI
    const tempUserMessage: ChatMessage = {
      _id: Date.now().toString(),
      conversationId: activeConversationId.value || 'temp',
      userId: '1', // This should come from auth store
      message: userMessageText,
      platform: selectedPlatform.value,
      type: 'text',
      createdAt: new Date().toISOString()
    };
    messages.value.push(tempUserMessage);
    scrollToBottom();
    
    const response = await chatbotApi.sendChatbotMessage(
      userMessageText,
      selectedPlatform.value,
      activeConversationId.value // can be null for new conversations
    );
    
    // If it was a new conversation, update the active ID and history
    if (!activeConversationId.value) {
      activeConversationId.value = response.conversation._id;
      conversationHistory.value.unshift(response.conversation);
    } else {
      // Update the existing conversation in the list to show the new last message and move to top
      const convoIndex = conversationHistory.value.findIndex(c => c._id === response.conversation._id);
      if (convoIndex !== -1) {
        const updatedConvo = conversationHistory.value.splice(convoIndex, 1)[0];
        updatedConvo.lastMessage = response.conversation.lastMessage;
        updatedConvo.updatedAt = response.conversation.updatedAt;
        conversationHistory.value.unshift(updatedConvo);
      }
    }

    // Add the bot's actual response
    const botResponse: ChatMessage = {
      _id: (Date.now() + 1).toString(),
      conversationId: response.conversation._id,
      userId: 'bot',
      message: userMessageText,
      response: sanitizeText(response.response),
      platform: selectedPlatform.value,
      type: 'text',
      createdAt: new Date().toISOString()
    };
    
    messages.value.push(botResponse);
    scrollToBottom();

  } catch (error: any) {
    ElMessage({
      message: error.message || 'Failed to send message',
      type: 'error',
      duration: 5000
    });
    // Optional: remove optimistic message on failure
    const tempMsgIndex = messages.value.findIndex(m => m._id === tempUserMessage._id);
    if (tempMsgIndex > -1) {
      messages.value.splice(tempMsgIndex, 1);
    }
  } finally {
    sending.value = false;
  }
}

const generateBotResponse = (message: string) => {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('process') || lowerMessage.includes('photo')) {
    return 'I\'ll start processing your photos right away. This may take a few minutes depending on the number of photos. You\'ll receive a notification when the processing is complete.'
  } else if (lowerMessage.includes('best') || lowerMessage.includes('good')) {
    return 'I\'ve selected the best photos based on face detection quality and image clarity. The photos with the highest scores feature well-lit subjects, sharp focus, and good composition. Would you like me to send them to you?'
  } else if (lowerMessage.includes('compare') || lowerMessage.includes('similar')) {
    return 'I can help you compare photos and find the most similar ones. Would you like to upload photos or use ones from Google Drive? I can analyze facial features, lighting, and quality to help you select the best images.'
  } else if (lowerMessage.includes('status') || lowerMessage.includes('how')) {
    return 'Your current processing status: 15 photos uploaded, 12 processed, 8 faces detected. Processing is 80% complete. Estimated time remaining: 2 minutes.'
  } else if (lowerMessage.includes('help')) {
    return 'I can help you with:\n1. Processing photos with AI face detection\n2. Finding best photos based on quality scores\n3. Comparing photos and selecting similar ones\n4. Checking processing status\n5. Creating shareable links for selected photos\n\nWhat would you like to do?'
  } else if (lowerMessage.includes('thank')) {
    return 'You\'re welcome! I\'m glad I could help. Is there anything else you need assistance with?'
  } else {
    return 'I understand your request. Let me help you with that. You can also use the quick action buttons for common tasks or try one of our templates for more specific requests.'
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

const refreshMessages = async () => {
  if (activeConversationId.value) {
    await switchConversation(activeConversationId.value);
    ElMessage({
      message: 'Messages refreshed',
      type: 'success',
      duration: 2000
    });
  }
}

const useTemplate = (content: string) => {
  newMessage.value = content
  templatesVisible.value = false
}

const showTemplatesModal = () => {
  templatesVisible.value = true
}

const showImageUpload = () => {
  uploadedImageId.value = null
  imageUploadVisible.value = true
}

const handleImageUploadSuccess = (response: any) => {
  uploadedImageId.value = response.data.id
  ElMessage({
    message: 'Image uploaded successfully!',
    type: 'success',
    duration: 2000
  })
  
  // Update usage stats
  usageStats.value.photos++
}

const handleComparisonUploadSuccess = (response: any) => {
  if (response.data && response.data.id) {
    uploadedImageIds.value.push(response.data.id)
    
    // Add to recent activity
    recentActivity.value.unshift({
      id: Date.now().toString(),
      description: `Uploaded image: ${response.data.filename}`,
      timestamp: new Date().toISOString()
    })
    
    ElMessage({
      message: 'Image uploaded for comparison',
      type: 'success',
      duration: 2000
    })
    
    // Update usage stats
    usageStats.value.photos++
  }
}

const handleImageUploadError = (error: any) => {
  ElMessage({
    message: error.message || 'Failed to upload image',
    type: 'error',
    duration: 5000
  })
}

const beforeImageUpload = (rawFile: File) => {
  const isJPGOrPNG = rawFile.type === 'image/jpeg' || rawFile.type === 'image/png'
  const isLt5M = rawFile.size / 1024 / 1024 < 5
  
  if (!isJPGOrPNG) {
    ElMessage.error('Image must be JPG/PNG format!')
  }
  if (!isLt5M) {
    ElMessage.error('Image must be smaller than 5MB!')
  }
  return isJPGOrPNG && isLt5M
}

const analyzeUploadedImage = async () => {
  if (!uploadedImageId.value) return
  
  sending.value = true
  analyzing.value = true
  imageUploadVisible.value = false
  
  try {
    const response = await chatbotApi.evaluateImages([uploadedImageId.value])
    
    // Create a bot message with the response
    const botResponse: ChatMessage = {
      _id: Date.now().toString(),
      conversationId: activeConversationId.value || 'temp', // Use active conversation or a temporary one
      userId: 'bot',
      message: 'Image analysis',
      response: sanitizeText(`Image evaluation started. This will take a moment to process. I'll find faces and assess the quality of the image using factors like lighting, focus, and composition.`),
      platform: selectedPlatform.value,
      type: 'text',
      createdAt: new Date().toISOString()
    };
    
    messages.value.push(botResponse);
    scrollToBottom();
    
    // Add to recent activity
    recentActivity.value.unshift({
      id: Date.now().toString(),
      description: 'Started image analysis',
      timestamp: new Date().toISOString()
    });
    
    // Update usage stats
    usageStats.value.tasks++;
    
  } catch (error: any) {
    ElMessage({
      message: error.message || 'Failed to analyze image',
      type: 'error',
      duration: 5000
    });
  } finally {
    sending.value = false;
    analyzing.value = false;
  }
}

const showPhotoComparisonDialog = () => {
  uploadedImageIds.value = []
  comparisonForm.value = {
    customerName: '',
    source: 'drive',
    notes: '',
    maxPhotos: 5,
    includeMetadata: true
  }
  comparisonStep.value = 1
  photoComparisonVisible.value = true
}

const startPhotoComparison = async () => {
  if (!canStartComparison.value) return
  
  processingComparison.value = true
  photoComparisonVisible.value = false
  
  try {
    let response
    
    if (comparisonForm.value.source === 'drive') {
      // Process images from Google Drive
      response = await chatbotApi.processDriveImages(comparisonForm.value.customerName)
    } else {
      // Process uploaded images
      response = await chatbotApi.selectBestImages(
        uploadedImageIds.value,
        comparisonForm.value.customerName,
        comparisonForm.value.maxPhotos
      )
    }
    
    // Create a user message
    const userMessage: ChatMessage = {
      _id: Date.now().toString(),
      conversationId: activeConversationId.value || 'temp', // Use active conversation or a temporary one
      userId: '1',
      message: `Please find the best photos for ${comparisonForm.value.customerName}`,
      platform: selectedPlatform.value,
      type: 'text',
      createdAt: new Date().toISOString()
    };
    
    messages.value.push(userMessage);
    scrollToBottom();
    
    // Create a bot message with the response
    const botResponse: ChatMessage = {
      _id: (Date.now() + 1).toString(),
      conversationId: activeConversationId.value || 'temp', // Use active conversation or a temporary one
      userId: 'bot',
      message: '',
      response: sanitizeText(`I'm processing photos for ${comparisonForm.value.customerName}. This may take a few minutes. I'll analyze faces, compare quality scores, and select the best ${comparisonForm.value.maxPhotos} images based on lighting, focus, composition, and facial expression.`),
      platform: selectedPlatform.value,
      type: 'text',
      createdAt: new Date().toISOString()
    };
    
    messages.value.push(botResponse);
    scrollToBottom();
    
    // Add to recent activity
    recentActivity.value.unshift({
      id: Date.now().toString(),
      description: `Started photo selection for ${comparisonForm.value.customerName}`,
      timestamp: new Date().toISOString()
    });
    
    // Update usage stats
    usageStats.value.tasks++;
    usageStats.value.selected += comparisonForm.value.maxPhotos;
    
    // Reset form
    uploadedImageIds.value = [];
    comparisonForm.value = {
      customerName: '',
      source: 'drive',
      notes: '',
      maxPhotos: 5,
      includeMetadata: true
    };
    
  } catch (error: any) {
    ElMessage({
      message: error.message || 'Failed to start photo comparison',
      type: 'error',
      duration: 5000
    });
  } finally {
    processingComparison.value = false;
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      const container = chatContainer.value;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  })
}

const formatTime = (dateString: string) => {
  if (!dateString) return '';
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

// Check if user is scrolling and show scroll button if needed
const onChatScroll = () => {
  if (chatContainer.value) {
    const { scrollTop, scrollHeight, clientHeight } = chatContainer.value
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
    
    showScrollButton.value = !isAtBottom && messages.value.length > 5
  }
}

// Watch for platform change to scroll to bottom
watch(selectedPlatform, () => {
  scrollToBottom()
})

// Watch for new messages
watch(messages, (newVal, oldVal) => {
  if (newVal.length > oldVal.length) {
    newMessageCount.value = newVal.length - oldVal.length
  }
}, { deep: true })

// Watch for new messages and scroll to bottom
watch(filteredMessages, () => {
  scrollToBottom();
}, { deep: true });

/* Add resize event listener to ensure proper scrolling after window resize */
onMounted(() => {
  loadConversations();
  
  // Add scroll event listener
  if (chatContainer.value) {
    chatContainer.value.addEventListener('scroll', onChatScroll);
  }
  
  // Add resize event listener
  window.addEventListener('resize', scrollToBottom);
});

/* Clean up event listeners */
onUnmounted(() => {
  if (chatContainer.value) {
    chatContainer.value.removeEventListener('scroll', onChatScroll);
  }
  window.removeEventListener('resize', scrollToBottom);
});

// Variables for editing messages
const editingMessageId = ref<string | null>(null);
const editMessageText = ref('');
const editConversationDialog = ref(false);
const editConversationTitle = ref('');
const editingConversationId = ref<string | null>(null);
const confirmDeleteDialog = ref(false);
const deleteConfirmMessage = ref('');
const deleteType = ref<'message' | 'conversation'>('message');
const deleteItemId = ref<string | null>(null);

// Handle message actions (edit, delete)
const handleMessageAction = (action: string, messageId: string) => {
  const message = messages.value.find(m => m._id === messageId);
  if (!message) return;
  
  if (action === 'edit') {
    editingMessageId.value = messageId;
    editMessageText.value = message.message;
  } else if (action === 'delete') {
    deleteType.value = 'message';
    deleteItemId.value = messageId;
    deleteConfirmMessage.value = 'Are you sure you want to delete this message? This action cannot be undone.';
    confirmDeleteDialog.value = true;
  }
};

// Save edited message
const saveEdit = async (messageId: string) => {
  if (!editMessageText.value.trim()) {
    ElMessage.warning('Message cannot be empty');
    return;
  }
  
  try {
    const response = await chatbotApi.updateMessage(messageId, editMessageText.value);
    
    // Update the message in the local array
    const index = messages.value.findIndex(m => m._id === messageId);
    if (index !== -1) {
      messages.value[index].message = editMessageText.value;
    }
    
    // Reset edit mode
    editingMessageId.value = null;
    editMessageText.value = '';
    
    ElMessage.success('Message updated successfully');
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to update message');
  }
};

// Cancel message editing
const cancelEdit = () => {
  editingMessageId.value = null;
  editMessageText.value = '';
};

// Handle conversation actions (edit, delete)
const handleConversationAction = (action: string, conversationId: string) => {
  const conversation = conversationHistory.value.find(c => c._id === conversationId);
  if (!conversation) return;
  
  if (action === 'edit') {
    editingConversationId.value = conversationId;
    editConversationTitle.value = conversation.title;
    editConversationDialog.value = true;
  } else if (action === 'delete') {
    deleteType.value = 'conversation';
    deleteItemId.value = conversationId;
    deleteConfirmMessage.value = 'Are you sure you want to delete this entire conversation? All messages will be permanently deleted.';
    confirmDeleteDialog.value = true;
  }
};

// Save conversation title
const saveConversationTitle = async () => {
  if (!editConversationTitle.value.trim() || !editingConversationId.value) {
    ElMessage.warning('Title cannot be empty');
    return;
  }
  
  try {
    const response = await chatbotApi.updateConversation(
      editingConversationId.value, 
      editConversationTitle.value
    );
    
    // Update the conversation in the local array
    const index = conversationHistory.value.findIndex(c => c._id === editingConversationId.value);
    if (index !== -1) {
      conversationHistory.value[index].title = editConversationTitle.value;
    }
    
    // Reset edit mode
    editingConversationId.value = null;
    editConversationTitle.value = '';
    editConversationDialog.value = false;
    
    ElMessage.success('Conversation renamed successfully');
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to rename conversation');
  }
};

// Confirm deletion (message or conversation)
const confirmDelete = async () => {
  if (!deleteItemId.value) {
    confirmDeleteDialog.value = false;
    return;
  }
  
  try {
    if (deleteType.value === 'message') {
      await chatbotApi.deleteMessage(deleteItemId.value);
      
      // Remove the message from the local array
      const index = messages.value.findIndex(m => m._id === deleteItemId.value);
      if (index !== -1) {
        messages.value.splice(index, 1);
      }
      
      ElMessage.success('Message deleted successfully');
    } else {
      await chatbotApi.deleteConversation(deleteItemId.value);
      
      // Remove the conversation from the local array
      const index = conversationHistory.value.findIndex(c => c._id === deleteItemId.value);
      if (index !== -1) {
        conversationHistory.value.splice(index, 1);
      }
      
      // If the deleted conversation was active, load another one
      if (activeConversationId.value === deleteItemId.value) {
        if (conversationHistory.value.length > 0) {
          await switchConversation(conversationHistory.value[0]._id);
        } else {
          startNewConversation();
        }
      }
      
      ElMessage.success('Conversation deleted successfully');
    }
  } catch (error: any) {
    ElMessage.error(error.message || `Failed to delete ${deleteType.value}`);
  } finally {
    confirmDeleteDialog.value = false;
    deleteItemId.value = null;
  }
};
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

@keyframes blink {
  0% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.5; }
}

@keyframes slideIn {
  0% { transform: translateX(-20px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0px); }
}

.chatbot-container-layout {
  display: flex;
  height: calc(100vh - 84px); /* Full height minus header */
  gap: 20px;
}

.conversation-history {
  width: 300px;
  flex-shrink: 0;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  padding: 16px;
  opacity: 0;
  animation: fadeInDown 0.5s ease-out 0.2s forwards;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.history-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-list {
  flex-grow: 1;
}

.history-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-bottom: 8px;
  position: relative;
}

.history-item:hover {
  background-color: #f5f7fa;
}

.history-item.active {
  background-color: #ecf5ff;
}

.history-item-icon {
  background-color: #e4e7ed;
  color: #606266;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.history-item.active .history-item-icon {
  background-color: #409eff;
  color: #fff;
}

.history-item-content {
  flex-grow: 1;
  overflow: hidden;
}

.history-item-title {
  font-weight: 500;
  font-size: 14px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-item-preview {
  font-size: 13px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 4px;
}

.history-item-time {
  font-size: 12px;
  color: #c0c4cc;
  flex-shrink: 0;
  padding-top: 2px;
}

.history-item-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message:hover .message-actions {
  opacity: 1;
}

.history-item:hover .history-item-actions {
  opacity: 1;
}

.chatbot-interface {
  flex-grow: 1;
  margin: 0;
  padding: 0;
  opacity: 0;
  animation: fadeInUp 0.5s ease-out 0.1s forwards;
  position: relative;
  display: flex;
  flex-direction: column;
}

.fade-in-down {
  animation: fadeInDown 0.5s ease-out forwards;
}

.animate-card {
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
  transition: all 0.3s ease;
}

/* Header styles */
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.header-content h1 {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 700;
  color: #333;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #409EFF, #1989fa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-subtitle {
  color: #666;
  font-size: 16px;
  margin: 0;
}

.platform-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.platform-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.platform-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
}

/* Card styles */
.chat-card {
  flex-grow: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden; /* This is important */
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  border: none;
  transition: all 0.3s ease;
  background: #fff;
  height: 100%; /* Ensure it takes full height */
}

.chat-card:hover {
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
}

.chat-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
  height: 46px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.platform-icon {
  color: #409EFF;
}

.platform-icon.facebook {
  color: #1877F2;
}

.platform-name {
  font-weight: 600;
  font-size: 16px;
}

.status-tag {
  margin-left: 8px;
}

.header-right {
  display: flex;
  align-items: center;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color 0.2s, background-color 0.2s;
}

.refresh-btn:hover {
  /* transform: rotate(45deg); -- animation removed per request */
}

/* New Chat Body Wrapper */
.chat-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0 20px 20px 20px;
  height: 100%; /* Ensure it takes full height */
  overflow: hidden; /* Prevent double scrollbars */
}

/* Chat container */
.chat-container {
  flex: 1 1 auto;
  min-height: 0; /* allow flexbox scrolling */
  overflow-y: auto;
  padding: 24px 8px 24px 24px;
  /* background: #f5f7fa; -- removed per request */
  scroll-behavior: smooth;
  position: relative;
  height: calc(100% - 100px); /* Ensure it takes full height minus input area */
  max-height: calc(100vh - 300px); /* Maximum height to ensure visibility */
}

.messages-wrapper {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 12px;
}

.message {
  margin-bottom: 8px;
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.message-avatar {
  margin-bottom: 8px;
  flex-shrink: 0;
}

.user-avatar {
  order: 1;
}

.message-fade-enter-active, 
.message-fade-leave-active {
  transition: all 0.3s ease;
}

.message-fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.message-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.user-message {
  justify-content: flex-end;
  animation: slideIn 0.3s ease-out;
}

.bot-message {
  justify-content: flex-start;
  animation: slideIn 0.3s ease-out;
}

.message-content {
  max-width: 75%;
  padding: 16px;
  border-radius: 18px;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.message-content:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.user-message .message-content {
  background: linear-gradient(135deg, #409EFF, #1989fa);
  color: white;
  border-bottom-right-radius: 4px;
  margin-left: auto;
}

.bot-message .message-content {
  background: white;
  color: #333;
  border-bottom-left-radius: 4px;
  margin-right: auto;
}

.message-text {
  margin-bottom: 8px;
  white-space: pre-wrap;
  line-height: 1.5;
  font-size: 15px;
}

.message-edit {
  margin-bottom: 12px;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.message-actions, .history-item-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message:hover .message-actions {
  opacity: 1;
}

.history-item:hover .history-item-actions {
  opacity: 1;
}

.message-meta {
  font-size: 12px;
  opacity: 0.7;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  position: relative;
}

.message-platform {
  text-transform: capitalize;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.message-image {
  margin-top: 12px;
  margin-bottom: 12px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.preview-image {
  width: 100%;
  max-height: 250px;
  object-fit: cover;
  transition: all 0.3s ease;
}

.preview-image:hover {
  transform: scale(1.02);
}

.image-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: #909399;
  font-size: 14px;
  background: #f5f7fa;
  border-radius: 8px;
}

.message-link {
  margin-top: 12px;
  margin-bottom: 8px;
}

.folder-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #409EFF;
  text-decoration: none;
  font-size: 15px;
  font-weight: 600;
  padding: 8px 16px;
  background: #ecf5ff;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.folder-link:hover {
  background: #d9ecff;
  transform: translateY(-2px);
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 350px;
  color: #909399;
}

.empty-chat-illustration {
  font-size: 48px;
  color: #c0c4cc;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

.empty-chat-text {
  margin: 16px 0;
  color: #606266;
  text-align: center;
}

/* Message input */
.message-input {
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}

.input-tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quick-replies {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.reply-btn {
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 13px;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.reply-btn:hover {
  transform: translateY(-2px);
}

.pulse-on-hover:hover {
  animation: pulse 1s infinite;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.2);
}

.input-animate {
  transition: all 0.3s ease;
}

.input-animate:focus-within :deep(.el-textarea__inner) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2) !important;
}

.template-icon {
  cursor: pointer;
  opacity: 0.7;
  transition: all 0.3s ease;
  margin: 0 8px;
  font-size: 18px;
}

.template-icon:hover {
  opacity: 1;
  transform: scale(1.1);
  color: #409EFF;
}

.send-btn {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  transition: all 0.3s ease;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.send-btn:hover {
  transform: translateX(2px);
}

/* Sidebar cards */
.action-card,
.status-card,
.activity-card,
.usage-card {
  margin-bottom: 24px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  border: none;
  transition: all 0.3s ease;
  background: #fff;
}

.action-card:hover,
.status-card:hover,
.activity-card:hover,
.usage-card:hover {
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-3px);
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 16px;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #ecf5ff;
  color: #409EFF;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.action-button {
  width: 100%;
  justify-content: flex-start;
  border-radius: 12px;
  padding: 16px;
  height: auto;
  transition: all 0.3s ease;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-button-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.action-description {
  font-size: 12px;
  opacity: 0.8;
  font-weight: normal;
  margin-top: 4px;
}

.platform-status {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-item {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
}

.status-item:hover {
  background: #f0f2f5;
  transform: translateY(-2px);
}

.status-active {
  position: relative;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f56c6c;
  position: relative;
}

.status-dot.active {
  background: #67C23A;
}

.status-dot.active::before {
  content: '';
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #67C23A;
  position: absolute;
  opacity: 0.4;
  animation: statusPulse 2s infinite;
}

.status-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.platform-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.status-stats {
  font-size: 13px;
  color: #666;
}

.status-progress {
  margin-top: 6px;
}

.timeline-item {
  position: relative;
  transition: all 0.3s ease;
}

.timeline-item:hover :deep(.el-timeline-item__node) {
  transform: scale(1.2);
  background-color: #409EFF;
}

.activity-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.activity-text {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
}

.activity-tag {
  flex-shrink: 0;
}

.empty-activity {
  text-align: center;
  color: #909399;
  padding: 30px 0;
}

.card-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}

/* Usage stats */
.usage-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-item {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  color: #606266;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

/* Dialog styles */
.dialog-content {
  padding: 16px 0;
}

.dialog-description {
  color: #606266;
  margin-bottom: 20px;
}

.message-templates {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.template-item {
  padding: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.template-item:hover {
  border-color: #409EFF;
  background: #f0f9ff;
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.15);
}

.template-icon {
  color: #409EFF;
  background: #ecf5ff;
  padding: 8px;
  border-radius: 8px;
}

.template-info {
  flex: 1;
}

.template-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
  font-size: 16px;
}

.template-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
}

/* Upload dialog */
.upload-dialog :deep(.el-dialog__body) {
  padding: 0 20px 20px;
}

.upload-instruction {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
  background: #f0f9ff;
  padding: 20px;
  border-radius: 12px;
}

.instruction-icon {
  color: #409EFF;
  flex-shrink: 0;
}

.instruction-text h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #333;
}

.instruction-text p {
  margin: 0;
  color: #606266;
  line-height: 1.5;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.upload-requirements {
  margin: 10px 0 0 20px;
  padding: 0;
  list-style-type: disc;
  font-size: 13px;
}

.upload-preview {
  margin-top: 24px;
  text-align: center;
}

.preview-badge {
  display: inline-block;
}

/* Comparison dialog */
.comparison-dialog :deep(.el-dialog__body) {
  padding: 0 20px 20px;
}

.comparison-header {
  margin-bottom: 24px;
}

.comparison-step {
  padding: 20px 0;
}

.step-header {
  margin-bottom: 24px;
  text-align: center;
}

.step-header h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #333;
}

.step-header p {
  margin: 0;
  color: #606266;
}

.source-options {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.source-option {
  flex: 1;
  padding: 20px;
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.source-option.active {
  border-color: #409EFF;
  background: #f0f9ff;
}

.source-option:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.option-title {
  font-weight: 600;
  margin: 16px 0 8px 0;
  font-size: 16px;
}

.option-description {
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
  margin-bottom: 16px;
}

.drive-status {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #f0f9ff;
  padding: 20px;
  border-radius: 12px;
  margin: 24px 0;
}

.drive-status-text {
  flex: 1;
}

.status-title {
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 16px;
}

.status-description {
  color: #606266;
}

.upload-counter {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 24px;
}

.counter-text {
  margin-top: 16px;
  font-size: 16px;
  font-weight: 500;
  color: #409EFF;
}

.footer-left, .footer-right {
  display: flex;
  gap: 12px;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* Typing indicator */
.typing-indicator {
  position: fixed;
  bottom: -50px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px 20px;
  border-radius: 30px;
  transition: all 0.3s ease;
  z-index: 999;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  pointer-events: none; /* avoid blocking inputs */
}

.typing-indicator-content {
  display: flex;
  align-items: center;
  gap: 4px;
}

.typing-text {
  font-size: 14px;
  font-weight: 500;
}

.show-typing {
  bottom: 100px; /* leave room for input bar */
}

.typing-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: white;
  animation: blink 1s infinite;
}

.typing-dot:nth-child(1) {
  animation-delay: 0s;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

/* Element UI overrides */
:deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow: hidden; /* Prevent double scrollbars */
  height: 100%; /* Ensure it takes full height */
}

:deep(.el-card__header) {
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
  padding: 16px 20px;
}

:deep(.el-radio-button__inner) {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  height: auto;
}

:deep(.el-textarea__inner) {
  border-radius: 8px;
  transition: all 0.3s ease;
  padding: 12px;
  font-size: 15px;
  line-height: 1.5;
}

:deep(.el-button) {
  font-weight: 500;
}

:deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

:deep(.el-dialog__title) {
  font-weight: 600;
  font-size: 20px;
}

:deep(.el-dialog__header) {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.el-timeline-item__content) {
  margin-left: 12px;
}

:deep(.el-upload--picture-card) {
  --el-upload-picture-card-size: 120px;
  border-radius: 12px;
}

:deep(.el-upload-list--picture-card .el-upload-list__item) {
  border-radius: 12px;
}

/* Responsive styles */
@media (max-width: 1200px) {
  .chatbot-interface {
    flex-direction: column;
    padding: 20px;
  }
  
  .chat-card {
    height: 500px;
  }
}

@media (max-width: 992px) {
  .conversation-history {
    display: none; /* Hide history on smaller screens for now */
  }

  .chat-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
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
  
  .el-col {
    width: 100% !important;
  }
  
  .source-options {
    flex-direction: column;
  }
}

.scroll-to-bottom {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  background: #409EFF;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 20;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.scroll-to-bottom:hover {
  background: #66b1ff;
  transform: translateY(-2px);
}

@keyframes rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.typing-icon {
  animation: rotate 1s linear infinite;
}

/* Remove rotate since icon removed; keep blinking dots */

.typing-content {
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  padding: 12px 16px;
  border-radius: 18px;
}

.typing-row {
  animation: slideIn 0.3s ease-out;
}

.loading-icon {
  animation: rotate 1s linear infinite;
  color: #409EFF;
}

@keyframes rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.delete-confirmation {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
}

.warning-icon {
  font-size: 24px;
  color: #E6A23C;
}
</style> 