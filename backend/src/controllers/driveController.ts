import { Request, Response } from 'express';
import DriveConfig, { IDriveConfig } from '../models/DriveConfig';
import n8nService from '../services/n8nService';
import googleDriveService from '../services/googleDriveService';
import config from '../config/config';

// @desc    Get Google Drive configuration
// @route   GET /api/drive/config
// @access  Private
export const getDriveConfig = async (req: Request, res: Response) => {
  try {
    // Check if user exists in request
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const driveConfig = await DriveConfig.findOne({ userId: req.user.id });

    if (!driveConfig) {
      // Return empty config instead of 404 error
      return res.status(200).json({
        success: true,
        data: {
          clientId: config.googleDrive.clientId || '',
          clientSecret: config.googleDrive.clientSecret || '',
          refreshToken: '',
          folderId: 'root',
          scanInterval: 60,
          userId: req.user.id
        },
      });
    }

    res.status(200).json({
      success: true,
      data: driveConfig,
    });
  } catch (error) {
    console.error('Get Drive config error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error when retrieving Drive configuration',
    });
  }
};

// @desc    Update Google Drive configuration
// @route   PUT /api/drive/config
// @access  Private
export const updateDriveConfig = async (req: Request, res: Response) => {
  try {
    const { clientId, clientSecret, refreshToken, folderId, scanInterval } = req.body;

    // Find existing config or create new one
    let driveConfig = await DriveConfig.findOne({ userId: req.user?.id });

    if (!driveConfig) {
      // Create new config
      driveConfig = await DriveConfig.create({
        clientId,
        clientSecret,
        refreshToken,
        folderId,
        scanInterval: scanInterval || 60,
        userId: req.user?.id,
      });
    } else {
      // Update existing config
      driveConfig.clientId = clientId || driveConfig.clientId;
      driveConfig.clientSecret = clientSecret || driveConfig.clientSecret;
      driveConfig.refreshToken = refreshToken !== undefined ? refreshToken : driveConfig.refreshToken;
      driveConfig.folderId = folderId || driveConfig.folderId;
      driveConfig.scanInterval = scanInterval || driveConfig.scanInterval;
      
      await driveConfig.save();
    }

    res.status(200).json({
      success: true,
      data: driveConfig,
    });
  } catch (error) {
    console.error('Update Drive config error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Generate OAuth URL for Google Drive
// @route   GET /api/drive/auth-url
// @access  Private
export const getAuthUrl = async (req: Request, res: Response) => {
  try {
    // Fetch saved Drive configuration
    const driveConfig = await DriveConfig
      .findOne({ userId: req.user?.id })
      .lean<IDriveConfig | null>()
      .exec();

    if (!driveConfig) {
      return res.status(400).json({
        success: false,
        error: 'Google Drive configuration not found. Please save Client ID and Client Secret first.'
      });
    }

    // Validate required fields
    if (!driveConfig.clientId || !driveConfig.clientSecret) {
      return res.status(400).json({
        success: false,
        error: 'Client ID or Client Secret is missing. Please update your configuration.'
      });
    }

    // Encode userId in state for later verification
    const state = Buffer.from(
      JSON.stringify({ userId: req.user?.id })
    ).toString('base64');

    // Generate OAuth authorization URL
    const authUrl = googleDriveService.generateAuthUrl(driveConfig, state);
    
    res.status(200).json({
      success: true,
      data: { authUrl }
    });
  } catch (error: any) {
    console.error('Get auth URL error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate authorization URL'
    });
  }
};

// @desc    OAuth2 callback handler
// @route   GET /api/drive/oauth2callback
// @access  Public
export const handleOAuth2Callback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is missing'
      });
    }
    
    // Decode state to get user ID
    let userId;
    try {
      if (state) {
        const decodedState = JSON.parse(Buffer.from(state as string, 'base64').toString());
        userId = decodedState.userId;
      }
    } catch (e) {
      console.error('Failed to decode state:', e);
    }
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid state parameter'
      });
    }
    
    // Get drive config
    let driveConfig: IDriveConfig | null = await DriveConfig.findOne({ userId });
    
    if (!driveConfig) {
      // Create default config
      driveConfig = await DriveConfig.create({
        clientId: config.googleDrive.clientId,
        clientSecret: config.googleDrive.clientSecret,
        folderId: 'root',
        scanInterval: 60,
        userId
      });
    }
    
    // Exchange code for tokens
    const tokens = await googleDriveService.getTokens(driveConfig as IDriveConfig, code as string);
    
    // Update refresh token
    if (tokens.refresh_token) {
      driveConfig.refreshToken = tokens.refresh_token;
      await driveConfig.save();
    }
    
    // Redirect back to the frontend application with success message
    const redirectUrl = `${config.frontendBaseUrl}/admin/config?auth=success`;
    res.redirect(redirectUrl);
    
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    const errorRedirect = `${config.frontendBaseUrl}/admin/config?auth=error&message=${encodeURIComponent(error.message || 'Authorization failed')}`;
    res.redirect(errorRedirect);
  }
};

// @desc    Scan Google Drive for new images
// @route   POST /api/drive/scan
// @access  Private
export const scanDrive = async (req: Request, res: Response) => {
  try {
    const driveConfig = await DriveConfig.findOne({ userId: req.user?.id });

    if (!driveConfig) {
      return res.status(404).json({
        success: false,
        error: 'Google Drive configuration not found. Please configure Google Drive first.',
      });
    }

    if (!driveConfig.refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Google Drive not authorized. Please authorize access first.',
      });
    }

    // Execute n8n workflow for scanning Google Drive
    const result = await n8nService.executeDriveScan(driveConfig);

    res.status(200).json({
      success: true,
      data: {
        executionId: result.id,
        status: result.status,
      },
    });
  } catch (error) {
    console.error('Scan Drive error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    List folders in Google Drive
// @route   GET /api/drive/folders
// @access  Private
export const listFolders = async (req: Request, res: Response) => {
  try {
    const { parentId } = req.query as { parentId?: string };
    const driveConfig = await DriveConfig.findOne({ userId: req.user?.id });
    if (!driveConfig) {
      return res.status(404).json({ success: false, error: 'Google Drive configuration not found' });
    }
    if (!driveConfig.refreshToken) {
      return res.status(400).json({ success: false, error: 'Google Drive not linked (missing refresh token)' });
    }
    const targetParent = parentId || driveConfig.folderId || 'root';
    const folders = await googleDriveService.listFolders(driveConfig as IDriveConfig, targetParent);
    res.status(200).json({ success: true, data: folders });
  } catch (error: any) {
    console.error('List Drive folders error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Server error' 
    });
  }
};

// @desc    List files in Google Drive folder
// @route   GET /api/drive/files
// @access  Private
export const listFiles = async (req: Request, res: Response) => {
  try {
    const { folderId = 'root', fileType } = req.query;
    
    const driveConfig = await DriveConfig.findOne({ userId: req.user?.id });
    
    if (!driveConfig) {
      return res.status(404).json({
        success: false,
        error: 'Google Drive configuration not found',
      });
    }
    
    const files = await googleDriveService.listFiles(
      driveConfig,
      folderId as string,
      fileType as string
    );
    
    res.status(200).json({
      success: true,
      data: files,
    });
  } catch (error: any) {
    console.error('Error listing files:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Create a new folder in Google Drive
// @route   POST /api/drive/folders
// @access  Private
export const createFolder = async (req: Request, res: Response) => {
  try {
    const { name, parentId = 'root' } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Folder name is required',
      });
    }
    
    const driveConfig = await DriveConfig.findOne({ userId: req.user?.id });
    
    if (!driveConfig) {
      return res.status(404).json({
        success: false,
        error: 'Google Drive configuration not found',
      });
    }
    
    const folder = await googleDriveService.createFolder(
      driveConfig,
      name,
      parentId
    );
    
    res.status(201).json({
      success: true,
      data: folder,
    });
  } catch (error: any) {
    console.error('Error creating folder:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Copy file to another folder
// @route   POST /api/drive/files/copy
// @access  Private
export const copyFile = async (req: Request, res: Response) => {
  try {
    const { fileId, destinationFolderId, newName } = req.body;
    
    if (!fileId || !destinationFolderId) {
      return res.status(400).json({
        success: false,
        error: 'File ID and destination folder ID are required',
      });
    }
    
    const driveConfig = await DriveConfig.findOne({ userId: req.user?.id });
    
    if (!driveConfig) {
      return res.status(404).json({
        success: false,
        error: 'Google Drive configuration not found',
      });
    }
    
    const file = await googleDriveService.copyFile(
      driveConfig,
      fileId,
      destinationFolderId,
      newName
    );
    
    res.status(200).json({
      success: true,
      data: file,
    });
  } catch (error: any) {
    console.error('Error copying file:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Set public permission for a file or folder
// @route   POST /api/drive/permissions/public
// @access  Private
export const setPublicPermission = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.body;
    
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'File ID is required',
      });
    }
    
    const driveConfig = await DriveConfig.findOne({ userId: req.user?.id });
    
    if (!driveConfig) {
      return res.status(404).json({
        success: false,
        error: 'Google Drive configuration not found',
      });
    }
    
    const publicLink = await googleDriveService.setPublicPermission(
      driveConfig,
      fileId
    );
    
    res.status(200).json({
      success: true,
      data: { publicLink },
    });
  } catch (error: any) {
    console.error('Error setting public permission:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Get image files from Google Drive
// @route   GET /api/drive/images
// @access  Private
export const getAllImages = async (req: Request, res: Response) => {
  try {
    const { maxResults = 1000, folderId, recursive = 'false' } = req.query;
    
    const driveConfig = await DriveConfig.findOne({ userId: req.user?.id });
    
    if (!driveConfig) {
      return res.status(404).json({
        success: false,
        error: 'Google Drive configuration not found',
      });
    }
    
    let images;
    
    if (folderId) {
      // Get images from specific folder
      if (recursive === 'true') {
        images = await googleDriveService.getImageFilesFromFolderRecursive(
          driveConfig,
          folderId as string,
          Number(maxResults)
        );
      } else {
        images = await googleDriveService.getImageFilesFromFolder(
          driveConfig,
          folderId as string,
          Number(maxResults)
        );
      }
    } else {
      // Get images from configured folder by default
      const configuredFolder = driveConfig.folderId || 'root';
      images = await googleDriveService.getImageFilesFromFolderRecursive(
        driveConfig,
        configuredFolder,
        Number(maxResults)
      );
    }
    
    res.status(200).json({
      success: true,
      data: images,
      folder: folderId || driveConfig.folderId || 'root',
      recursive: recursive === 'true'
    });
  } catch (error: any) {
    console.error('Error listing images:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
}; 