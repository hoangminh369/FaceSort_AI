import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import mongoose from 'mongoose';
import Image from '../models/Image';
import config from '../config/config';
import n8nService from '../services/n8nService';
import deepFaceService from '../services/deepFaceService';

// Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(config.uploadDir)) {
      fs.mkdirSync(config.uploadDir, { recursive: true });
    }
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

// File filter to accept only images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// @desc    Get all images for a user
// @route   GET /api/images
// @access  Private
export const getImages = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const total = await Image.countDocuments({ userId: req.user?.id });
    const images = await Image.find({ userId: req.user?.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: {
        data: images,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Upload images
// @route   POST /api/images/upload
// @access  Private
export const uploadImages = async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
      });
    }

    const uploadedFiles = req.files as Express.Multer.File[];
    const savedImages = [];

    for (const file of uploadedFiles) {
      const image = await Image.create({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        url: `/uploads/${file.filename}`,
        size: file.size,
        mimeType: file.mimetype,
        userId: req.user?.id,
        status: 'uploaded',
      });

      savedImages.push(image);
    }

    res.status(201).json({
      success: true,
      data: savedImages,
    });
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Delete an image
// @route   DELETE /api/images/:id
// @access  Private
export const deleteImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image ID provided',
      });
    }

    const image = await Image.findOne({
      _id: id,
      userId: req.user?.id,
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        error: 'Image not found',
      });
    }

    // Delete file from disk
    if (fs.existsSync(image.path)) {
      fs.unlinkSync(image.path);
    }

    // Delete from database
    await image.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Process images with DeepFace
// @route   POST /api/images/process
// @access  Private
export const processImages = async (req: Request, res: Response) => {
  try {
    // Find all uploaded images for the user
    const images = await Image.find({
      userId: req.user?.id,
      status: 'uploaded',
    });

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No uploaded images found to process',
      });
    }

    // Update images status to processing
    await Image.updateMany(
      { _id: { $in: images.map(img => (img._id as mongoose.Types.ObjectId)) } },
      { status: 'processing' }
    );

    // Execute n8n workflow for DeepFace processing
    const result = await n8nService.executeDeepFaceProcessing(
      images.map(img => (img._id as mongoose.Types.ObjectId).toString())
    );

    res.status(200).json({
      success: true,
      data: {
        executionId: result.id,
        status: result.status,
        imageCount: images.length,
      },
    });
  } catch (error) {
    console.error('Process images error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Analyze face attributes for a single image
// @route   POST /api/images/analyze-face
// @access  Public (for n8n workflows)
export const analyzeFace = async (req: Request, res: Response) => {
  try {
    const { imageUrl, imageId, actions } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Image URL is required',
      });
    }

    // Analyze face attributes using local DeepFace service
    const faceAttributes = await deepFaceService.analyzeFaceAttributes(
      imageUrl,
      actions || ['age', 'gender', 'emotion', 'race']
    );

    // Get image quality score
    const qualityResult = await deepFaceService.analyzeImageQuality(imageUrl);

    // Extract face embeddings for future comparison
    const embeddingResult = await deepFaceService.extractFaceEmbeddings(imageUrl);

    // Update image in database if imageId is provided
    if (imageId) {
      try {
        await Image.findByIdAndUpdate(imageId, {
          status: 'processed',
          faceAnalysis: faceAttributes,
          qualityScore: qualityResult.qualityScore,
          faceCount: embeddingResult?.faceCount || 0,
          processedAt: new Date()
        });
      } catch (dbError) {
        console.error('Database update error:', dbError);
        // Continue processing even if DB update fails
      }
    }

    res.status(200).json({
      success: true,
      analyses: faceAttributes || [],
      qualityScore: qualityResult.qualityScore,
      faceCount: embeddingResult?.faceCount || 0,
      embeddings: embeddingResult?.embeddings || []
    });
  } catch (error) {
    console.error('Analyze face error:', error);
    res.status(500).json({
      success: false,
      error: 'Face analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// @desc    Compare two images for face similarity
// @route   POST /api/images/compare-faces
// @access  Private
export const compareFaces = async (req: Request, res: Response) => {
  try {
    const { sourceImageUrl, targetImageUrl } = req.body;

    if (!sourceImageUrl || !targetImageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Both source and target image URLs are required',
      });
    }

    // Verify faces using local DeepFace service
    const verificationResult = await deepFaceService.verifyFaces(
      sourceImageUrl,
      targetImageUrl
    );

    res.status(200).json({
      success: true,
      data: verificationResult
    });
  } catch (error) {
    console.error('Compare faces error:', error);
    res.status(500).json({
      success: false,
      error: 'Face comparison failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// @desc    Find similar faces in user's image collection
// @route   POST /api/images/find-similar
// @access  Private
export const findSimilarFaces = async (req: Request, res: Response) => {
  try {
    const { imageId, similarityThreshold } = req.body;

    if (!imageId) {
      return res.status(400).json({
        success: false,
        error: 'Image ID is required',
      });
    }

    // Get all images for the user
    const userImages = await Image.find({
      userId: req.user?.id,
      status: 'processed'
    });

    if (userImages.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Need at least 2 processed images to find similarities',
      });
    }

    const imageIds = userImages.map(img => (img._id as mongoose.Types.ObjectId).toString());
    
    // Find similar faces using local DeepFace service
    const similarFaces = await deepFaceService.findSimilarFaces(
      imageIds,
      similarityThreshold || config.deepface.similarityThreshold
    );

    res.status(200).json({
      success: true,
      data: similarFaces
    });
  } catch (error) {
    console.error('Find similar faces error:', error);
    res.status(500).json({
      success: false,
      error: 'Finding similar faces failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 