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
import User from '../models/User';
import path from 'path';
import { DriveFile } from '../services/googleDriveService';

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

    // Process each image directly with deepface service
    const processedResults = [];
    
    for (const image of images) {
      try {
        console.log(`Processing image: ${image.url}`);
        
        // Extract face embeddings
        const embeddingResult = await deepFaceService.extractFaceEmbeddings(image.url);
        
        // Get image quality
        const qualityResult = await deepFaceService.analyzeImageQuality(image.url);
        
        // Analyze face attributes
        const faceAttributes = await deepFaceService.analyzeFaceAttributes(image.url);
        
        // Update image in database
        await Image.findByIdAndUpdate(image._id as mongoose.Types.ObjectId, {
          status: 'processed',
          faceAnalysis: faceAttributes,
          qualityScore: qualityResult.qualityScore,
          faceCount: embeddingResult?.faceCount || 0,
          processedAt: new Date()
        });
        
        processedResults.push({
          imageId: (image._id as mongoose.Types.ObjectId).toString(),
          filename: image.filename,
          faceCount: embeddingResult?.faceCount || 0,
          qualityScore: qualityResult.qualityScore,
          hasEmbeddings: !!embeddingResult && embeddingResult.embeddings.length > 0
        });
        
      } catch (error) {
        console.error(`Error processing image ${(image._id as mongoose.Types.ObjectId).toString()}:`, error);
        
        // Mark as error
        await Image.findByIdAndUpdate(image._id as mongoose.Types.ObjectId, {
          status: 'error',
          processedAt: new Date()
        });
        
                 processedResults.push({
           imageId: (image._id as mongoose.Types.ObjectId).toString(),
           filename: image.filename,
           error: error instanceof Error ? error.message : 'Processing failed'
         });
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        message: 'Image evaluation completed',
        imageCount: images.length,
        processedResults
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
    
    // Get images from configured folder in Drive
    const configuredFolder = driveConfig.folderId || 'root';
    console.log(`[processDriveImages] Scanning folder: ${configuredFolder}`);
    
    const images = await googleDriveService.getImageFilesFromFolderRecursive(driveConfig, configuredFolder, 1000);
    
    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No images found in configured folder (${configuredFolder}). Please check your folder configuration.`
      });
    }
    
    console.log(`[processDriveImages] Found ${images.length} images in configured folder ${configuredFolder}`);
    
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
    let { message, platform, conversationId, imageIds } = req.body;
    const userId = req.user?.id;

    // Step 1: Input validation
    if ((!message || !message.trim()) && (!imageIds || imageIds.length === 0)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Either message text or images are required' 
      });
    }

    if (!platform) {
      return res.status(400).json({ 
        success: false, 
        error: 'Platform is required' 
      });
    }

    // Step 2: Handle conversation (find existing or create new)
    let conversation;
    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
      conversation = await Conversation.findOne({ _id: conversationId, userId });
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }
    } else {
      // Create a new conversation with appropriate title
      const title = message && message.trim() 
        ? message.substring(0, 30) + (message.length > 30 ? '...' : '')
        : 'Image conversation';
      
      conversation = new Conversation({
        userId,
        title,
        platform,
      });
      await conversation.save();
    }

    // Step 3: Prepare messages to save
    const messagesToSave: any[] = [];

    // Add text message if exists
    if (message && message.trim()) {
      const userMessage = new ChatMessage({
        conversationId: conversation._id,
        userId,
        message: message.trim(),
        platform,
        type: 'text',
      });
      messagesToSave.push(userMessage);
    }

    // Step 4: Add image messages if exist
    if (Array.isArray(imageIds) && imageIds.length > 0) {
      try {
        const images = await Image.find({ 
          _id: { $in: imageIds },
          userId // Ensure user owns these images
        });

        if (images.length !== imageIds.length) {
          return res.status(400).json({
            success: false,
            error: 'Some images not found or access denied'
          });
        }

        // Add image URLs to the main message as attachments instead of separate messages
        const lastMessage = messagesToSave[messagesToSave.length - 1];
        if (lastMessage) {
          // Add attachments to the last message
          lastMessage.attachments = images.map(image => ({
            id: (image._id as mongoose.Types.ObjectId).toString(),
            url: image.url,
            type: 'image' as const,
            name: image.filename
          }));
        } else {
          // If no text message, create an image message
          const imageMessage = new ChatMessage({
            conversationId: conversation._id,
            userId,
            message: `Sent ${images.length} image${images.length > 1 ? 's' : ''}`,
            platform,
            type: 'image',
            attachments: images.map(image => ({
              id: (image._id as mongoose.Types.ObjectId).toString(),
              url: image.url,
              type: 'image' as const,
              name: image.filename
            })),
          });
          messagesToSave.push(imageMessage);
        }
      } catch (imageError) {
        console.error('Error processing images:', imageError);
        return res.status(500).json({
          success: false,
          error: 'Failed to process images'
        });
      }
    }

    // Save all messages in parallel
    if (messagesToSave.length > 0) {
      await Promise.all(messagesToSave.map(msg => msg.save()));
    }

    // Step 5: Generate AI response
    let aiResponse = '';
    console.log('Step 5: Starting AI response generation...');
    console.log('Message:', message);
    console.log('ImageIds:', imageIds);
    
    // Check if this is a specific command to process photos with customer name
    const isPhotoProcessingRequest = message && imageIds && imageIds.length > 0 && (
      // English patterns: "Process these photos for customer [name]"
      /process\s+(?:these\s+)?(?:photos?|images?)\s+for\s+(?:customer\s+)?([A-Za-z0-9\s]+)/i.test(message) ||
      // Vietnamese patterns: "Xử lý ảnh cho khách hàng [name]"
      /(?:xử lý|x[ử]?\s*l[ý]?)\s+(?:những\s+)?(?:ảnh|hình)\s+cho\s+(?:khách hàng\s+)?([A-Za-z0-9\s]+)/i.test(message) ||
      // Alternative patterns: "Process photos for [name]"
      /process\s+(?:photos?|images?)\s+for\s+([A-Za-z0-9\s]+)/i.test(message) ||
      // Vietnamese alternative: "Xử lý cho khách hàng [name]"
      /(?:xử lý|x[ử]?\s*l[ý]?)\s+cho\s+(?:khách hàng\s+)?([A-Za-z0-9\s]+)/i.test(message)
    );
    
    console.log('isPhotoProcessingRequest:', isPhotoProcessingRequest);

    if (isPhotoProcessingRequest) {
      // Extract customer name from message using improved patterns
      let customerName = '';
      
      console.log('Original message:', message);
      
      // Try English patterns with word boundaries and better capture
      let match = message.match(/process\s+(?:these\s+)?(?:photos?|images?)\s+for\s+(?:customer\s+)?([A-Za-z0-9\s\-\_\u00C0-\u017F]{2,30})(?:\s|$|[.!?])/i);
      if (!match) {
        match = message.match(/process\s+(?:photos?|images?)\s+for\s+([A-Za-z0-9\s\-\_\u00C0-\u017F]{2,30})(?:\s|$|[.!?])/i);
      }
      if (!match) {
        match = message.match(/for\s+(?:customer\s+)?([A-Za-z0-9\s\-\_\u00C0-\u017F]{2,30})(?:\s|$|[.!?])/i);
      }
      
      // Try Vietnamese patterns with Unicode support
      if (!match) {
        match = message.match(/(?:xử lý|x[ử]?\s*l[ý]?)\s+(?:những\s+)?(?:ảnh|hình)\s+cho\s+(?:khách hàng\s+)?([A-Za-z0-9\s\-\_\u00C0-\u017F\u1EA0-\u1EF9]{2,30})(?:\s|$|[.!?])/i);
      }
      if (!match) {
        match = message.match(/(?:xử lý|x[ử]?\s*l[ý]?)\s+cho\s+(?:khách hàng\s+)?([A-Za-z0-9\s\-\_\u00C0-\u017F\u1EA0-\u1EF9]{2,30})(?:\s|$|[.!?])/i);
      }
      if (!match) {
        match = message.match(/cho\s+(?:khách hàng\s+)?([A-Za-z0-9\s\-\_\u00C0-\u017F\u1EA0-\u1EF9]{2,30})(?:\s|$|[.!?])/i);
      }
      
      // Additional fallback patterns
      if (!match) {
        match = message.match(/(?:customer|khách hàng)\s+([A-Za-z0-9\s\-\_\u00C0-\u017F\u1EA0-\u1EF9]{2,30})(?:\s|$|[.!?])/i);
      }
      
      if (match) {
        customerName = match[1].trim();
        // Clean up customer name - remove trailing words that might be captured
        customerName = customerName.replace(/\s+(and|và|with|cùng|together|nữa|thêm).*$/i, '');
        customerName = customerName.replace(/\s+$/, ''); // Remove trailing spaces
        
        // Validate customer name
        if (customerName.length < 2 || customerName.length > 30) {
          customerName = `Customer_${Date.now()}`;
        }
      } else {
        customerName = `Customer_${Date.now()}`;
      }
      
      console.log('Extracted customer name:', customerName);

      try {
        // Execute complete workflow for photo processing
        if (!userId) {
          throw new Error('User ID is required');
        }
        const workflowResult = await executePhotoWorkflow(userId, imageIds, customerName);
        
        if (workflowResult.success) {
          aiResponse = `✅ I've successfully processed your photos for ${customerName}!\n\n` +
            `📊 Results:\n` +
            `- Analyzed ${workflowResult.totalImages || 0} photos from your configured Google Drive folder\n` +
            `- Found ${workflowResult.matchingPhotos || 0} photos matching the uploaded images\n` +
            `- Selected the best ${workflowResult.bestPhotosCount || 0} photos\n\n` +
            `📁 Folder Structure (Created OUTSIDE scan folder):\n` +
            `- Root/Gogi-Processed (main output folder)\n` +
            `  └── ${workflowResult.folderName || customerName} (all ${workflowResult.matchingPhotos || 0} matching photos)\n` +
            `      └── Best (top ${workflowResult.bestPhotosCount || 0} photos)\n\n` +
            `🔗 View all photos here: ${workflowResult.publicLink || "Link not available"}\n\n` +
            `✨ The output folder is created separately from your source images folder. ` +
            `Customer folder contains ALL matching photos, with the highest quality ones also saved in the "Best" subfolder. ` +
            `You can share this link with ${customerName}.`;
        } else {
          aiResponse = `❌ I encountered an issue while processing your photos: ${workflowResult.error}\n\n` +
            `Please try again or contact support if the issue persists.`;
        }
      } catch (workflowError: any) {
        console.error('Workflow error:', workflowError);
        aiResponse = `I'm sorry, I couldn't complete the photo processing workflow. Error: ${workflowError.message}`;
      }
    } else {
      // Generate regular AI response (includes case with images but no workflow trigger)
      try {
        // Get chat history for context
        const chatHistory = await ChatMessage.find({ conversationId: conversation._id })
          .sort({ createdAt: 'asc' })
          .limit(10);
        
        const formattedHistory = chatHistory.map(msg => ({
          role: (msg.userId === userId ? 'user' : 'model') as 'user' | 'model',
          parts: msg.message || msg.response || ''
        }));

        // Create enhanced prompt if images are present
        let enhancedMessage = message;
        if (imageIds && imageIds.length > 0) {
          const images = await Image.find({ _id: { $in: imageIds }, userId });
          
          enhancedMessage = `${message}\n\n[Context: User has uploaded ${imageIds.length} image${imageIds.length > 1 ? 's' : ''}. ` +
            `You can describe what you see in these images and answer questions about them. ` +
            `If the user wants to process these photos for a customer, they should say: "Process these photos for customer [name]" ` +
            `or in Vietnamese: "Xử lý ảnh cho khách hàng [name]"]`;
            
          // Add image information to context
          if (images.length > 0) {
            const imageInfo = images.map(img => `Image: ${img.filename}, Status: ${img.status}`).join(', ');
            enhancedMessage += `\n\nImage details: ${imageInfo}`;
          }
        }

        console.log('Calling googleAiService.generateChatResponse...');
        aiResponse = await googleAiService.generateChatResponse(enhancedMessage, formattedHistory);
        console.log('AI Response generated successfully:', aiResponse.substring(0, 100) + '...');
      } catch (aiError: any) {
        console.error('AI generation error:', aiError);
        aiResponse = 'I apologize, but I am unable to generate a response at the moment. Please try again later.';
      }
    }

    // Save bot response
    console.log('Saving bot response...');
    const botMessage = new ChatMessage({
      conversationId: conversation._id,
      userId: 'bot',
      message: message || 'Image processing',
      response: aiResponse,
      platform,
      type: 'text',
    });
    await botMessage.save();
    console.log('Bot message saved successfully');

    // Update conversation's last message and timestamp
    console.log('Updating conversation...');
    conversation.lastMessage = aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : '');
    conversation.updatedAt = new Date();
    await conversation.save();
    console.log('Conversation updated successfully');

    const responseData = {
      success: true,
      conversation: {
        _id: conversation._id,
        title: conversation.title,
        lastMessage: conversation.lastMessage,
        updatedAt: conversation.updatedAt,
      },
      response: aiResponse,
    };

    console.log('Sending response:', JSON.stringify(responseData, null, 2));
    res.status(200).json(responseData);

  } catch (error: any) {
    console.error('Send chat message error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    
    // Try to get conversation if it exists
    let conversation = null;
    if (req.body.conversationId) {
      try {
        conversation = await Conversation.findById(req.body.conversationId);
      } catch (dbError) {
        console.error('Error fetching conversation:', dbError);
      }
    }
    
    // If no conversation found, create a temporary one for error response
    if (!conversation) {
      conversation = {
        _id: 'temp-error-' + Date.now(),
        title: 'Error - ' + (req.body.message || 'Message').substring(0, 30),
        lastMessage: 'Error occurred',
        updatedAt: new Date()
      };
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Server error',
      conversation: {
        _id: conversation._id,
        title: conversation.title,
        lastMessage: conversation.lastMessage,
        updatedAt: conversation.updatedAt
      },
      response: `❌ I'm sorry, I encountered an error while processing your message: ${error.message || 'Server error'}. Please try again.`
    });
  }
};

// Advanced face matching function with multiple strategies
async function performAdvancedFaceMatching(
  uploadedEmbeddings: any[],
  driveEmbedding: any,
  imageUrl: string
): Promise<{
  isMatch: boolean;
  bestSimilarity: number;
  qualityScore: number;
  combinedScore: number;
  matchingFaces: number;
  confidence: number;
}> {
  // ===== NEW HELPER FUNCTIONS =====
  // Simple cosine similarity between two vectors (0-1)
  function cosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || !b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (!normA || !normB) return 0;
    return (dot / (Math.sqrt(normA) * Math.sqrt(normB)) + 1) / 2; // map [-1,1] -> [0,1]
  }

  // Very lightweight clustering: group embeddings if cosine sim > threshold
  function clusterEmbeddings(flatEmbeddings: number[][], threshold = 0.8): number[][][] {
    const clusters: number[][][] = [];
    outer: for (const emb of flatEmbeddings) {
      for (const cluster of clusters) {
        if (cosineSimilarity(emb, cluster[0]) > threshold) {
          cluster.push(emb);
          continue outer;
        }
      }
      clusters.push([emb]);
    }
    return clusters;
  }

  // Flatten uploaded embeddings into one array of vectors
  const allCustomerVectors: number[][] = [];
  for (const embObj of uploadedEmbeddings) {
    if (Array.isArray(embObj.embeddings)) {
      for (const vec of embObj.embeddings) {
        if (Array.isArray(vec) && vec.length) allCustomerVectors.push(vec);
      }
    }
  }

  // If no embeddings, early reject
  if (allCustomerVectors.length === 0) {
    return {
      isMatch: false,
      bestSimilarity: 0,
      qualityScore: 0,
      combinedScore: 0,
      matchingFaces: 0,
      confidence: 0
    };
  }

  // Cluster and select dominant cluster (largest size)
  const clusters = clusterEmbeddings(allCustomerVectors, 0.8);
  clusters.sort((a, b) => b.length - a.length);
  const dominantCluster = clusters[0];

  // Use only embeddings from dominant cluster for matching
  const representativeEmbeddings = dominantCluster.length ? dominantCluster : allCustomerVectors;
  // ===== END NEW CODE =====

  try {
    let bestSimilarity = 0;
    let totalSimilarity = 0;
    let comparisonCount = 0;
    let matchingFaceCount = 0;
    let confidenceSum = 0;
    
    // Updated loop – iterate over representative embeddings only
    const faceMatches: Array<{ similarity: number; confidence: number; quality1: number; quality2: number }> = [];
    
    for (const upEmb of representativeEmbeddings) {
      const upQuality = 0.75; // Assume decent quality; precise per-vector quality not tracked
      
      for (let j = 0; j < driveEmbedding.embeddings.length; j++) {
        const driveEmb = driveEmbedding.embeddings[j];
        const driveQuality = driveEmbedding.embeddings[j]?.quality_score || 0.5;
        
        const comparison = await deepFaceService.compareFaces(upEmb, driveEmb);
        
        if (comparison && comparison.similarity !== undefined) {
          const { similarity, confidence } = comparison;
          
          faceMatches.push({ similarity, confidence, quality1: upQuality, quality2: driveQuality });
          
          totalSimilarity += similarity;
          confidenceSum += confidence;
          comparisonCount++;
          
          if (similarity > bestSimilarity) bestSimilarity = similarity;
          
          if (similarity > 0.8 && confidence > 0.75) matchingFaceCount++;
        }
      }
    }
    
    if (comparisonCount === 0) {
      return {
        isMatch: false,
        bestSimilarity: 0,
        qualityScore: 0,
        combinedScore: 0,
        matchingFaces: 0,
        confidence: 0
      };
    }
    
    // CROSS-VALIDATION: Kiểm tra consistency giữa multiple embeddings
    if (representativeEmbeddings.length > 1 && driveEmbedding.embeddings.length > 1) {
      // Tính variance của similarities giữa different face combinations
      const allSimilarities = faceMatches.map(m => m.similarity);
      if (allSimilarities.length > 1) {
        const meanSim = allSimilarities.reduce((a, b) => a + b, 0) / allSimilarities.length;
        const variance = allSimilarities.reduce((sum, sim) => sum + Math.pow(sim - meanSim, 2), 0) / allSimilarities.length;
        const stdDev = Math.sqrt(variance);
        
        // Nếu variance quá cao (inconsistent results), penalize heavily
        if (stdDev > 0.15) {
          console.log(`[Advanced Matching] HIGH VARIANCE detected: ${stdDev.toFixed(3)} - REJECTING inconsistent match`);
          return {
            isMatch: false,
            bestSimilarity: 0,
            qualityScore: 0,
            combinedScore: 0,
            matchingFaces: 0,
            confidence: 0
          };
        }
      }
    }
    
    // Strategy 2: Calculate ensemble metrics
    const averageSimilarity = totalSimilarity / comparisonCount;
    const averageConfidence = confidenceSum / comparisonCount;
    
    // Strategy 3: Quality-weighted scoring
    const sortedMatches = faceMatches.sort((a, b) => 
      (b.similarity * b.confidence * (b.quality1 + b.quality2) / 2) - 
      (a.similarity * a.confidence * (a.quality1 + a.quality2) / 2)
    );
    
    // Get image quality score với strict quality gate
    const qualityResult = await deepFaceService.analyzeImageQuality(imageUrl);
    const imageQuality = qualityResult?.qualityScore || 0;
    
    // ULTRA-STRICT Quality Gate: Reject low quality images immediately
    if (imageQuality < 60) {
      console.log(`[Advanced Matching] LOW QUALITY image rejected: ${imageQuality.toFixed(1)} < 60`);
      return {
        isMatch: false,
        bestSimilarity: 0,
        qualityScore: imageQuality,
        combinedScore: 0,
        matchingFaces: 0,
        confidence: 0
      };
    }
    
    // Strategy 4: ULTRA-STRICT decision making - loại bỏ hoàn toàn false positives
    const isStrongMatch = bestSimilarity > 0.85 && averageConfidence > 0.80 && matchingFaceCount >= 2 && imageQuality > 70;
    const isGoodMatch = bestSimilarity > 0.80 && averageConfidence > 0.75 && matchingFaceCount >= 1 && imageQuality > 65;
    const isWeakMatch = false; // Tắt hoàn toàn weak matches
    
    // Chỉ accept match khi có high confidence và quality
    const isMatch = isStrongMatch || isGoodMatch || isWeakMatch;
    
    // Strategy 5: Enhanced combined scoring
    let combinedScore = 0;
    if (isMatch && sortedMatches.length > 0) {
      const topMatch = sortedMatches[0];
      const similarityScore = bestSimilarity * 0.4; // 40% weight
      const averageScore = averageSimilarity * 0.2; // 20% weight  
      const confidenceScore = averageConfidence * 0.15; // 15% weight
      const qualityScore = (imageQuality / 100) * 0.15; // 15% weight
      const faceCountBonus = Math.min(matchingFaceCount * 0.05, 0.1); // 5% per face, max 10%
      
      combinedScore = similarityScore + averageScore + confidenceScore + qualityScore + faceCountBonus;
      combinedScore = Math.min(1.0, combinedScore); // Cap at 1.0
    }
    
    console.log(`[ULTRA-STRICT Matching] Image: ${imageUrl.substring(imageUrl.length - 20)}`);
    console.log(`  - Best similarity: ${bestSimilarity.toFixed(3)}, Avg: ${averageSimilarity.toFixed(3)}`);
    console.log(`  - Confidence: ${averageConfidence.toFixed(3)}, Quality: ${imageQuality.toFixed(1)}`);
    console.log(`  - Matching faces: ${matchingFaceCount}, Valid comparisons: ${comparisonCount}`);
    console.log(`  - Strong: ${isStrongMatch}, Good: ${isGoodMatch}, Weak: ${isWeakMatch}`);
    
    if (!isMatch) {
      const rejectionReasons = [];
      if (bestSimilarity <= 0.80) rejectionReasons.push(`Low similarity (${bestSimilarity.toFixed(3)} ≤ 0.80)`);
      if (averageConfidence <= 0.75) rejectionReasons.push(`Low confidence (${averageConfidence.toFixed(3)} ≤ 0.75)`);
      if (matchingFaceCount < 1) rejectionReasons.push(`No matching faces (${matchingFaceCount} < 1)`);
      if (imageQuality <= 65) rejectionReasons.push(`Low quality (${imageQuality.toFixed(1)} ≤ 65)`);
      
      console.log(`  - REJECTION REASONS: ${rejectionReasons.join(', ')}`);
    }
    
    console.log(`  - Decision: ${isMatch ? 'MATCH ✅' : 'REJECTED ❌'}, Combined score: ${combinedScore.toFixed(3)}`);
    
    return {
      isMatch,
      bestSimilarity,
      qualityScore: imageQuality,
      combinedScore,
      matchingFaces: matchingFaceCount,
      confidence: averageConfidence
    };
    
  } catch (error) {
    console.error('Advanced face matching error:', error);
    return {
      isMatch: false,
      bestSimilarity: 0,
      qualityScore: 0,
      combinedScore: 0,
      matchingFaces: 0,
      confidence: 0
    };
  }
}

/**
 * Validate customer face quality before matching
 */
function validateCustomerFaceQuality(faceEmbedding: any): { isValid: boolean; reason?: string } {
  if (!faceEmbedding || !faceEmbedding.embeddings || faceEmbedding.embeddings.length === 0) {
    return { isValid: false, reason: 'Không phát hiện được khuôn mặt' };
  }

  if (faceEmbedding.qualityScore < 0.35) {
    return { isValid: false, reason: 'Chất lượng ảnh quá thấp' };
  }

  if (faceEmbedding.faceCount === 0) {
    return { isValid: false, reason: 'Không có khuôn mặt hợp lệ' };
  }

  if (faceEmbedding.faceCount > 3) {
    return { isValid: false, reason: 'Có quá nhiều khuôn mặt trong ảnh, vui lòng sử dụng ảnh chỉ có 1 người' };
  }

  return { isValid: true };
}

/**
 * Process enhanced matches with quality filtering
 */
function processEnhancedMatches(
  matches: Array<{ imagePath: string; similarity: number; confidence: number }>,
  folderEmbeddings: any,
  customerFaceEmbedding: any
): Array<{ imagePath: string; driveFileId?: string; similarity: number; confidence: number; qualityScore: number; combinedScore: number }> {
  const processedMatches: Array<{ imagePath: string; driveFileId?: string; similarity: number; confidence: number; qualityScore: number; combinedScore: number }> = [];
  
  // Group matches by image path to handle multiple face matches in the same image
  const groupedMatches = new Map<string, Array<{ imagePath: string; similarity: number; confidence: number }>>();
  
  for (const match of matches) {
    if (!groupedMatches.has(match.imagePath)) {
      groupedMatches.set(match.imagePath, []);
    }
    groupedMatches.get(match.imagePath)!.push(match);
  }

  // Process each image group
  for (const [imagePath, imageMatches] of groupedMatches) {
    // Find best match for this image
    const bestMatch = imageMatches.reduce((best, current) => {
      const bestScore = best.similarity * 0.7 + best.confidence * 0.3;
      const currentScore = current.similarity * 0.7 + current.confidence * 0.3;
      return currentScore > bestScore ? current : best;
    });

    // Calculate quality score
    const folderEmbedding = folderEmbeddings[imagePath];
    const qualityScore = folderEmbedding ? folderEmbedding.qualityScore || 0.5 : 0.5;

    // Calculate combined score
    const combinedScore = (
      bestMatch.similarity * 0.4 +
      bestMatch.confidence * 0.3 +
      qualityScore * 0.2 +
      customerFaceEmbedding.qualityScore * 0.1
    );

    // Only include high-quality matches
    if (combinedScore > 0.5 && bestMatch.similarity > 0.55 && bestMatch.confidence > 0.45) {
      // Retrieve driveFileId from the folder embedding
      const driveFileId = folderEmbedding?.driveFileId;
      
      processedMatches.push({
        imagePath,
        driveFileId,
        similarity: bestMatch.similarity,
        confidence: bestMatch.confidence,
        qualityScore,
        combinedScore
      });
    }
  }

  // Sort by combined score
  return processedMatches.sort((a, b) => b.combinedScore - a.combinedScore);
}

/**
 * Select best matched images with enhanced criteria
 */
function selectBestMatchedImages(
  processedMatches: Array<{ imagePath: string; driveFileId?: string; similarity: number; confidence: number; qualityScore: number; combinedScore: number }>,
  maxImages: number
): Array<{ imagePath: string; driveFileId?: string; similarity: number; confidence: number; qualityScore: number; combinedScore: number }> {
  // Take top matches up to maxImages
  return processedMatches.slice(0, maxImages);
}

/**
 * Get all images from folder using Google Drive API - always use admin's configured folder
 */
async function getAllImagesFromFolder(folderPath: string): Promise<DriveFile[]> {
  try {
    // Get admin user to access their Drive config
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('[getAllImagesFromFolder] Admin user not found');
      return [];
    }

    // Get Drive configuration from admin
    const driveConfig = await DriveConfig.findOne({ userId: adminUser._id });
    if (!driveConfig || !driveConfig.refreshToken) {
      console.log('[getAllImagesFromFolder] Google Drive not configured for admin');
      return [];
    }

    // ALWAYS use the folder ID from the admin's Drive config
    const folderId = driveConfig.folderId || 'root';
    
    console.log(`[getAllImagesFromFolder] Using admin's configured folder ID: ${folderId}`);
    
    // Get images from Google Drive and return the complete DriveFile objects
    const driveImages = await googleDriveService.getImageFilesFromFolderRecursive(driveConfig, folderId, 1000);
    
    console.log(`[getAllImagesFromFolder] Found ${driveImages.length} images in admin's configured folder`);
    
    // Return array of DriveFile objects to preserve the ID and other metadata
    return driveImages;
  } catch (error) {
    console.error('[getAllImagesFromFolder] Error:', error);
    return [];
  }
}

/**
 * Create processed folder in Google Drive for matched faces
 */
async function createProcessedFolder(selectedImages: any[], customerName: string): Promise<string> {
  try {
    // Get admin user to access their Drive config
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('[createProcessedFolder] Admin user not found');
      return '';
    }

    // Get Drive configuration from admin
    const driveConfig = await DriveConfig.findOne({ userId: adminUser._id });
    if (!driveConfig || !driveConfig.refreshToken) {
      console.log('[createProcessedFolder] Google Drive not configured for admin');
      return '';
    }

    // Create main Gogi folder at root level
    const gogiFolder = await googleDriveService.findOrCreateFolder(
      driveConfig, 
      'Gogi-folder',
      'root' // Create at root level
    );
    
    // Create customer folder with timestamp
    const customerFolderName = `${customerName}-${Date.now()}`;
    const customerFolder = await googleDriveService.createFolder(
      driveConfig, 
      customerFolderName, 
      gogiFolder.id
    );
    
    console.log(`[createProcessedFolder] Created folder structure:`);
    console.log(`  - Root/Gogi-folder (ID: ${gogiFolder.id})`);
    console.log(`  - Customer folder: ${customerFolderName} (ID: ${customerFolder.id})`);
    
    // Set public permission for customer folder
    const publicLink = await googleDriveService.setPublicPermission(
      driveConfig,
      customerFolder.id
    );
    
    return publicLink || `https://drive.google.com/drive/folders/${customerFolder.id}`;
  } catch (error) {
    console.error('[createProcessedFolder] Error:', error);
    return '';
  }
}

// NOTE: This config is no longer used. We always get the folder ID from admin's DriveConfig.
// Kept for backward compatibility only.
const adminConfig = {
  imageFolder: 'admin-drive-folder' // Placeholder value
};

// Helper function to execute the complete photo workflow
async function executePhotoWorkflow(
  userId: string, 
  uploadedImageIds: string[], 
  customerName: string
): Promise<any> {
  try {
    // Step 1: Get uploaded images and extract face embeddings
    const uploadedImages = await Image.find({ 
      _id: { $in: uploadedImageIds },
      userId 
    });

    if (uploadedImages.length === 0) {
      return { success: false, error: 'No uploaded images found' };
    }

    // Step 2: Extract face embeddings from uploaded images
    const uploadedEmbeddings: any[] = [];
    for (const image of uploadedImages) {
      const embedding = await deepFaceService.extractFaceEmbeddings(image.url);
      if (embedding && embedding.embeddings.length > 0) {
        uploadedEmbeddings.push({
          imageId: image._id,
          embeddings: embedding.embeddings,
          faceCount: embedding.faceCount
        });
      }
    }

    if (uploadedEmbeddings.length === 0) {
      return { success: false, error: 'No faces detected in uploaded images' };
    }

    // Step 3: Get Google Drive configuration from admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      return { success: false, error: 'Admin user not found. Please contact support.' };
    }

    const driveConfig = await DriveConfig.findOne({ userId: adminUser._id });
    if (!driveConfig || !driveConfig.refreshToken) {
      return { success: false, error: 'Google Drive not configured. Please connect your Google Drive account first.' };
    }

    // Step 4: Get images from configured folder in Google Drive
    const configuredFolder = driveConfig.folderId || 'root';
    console.log(`[executePhotoWorkflow] Scanning admin's configured folder: ${configuredFolder}`);
    
    const driveImages = await googleDriveService.getImageFilesFromFolderRecursive(driveConfig, configuredFolder, 1000);
    if (driveImages.length === 0) {
      return { success: false, error: `Không tìm thấy ảnh nào trong thư mục đã cấu hình (${configuredFolder}). Vui lòng kiểm tra cấu hình thư mục Google Drive của admin.` };
    }

    console.log(`[executePhotoWorkflow] Found ${driveImages.length} images in admin's configured folder ${configuredFolder}`);

    // Step 5: Compare embeddings and find ALL matching photos
    const matchingPhotos: any[] = [];
    const processedUrls = new Set<string>();
    let processedCount = 0;

    console.log(`[executePhotoWorkflow] Starting face comparison for ${driveImages.length} images...`);

    for (const driveImage of driveImages) {
      // Skip if already processed
      if (processedUrls.has(driveImage.id)) continue;
      processedUrls.add(driveImage.id);
      processedCount++;

      // Log progress every 10 images
      if (processedCount % 10 === 0) {
        console.log(`[executePhotoWorkflow] Processed ${processedCount}/${driveImages.length} images...`);
      }

      try {
        // Get direct download URL for the drive image
        const imageUrl = driveImage.thumbnailLink || 
          `https://drive.google.com/uc?export=view&id=${driveImage.id}`;

        // Extract embeddings from drive image
        const driveEmbedding = await deepFaceService.extractFaceEmbeddings(imageUrl);
        
        if (driveEmbedding && driveEmbedding.embeddings.length > 0) {
          // Enhanced face matching with validation
          try {
            console.log('Starting enhanced face matching process...');
            
            // Step 1: Enhanced face extraction and validation from customer image
            console.log('Step 1: Extracting and validating faces from customer image...');
            const customerFaceEmbedding = await deepFaceService.extractFaceEmbeddings(imageUrl);
            
            if (!customerFaceEmbedding || !customerFaceEmbedding.embeddings || customerFaceEmbedding.embeddings.length === 0) {
              console.log('❌ No valid faces detected in customer image');
              
              // Enhanced error message based on extraction result
              let errorMessage = 'Không thể phát hiện khuôn mặt trong ảnh.';
              
              if (customerFaceEmbedding && customerFaceEmbedding.qualityScore !== undefined) {
                if (customerFaceEmbedding.qualityScore < 0.3) {
                  errorMessage += ' Ảnh có chất lượng thấp, vui lòng gửi ảnh rõ nét hơn.';
                } else {
                  errorMessage += ' Vui lòng đảm bảo ảnh có khuôn mặt rõ ràng và không bị che khuất.';
                }
              } else {
                errorMessage += ' Vui lòng kiểm tra lại ảnh và gửi lại.';
              }
              
              return {
                success: false,
                error: errorMessage,
                bestImages: [],
                folderUrl: ''
              };
            }

            // Step 2: Validate customer face quality
            console.log('Step 2: Validating customer face quality...');
            const faceQualityValidation = validateCustomerFaceQuality(customerFaceEmbedding);
            
            if (!faceQualityValidation.isValid) {
              console.log(`❌ Customer face quality validation failed: ${faceQualityValidation.reason}`);
              
              return {
                success: false,
                error: `Chất lượng ảnh chưa đủ tốt: ${faceQualityValidation.reason}. Vui lòng gửi ảnh rõ nét hơn với khuôn mặt chính diện.`,
                bestImages: [],
                folderUrl: '',
                qualityInfo: faceQualityValidation
              };
            }

            console.log(`✅ Customer face validation passed: ${customerFaceEmbedding.faceCount} faces detected, quality score: ${customerFaceEmbedding.qualityScore.toFixed(3)}`);

            // Step 3: Continue with folder processing...
            console.log('Step 3: Processing folder images...');
            
            // Always use admin's configured folder for image comparison
            const folderImages = await getAllImagesFromFolder("");
            console.log(`Found ${folderImages.length} images in admin's configured folder`);

            if (folderImages.length === 0) {
              return {
                success: false,
                error: 'Không tìm thấy ảnh nào trong thư mục đã cấu hình để so sánh. Vui lòng kiểm tra cấu hình thư mục Google Drive của admin.',
                bestImages: [],
                folderUrl: ''
              };
            }

            // Rest of the existing logic continues unchanged...
            const folderEmbeddings: { [key: string]: any } = {};
            
            for (const driveFile of folderImages) {
              try {
                // Get the image URL from DriveFile object
                const imageUrl = driveFile.thumbnailLink || `https://drive.google.com/uc?export=view&id=${driveFile.id}`;
                const embedding = await deepFaceService.extractFaceEmbeddings(imageUrl);
                
                if (embedding && embedding.embeddings.length > 0) {
                  // Store the embedding with image URL as key, but also include driveFileId
                  folderEmbeddings[imageUrl] = {
                    ...embedding,
                    driveFileId: driveFile.id  // Store the drive file ID with the embedding
                  };
                  console.log(`✅ Processed: ${driveFile.name} - ${embedding.faceCount} faces, quality: ${embedding.qualityScore.toFixed(2)}`);
                } else {
                  console.log(`⚠️ No faces found in: ${driveFile.name}`);
                }
              } catch (error) {
                console.error(`❌ Error processing ${driveFile.name}:`, error);
              }
            }

            const validFolderImages = Object.keys(folderEmbeddings);
            console.log(`Successfully processed ${validFolderImages.length} out of ${folderImages.length} folder images`);

            if (validFolderImages.length === 0) {
              return {
                success: false,
                error: 'Không tìm thấy ảnh nào có khuôn mặt hợp lệ trong thư mục.',
                bestImages: [],
                folderUrl: ''
              };
            }

            // Enhanced matching with multiple embeddings
            console.log('Step 4: Enhanced face matching...');
            const matches: Array<{ imagePath: string; similarity: number; confidence: number }> = [];

            for (const customerEmbedding of customerFaceEmbedding.embeddings) {
              for (const [imagePath, folderEmbedding] of Object.entries(folderEmbeddings)) {
                for (const folderEmb of folderEmbedding.embeddings) {
                  try {
                    const result = await deepFaceService.compareFaces(customerEmbedding, folderEmb);
                    
                    if (result.similarity > 0.5 && result.confidence > 0.4) { // Enhanced thresholds
                      matches.push({
                        imagePath,
                        similarity: result.similarity,
                        confidence: result.confidence
                      });
                      
                      console.log(`🎯 Match found: ${path.basename(imagePath)} - Similarity: ${result.similarity.toFixed(3)}, Confidence: ${result.confidence.toFixed(3)}`);
                    }
                  } catch (error) {
                    console.error(`Error comparing with ${path.basename(imagePath)}:`, error);
                  }
                }
              }
            }

            // Enhanced match processing and selection
            console.log(`Step 5: Processing ${matches.length} matches...`);
            
            const processedMatches = processEnhancedMatches(matches, folderEmbeddings, customerFaceEmbedding);
            
            if (processedMatches.length === 0) {
              console.log('❌ No high-quality matches found');
              return {
                success: false,
                error: 'Không tìm thấy ảnh nào phù hợp trong thư mục. Vui lòng thử với ảnh khác hoặc kiểm tra lại thư mục ảnh.',
                bestImages: [],
                folderUrl: '',
                matchingInfo: {
                  totalMatches: matches.length,
                  qualityMatches: 0,
                  customerFaceQuality: customerFaceEmbedding.qualityScore
                }
              };
            }

            // Select best images with enhanced criteria
            const selectedImages = selectBestMatchedImages(processedMatches, 5);
            console.log(`✅ Selected ${selectedImages.length} best images`);

            // Create output folder and copy images
            const adminUser = await User.findOne({ role: 'admin' });
            if (!adminUser) {
              return {
                success: false,
                error: 'Admin user not found',
                bestImages: [],
                folderUrl: ''
              };
            }

            const driveConfig = await DriveConfig.findOne({ userId: adminUser._id });
            if (!driveConfig || !driveConfig.refreshToken) {
              return {
                success: false,
                error: 'Google Drive not configured for admin',
                bestImages: [],
                folderUrl: ''
              };
            }

            // Create output folder
            const outputFolderUrl = await createProcessedFolder(selectedImages, customerName);
            
            // Get the folder ID from the URL
            const folderIdMatch = outputFolderUrl.match(/folders\/([^\/]+)/);
            const customerFolderId = folderIdMatch ? folderIdMatch[1] : '';
            
            if (customerFolderId) {
              // Copy matched images to the customer folder
              console.log(`Copying ${selectedImages.length} matched images to customer folder...`);
              
              for (const image of selectedImages) {
                try {
                  const fileId = (image as any).driveFileId;
                  if (fileId) {
                    await googleDriveService.copyFile(
                      driveConfig,
                      fileId,
                      customerFolderId
                    );
                    console.log(`✅ Copied image ${fileId} to customer folder`);
                  } else {
                    console.log(`⚠️ Missing driveFileId for image ${image.imagePath}`);
                  }
                } catch (error) {
                  console.error(`❌ Error copying image:`, error);
                }
              }
            }
            
            console.log(`✅ Enhanced face matching completed successfully!`);
            console.log(`📁 Output folder: ${outputFolderUrl}`);
            console.log(`🎯 Best matches: ${selectedImages.map(img => path.basename(img.imagePath)).join(', ')}`);

            return {
              success: true,
              bestImages: selectedImages.map(img => img.imagePath),
              folderUrl: outputFolderUrl,
              totalImages: folderImages.length,
              matchingPhotos: selectedImages.length,
              bestPhotosCount: selectedImages.length,
              folderName: customerName,
              publicLink: outputFolderUrl,
              matchingInfo: {
                totalMatches: matches.length,
                qualityMatches: processedMatches.length,
                customerFaceQuality: customerFaceEmbedding.qualityScore,
                selectedImages: selectedImages.length
              }
            };

          } catch (error) {
            console.error('Enhanced face matching error:', error);
            return {
              success: false,
              error: 'Đã xảy ra lỗi trong quá trình xử lý. Vui lòng thử lại.',
              bestImages: [],
              folderUrl: ''
            };
          }
        }
      } catch (embError) {
        console.error(`Error processing drive image ${driveImage.id}:`, embError);
        // Continue with other images
      }
    }

    console.log(`[executePhotoWorkflow] 🎯 MATCHING SUMMARY:`);
    console.log(`  - Processed ${processedCount} images from Google Drive`);
    console.log(`  - Found ${matchingPhotos.length} matching photos for customer: ${customerName}`);
    console.log(`  - Upload images for comparison: ${uploadedEmbeddings.length}`);
    
    if (matchingPhotos.length > 0) {
      const avgSimilarity = matchingPhotos.reduce((sum, p) => sum + p.similarity, 0) / matchingPhotos.length;
      const avgQuality = matchingPhotos.reduce((sum, p) => sum + p.qualityScore, 0) / matchingPhotos.length;
      console.log(`  - Average similarity: ${avgSimilarity.toFixed(3)}`);
      console.log(`  - Average quality: ${avgQuality.toFixed(1)}`);
      console.log(`  - Top 3 scores: ${matchingPhotos.sort((a, b) => b.combinedScore - a.combinedScore).slice(0, 3).map(p => p.combinedScore.toFixed(3)).join(', ')}`);
    }

    // Step 6: Check if we have matching photos
    if (matchingPhotos.length === 0) {
      return { success: false, error: 'No matching photos found in your Google Drive' };
    }

    // Step 7: Create folder structure outside configured folder: Gogi -> Customer Name -> Best
    console.log(`[executePhotoWorkflow] Creating folder structure for ${customerName} OUTSIDE configured folder...`);
    
    // Create main Gogi folder at root level (OUTSIDE the configured scan folder)
    // This ensures customer folders are separate from the source images folder
    const gogiFolder = await googleDriveService.findOrCreateFolder(
      driveConfig, 
      'Gogi-Processed', // Use different name to distinguish from source
      'root' // Always create at root level, not inside configured folder
    );
    
    // Create customer folder inside Gogi-Processed
    const customerFolderName = `${customerName} - ${new Date().toISOString().split('T')[0]}`;
    const customerFolder = await googleDriveService.createFolder(
      driveConfig, 
      customerFolderName, 
      gogiFolder.id
    );
    
    // Create Best subfolder inside customer folder
    const bestFolder = await googleDriveService.createFolder(
      driveConfig, 
      'Best', 
      customerFolder.id
    );
    
    console.log(`[executePhotoWorkflow] Created folder structure:`);
    console.log(`  - Root/Gogi-Processed (ID: ${gogiFolder.id})`);
    console.log(`  - Customer folder: ${customerFolderName} (ID: ${customerFolder.id})`);
    console.log(`  - Best folder (ID: ${bestFolder.id})`);
    console.log(`  - Source folder (scan): ${driveConfig.folderId || 'root'}`);

    // Step 8: Copy ALL matching photos to customer folder
    console.log(`[executePhotoWorkflow] Copying ${matchingPhotos.length} matching photos to customer folder...`);
    const copiedMatchingFiles = [];
    let copyCount = 0;

    for (const photo of matchingPhotos) {
      try {
        const copiedFile = await googleDriveService.copyFile(
          driveConfig,
          (photo as any).driveFileId, // Use photo.driveFileId here
          customerFolder.id
        );
        copiedMatchingFiles.push({
          ...copiedFile,
          similarity: photo.similarity,
          qualityScore: photo.qualityScore,
          combinedScore: photo.combinedScore
        });
        copyCount++;
        
        // Log progress every 10 files
        if (copyCount % 10 === 0) {
          console.log(`[executePhotoWorkflow] Copied ${copyCount}/${matchingPhotos.length} matching photos...`);
        }
      } catch (copyError) {
        console.error(`Error copying file ${photo.driveFileId}:`, copyError);
      }
    }

    // Step 9: Sort by combined score and select best 10 photos
    console.log(`[executePhotoWorkflow] Selecting best photos based on similarity and quality...`);
    matchingPhotos.sort((a, b) => b.combinedScore - a.combinedScore);
    const bestPhotos = matchingPhotos.slice(0, Math.min(10, matchingPhotos.length));

    // Step 10: Copy best photos to Best subfolder
    console.log(`[executePhotoWorkflow] Copying ${bestPhotos.length} best photos to Best folder...`);
    const copiedBestFiles = [];
    
    for (const photo of bestPhotos) {
      try {
        const copiedFile = await googleDriveService.copyFile(
          driveConfig,
          (photo as any).driveFileId, // Use photo.driveFileId here
          bestFolder.id
        );
        copiedBestFiles.push(copiedFile);
      } catch (copyError) {
        console.error(`Error copying best file ${photo.driveFileId}:`, copyError);
      }
    }

    // Step 11: Set public permission for customer folder
    const publicLink = await googleDriveService.setPublicPermission(
      driveConfig,
      customerFolder.id
    );

    console.log(`[executePhotoWorkflow] Workflow completed successfully!`);
    console.log(`[executePhotoWorkflow] Total matching: ${matchingPhotos.length}, Best: ${copiedBestFiles.length}`);

    return {
      success: true,
      totalImages: driveImages.length,
      matchingPhotos: copiedMatchingFiles.length,
      bestPhotosCount: copiedBestFiles.length,
      folderName: customerFolder.name,
      folderId: customerFolder.id,
      publicLink,
      folderStructure: {
        gogiFolder: gogiFolder.name,
        customerFolder: customerFolder.name,
        bestFolder: bestFolder.name
      }
    };

  } catch (error: any) {
    console.error('Photo workflow error:', error);
    return {
      success: false,
      error: error.message || 'Workflow execution failed'
    };
  }
}

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