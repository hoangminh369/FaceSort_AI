import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
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
  PaginatedResponse
} from '@/types'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL:  'http://localhost:5678/api',
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
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response.data
      },
      (error) => {
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
  async getChatMessages(page = 1, limit = 50): Promise<PaginatedResponse<ChatMessage>> {
    const response = await this.get<PaginatedResponse<ChatMessage>>(`/chatbot/messages?page=${page}&limit=${limit}`)
    return response.data!
  }

  async sendChatbotMessage(userId: string, message: string, platform: 'zalo' | 'facebook'): Promise<void> {
    await this.post('/chatbot/send', { userId, message, platform })
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

  // System endpoints
  async getSystemStats(): Promise<SystemStats> {
    const response = await this.get<SystemStats>('/system/stats')
    return response.data!
  }
}

const apiClient = new ApiClient()

// Export organized API modules
export const authApi = {
  login: apiClient.login.bind(apiClient),
  logout: apiClient.logout.bind(apiClient),
  getProfile: apiClient.getProfile.bind(apiClient)
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
  getChatMessages: apiClient.getChatMessages.bind(apiClient),
  sendChatbotMessage: apiClient.sendChatbotMessage.bind(apiClient),
  getChatbotConfig: apiClient.getChatbotConfig.bind(apiClient),
  updateChatbotConfig: apiClient.updateChatbotConfig.bind(apiClient)
}

export const driveApi = {
  getDriveConfig: apiClient.getDriveConfig.bind(apiClient),
  updateDriveConfig: apiClient.updateDriveConfig.bind(apiClient),
  scanDrive: apiClient.scanDrive.bind(apiClient)
}

export const systemApi = {
  getSystemStats: apiClient.getSystemStats.bind(apiClient)
}

export default apiClient 