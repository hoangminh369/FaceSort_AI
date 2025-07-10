import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import NProgress from 'nprogress'
import type { 
  LoginRequest, 
  LoginResponse, 
  User, 
  ImageFile, 
  Workflow, 
  WorkflowExecution,
  ChatMessage,
  ChatbotConfig,
  DriveConfig,
  SystemStats,
  ApiResponse,
  PaginatedResponse,
  Conversation
} from '@/types'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        NProgress.start()
        return config
      },
      (error) => {
        NProgress.done()
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        NProgress.done()
        return response.data
      },
      (error) => {
        NProgress.done()
        if (error.response?.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('userRole')
          window.location.href = '/login'
        }
        return Promise.reject(error.response?.data || error)
      }
    )
  }

  // Generic methods
  private async get<T>(url: string): Promise<ApiResponse<T>> {
    return this.client.get(url)
  }

  private async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.client.post(url, data)
  }

  private async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.client.put(url, data)
  }

  private async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.client.delete(url)
  }

  // Auth endpoints
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.post<LoginResponse>('/auth/login', data)
    return response.data!
  }

  async logout(): Promise<void> {
    await this.post('/auth/logout')
  }

  async getProfile(): Promise<{ user: User }> {
    const response = await this.get<{ user: User }>('/auth/profile')
    return response.data!
  }

  // User endpoints
  async getUsers(page = 1, limit = 10): Promise<PaginatedResponse<User>> {
    const response = await this.get<PaginatedResponse<User>>(`/users?page=${page}&limit=${limit}`)
    return response.data!
  }

  async createUser(data: Partial<User>): Promise<User> {
    const response = await this.post<User>('/users', data)
    return response.data!
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const response = await this.put<User>(`/users/${id}`, data)
    return response.data!
  }

  async deleteUser(id: string): Promise<void> {
    await this.delete(`/users/${id}`)
  }

  // Image endpoints
  async getImages(page = 1, limit = 20): Promise<PaginatedResponse<ImageFile>> {
    const response = await this.get<PaginatedResponse<ImageFile>>(`/images?page=${page}&limit=${limit}`)
    return response.data!
  }

  async uploadImages(files: File[]): Promise<ImageFile[]> {
    const formData = new FormData()
    files.forEach(file => formData.append('images', file))
    
    const response = await this.client.post('/images/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  }

  async deleteImage(id: string): Promise<void> {
    await this.delete(`/images/${id}`)
  }

  async processImages(): Promise<{ executionId: string }> {
    const response = await this.post<{ executionId: string }>('/images/process')
    return response.data!
  }

  // Workflow endpoints
  async getWorkflows(): Promise<Workflow[]> {
    const response = await this.get<Workflow[]>('/workflows')
    return response.data!
  }

  async createWorkflow(data: Partial<Workflow>): Promise<Workflow> {
    const response = await this.post<Workflow>('/workflows', data)
    return response.data!
  }

  async updateWorkflow(id: string, data: Partial<Workflow>): Promise<Workflow> {
    const response = await this.put<Workflow>(`/workflows/${id}`, data)
    return response.data!
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.delete(`/workflows/${id}`)
  }

  async executeWorkflow(id: string): Promise<WorkflowExecution> {
    const response = await this.post<WorkflowExecution>(`/workflows/${id}/execute`)
    return response.data!
  }

  async getWorkflowExecutions(workflowId: string): Promise<WorkflowExecution[]> {
    const response = await this.get<WorkflowExecution[]>(`/workflows/${workflowId}/executions`)
    return response.data!
  }

  // Chatbot endpoints
  async getConversations(): Promise<Conversation[]> {
    const response = await this.get<Conversation[]>('/chatbot/conversations');
    return response.data!;
  }

  async getMessagesByConversation(conversationId: string): Promise<ChatMessage[]> {
    const response = await this.get<ChatMessage[]>(`/chatbot/conversations/${conversationId}/messages`);
    return response.data!;
  }

  async getChatMessages(page = 1, limit = 50): Promise<PaginatedResponse<ChatMessage>> {
    const response = await this.get<PaginatedResponse<ChatMessage>>(`/chatbot/messages?page=${page}&limit=${limit}`)
    return response.data!
  }

  async sendChatbotMessage(
    message: string,
    platform: 'web' | 'zalo' | 'facebook',
    conversationId: string | null
  ): Promise<{ response: string, conversation: Conversation }> {
    const response = await this.post<{ response: string, conversation: Conversation }>('/chatbot/send', { message, platform, conversationId });
    return response.data!;
  }

  // New methods for message and conversation management
  async updateMessage(messageId: string, newContent: string): Promise<ChatMessage> {
    const response = await this.put<ChatMessage>(`/chatbot/messages/${messageId}`, { message: newContent });
    return response.data!;
  }

  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    const response = await this.delete<{ success: boolean }>(`/chatbot/messages/${messageId}`);
    return response.data!;
  }

  async updateConversation(conversationId: string, title: string): Promise<Conversation> {
    const response = await this.put<Conversation>(`/chatbot/conversations/${conversationId}`, { title });
    return response.data!;
  }

  async deleteConversation(conversationId: string): Promise<{ success: boolean }> {
    const response = await this.delete<{ success: boolean }>(`/chatbot/conversations/${conversationId}`);
    return response.data!;
  }

  async evaluateImages(imageIds: string[]): Promise<any> {
    const response = await this.post('/chatbot/evaluate-images', { imageIds })
    return response
  }

  async compareImages(sourceImageId: string, targetImageIds: string[]): Promise<any> {
    const response = await this.post('/chatbot/compare-images', { 
      sourceImageId, 
      targetImageIds 
    })
    return response
  }

  async selectBestImages(imageIds: string[], customerName: string, maxImages: number = 5): Promise<any> {
    const response = await this.post('/chatbot/select-best-images', {
      imageIds,
      customerName,
      maxImages
    })
    return response
  }

  async processDriveImages(customerName: string, folderPath?: string): Promise<any> {
    const response = await this.post('/chatbot/process-drive-images', {
      customerName,
      folderPath
    })
    return response
  }

  async getChatbotConfig(): Promise<ChatbotConfig> {
    const response = await this.get<ChatbotConfig>('/chatbot/config')
    return response.data!
  }

  async updateChatbotConfig(config: ChatbotConfig): Promise<ChatbotConfig> {
    const response = await this.put<ChatbotConfig>('/chatbot/config', config)
    return response.data!
  }

  // Google Drive endpoints
  async getDriveConfig(): Promise<DriveConfig> {
    const response = await this.get<DriveConfig>('/drive/config')
    return response.data!
  }

  async updateDriveConfig(config: DriveConfig): Promise<DriveConfig> {
    const response = await this.put<DriveConfig>('/drive/config', config)
    return response.data!
  }

  async scanDrive(): Promise<{ executionId: string }> {
    const response = await this.post<{ executionId: string }>('/drive/scan')
    return response.data!
  }

  async listDriveFolders(parentId?: string): Promise<any[]> {
    const url = parentId ? `/drive/folders?parentId=${parentId}` : '/drive/folders'
    const response = await this.get<any[]>(url)
    return response.data!
  }
  
  // Corrected: backend expects 'folderId' query param, not 'parentId'
  async listDriveFiles(folderId?: string): Promise<any[]> {
    const url = folderId ? `/drive/files?folderId=${folderId}` : '/drive/files'
    const response = await this.get<any[]>(url)
    return response.data!
  }
  
  async getDriveAuthUrl(): Promise<string> {
    const response = await this.get<{ authUrl: string }>('/drive/auth-url')
    return response.data!.authUrl
  }

  // System endpoints
  async getSystemStats(): Promise<SystemStats> {
    const response = await this.get<SystemStats>('/system/stats')
    return response.data!
  }

  async register(data: { username: string; email: string; password: string }) {
    const response = await this.post('/auth/register', data)
    return response.data
  }
}

// Export a single instance of the API client
export const apiClient = new ApiClient()

// You can also export specific parts of the API for easier use
export const authApi = {
  login: apiClient.login.bind(apiClient),
  logout: apiClient.logout.bind(apiClient),
  getProfile: apiClient.getProfile.bind(apiClient),
  register: apiClient.register.bind(apiClient),
}

export const userApi = {
  getUsers: apiClient.getUsers.bind(apiClient),
  createUser: apiClient.createUser.bind(apiClient),
  updateUser: apiClient.updateUser.bind(apiClient),
  deleteUser: apiClient.deleteUser.bind(apiClient)
}

export const imageApi = {
  getImages: apiClient.getImages.bind(apiClient),
  uploadImages: apiClient.uploadImages.bind(apiClient),
  deleteImage: apiClient.deleteImage.bind(apiClient),
  processImages: apiClient.processImages.bind(apiClient)
}

export const workflowApi = {
  getWorkflows: apiClient.getWorkflows.bind(apiClient),
  createWorkflow: apiClient.createWorkflow.bind(apiClient),
  updateWorkflow: apiClient.updateWorkflow.bind(apiClient),
  deleteWorkflow: apiClient.deleteWorkflow.bind(apiClient),
  executeWorkflow: apiClient.executeWorkflow.bind(apiClient),
  getWorkflowExecutions: apiClient.getWorkflowExecutions.bind(apiClient)
}

export const chatbotApi = {
  getConversations: apiClient.getConversations.bind(apiClient),
  getMessagesByConversation: apiClient.getMessagesByConversation.bind(apiClient),
  getChatMessages: apiClient.getChatMessages.bind(apiClient),
  sendChatbotMessage: apiClient.sendChatbotMessage.bind(apiClient),
  evaluateImages: apiClient.evaluateImages.bind(apiClient),
  compareImages: apiClient.compareImages.bind(apiClient),
  selectBestImages: apiClient.selectBestImages.bind(apiClient),
  processDriveImages: apiClient.processDriveImages.bind(apiClient),
  getChatbotConfig: apiClient.getChatbotConfig.bind(apiClient),
  updateChatbotConfig: apiClient.updateChatbotConfig.bind(apiClient),
  // Add new methods
  updateMessage: apiClient.updateMessage.bind(apiClient),
  deleteMessage: apiClient.deleteMessage.bind(apiClient),
  updateConversation: apiClient.updateConversation.bind(apiClient),
  deleteConversation: apiClient.deleteConversation.bind(apiClient),
}

export const driveApi = {
  getDriveConfig: apiClient.getDriveConfig.bind(apiClient),
  updateDriveConfig: apiClient.updateDriveConfig.bind(apiClient),
  scanDrive: apiClient.scanDrive.bind(apiClient),
  listDriveFolders: apiClient.listDriveFolders.bind(apiClient),
  listDriveFiles: apiClient.listDriveFiles.bind(apiClient),
  getDriveAuthUrl: apiClient.getDriveAuthUrl.bind(apiClient)
}

export const systemApi = {
  getSystemStats: apiClient.getSystemStats.bind(apiClient)
} 