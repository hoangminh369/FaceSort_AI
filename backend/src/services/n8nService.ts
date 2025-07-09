import axios from 'axios';
import config from '../config/config';

interface WorkflowExecutionResponse {
  id: string;
  status: string;
  data: any;
}

class N8nService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.n8n.baseUrl;
    this.apiKey = config.n8n.apiKey;
  }

  private getHeaders() {
    return {
      'X-N8N-API-KEY': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get all workflows from n8n
   */
  async getWorkflows() {
    try {
      const response = await axios.get(`${this.baseUrl}/workflows`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching workflows from n8n:', error);
      throw error;
    }
  }

  /**
   * Get a specific workflow by ID
   */
  async getWorkflow(workflowId: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/workflows/${workflowId}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching workflow ${workflowId} from n8n:`, error);
      throw error;
    }
  }

  /**
   * Execute a workflow by ID with optional data
   */
  async executeWorkflow(workflowId: string, data: any = {}): Promise<WorkflowExecutionResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/workflows/${workflowId}/execute`,
        { data },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error(`Error executing workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Execute the Google Drive scanner workflow
   */
  async executeDriveScan(driveConfig: any) {
    return this.executeWorkflow('google-drive-scanner', { driveConfig });
  }

  /**
   * Execute the DeepFace processing workflow
   */
  async executeDeepFaceProcessing(imageIds: string[]) {
    return this.executeWorkflow('deepface-processing', { imageIds });
  }

  /**
   * Execute the image selection workflow
   */
  async executeImageSelection(userId: string) {
    return this.executeWorkflow('image-selection', { userId });
  }

  /**
   * Execute the chatbot response workflow
   */
  async executeChatbotResponse(userId: string, message: string, platform: 'zalo' | 'facebook') {
    return this.executeWorkflow('chatbot-response', { userId, message, platform });
  }
}

export default new N8nService(); 