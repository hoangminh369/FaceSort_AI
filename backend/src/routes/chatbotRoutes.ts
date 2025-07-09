import express from 'express';
import {
  getChatbotConfig,
  updateChatbotConfig,
  zaloWebhook,
  facebookWebhookVerify,
  facebookWebhook,
  evaluateImages,
  compareImages,
  selectBestImages,
  processDriveImages,
  sendChatMessage,
  getChatMessages,
  getConversations,
  getMessagesByConversation,
  updateMessage,
  deleteMessage,
  updateConversation,
  deleteConversation
} from '../controllers/chatbotController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Protected routes
router.get('/config', authenticate, getChatbotConfig);
router.put('/config', authenticate, updateChatbotConfig);
router.get('/messages', authenticate, getChatMessages);

// Conversation routes
router.route('/conversations').get(authenticate, getConversations);
router.route('/conversations/:conversationId/messages').get(authenticate, getMessagesByConversation);
router.route('/conversations/:id')
  .put(authenticate, updateConversation)
  .delete(authenticate, deleteConversation);

// Message routes
router.route('/messages/:id')
  .put(authenticate, updateMessage)
  .delete(authenticate, deleteMessage);

// Image processing routes
router.post('/evaluate-images', authenticate, evaluateImages);
router.post('/compare-images', authenticate, compareImages);
router.post('/select-best-images', authenticate, selectBestImages);
router.post('/process-drive-images', authenticate, processDriveImages);
router.post('/send', authenticate, sendChatMessage);

// Public webhook routes
router.post('/webhook/zalo', zaloWebhook);
router.get('/webhook/facebook', facebookWebhookVerify);
router.post('/webhook/facebook', facebookWebhook);

export default router; 