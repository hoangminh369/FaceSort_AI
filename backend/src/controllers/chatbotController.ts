import { Request, Response } from 'express';
import ChatbotConfig from '../models/ChatbotConfig';
import n8nService from '../services/n8nService';
import deepFaceService from '../services/deepFaceService';
import googleDriveService from '../services/googleDriveService';
import DriveConfig from '../models/DriveConfig';
import Image from '../models/Image';
import mongoose from 'mongoose';
import googleAiService from '../services/googleAiService';
import ChatMessage from '../models/ChatMessage';
import Conversation from '../models/Conversation';

// @desc    Get all conversations for a user
// @route   GET /api/chatbot/conversations
// @access  Private
export const getConversations = async (req: Request, res: Response) => {
  try {
    const conversations = await Conversation.find({ userId: req.user?.id }).sort({ updatedAt: -1 });
    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @desc    Get messages for a specific conversation
// @route   GET /api/chatbot/conversations/:conversationId/messages
// @access  Private
export const getMessagesByConversation = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    // Validate conversationId
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, error: 'Invalid Conversation ID' });
    }

    // Check if user has access to this conversation
    const conversation = await Conversation.findOne({ _id: conversationId, userId: req.user?.id });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found or access denied' });
    }

    const messages = await ChatMessage.find({ conversationId }).sort({ createdAt: 'asc' });

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Get messages by conversation error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};


// @desc    Get chatbot configuration
// @route   GET /api/chatbot/config
// @access  Private
export const getChatbotConfig = async (req: Request, res: Response) => {
  try {
    const chatbotConfig = await ChatbotConfig.findOne({ userId: req.user?.id });

    if (!chatbotConfig) {
      return res.status(404).json({
        success: false,
        error: 'Chatbot configuration not found',
      });
    }

    res.status(200).json({
      success: true,
      data: chatbotConfig,
    });
  } catch (error) {
    console.error('Get chatbot config error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Update chatbot configuration
// @route   PUT /api/chatbot/config
// @access  Private
export const updateChatbotConfig = async (req: Request, res: Response) => {
  try {
    const { zalo, facebook } = req.body;

    // Find existing config or create new one
    let chatbotConfig = await ChatbotConfig.findOne({ userId: req.user?.id });

    if (!chatbotConfig) {
      // Create new config
      chatbotConfig = await ChatbotConfig.create({
        zalo: {
          enabled: zalo?.enabled || false,
          accessToken: zalo?.accessToken || '',
          webhookUrl: zalo?.webhookUrl || '',
        },
        facebook: {
          enabled: facebook?.enabled || false,
          pageAccessToken: facebook?.pageAccessToken || '',
          verifyToken: facebook?.verifyToken || '',
          webhookUrl: facebook?.webhookUrl || '',
        },
        userId: req.user?.id,
      });
    } else {
      // Update existing config
      if (zalo) {
        chatbotConfig.zalo.enabled = zalo.enabled !== undefined ? zalo.enabled : chatbotConfig.zalo.enabled;
        chatbotConfig.zalo.accessToken = zalo.accessToken || chatbotConfig.zalo.accessToken;
        chatbotConfig.zalo.webhookUrl = zalo.webhookUrl || chatbotConfig.zalo.webhookUrl;
      }

      if (facebook) {
        chatbotConfig.facebook.enabled = facebook.enabled !== undefined ? facebook.enabled : chatbotConfig.facebook.enabled;
        chatbotConfig.facebook.pageAccessToken = facebook.pageAccessToken || chatbotConfig.facebook.pageAccessToken;
        chatbotConfig.facebook.verifyToken = facebook.verifyToken || chatbotConfig.facebook.verifyToken;
        chatbotConfig.facebook.webhookUrl = facebook.webhookUrl || chatbotConfig.facebook.webhookUrl;
      }

      await chatbotConfig.save();
    }

    res.status(200).json({
      success: true,
      data: chatbotConfig,
    });
  } catch (error) {
    console.error('Update chatbot config error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Handle Zalo webhook
// @route   POST /api/chatbot/webhook/zalo
// @access  Public
export const zaloWebhook = async (req: Request, res: Response) => {
  try {
    const { event, sender, message } = req.body;

    // Process the webhook data using n8n workflow
    await n8nService.executeChatbotResponse(sender.id, message.text, 'zalo');

    res.status(200).json({
      success: true,
      data: { received: true },
    });
  } catch (error) {
    console.error('Zalo webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Handle Facebook webhook verification
// @route   GET /api/chatbot/webhook/facebook
// @access  Public
export const facebookWebhookVerify = async (req: Request, res: Response) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Find any user with this verify token
    const chatbotConfig = await ChatbotConfig.findOne({
      'facebook.verifyToken': token,
    });

    if (mode === 'subscribe' && token && chatbotConfig) {
      console.log('Facebook webhook verified');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } catch (error) {
    console.error('Facebook webhook verify error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Handle Facebook webhook
// @route   POST /api/chatbot/webhook/facebook
// @access  Public
export const facebookWebhook = async (req: Request, res: Response) => {
  try {
    const { object, entry } = req.body;

    if (object === 'page') {
      for (const pageEntry of entry) {
        for (const messagingEvent of pageEntry.messaging) {
          if (messagingEvent.message) {
            const senderId = messagingEvent.sender.id;
            const messageText = messagingEvent.message.text;

            // Process the message using n8n workflow
            await n8nService.executeChatbotResponse(senderId, messageText, 'facebook');
          }
        }
      }

      res.status(200).json({
        success: true,
        data: { received: true },
      });
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Facebook webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Process and evaluate images
// @route   POST /api/chatbot/evaluate-images
// @access  Private
export const evaluateImages = async (req: Request, res: Response) => {
  try {
    const { imageIds } = req.body;
    
    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Image IDs are required'
      });
    }
    
    // Get images from database
    const images = await Image.find({
      _id: { $in: imageIds.map(id => new mongoose.Types.ObjectId(id)) },
      userId: req.user?.id
    });
    
    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No images found with the provided IDs'
      });
    }
    
    // Mark images as processing
    await Image.updateMany(
      { _id: { $in: images.map(img => img._id) } },
      { status: 'processing' }
    );
    
    // Execute DeepFace processing workflow
    const result = await n8nService.executeDeepFaceProcessing(
      images.map(img => (img._id as mongoose.Types.ObjectId).toString())
    );
    
    res.status(200).json({
      success: true,
      data: {
        executionId: result.id,
        status: result.status,
        message: 'Image evaluation started',
        imageCount: images.length
      }
    });
  } catch (error: any) {
    console.error('Image evaluation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Compare images and select the best ones
// @route   POST /api/chatbot/compare-images
// @access  Private
export const compareImages = async (req: Request, res: Response) => {
  try {
    const { sourceImageId, targetImageIds } = req.body;
    
    if (!sourceImageId || !targetImageIds || !Array.isArray(targetImageIds)) {
      return res.status(400).json({
        success: false,
        error: 'Source image ID and target image IDs are required'
      });
    }
    
    // Check if images exist and belong to the user
    const sourceImage = await Image.findOne({
      _id: new mongoose.Types.ObjectId(sourceImageId),
      userId: req.user?.id
    });
    
    if (!sourceImage) {
      return res.status(404).json({
        success: false,
        error: 'Source image not found'
      });
    }
    
    // Get comparison results
    const comparisons = await deepFaceService.compareMultipleImages(
      sourceImageId,
      targetImageIds
    );
    
    res.status(200).json({
      success: true,
      data: {
        comparisons,
        sourceImage: {
          id: sourceImage._id,
          filename: sourceImage.filename,
          url: sourceImage.url
        }
      }
    });
  } catch (error: any) {
    console.error('Image comparison error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Select and share best images
// @route   POST /api/chatbot/select-best-images
// @access  Private
export const selectBestImages = async (req: Request, res: Response) => {
  try {
    const { imageIds, customerName, maxImages = 5 } = req.body;
    
    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0 || !customerName) {
      return res.status(400).json({
        success: false,
        error: 'Image IDs and customer name are required'
      });
    }
    
    // Get images from database
    const images = await Image.find({
      _id: { $in: imageIds.map(id => new mongoose.Types.ObjectId(id)) },
      userId: req.user?.id
    });
    
    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No images found with the provided IDs'
      });
    }
    
    // Get best images based on quality and face detection
    const bestImageIds = await deepFaceService.selectBestImages(
      imageIds,
      maxImages
    );
    
    // Get Drive configuration
    const driveConfig = await DriveConfig.findOne({ userId: req.user?.id });
    
    if (!driveConfig || !driveConfig.refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Google Drive not configured or authorized'
      });
    }
    
    // Create a new folder with customer name
    const newFolder = await googleDriveService.createFolder(
      driveConfig,
      `Best Photos - ${customerName} - ${new Date().toISOString().split('T')[0]}`
    );
    
    // Copy best images to the new folder
    const bestImages = await Promise.all(
      bestImageIds.map(async (imageId) => {
        const image = images.find(img => (img._id as mongoose.Types.ObjectId).toString() === imageId);
        if (!image) return null;
        
        // Extract fileId from the URL or path
        const fileIdMatch = image.url.match(/[-\w]{25,}/);
        const fileId = fileIdMatch ? fileIdMatch[0] : '';
        
        if (!fileId) return null;
        
        // Copy file to the new folder
        const copiedFile = await googleDriveService.copyFile(
          driveConfig,
          fileId,
          newFolder.id
        );
        
        return {
          originalImage: image,
          copiedFile
        };
      })
    );
    
    // Filter out null values
    const validBestImages = bestImages.filter(Boolean);
    
    // Set public permission for the folder
    const publicLink = await googleDriveService.setPublicPermission(
      driveConfig,
      newFolder.id
    );
    
    // Update image status to 'selected'
    await Image.updateMany(
      { _id: { $in: bestImageIds.map(id => new mongoose.Types.ObjectId(id)) } },
      { status: 'selected' }
    );
    
    res.status(200).json({
      success: true,
      data: {
        folderName: newFolder.name,
        folderId: newFolder.id,
        publicLink,
        bestImages: validBestImages.map(item => ({
          id: item?.originalImage._id,
          name: item?.originalImage.filename,
          url: item?.originalImage.url
        })),
        message: `Created folder "${newFolder.name}" with ${validBestImages.length} best images`
      }
    });
  } catch (error: any) {
    console.error('Select best images error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Process and evaluate images from Google Drive
// @route   POST /api/chatbot/process-drive-images
// @access  Private
export const processDriveImages = async (req: Request, res: Response) => {
  try {
    const { folderPath, customerName } = req.body;
    
    if (!customerName) {
      return res.status(400).json({
        success: false,
        error: 'Customer name is required'
      });
    }
    
    // Get Drive configuration
    const driveConfig = await DriveConfig.findOne({ userId: req.user?.id });
    
    if (!driveConfig || !driveConfig.refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Google Drive not configured or authorized'
      });
    }
    
    // Get images from Drive
    const images = await googleDriveService.getAllImageFiles(driveConfig, 100);
    
    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No images found in Google Drive'
      });
    }
    
    // Start the workflow for processing and image selection
    const result = await n8nService.executeDriveScan(driveConfig);
    
    res.status(200).json({
      success: true,
      data: {
        executionId: result.id,
        status: result.status,
        message: 'Drive images processing started',
        imageCount: images.length,
        customerName
      }
    });
  } catch (error: any) {
    console.error('Process Drive images error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
}; 

// @desc Get paginated chat messages (deprecated, use getMessagesByConversation)
// @route   GET /api/chatbot/messages
// @access  Private
export const getChatMessages = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    // This endpoint is less useful now. We should ideally get messages per conversation.
    // For now, let's just return an empty array if no conversation is specified.
    return res.status(200).json({
      success: true,
      data: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
      }
    });

  } catch (error: any) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// @desc Send a chat message
// @route   POST /api/chatbot/send
// @access  Private
export const sendChatMessage = async (req: Request, res: Response) => {
  try {
    let { message, platform, conversationId } = req.body;
    const userId = req.user?.id;

    if (!message || !platform) {
      return res.status(400).json({ success: false, error: 'Message and platform are required' });
    }

    let conversation;

    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
      conversation = await Conversation.findOne({ _id: conversationId, userId });
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }
    } else {
      // Create a new conversation
      const a_title = message.substring(0, 30);
      conversation = new Conversation({
        userId,
        title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
        platform,
      });
    }
    
    // Save user message
    const userMessage = new ChatMessage({
      conversationId: conversation._id,
      userId,
      message,
      platform,
    });
    
    // Generate AI response
    const aiResponseText = await googleAiService.generateChatResponse(message);

    // Save bot response
    const botMessage = new ChatMessage({
      conversationId: conversation._id,
      userId, // Or a special bot ID
      message, // Original user message
      response: aiResponseText,
      platform,
    });
    
    // Update conversation's last message
    conversation.lastMessage = aiResponseText;
    
    await Promise.all([
      userMessage.save(),
      botMessage.save(),
      conversation.save()
    ]);

    res.status(201).json({
      success: true,
      data: {
        response: aiResponseText,
        conversation,
      },
    });

  } catch (error: any) {
    console.error('Send chat message error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
}; 

// @desc    Update a message
// @route   PUT /api/chatbot/messages/:id
// @access  Private
export const updateMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    // Validate message ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid message ID'
      });
    }

    // Find the message and ensure it belongs to the user
    const chatMessage = await ChatMessage.findOne({
      _id: id,
      userId: req.user?.id,
      response: { $exists: false } // Only allow editing user messages, not bot responses
    });

    if (!chatMessage) {
      return res.status(404).json({
        success: false,
        error: 'Message not found or cannot be edited'
      });
    }

    // Update the message
    chatMessage.message = message;
    await chatMessage.save();

    res.status(200).json({
      success: true,
      data: chatMessage
    });
  } catch (error: any) {
    console.error('Update message error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Delete a message
// @route   DELETE /api/chatbot/messages/:id
// @access  Private
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate message ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid message ID'
      });
    }

    // Find the message and ensure it belongs to the user
    const chatMessage = await ChatMessage.findOne({
      _id: id,
      userId: req.user?.id
    });

    if (!chatMessage) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Delete the message
    await ChatMessage.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      data: { success: true }
    });
  } catch (error: any) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Update a conversation
// @route   PUT /api/chatbot/conversations/:id
// @access  Private
export const updateConversation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Conversation title is required'
      });
    }

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversation ID'
      });
    }

    // Find the conversation and ensure it belongs to the user
    const conversation = await Conversation.findOne({
      _id: id,
      userId: req.user?.id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Update the conversation
    conversation.title = title;
    await conversation.save();

    res.status(200).json({
      success: true,
      data: conversation
    });
  } catch (error: any) {
    console.error('Update conversation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Delete a conversation
// @route   DELETE /api/chatbot/conversations/:id
// @access  Private
export const deleteConversation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate conversation ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conversation ID'
      });
    }

    // Find the conversation and ensure it belongs to the user
    const conversation = await Conversation.findOne({
      _id: id,
      userId: req.user?.id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Delete all messages in the conversation
    await ChatMessage.deleteMany({ conversationId: id });

    // Delete the conversation
    await Conversation.deleteOne({ _id: id });

    res.status(200).json({
      success: true,
      data: { success: true }
    });
  } catch (error: any) {
    console.error('Delete conversation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
}; 