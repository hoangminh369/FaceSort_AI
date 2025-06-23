// User types
export interface User {
  id: string
  username: string
  email: string
  role: 'admin' | 'user'
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

// Image types
export interface ImageFile {
  id: string
  filename: string
  originalName: string
  url: string
  thumbnailUrl?: string
  size: number
  mimeType: string
  faceDetected: boolean
  faceCount: number
  qualityScore?: number
  userId: string
  createdAt: string
  status: 'uploaded' | 'processing' | 'processed' | 'selected' | 'error'
}

export interface FaceAnalysis {
  id: string
  imageId: string
  faceBox: {
    x: number
    y: number
    width: number
    height: number
  }
  confidence: number
  qualityScore: number
  emotions?: {
    happy: number
    sad: number
    angry: number
    surprised: number
    neutral: number
  }
  createdAt: string
}

// Workflow types
export interface Workflow {
  id: string
  name: string
  description: string
  type: 'scan_drive' | 'process_images' | 'send_notification'
  status: 'active' | 'inactive' | 'running' | 'error'
  lastRun?: string
  nextRun?: string
  config: Record<string, any>
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  status: 'running' | 'completed' | 'failed'
  startedAt: string
  completedAt?: string
  logs: string[]
  result?: Record<string, any>
}

// Chatbot types
export interface ChatMessage {
  id: string
  userId: string
  message: string
  response?: string
  platform: 'zalo' | 'facebook'
  type: 'text' | 'image' | 'notification'
  createdAt: string
}

export interface ChatbotConfig {
  zalo: {
    enabled: boolean
    accessToken?: string
    webhookUrl?: string
  }
  facebook: {
    enabled: boolean
    pageAccessToken?: string
    verifyToken?: string
    webhookUrl?: string
  }
}

// Google Drive types
export interface DriveConfig {
  clientId: string
  clientSecret: string
  refreshToken?: string
  folderId: string
  scanInterval: number // minutes
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size: number
  createdTime: string
  webViewLink: string
  thumbnailLink?: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// System types
export interface SystemStats {
  totalUsers: number
  totalImages: number
  totalProcessed: number
  totalFacesDetected: number
  storageUsed: number
  lastProcessingTime?: string
} 