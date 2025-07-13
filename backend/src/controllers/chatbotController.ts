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
    
    const images = await googleDriveService.getImageFilesFromFolderRecursive(driveConfig, configuredFolder, 100);
    
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
      // Extract customer name from message using multiple patterns
      let customerName = '';
      
      // Try English patterns first
      let match = message.match(/process\s+(?:these\s+)?(?:photos?|images?)\s+for\s+(?:customer\s+)?([A-Za-z0-9\s]+)/i);
      if (!match) {
        match = message.match(/process\s+(?:photos?|images?)\s+for\s+([A-Za-z0-9\s]+)/i);
      }
      
      // Try Vietnamese patterns
      if (!match) {
        match = message.match(/(?:xử lý|x[ử]?\s*l[ý]?)\s+(?:những\s+)?(?:ảnh|hình)\s+cho\s+(?:khách hàng\s+)?([A-Za-z0-9\s]+)/i);
      }
      if (!match) {
        match = message.match(/(?:xử lý|x[ử]?\s*l[ý]?)\s+cho\s+(?:khách hàng\s+)?([A-Za-z0-9\s]+)/i);
      }
      
      customerName = match ? match[1].trim() : `Customer_${Date.now()}`;
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
            `- Analyzed ${workflowResult.totalImages} photos from your Google Drive\n` +
            `- Found ${workflowResult.matchingPhotos} photos matching the uploaded images\n` +
            `- Selected the best ${workflowResult.bestPhotosCount} photos\n\n` +
            `📁 Folder Structure:\n` +
            `- Gogi (main folder)\n` +
            `  └── ${workflowResult.folderName} (all ${workflowResult.matchingPhotos} matching photos)\n` +
            `      └── Best (top ${workflowResult.bestPhotosCount} photos)\n\n` +
            `🔗 View all photos here: ${workflowResult.publicLink}\n\n` +
            `The customer folder contains ALL matching photos, with the highest quality ones also saved in the "Best" subfolder. ` +
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
    console.log(`[executePhotoWorkflow] Scanning folder: ${configuredFolder}`);
    
    const driveImages = await googleDriveService.getImageFilesFromFolderRecursive(driveConfig, configuredFolder, 1000);
    if (driveImages.length === 0) {
      return { success: false, error: `No images found in configured folder (${configuredFolder}). Please check your folder configuration.` };
    }

    console.log(`[executePhotoWorkflow] Found ${driveImages.length} images in configured folder ${configuredFolder}`);

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
          // Compare with uploaded embeddings
          let bestSimilarity = 0;
          
          for (const uploadedEmb of uploadedEmbeddings) {
            for (const upEmb of uploadedEmb.embeddings) {
              for (const driveEmb of driveEmbedding.embeddings) {
                const comparison = await deepFaceService.compareFaces(
                  upEmb,
                  driveEmb
                );
                if (comparison.similarity > bestSimilarity) {
                  bestSimilarity = comparison.similarity;
                }
              }
            }
          }

          // If similarity is above threshold, add to matching photos
          if (bestSimilarity > 0.6) { // 60% similarity threshold
            // Get quality score for ranking
            const qualityResult = await deepFaceService.analyzeImageQuality(imageUrl);
            
            matchingPhotos.push({
              driveFile: driveImage,
              similarity: bestSimilarity,
              faceCount: driveEmbedding.faceCount,
              qualityScore: qualityResult?.qualityScore || 0,
              // Combined score for ranking: 70% similarity + 30% quality
              combinedScore: (bestSimilarity * 0.7) + ((qualityResult?.qualityScore || 0) / 100 * 0.3)
            });
          }
        }
      } catch (embError) {
        console.error(`Error processing drive image ${driveImage.id}:`, embError);
        // Continue with other images
      }
    }

    console.log(`[executePhotoWorkflow] Found ${matchingPhotos.length} matching photos from ${processedCount} processed images`);

    // Step 6: Check if we have matching photos
    if (matchingPhotos.length === 0) {
      return { success: false, error: 'No matching photos found in your Google Drive' };
    }

    // Step 7: Create folder structure: Gogi -> Customer Name -> Best
    console.log(`[executePhotoWorkflow] Creating folder structure for ${customerName}...`);
    
    // Find or create main Gogi folder
    const gogiFolder = await googleDriveService.findOrCreateFolder(
      driveConfig, 
      'Gogi', 
      driveConfig.folderId || 'root'
    );
    
    // Create customer folder inside Gogi
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

    // Step 8: Copy ALL matching photos to customer folder
    console.log(`[executePhotoWorkflow] Copying ${matchingPhotos.length} matching photos to customer folder...`);
    const copiedMatchingFiles = [];
    let copyCount = 0;

    for (const photo of matchingPhotos) {
      try {
        const copiedFile = await googleDriveService.copyFile(
          driveConfig,
          photo.driveFile.id,
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
        console.error(`Error copying file ${photo.driveFile.id}:`, copyError);
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
          photo.driveFile.id,
          bestFolder.id
        );
        copiedBestFiles.push(copiedFile);
      } catch (copyError) {
        console.error(`Error copying best file ${photo.driveFile.id}:`, copyError);
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