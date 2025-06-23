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

// Sample data
const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    username: 'user',
    email: 'user@example.com',
    role: 'user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

const mockWorkflows: Workflow[] = [
  {
    id: '1',
    name: 'Daily Drive Scan',
    description: 'Scan Google Drive for new photos daily',
    type: 'scan_drive',
    status: 'active',
    lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    config: { frequency: 'daily' }
  },
  {
    id: '2',
    name: 'Process Uploaded Images',
    description: 'Process all newly uploaded images',
    type: 'process_images',
    status: 'active',
    config: { detectFaces: true, enhanceQuality: true }
  }
]

const mockImages: ImageFile[] = [
  {
    id: '1',
    filename: 'image1.jpg',
    originalName: 'vacation.jpg',
    url: 'https://picsum.photos/id/237/800/600',
    thumbnailUrl: 'https://picsum.photos/id/237/200/200',
    size: 1024 * 1024,
    mimeType: 'image/jpeg',
    faceDetected: true,
    faceCount: 2,
    qualityScore: 0.85,
    userId: '2',
    createdAt: new Date().toISOString(),
    status: 'processed'
  },
  {
    id: '2',
    filename: 'image2.jpg',
    originalName: 'family.jpg',
    url: 'https://picsum.photos/id/1/800/600',
    thumbnailUrl: 'https://picsum.photos/id/1/200/200',
    size: 2 * 1024 * 1024,
    mimeType: 'image/jpeg',
    faceDetected: true,
    faceCount: 4,
    qualityScore: 0.75,
    userId: '2',
    createdAt: new Date().toISOString(),
    status: 'processed'
  }
]

// Helper function to delay response for simulating network
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Mock API implementation
class MockApiClient {
  // Auth endpoints
  async login(data: LoginRequest): Promise<LoginResponse> {
    await delay(500) // Simulate network delay
    
    const { username, password } = data
    
    if (username === 'admin' && password === 'admin123') {
      return {
        token: 'mock-admin-token-12345',
        user: mockUsers[0]
      }
    } else if (username === 'user' && password === 'user123') {
      return {
        token: 'mock-user-token-67890',
        user: mockUsers[1]
      }
    }
    
    throw new Error('Invalid username or password')
  }
  
  async logout(): Promise<void> {
    await delay(200)
    // Nothing to do here in mock
    return
  }
  
  async getProfile(): Promise<{ user: User }> {
    await delay(300)
    
    const token = localStorage.getItem('token')
    let user: User | null = null
    
    if (token === 'mock-admin-token-12345') {
      user = mockUsers[0]
    } else if (token === 'mock-user-token-67890') {
      user = mockUsers[1]
    }
    
    if (!user) {
      throw new Error('User not found')
    }
    
    return { user }
  }
  
  // Workflow endpoints
  async getWorkflows(): Promise<Workflow[]> {
    await delay(300)
    return [...mockWorkflows]
  }
  
  async createWorkflow(data: Partial<Workflow>): Promise<Workflow> {
    await delay(400)
    const newWorkflow: Workflow = {
      id: `w-${Date.now()}`,
      name: data.name || 'New Workflow',
      description: data.description || '',
      type: data.type || 'process_images',
      status: data.status || 'inactive',
      config: data.config || {},
      createdAt: new Date().toISOString()
    }
    mockWorkflows.push(newWorkflow)
    return newWorkflow
  }
  
  async updateWorkflow(id: string, data: Partial<Workflow>): Promise<Workflow> {
    await delay(400)
    const index = mockWorkflows.findIndex(w => w.id === id)
    if (index === -1) throw new Error('Workflow not found')
    
    mockWorkflows[index] = { ...mockWorkflows[index], ...data }
    return mockWorkflows[index]
  }
  
  async deleteWorkflow(id: string): Promise<void> {
    await delay(300)
    const index = mockWorkflows.findIndex(w => w.id === id)
    if (index === -1) throw new Error('Workflow not found')
    
    mockWorkflows.splice(index, 1)
    return
  }
  
  async executeWorkflow(id: string): Promise<WorkflowExecution> {
    await delay(500)
    const workflow = mockWorkflows.find(w => w.id === id)
    if (!workflow) throw new Error('Workflow not found')
    
    const execution: WorkflowExecution = {
      id: `exec-${Date.now()}`,
      workflowId: id,
      status: 'running',
      startedAt: new Date().toISOString(),
      logs: ['Workflow started', 'Processing...']
    }
    
    // Update workflow lastRun
    workflow.lastRun = new Date().toISOString()
    
    return execution
  }
  
  // Image endpoints
  async getImages(page = 1, limit = 20): Promise<PaginatedResponse<ImageFile>> {
    await delay(400)
    
    const start = (page - 1) * limit
    const end = start + limit
    const data = mockImages.slice(start, end)
    
    return {
      data,
      total: mockImages.length,
      page,
      limit,
      totalPages: Math.ceil(mockImages.length / limit)
    }
  }
}

const mockApiClient = new MockApiClient()

// Export mock API
export const mockAuthApi = {
  login: mockApiClient.login.bind(mockApiClient),
  logout: mockApiClient.logout.bind(mockApiClient),
  getProfile: mockApiClient.getProfile.bind(mockApiClient)
}

export const mockWorkflowApi = {
  getWorkflows: mockApiClient.getWorkflows.bind(mockApiClient),
  createWorkflow: mockApiClient.createWorkflow.bind(mockApiClient),
  updateWorkflow: mockApiClient.updateWorkflow.bind(mockApiClient),
  deleteWorkflow: mockApiClient.deleteWorkflow.bind(mockApiClient),
  executeWorkflow: mockApiClient.executeWorkflow.bind(mockApiClient)
}

export const mockImageApi = {
  getImages: mockApiClient.getImages.bind(mockApiClient)
} 