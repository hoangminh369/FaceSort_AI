"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config/config"));
class N8nService {
    constructor() {
        this.baseUrl = config_1.default.n8n.baseUrl;
        this.apiKey = config_1.default.n8n.apiKey;
    }
    getHeaders() {
        return {
            'X-N8N-API-KEY': this.apiKey,
            'Content-Type': 'application/json',
        };
    }
    /**
     * Get all workflows from n8n
     */
    getWorkflows() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.baseUrl}/workflows`, {
                    headers: this.getHeaders(),
                });
                return response.data;
            }
            catch (error) {
                console.error('Error fetching workflows from n8n:', error);
                throw error;
            }
        });
    }
    /**
     * Get a specific workflow by ID
     */
    getWorkflow(workflowId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.baseUrl}/workflows/${workflowId}`, {
                    headers: this.getHeaders(),
                });
                return response.data;
            }
            catch (error) {
                console.error(`Error fetching workflow ${workflowId} from n8n:`, error);
                throw error;
            }
        });
    }
    /**
     * Execute a workflow by ID with optional data
     */
    executeWorkflow(workflowId_1) {
        return __awaiter(this, arguments, void 0, function* (workflowId, data = {}) {
            try {
                const response = yield axios_1.default.post(`${this.baseUrl}/workflows/${workflowId}/execute`, { data }, { headers: this.getHeaders() });
                return response.data;
            }
            catch (error) {
                console.error(`Error executing workflow ${workflowId}:`, error);
                throw error;
            }
        });
    }
    /**
     * Execute the Google Drive scanner workflow
     */
    executeDriveScan(driveConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.executeWorkflow('google-drive-scanner', { driveConfig });
        });
    }
    /**
     * Execute the DeepFace processing workflow
     */
    executeDeepFaceProcessing(imageIds) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.executeWorkflow('deepface-processing', { imageIds });
        });
    }
    /**
     * Execute the image selection workflow
     */
    executeImageSelection(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.executeWorkflow('image-selection', { userId });
        });
    }
    /**
     * Execute the chatbot response workflow
     */
    executeChatbotResponse(userId, message, platform) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.executeWorkflow('chatbot-response', { userId, message, platform });
        });
    }
}
exports.default = new N8nService();
