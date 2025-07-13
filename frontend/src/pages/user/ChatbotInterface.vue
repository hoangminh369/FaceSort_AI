<template>
  <div class="chatbot-container-layout">
    <!-- Conversation History Sidebar -->
    <div class="conversation-history">
      <div class="history-header">
        <h4><el-icon><ChatLineSquare /></el-icon> Chat History</h4>
        <el-button @click="startNewConversation" type="primary" size="small" plain>
          <el-icon><Plus /></el-icon> New
        </el-button>
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
          <div class="history-item-actions">
            <el-dropdown trigger="click" @command="handleConversationAction($event, convo._id)">
              <el-button link size="small">
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
          <p class="header-subtitle">Your intelligent photo management companion</p>
        </div>
        <div class="header-actions">
          <el-button size="default" @click="showPhotoComparisonDialog" type="success" plain>
            <el-icon><CameraFilled /></el-icon>
            Compare Photos
          </el-button>
          <el-button size="default" @click="showImageUpload" type="primary" plain>
            <el-icon><Upload /></el-icon>
            Analyze Images
          </el-button>
        </div>
      </div>
      
      <el-card class="chat-card animate-card">
        <template #header>
          <div class="chat-card-header">
            <div class="header-left">
              <el-icon :size="20" class="platform-icon">
                <ChatDotSquare />
              </el-icon>
              <span class="platform-name">AI Assistant Chat</span>
              <el-tag size="small" type="success" class="status-tag">
                Online
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
                v-for="message in messages"
                :key="message._id"
                :class="['message', message.response ? 'bot-message' : 'user-message']"
              >
                <div class="message-avatar" v-if="message.response">
                  <el-avatar :size="36">
                    <el-icon><Avatar /></el-icon>
                  </el-avatar>
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
                  
                  <!-- Display attached images -->
                  <div v-if="message.attachments && message.attachments.length > 0" class="message-attachments">
                    <div class="attachment-grid">
                      <div 
                        v-for="(attachment, index) in message.attachments" 
                        :key="index"
                        class="attachment-item"
                      >
                        <el-image
                          :src="attachment.url"
                          fit="cover"
                          :preview-src-list="message.attachments.map(att => att.url)"
                          :initial-index="index"
                          class="attachment-image"
                        >
                          <template #error>
                            <div class="image-error">
                              <el-icon><Picture /></el-icon>
                              Image unavailable
                            </div>
                          </template>
                        </el-image>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Display single image (legacy support) -->
                  <div v-else-if="message.imageUrl" class="message-image">
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
                          Image unavailable
                        </div>
                      </template>
                    </el-image>
                  </div>
                  
                  <!-- Display link to best photos -->
                  <div v-if="message.folderLink" class="message-link">
                    <a :href="message.folderLink" target="_blank" class="folder-link">
                      <el-icon><Folder /></el-icon>
                      View Best Photos Folder
                    </a>
                  </div>
                  
                  <div class="message-meta">
                    <span class="message-time">
                      {{ formatTime(message.createdAt) }}
                    </span>
                    
                    <!-- Message actions (only for user messages) -->
                    <div v-if="!message.response" class="message-actions">
                      <el-dropdown trigger="click" @command="handleMessageAction($event, message._id)">
                        <el-button link size="small">
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
                  <el-avatar :size="36">
                    <el-icon><User /></el-icon>
                  </el-avatar>
                </div>
              </div>
            </transition-group>
            
            <!-- Typing indicator -->
            <transition name="message-fade">
              <div
                v-if="sending"
                key="bot-typing-row"
                class="message bot-message typing-row"
              >
                <div class="message-avatar">
                  <el-avatar :size="36">
                    <el-icon><Avatar /></el-icon>
                  </el-avatar>
                </div>
                <div class="message-content typing-content">
                  <el-icon class="loading-icon"><Loading /></el-icon>
                  <span>AI is typing</span>
                  <div class="typing-dots">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                  </div>
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

            <!-- Empty state -->
            <div v-if="messages.length === 0" class="empty-chat">
              <el-empty description="No messages yet" :image-size="120">
                <template #image>
                  <div class="empty-chat-illustration">
                    <el-icon><ChatDotSquare /></el-icon>
                  </div>
                </template>
                <div class="empty-chat-text">
                  <h3>Start a conversation with your AI assistant</h3>
                  <p>Upload images, ask questions, or get help with photo management</p>
                </div>
                <el-button type="primary" @click="sendTestMessage" class="pulse-on-hover" size="large">
                  <el-icon><ChatLineRound /></el-icon>
                  Send Sample Message
                </el-button>
              </el-empty>
            </div>
          </div>
          
          <!-- Message input -->
          <div class="message-input-container">
            <!-- Attached images preview -->
            <div class="attached-preview" v-if="attachedImages.length > 0">
              <div class="attached-header">
                <span class="attached-count">{{ attachedImages.length }} image{{ attachedImages.length > 1 ? 's' : '' }} attached</span>
                <el-button size="small" link @click="clearAllAttachments">
                  <el-icon><Close /></el-icon> Clear all
                </el-button>
              </div>
              <div class="attached-grid">
                <div
                  class="attached-thumb"
                  v-for="(img, idx) in attachedImages"
                  :key="idx"
                >
                  <img :src="img.url" alt="attachment" />
                  <el-icon class="remove" @click="removeAttachment(idx)"><Close /></el-icon>
                </div>
              </div>
            </div>

            <!-- Quick replies -->
            <div class="quick-replies" v-if="!sending && messages.length > 0">
              <el-button v-for="(reply, index) in quickReplies" :key="index" 
                @click="useTemplate(reply)" size="small" class="reply-btn" plain>
                {{ reply }}
              </el-button>
            </div>

            <!-- Input area -->
            <div class="message-input">
              <el-button
                class="upload-btn"
                type="primary"
                circle
                size="large"
                @click="triggerFileSelect"
                :disabled="sending"
                v-tooltip="'Attach images'"
              >
                <el-icon><Plus /></el-icon>
              </el-button>
              
              <input
                type="file"
                ref="fileInput"
                multiple
                accept="image/*"
                @change="handleFilesSelected"
                style="display: none;"
              />
              
              <div class="input-wrapper">
                <el-input
                  v-model="newMessage"
                  placeholder="Type your message..."
                  @keyup.enter.exact="sendMessage"
                  @keyup.enter.shift.exact="newMessage += '\n'"
                  :disabled="sending"
                  class="input-animate"
                  :autosize="{ minRows: 1, maxRows: 4 }"
                  type="textarea"
                  resize="none"
                >
                  <template #prefix>
                    <div class="input-tools">
                      <el-tooltip content="Message Templates" placement="top">
                        <el-icon v-if="!sending" @click="showTemplatesModal" class="template-icon">
                          <Document />
                        </el-icon>
                      </el-tooltip>
                    </div>
                  </template>
                </el-input>
                
                <el-button
                  type="primary"
                  @click="sendMessage"
                  :loading="sending || uploadingAttachments"
                  :disabled="(!newMessage.trim() && attachedImages.length === 0) || uploadingAttachments"
                  class="send-btn"
                  size="large"
                >
                  <el-icon><Promotion /></el-icon>
                  Send
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>
    
    <!-- Message Templates Modal -->
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
    
    <!-- Image Upload Dialog -->
    <el-dialog
      v-model="imageUploadVisible"
      title="Upload Images for Analysis"
      width="700px"
      destroy-on-close
      top="10vh"
      class="upload-dialog"
    >
      <div class="dialog-content">
        <div class="upload-instruction">
          <el-icon :size="40" class="instruction-icon"><PictureRounded /></el-icon>
          <div class="instruction-text">
            <h3>Upload photos for AI analysis</h3>
            <p>Our AI will analyze facial features, image quality, and other parameters to help you select the best photos. You can upload up to 20 images at once.</p>
          </div>
        </div>
        
        <el-upload
          class="image-uploader"
          :action="uploadActionUrl"
          name="images"
          :headers="authHeaders"
          :on-success="handleImageUploadSuccess"
          :on-error="handleImageUploadError"
          :before-upload="beforeImageUpload"
          :limit="20"
          :auto-upload="true"
          accept="image/*"
          multiple
          drag
        >
          <div class="upload-content">
            <el-icon class="el-icon--upload" :size="40"><upload-filled /></el-icon>
            <div class="el-upload__text">Drop images here or <em>click to upload</em></div>
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
                  <li>JPG, PNG, WebP, or GIF format</li>
                  <li>Maximum file size: 1GB per image</li>
                  <li>Up to 20 images can be uploaded at once</li>
                  <li>Good lighting recommended for best results</li>
                </ul>
              </el-alert>
            </div>
          </template>
        </el-upload>
        
        <div class="upload-preview" v-if="analysisImageIds.length > 0">
          <div class="preview-badge">
            <el-badge :value="`${analysisImageIds.length} Uploaded`" type="success">
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
            :disabled="!analysisImageIds.length" 
            @click="analyzeUploadedImage"
            :loading="analyzing"
          >
            <el-icon><Crop /></el-icon>
            Analyze Images
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- Photo Comparison Dialog -->
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
              <p>{{ comparisonForm.source === 'drive' ? 'All photos from your connected Google Drive will be processed' : 'Upload up to 50 photos for comparison' }}</p>
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
                :action="uploadActionUrl"
                name="images"
                :headers="authHeaders"
                :on-success="handleComparisonUploadSuccess"
                :on-error="handleImageUploadError"
                :before-upload="beforeImageUpload"
                :limit="50"
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
                  :percentage="Math.min(100, uploadedImageIds.length * 2)" 
                  :width="80"
                  :stroke-width="10"
                  :format="() => `${uploadedImageIds.length}/50`"
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

    <!-- Conversation editing dialog -->
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
  WarningFilled, Close, Avatar
} from '@element-plus/icons-vue'
import { chatbotApi, imageApi } from '@/services/api'
import type { ChatMessage, Conversation } from '@/types'

// Utility to clean markdown-like characters from bot responses
const sanitizeText = (text: string): string => text.replace(/[*#]+/g, '').trim()

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
const uploadedImageIds = ref<string[]>([])
const analysisImageIds = ref<string[]>([])
const attachedImages = ref<{ id: string; url: string }[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const uploadingAttachments = ref(false)

// Chat History
const activeConversationId = ref<string | null>(null);
const conversationHistory = ref<Conversation[]>([]);

const loadConversations = async () => {
  try {
    const response = await chatbotApi.getConversations();
    conversationHistory.value = response;
    if (!activeConversationId.value && response.length > 0) {
      await switchConversation(response[0]._id);
    } else if (response.length === 0) {
      startNewConversation();
    }
  } catch (error) {
    ElMessage.error('Failed to load conversation history');
  }
}

const switchConversation = async (id: string | null) => {
  if (id === null) {
    startNewConversation();
    return;
  }
  activeConversationId.value = id;
  messages.value = [];
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

// UI state
const comparisonStep = ref(1)
const showScrollButton = ref(false)

// Quick reply suggestions
const quickReplies = computed(() => {
  // Show different quick replies based on context
  if (attachedImages.value.length > 0) {
    return [
      "Process these photos for customer",
      "Compare with my Google Drive",
      "Find similar faces",
      "Create photo album"
    ]
  } else {
    return [
      "Connect Google Drive",
      "How to compare photos?", 
      "Show recent albums",
      "Help"
    ]
  }
})

// Enhanced message templates
const messageTemplates = [
  {
    id: '1',
    title: 'Process Photos for Customer',
    content: 'Process these photos for customer [Customer Name]',
    category: 'processing'
  },
  {
    id: '2',
    title: 'Compare with Drive Photos',
    content: 'Compare these photos with my Google Drive and find the best matches for customer [Customer Name]',
    category: 'comparison'
  },
  {
    id: '3',
    title: 'Best Photos Request',
    content: 'Find the best photos from my Google Drive for customer [Customer Name]',
    category: 'selection'
  },
  {
    id: '4',
    title: 'Face Detection Request',
    content: 'Please analyze these photos and detect faces for customer [Customer Name]',
    category: 'processing'
  },
  {
    id: '5',
    title: 'Create Photo Album',
    content: 'Create a photo album with the best photos for customer [Customer Name]',
    category: 'sharing'
  },
  {
    id: '6',
    title: 'Status Check',
    content: 'What is the current status of my photo processing?',
    category: 'status'
  },
  {
    id: '7',
    title: 'Help Request',
    content: 'How do I use the photo comparison feature?',
    category: 'help'
  }
]

// Comparison form
const comparisonForm = ref({
  customerName: '',
  source: 'drive' as 'drive' | 'upload',
  notes: '',
  maxPhotos: 5,
  includeMetadata: true
})

const canStartComparison = computed(() => {
  return comparisonForm.value.customerName.trim() && 
    (comparisonForm.value.source === 'drive' || 
     (comparisonForm.value.source === 'upload' && uploadedImageIds.value.length > 0));
});

// Enhanced methods
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

const sendMessage = async () => {
  if (!newMessage.value.trim() && attachedImages.value.length === 0) return
  
  if (uploadingAttachments.value) {
    ElMessage.warning('Please wait for images to finish uploading')
    return
  }

  sending.value = true
  const userMessageText = newMessage.value.trim()
  const attachmentIds = attachedImages.value.map(img => img.id)
  
  // Clear input immediately
  newMessage.value = ''

  // Create user message with attachments
  console.log('Creating user message with attachments:', attachedImages.value);
  const userMessage: ChatMessage = {
    _id: Date.now().toString(),
    conversationId: activeConversationId.value || 'temp',
    userId: '1',
    message: userMessageText || (attachedImages.value.length > 0 ? `Sent ${attachedImages.value.length} image${attachedImages.value.length > 1 ? 's' : ''}` : ''),
    platform: 'web',
    type: 'text',
    attachments: attachedImages.value.map(img => ({
      id: img.id,
      url: img.url,
      type: 'image'
    })),
    createdAt: new Date().toISOString()
  }
  console.log('User message created:', userMessage);

  // Add user message to UI immediately
  messages.value.push(userMessage)
  scrollToBottom()

  // Add processing message for long operations
  let processingMessage: ChatMessage | null = null
  let processingTimer: NodeJS.Timeout | null = null
  
  if (attachmentIds.length > 0) {
    processingTimer = setTimeout(() => {
      processingMessage = {
        _id: 'processing-' + Date.now().toString(),
        conversationId: activeConversationId.value || 'temp',
        userId: 'bot',
        message: 'Processing images...',
        response: `🔄 Processing your ${attachmentIds.length} image${attachmentIds.length > 1 ? 's' : ''}. This may take a few minutes for face detection and analysis...`,
        platform: 'web',
        type: 'text',
        createdAt: new Date().toISOString()
      }
      messages.value.push(processingMessage)
      scrollToBottom()
    }, 3000) // Show processing message after 3 seconds
  }

  try {
    console.log('Sending message with attachments:', attachmentIds) // Debug log
    
    const response = await chatbotApi.sendChatbotMessage(
      userMessageText || '',
      'web',
      activeConversationId.value,
      attachmentIds.length ? attachmentIds : undefined
    )
    
    console.log('API Response:', response) // Debug log
    
    // Clear processing timer and message
    if (processingTimer) {
      clearTimeout(processingTimer)
    }
    if (processingMessage) {
      const processingIndex = messages.value.findIndex(m => m._id === processingMessage!._id)
      if (processingIndex !== -1) {
        messages.value.splice(processingIndex, 1)
      }
    }
    
    // Check if response is valid
    if (!response) {
      throw new Error('Invalid response from server');
    }
    
    // Check if response indicates error
    if (response.success === false) {
      throw new Error(response.error || 'Server error');
    }
    
    // Check if response has conversation data
    if (!response.conversation) {
      throw new Error('Invalid response format - missing conversation data');
    }
    
    // Handle conversation management
    if (!activeConversationId.value) {
      activeConversationId.value = response.conversation._id
      conversationHistory.value.unshift(response.conversation)
    } else {
      const convoIndex = conversationHistory.value.findIndex(c => c._id === response.conversation._id)
      if (convoIndex !== -1) {
        const updatedConvo = conversationHistory.value.splice(convoIndex, 1)[0]
        updatedConvo.lastMessage = response.conversation.lastMessage
        updatedConvo.updatedAt = response.conversation.updatedAt
        conversationHistory.value.unshift(updatedConvo)
      }
    }

    // Parse response to check for folder link
    let folderLink: string | undefined = undefined
    if (response.response && response.response.includes('http')) {
      const urlMatch = response.response.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        folderLink = urlMatch[1];
      }
    }

    // Add bot response
    const botResponse: ChatMessage = {
      _id: (Date.now() + 1).toString(),
      conversationId: response.conversation._id,
      userId: 'bot',
      message: userMessageText || 'Image conversation',
      response: sanitizeText(response.response || ''),
      platform: 'web',
      type: 'text',
      folderLink: folderLink,
      createdAt: new Date().toISOString()
    }
    
    messages.value.push(botResponse)
    scrollToBottom()

    // Clear attachments only after successful response
    console.log('Clearing attachments after successful response');
    attachedImages.value = []
    
    // Show appropriate success message
    if (response.response.includes('successfully processed')) {
      ElMessage.success('Photos processed successfully! Check the response for the link.')
    } else if (response.response.includes('No faces detected')) {
      ElMessage.warning('No faces were detected in the uploaded images. Please try with different photos.')
    } else {
      ElMessage.success(`Message ${attachmentIds.length ? `with ${attachmentIds.length} image${attachmentIds.length > 1 ? 's' : ''}` : ''} sent successfully`)
    }

  } catch (error: any) {
    console.error('Send message error:', error) // Debug log
    
    // Clear processing timer and message
    if (processingTimer) {
      clearTimeout(processingTimer)
    }
    if (processingMessage) {
      const processingIndex = messages.value.findIndex(m => m._id === processingMessage!._id)
      if (processingIndex !== -1) {
        messages.value.splice(processingIndex, 1)
      }
    }
    
    // Remove the optimistic user message on error
    messages.value = messages.value.filter(m => m._id !== userMessage._id)
    
    // Check if error response contains conversation and response (from 500 error)
    let errorResponse = null;
    if (error.response && error.response.data) {
      const errorData = error.response.data;
      
      // If backend returned conversation and response in error, use them
      if (errorData.conversation && errorData.response) {
        // Update conversation if provided
        if (!activeConversationId.value) {
          activeConversationId.value = errorData.conversation._id;
        }
        
        // Show error response as chat message
        const errorMessage: ChatMessage = {
          _id: 'error-' + Date.now().toString(),
          conversationId: activeConversationId.value || 'temp',
          userId: 'bot',
          message: 'Error',
          response: errorData.response,
          platform: 'web',
          type: 'text',
          createdAt: new Date().toISOString()
        }
        
        messages.value.push(errorMessage)
        scrollToBottom()
        
        // Use backend error message for toast
        errorResponse = errorData.error || 'Server error occurred';
      }
    }
    
    // Show detailed error message
    let errorMessage = errorResponse || 'Failed to send message. Please try again.'
    if (!errorResponse && error.message) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again with fewer images or check your connection.'
      } else if (error.message.includes('Network Error')) {
        errorMessage = 'Network error. Please check your connection and try again.'
      } else {
        errorMessage = error.message
      }
    }
    
    ElMessage({
      message: errorMessage,
      type: 'error',
      duration: 8000,
      showClose: true
    })
    
    // Restore input on error
    newMessage.value = userMessageText
    
    // Restore attachments on error
    if (attachmentIds.length > 0) {
      // Try to restore attachments if they were cleared
      // This would require keeping a backup of attachedImages
    }
  } finally {
    sending.value = false
  }
}

const sendTestMessage = () => {
  newMessage.value = 'Hello, can you help me process my photos?'
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
  analysisImageIds.value = []
  imageUploadVisible.value = true
}

const handleImageUploadSuccess = (response: any, file: any, fileList: any) => {
  const files = Array.isArray(response.data) ? response.data : [response.data]
  files.forEach((file: any) => {
    if (file && (file._id || file.id)) {
      analysisImageIds.value.push(file._id || file.id)
    }
  })
  ElMessage({
    message: `${files.length} image${files.length > 1 ? 's' : ''} uploaded successfully!`,
    type: 'success',
    duration: 2000
  })
  
  // Clear the upload list after successful upload
  if (fileList && fileList.length === analysisImageIds.value.length) {
    nextTick(() => {
      const uploadRef = document.querySelector('.image-uploader .el-upload-list')
      if (uploadRef) {
        uploadRef.innerHTML = ''
      }
    })
  }
}

const handleComparisonUploadSuccess = (response: any, file: any, fileList: any) => {
  const files = Array.isArray(response.data) ? response.data : [response.data]
  files.forEach((file: any) => {
    if (file && (file._id || file.id)) {
      uploadedImageIds.value.push(file._id || file.id)
    }
  })
   
  ElMessage({
    message: `${files.length} image${files.length > 1 ? 's' : ''} uploaded for comparison`,
    type: 'success',
    duration: 2000
  })
  
  // Clear the upload list after successful upload
  if (fileList && fileList.length === uploadedImageIds.value.length) {
    nextTick(() => {
      const uploadRef = document.querySelector('.photo-comparison-uploader .el-upload-list')
      if (uploadRef) {
        uploadRef.innerHTML = ''
      }
    })
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
  const isValidFormat = rawFile.type === 'image/jpeg' || rawFile.type === 'image/png' || rawFile.type === 'image/webp' || rawFile.type === 'image/gif'
  const isLt1GB = rawFile.size / 1024 / 1024 / 1024 < 1
  
  if (!isValidFormat) {
    ElMessage.error('Image must be JPG, PNG, WebP, or GIF format!')
  }
  if (!isLt1GB) {
    ElMessage.error('Image must be smaller than 1GB!')
  }
  return isValidFormat && isLt1GB
}

const analyzeUploadedImage = async () => {
  if (!analysisImageIds.value.length) return
  
  sending.value = true
  analyzing.value = true
  imageUploadVisible.value = false
  
  try {
    const response = await chatbotApi.evaluateImages(analysisImageIds.value)
    
    const botResponse: ChatMessage = {
      _id: Date.now().toString(),
      conversationId: activeConversationId.value || 'temp',
      userId: 'bot',
      message: 'Image analysis',
      response: sanitizeText(`Image evaluation started. This will take a moment to process ${analysisImageIds.value.length} image${analysisImageIds.value.length > 1 ? 's' : ''}. I'll find faces and assess the quality of the images using factors like lighting, focus, and composition.`),
      platform: 'web',
      type: 'text',
      createdAt: new Date().toISOString()
    };
    
    messages.value.push(botResponse);
    scrollToBottom();
    
  } catch (error: any) {
    ElMessage({
      message: error.message || 'Failed to analyze images',
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
      response = await chatbotApi.processDriveImages(comparisonForm.value.customerName)
    } else {
      response = await chatbotApi.selectBestImages(
        uploadedImageIds.value,
        comparisonForm.value.customerName,
        comparisonForm.value.maxPhotos
      )
    }
    
    const userMessage: ChatMessage = {
      _id: Date.now().toString(),
      conversationId: activeConversationId.value || 'temp',
      userId: '1',
      message: `Please find the best photos for ${comparisonForm.value.customerName}`,
      platform: 'web',
      type: 'text',
      createdAt: new Date().toISOString()
    };
    
    messages.value.push(userMessage);
    scrollToBottom();
    
    const botResponse: ChatMessage = {
      _id: (Date.now() + 1).toString(),
      conversationId: activeConversationId.value || 'temp',
      userId: 'bot',
      message: '',
      response: sanitizeText(`I'm processing photos for ${comparisonForm.value.customerName}. This may take a few minutes. I'll analyze faces, compare quality scores, and select the best ${comparisonForm.value.maxPhotos} images based on lighting, focus, composition, and facial expression.`),
      platform: 'web',
      type: 'text',
      createdAt: new Date().toISOString()
    };
    
    messages.value.push(botResponse);
    scrollToBottom();
    
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

const onChatScroll = () => {
  if (chatContainer.value) {
    const { scrollTop, scrollHeight, clientHeight } = chatContainer.value
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
    
    showScrollButton.value = !isAtBottom && messages.value.length > 5
  }
}

// Message editing
const editingMessageId = ref<string | null>(null);
const editMessageText = ref('');
const editConversationDialog = ref(false);
const editConversationTitle = ref('');
const editingConversationId = ref<string | null>(null);
const confirmDeleteDialog = ref(false);
const deleteConfirmMessage = ref('');
const deleteType = ref<'message' | 'conversation'>('message');
const deleteItemId = ref<string | null>(null);

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

const saveEdit = async (messageId: string) => {
  if (!editMessageText.value.trim()) {
    ElMessage.warning('Message cannot be empty');
    return;
  }
  
  try {
    const response = await chatbotApi.updateMessage(messageId, editMessageText.value);
    
    const index = messages.value.findIndex(m => m._id === messageId);
    if (index !== -1) {
      messages.value[index].message = editMessageText.value;
    }
    
    editingMessageId.value = null;
    editMessageText.value = '';
    
    ElMessage.success('Message updated successfully');
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to update message');
  }
};

const cancelEdit = () => {
  editingMessageId.value = null;
  editMessageText.value = '';
};

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
    
    const index = conversationHistory.value.findIndex(c => c._id === editingConversationId.value);
    if (index !== -1) {
      conversationHistory.value[index].title = editConversationTitle.value;
    }
    
    editingConversationId.value = null;
    editConversationTitle.value = '';
    editConversationDialog.value = false;
    
    ElMessage.success('Conversation renamed successfully');
  } catch (error: any) {
    ElMessage.error(error.message || 'Failed to rename conversation');
  }
};

const confirmDelete = async () => {
  if (!deleteItemId.value) {
    confirmDeleteDialog.value = false;
    return;
  }
  
  try {
    if (deleteType.value === 'message') {
      await chatbotApi.deleteMessage(deleteItemId.value);
      
      const index = messages.value.findIndex(m => m._id === deleteItemId.value);
      if (index !== -1) {
        messages.value.splice(index, 1);
      }
      
      ElMessage.success('Message deleted successfully');
    } else {
      await chatbotApi.deleteConversation(deleteItemId.value);
      
      const index = conversationHistory.value.findIndex(c => c._id === deleteItemId.value);
      if (index !== -1) {
        conversationHistory.value.splice(index, 1);
      }
      
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

const authHeaders = computed(() => {
  const token = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('token') : ''
  return { Authorization: `Bearer ${token || ''}` }
})

const uploadActionUrl = computed(() => {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
  return `${base}/images/upload`
})

const triggerFileSelect = () => {
  fileInput.value?.click()
}

const handleFilesSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return
  const files = Array.from(input.files)
  
  try {
    uploadingAttachments.value = true;
    const uploaded = await imageApi.uploadImages(files)
    
    const apiRoot = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api$/, '')
    
    uploaded.forEach((file: any) => {
      console.log('Processing uploaded file:', file); // Debug log
      
      const rawUrl = file.url || file.thumbnailUrl || file.path || ''
      console.log('Raw URL:', rawUrl); // Debug log
      
      // Handle different URL formats
      let absoluteUrl: string
      if (rawUrl.startsWith('http')) {
        absoluteUrl = rawUrl
      } else if (rawUrl.startsWith('/')) {
        absoluteUrl = `${apiRoot}${rawUrl}`
      } else if (rawUrl) {
        absoluteUrl = `${apiRoot}/${rawUrl}`
      } else {
        // Fallback if no URL is provided
        absoluteUrl = `${apiRoot}/uploads/${file.filename || file.name || file._id}`
      }
      
      console.log('Final absolute URL:', absoluteUrl); // Debug log
      
      const attachmentItem = { 
        id: file.id || file._id, 
        url: absoluteUrl,
        name: file.name || file.filename || 'image'
      };
      
      console.log('Adding attachment to array:', attachmentItem);
      attachedImages.value.push(attachmentItem);
    })
    
    input.value = ''
    uploadingAttachments.value = false;
    
    ElMessage.success(`${files.length} image${files.length > 1 ? 's' : ''} uploaded successfully`)
  } catch (error: any) {
    console.error('Upload error:', error); // Debug log
    ElMessage.error(error.message || 'Failed to upload image')
    uploadingAttachments.value = false;
  }
}

const removeAttachment = (index: number) => {
  attachedImages.value.splice(index, 1)
}

const clearAllAttachments = () => {
  attachedImages.value = []
}

// Watchers
watch(messages, () => {
  scrollToBottom();
}, { deep: true });

onMounted(() => {
  loadConversations();
  
  if (chatContainer.value) {
    chatContainer.value.addEventListener('scroll', onChatScroll);
  }
  
  window.addEventListener('resize', scrollToBottom);
});

onUnmounted(() => {
  if (chatContainer.value) {
    chatContainer.value.removeEventListener('scroll', onChatScroll);
  }
  window.removeEventListener('resize', scrollToBottom);
});
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-actions .el-button {
  border-radius: 20px;
  padding: 12px 20px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-actions .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
  gap: 8px;
  color: #fff;
  text-decoration: none;
  font-size: 15px;
  font-weight: 600;
  padding: 12px 20px;
  background: linear-gradient(135deg, #52c41a, #73d13d);
  border-radius: 24px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(82, 196, 26, 0.3);
  margin: 8px 0;
}

.folder-link:hover {
  background: linear-gradient(135deg, #73d13d, #95de64);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(82, 196, 26, 0.4);
  color: #fff;
}

.folder-link:before {
  content: "🎉";
  font-size: 18px;
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

/* Message input container */
.message-input-container {
  margin-top: auto;
  border-top: 1px solid #f0f0f0;
  padding: 16px 0 0 0;
  background: linear-gradient(135deg, #fafbfc 0%, #ffffff 100%);
}

/* Message input */
.message-input {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-top: 12px;
}

.upload-btn {
  margin-bottom: 8px;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
  transition: all 0.3s ease;
}

.upload-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4);
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

/* Message attachments display */
.message-attachments {
  margin: 12px 0;
}

.attachment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  max-width: 500px;
}

.attachment-item {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  background: #f8f9fa;
}

.attachment-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.attachment-image {
  width: 100%;
  height: 150px;
  border-radius: 12px;
  overflow: hidden;
}

/* Input area attachment preview */
.attached-preview {
  margin-bottom: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 16px;
  border: 2px dashed #e9ecef;
  transition: all 0.3s ease;
}

.attached-preview:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
}

.attached-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e9ecef;
}

.attached-count {
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.attached-count::before {
  content: "📎";
  font-size: 16px;
}

.attached-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 12px;
}

.attached-thumb {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
}

.attached-thumb:hover {
  transform: scale(1.05) rotate(1deg);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.attached-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
}

.attached-thumb:hover img {
  transform: scale(1.1);
}

.attached-thumb .remove {
  position: absolute;
  top: -6px;
  right: -6px;
  background: linear-gradient(135deg, #ff4757, #ff3742);
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  padding: 6px;
  box-shadow: 0 2px 8px rgba(255, 71, 87, 0.4);
  transition: all 0.3s ease;
  border: 2px solid white;
  opacity: 0;
}

.attached-thumb:hover .remove {
  opacity: 1;
}

.attached-thumb .remove:hover {
  background: linear-gradient(135deg, #ff3742, #ff2f3a);
  transform: scale(1.1);
}

/* Input wrapper styling */
.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex: 1;
}

.input-wrapper .el-input {
  flex: 1;
}

/* Enhanced typing dots */
.typing-dots {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.typing-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #409eff;
  animation: typing-bounce 1.4s infinite ease-in-out;
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

@keyframes typing-bounce {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Enhanced empty chat styling */
.empty-chat-text h3 {
  color: #303133;
  margin-bottom: 8px;
  font-size: 20px;
  font-weight: 600;
}

.empty-chat-text p {
  color: #909399;
  margin: 0;
  font-size: 16px;
}

/* Enhanced send button */
.send-btn {
  border-radius: 12px;
  min-width: 100px;
  height: 48px;
  font-weight: 600;
  background: linear-gradient(135deg, #409eff, #1989fa);
  border: none;
  color: white;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.send-btn:hover {
  background: linear-gradient(135deg, #66b1ff, #409eff);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4);
}

.send-btn:active {
  transform: translateY(0);
}

/* Enhanced quick replies */
.quick-replies {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  padding: 0;
}

.reply-btn {
  border-radius: 20px;
  padding: 6px 16px;
  font-size: 13px;
  white-space: nowrap;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #f8f9fa, #ffffff);
  border: 1px solid #e9ecef;
  color: #606266;
}

.reply-btn:hover {
  background: linear-gradient(135deg, #409eff, #1989fa);
  color: white;
  border-color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}
</style> 