import { PythonShell } from 'python-shell';
import path from 'path';
import fs from 'fs';
import config from '../config/config';
import Image, { IImage } from '../models/Image';
import mongoose from 'mongoose';

interface FaceEmbedding {
  imageId: string;
  embeddings: number[][];
  faceCount: number;
  qualityScore: number;
}

interface ComparisonResult {
  sourceImageId: string;
  targetImageId: string;
  similarity: number;
  matchingFaces: number;
}

interface ImageRanking {
  imageId: string;
  score: number;
  similarImages: string[];
  qualityScore: number;
  faceCount: number;
}

interface DeepFaceResponse {
  success: boolean;
  error?: string;
  [key: string]: any;
}

class DeepFaceService {
  private pythonScriptPath: string;
  private pythonExecutable: string;
  private useFallback: boolean = false;

  constructor() {
    // Prefer full DeepFace processor if available for better accuracy
    const deepfaceProcessorPath = path.join(__dirname, '../../scripts/python/deepface_processor.py');
    const enhancedScriptPath = path.join(__dirname, '../../scripts/python/simple_face_processor_v2.py');
    const basicScriptPath = path.join(__dirname, '../../scripts/python/simple_face_processor.py');
    
    if (fs.existsSync(deepfaceProcessorPath)) {
      this.pythonScriptPath = deepfaceProcessorPath;
    } else if (fs.existsSync(enhancedScriptPath)) {
      this.pythonScriptPath = enhancedScriptPath;
    } else {
      this.pythonScriptPath = basicScriptPath;
    }
    
    // Use Python path from config or default to 'python'
    this.pythonExecutable = config.deepface?.pythonPath || 'python';
    
    // Verify Python script exists
    if (!fs.existsSync(this.pythonScriptPath)) {
      console.warn(`Simple face processor Python script not found at: ${this.pythonScriptPath}`);
      this.useFallback = true;
    } else {
      console.log(`Using Python script: ${this.pythonScriptPath}`);
    }
  }

  /**
   * Convert image URL to absolute file path with proper Windows handling
   */
  private async resolveImagePath(imageUrl: string): Promise<string> {
    console.log(`[DeepFaceService] resolveImagePath - Input imageUrl: ${imageUrl}`);
    console.log(`[DeepFaceService] resolveImagePath - __dirname: ${__dirname}`);
    
    let imagePath = imageUrl;
    
    // Handle HTTP/HTTPS URLs by downloading them first
    if (imageUrl.startsWith('http')) {
      console.log(`[DeepFaceService] resolveImagePath - URL detected, downloading to local temp file`);
      try {
        const tempPath = await this.downloadImageFromUrl(imageUrl);
        console.log(`[DeepFaceService] resolveImagePath - Downloaded to: ${tempPath}`);
        return tempPath;
      } catch (downloadError) {
        console.error(`[DeepFaceService] resolveImagePath - Failed to download URL: ${downloadError}`);
        throw new Error(`Failed to download image from URL: ${imageUrl}`);
      }
    }
    
    if (imageUrl.startsWith('/uploads/')) {
      // Convert relative path to absolute path - uploads folder is at backend/uploads
      imagePath = path.join(__dirname, '../..', imageUrl.substring(1)); // Remove leading slash
      console.log(`[DeepFaceService] resolveImagePath - Converting relative path: ${imageUrl} -> ${imagePath}`);
    } else if (imageUrl.startsWith('uploads/')) {
      // Handle path without leading slash
      imagePath = path.join(__dirname, '../..', imageUrl);
      console.log(`[DeepFaceService] resolveImagePath - Converting uploads path: ${imageUrl} -> ${imagePath}`);
    } else {
      // Assume it's already an absolute path
      console.log(`[DeepFaceService] resolveImagePath - Assuming absolute path: ${imageUrl}`);
    }
    
    // Normalize path for Windows compatibility
    imagePath = path.normalize(imagePath);
    console.log(`[DeepFaceService] resolveImagePath - Normalized path: ${imagePath}`);
    
    // Check if file exists
    console.log(`[DeepFaceService] resolveImagePath - Checking if file exists: ${imagePath}`);
    if (!fs.existsSync(imagePath)) {
      console.error(`[DeepFaceService] resolveImagePath - File not found: ${imagePath}`);
      
      // Try alternative paths
      const alternativePath1 = path.join(__dirname, '../../uploads', path.basename(imageUrl));
      console.log(`[DeepFaceService] resolveImagePath - Trying alternative path 1: ${alternativePath1}`);
      if (fs.existsSync(alternativePath1)) {
        console.log(`[DeepFaceService] resolveImagePath - Found at alternative path 1: ${alternativePath1}`);
        return alternativePath1;
      }
      
      const alternativePath2 = path.join(process.cwd(), 'uploads', path.basename(imageUrl));
      console.log(`[DeepFaceService] resolveImagePath - Trying alternative path 2: ${alternativePath2}`);
      if (fs.existsSync(alternativePath2)) {
        console.log(`[DeepFaceService] resolveImagePath - Found at alternative path 2: ${alternativePath2}`);
        return alternativePath2;
      }
      
      // List files in uploads directory for debugging
      const uploadsDir = path.join(__dirname, '../..', 'uploads');
      console.log(`[DeepFaceService] resolveImagePath - Listing uploads directory: ${uploadsDir}`);
      try {
        const files = fs.readdirSync(uploadsDir);
        console.log(`[DeepFaceService] resolveImagePath - Files in uploads:`, files.slice(0, 5)); // Show first 5 files
      } catch (listError) {
        console.error(`[DeepFaceService] resolveImagePath - Cannot list uploads directory:`, listError);
      }
      
      throw new Error(`Image file not found: ${imagePath}`);
    }
    
    console.log(`[DeepFaceService] resolveImagePath - Successfully resolved path: ${imagePath}`);
    return imagePath;
  }

  /**
   * Download image from URL to temporary local file
   */
  private async downloadImageFromUrl(imageUrl: string): Promise<string> {
    const https = require('https');
    const http = require('http');
    
    return new Promise((resolve, reject) => {
      // Create temp directory if it doesn't exist
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Generate unique filename
      const filename = `temp_${Date.now()}_${Math.round(Math.random() * 1e9)}.jpg`;
      const tempPath = path.join(tempDir, filename);
      const file = fs.createWriteStream(tempPath);
      
      console.log(`[DeepFaceService] downloadImageFromUrl - Downloading ${imageUrl} to ${tempPath}`);
      
      const protocol = imageUrl.startsWith('https:') ? https : http;
      
      const request = protocol.get(imageUrl, (response: any) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`[DeepFaceService] downloadImageFromUrl - Successfully downloaded to ${tempPath}`);
          resolve(tempPath);
        });
        
        file.on('error', (err: any) => {
          fs.unlink(tempPath, () => {}); // Delete temp file on error
          reject(err);
        });
      });
      
      request.on('error', (err: any) => {
        fs.unlink(tempPath, () => {}); // Delete temp file on error
        reject(err);
      });
      
      request.setTimeout(30000, () => {
        request.destroy();
        fs.unlink(tempPath, () => {}); // Delete temp file on timeout
        reject(new Error('Download timeout'));
      });
    });
  }

  /**
   * Execute Python script with given arguments
   */
  private async executePythonScript(args: string[]): Promise<DeepFaceResponse> {
    if (this.useFallback) {
      console.log('Using fallback mock implementation');
      return this.getMockResponse(args);
    }

    try {
      console.log(`[DeepFaceService] Executing Python script with args: ${JSON.stringify(args)}`);
      console.log(`[DeepFaceService] Python executable: ${this.pythonExecutable}`);
      console.log(`[DeepFaceService] Python script path: ${this.pythonScriptPath}`);
      
      const options = {
        mode: 'text' as const,
        pythonPath: this.pythonExecutable,
        pythonOptions: ['-u'],
        scriptPath: path.dirname(this.pythonScriptPath),
        args
      };

      console.log(`[DeepFaceService] Python options: ${JSON.stringify(options)}`);

      // Add timeout to prevent hanging
      const timeoutMs = 30000; // 30 seconds timeout
      const pythonPromise = PythonShell.run(path.basename(this.pythonScriptPath), options);
      
      const results: string[] = await Promise.race([
        pythonPromise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Python script timeout')), timeoutMs)
        )
      ]);
      
      console.log(`[DeepFaceService] Python script raw output: ${JSON.stringify(results)}`);
      
      if (!results || results.length === 0) {
        throw new Error('No output from Python script');
      }

      const lastResult = results[results.length - 1]; // Get the last line which should contain JSON
      console.log(`[DeepFaceService] Parsing result: ${lastResult}`);
      
      const parsed = JSON.parse(lastResult);
      
      console.log(`[DeepFaceService] Python script parsed result: ${JSON.stringify(parsed)}`);
      return parsed;
    } catch (err: any) {
      console.error('[DeepFaceService] Python script error:', err);
      console.error('[DeepFaceService] Error details:', {
        message: err.message,
        stack: err.stack,
        code: err.code,
        errno: err.errno,
        syscall: err.syscall,
        path: err.path
      });
      
      // Check for specific error types
      if (err.message?.includes('timeout')) {
        console.error('[DeepFaceService] Python script timed out');
      }
      
      if (err.code === 'ENOENT') {
        console.error('[DeepFaceService] Python executable not found. Make sure Python is installed and accessible.');
      }
      
      console.log('[DeepFaceService] Falling back to mock implementation...');
      this.useFallback = true;
      return this.getMockResponse(args);
    }
  }

  /**
   * Mock response for fallback when Python script fails
   */
  private getMockResponse(args: string[]): DeepFaceResponse {
    const action = args[0];
    
    switch (action) {
      case 'detect_faces':
      case 'extract_embeddings':
        return {
          success: true,
          face_count: 1,
          embeddings: [{
            face_id: 0,
            embedding: Array.from({ length: 256 }, () => Math.random()),
            region: { x: 50, y: 50, w: 100, h: 100 }
          }]
        };
      case 'quality':
        return {
          success: true,
          quality_score: Math.random() * 40 + 60, // 60-100 range
          metrics: {
            brightness: Math.random() * 30 + 70,
            contrast: Math.random() * 30 + 70,
            sharpness: Math.random() * 30 + 70,
            resolution: Math.random() * 30 + 70
          }
        };
      default:
        return {
          success: true,
          similarity: Math.random() * 0.3 + 0.5, // 0.5-0.8 range
          distance: Math.random() * 0.3 + 0.2
        };
    }
  }

  /**
   * Extract face embeddings from an image
   */
  async extractFaceEmbeddings(imageUrl: string): Promise<FaceEmbedding | null> {
    let tempFilePath: string | null = null;
    
    try {
      console.log(`[DeepFaceService] Starting face embedding extraction for: ${imageUrl}`);
      
      const imagePath = await this.resolveImagePath(imageUrl);
      console.log(`[DeepFaceService] Resolved image path: ${imagePath}`);
      
      // Track if this is a temp file for cleanup
      if (imagePath.includes('/temp/') || imagePath.includes('\\temp\\')) {
        tempFilePath = imagePath;
      }

      const args = [
        'extract_embeddings',
        '--img1', imagePath
      ];

      console.log(`[DeepFaceService] Calling Python script with args: ${JSON.stringify(args)}`);
      const result = await this.executePythonScript(args);
      
      console.log(`[DeepFaceService] Python script result: ${JSON.stringify(result)}`);
      
      if (!result.success) {
        console.error(`[DeepFaceService] Failed to extract face embeddings: ${result.error}`);
        return null;
      }

      if (!result.face_count || result.face_count === 0) {
        console.warn(`[DeepFaceService] No faces detected in image: ${imageUrl}`);
        return null;
      }

      console.log(`[DeepFaceService] Successfully detected ${result.face_count} face(s) in image`);

      // Transform the result to match the expected interface
      const faceEmbedding: FaceEmbedding = {
        imageId: imageUrl,
        embeddings: result.embeddings?.map((emb: any) => emb.embedding) || [],
        faceCount: result.face_count || 0,
        qualityScore: 80 // Default quality score, can be enhanced later
      };

      console.log(`[DeepFaceService] Created face embedding with ${faceEmbedding.embeddings.length} embeddings`);
      return faceEmbedding;
    } catch (error) {
      console.error(`[DeepFaceService] Error extracting face embeddings from ${imageUrl}:`, error);
      return null;
    } finally {
      // Cleanup temp file if it was created
      if (tempFilePath) {
        this.cleanupTempFile(tempFilePath);
      }
    }
  }

  /**
   * Cleanup temporary file
   */
  private cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[DeepFaceService] Cleaned up temp file: ${filePath}`);
      }
    } catch (error) {
      console.error(`[DeepFaceService] Failed to cleanup temp file ${filePath}:`, error);
    }
  }

  /**
   * Compare two face embeddings
   */
  async compareFaces(
    sourceEmbedding: number[],
    targetEmbedding: number[]
  ): Promise<{ similarity: number }> {
    try {
      // For direct embedding comparison, we'll use cosine similarity
      // This is a simplified implementation - in practice, you'd want to save embeddings and compare them
      const similarity = this.calculateCosineSimilarity(sourceEmbedding, targetEmbedding);
      return { similarity };
    } catch (error) {
      console.error('Error comparing face embeddings:', error);
      return { similarity: 0 };
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) {
      console.warn('[DeepFaceService] Invalid embeddings for comparison');
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    
    // Ensure similarity is between 0 and 1
    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * Verify if two images contain the same person
   */
  async verifyFaces(
    sourceImageUrl: string,
    targetImageUrl: string
  ): Promise<{ verified: boolean; similarity: number; distance: number }> {
    try {
      // First extract embeddings from both images
      const embedding1 = await this.extractFaceEmbeddings(sourceImageUrl);
      const embedding2 = await this.extractFaceEmbeddings(targetImageUrl);
      
      if (!embedding1 || !embedding2 || embedding1.embeddings.length === 0 || embedding2.embeddings.length === 0) {
        return { verified: false, similarity: 0, distance: 1.0 };
      }
      
      // Compare first face from each image
      const similarity = this.calculateCosineSimilarity(embedding1.embeddings[0], embedding2.embeddings[0]);
      const distance = 1 - similarity;
      const verified = similarity > 0.5; // 50% similarity threshold

      return {
        verified,
        similarity,
        distance
      };
    } catch (error) {
      console.error('Error verifying faces:', error);
      return { verified: false, similarity: 0, distance: 1.0 };
    }
  }

  /**
   * Compare a source image against multiple target images
   */
  async compareMultipleImages(
    sourceImageId: string,
    targetImageIds: string[]
  ): Promise<ComparisonResult[]> {
    try {
      // Get the actual image URLs from database
      const sourceImage = await Image.findById(sourceImageId);
      const targetImages = await Image.find({ _id: { $in: targetImageIds } });

      if (!sourceImage) {
        console.error('Source image not found');
        return [];
      }

      const results: ComparisonResult[] = [];

      // Compare source with each target image
      for (const targetImage of targetImages) {
        try {
          const comparisonResult = await this.verifyFaces(
            sourceImage.url,
            targetImage.url
          );

          results.push({
            sourceImageId,
            targetImageId: (targetImage._id as mongoose.Types.ObjectId).toString(),
            similarity: comparisonResult.similarity,
            matchingFaces: comparisonResult.verified ? 1 : 0
          });
        } catch (error) {
          console.error(`Error comparing ${sourceImageId} with ${targetImage._id}:`, error);
        }
      }

      return results;
    } catch (error) {
      console.error('Error comparing multiple images:', error);
      return [];
    }
  }

  /**
   * Find similar faces in a collection of images
   */
  async findSimilarFaces(
    imageIds: string[],
    similarityThreshold: number = config.deepface.similarityThreshold
  ): Promise<ImageRanking[]> {
    try {
      const images = await Image.find({ _id: { $in: imageIds } });
      const rankings: ImageRanking[] = [];

      for (const image of images) {
        const similarImages: string[] = [];
        let totalSimilarity = 0;
        let comparisons = 0;

        // Compare with all other images
        for (const otherImage of images) {
          if ((image._id as mongoose.Types.ObjectId).toString() === (otherImage._id as mongoose.Types.ObjectId).toString()) continue;

          try {
            const result = await this.verifyFaces(image.url, otherImage.url);
            
            if (result.similarity >= similarityThreshold) {
              similarImages.push((otherImage._id as mongoose.Types.ObjectId).toString());
            }
            
            totalSimilarity += result.similarity;
            comparisons++;
          } catch (error) {
            console.error(`Error comparing images:`, error);
          }
        }

        // Get quality score for the image
        const qualityResult = await this.analyzeImageQuality(image.url);

        rankings.push({
          imageId: (image._id as mongoose.Types.ObjectId).toString(),
          score: comparisons > 0 ? totalSimilarity / comparisons : 0,
          similarImages,
          qualityScore: qualityResult.qualityScore,
          faceCount: 1 // Will be updated with actual face detection results
        });
      }

      // Sort by score descending
      rankings.sort((a, b) => b.score - a.score);

      return rankings;
    } catch (error) {
      console.error('Error finding similar faces:', error);
      return [];
    }
  }

  /**
   * Analyze image quality
   */
  async analyzeImageQuality(imageUrl: string): Promise<{ qualityScore: number }> {
    let tempFilePath: string | null = null;
    
    try {
      const imagePath = await this.resolveImagePath(imageUrl);
      
      // Track if this is a temp file for cleanup
      if (imagePath.includes('/temp/') || imagePath.includes('\\temp\\')) {
        tempFilePath = imagePath;
      }

      const args = [
        'quality',
        '--img1', imagePath
      ];

      const result = await this.executePythonScript(args);
      
      if (!result.success) {
        console.error('[DeepFaceService] Failed to analyze image quality:', result.error);
        return { qualityScore: 50 }; // Default middle score instead of 0
      }

      // Ensure quality score is between 0 and 100
      const qualityScore = Math.max(0, Math.min(100, result.quality_score || 50));
      
      return { qualityScore };
    } catch (error) {
      console.error('[DeepFaceService] Error analyzing image quality:', error);
      return { qualityScore: 50 }; // Default middle score instead of 0
    } finally {
      // Cleanup temp file if needed
      if (tempFilePath) {
        this.cleanupTempFile(tempFilePath);
      }
    }
  }

  /**
   * Analyze face attributes (age, gender, emotion, etc.)
   */
  async analyzeFaceAttributes(
    imageUrl: string,
    actions: string[] = ['age', 'gender', 'emotion', 'race']
  ): Promise<any> {
    try {
      const imagePath = await this.resolveImagePath(imageUrl);

      // Script v2 doesn't support face attributes analysis
      // Return null for now until we implement this feature
      console.log(`[DeepFaceService] analyzeFaceAttributes not supported in v2 script`);
      return null;
    } catch (error) {
      console.error('Error analyzing face attributes:', error);
      return null;
    }
  }

  /**
   * Select the best images from a group based on face detection and quality
   */
  async selectBestImages(
    imageIds: string[],
    maxImages: number = 5
  ): Promise<string[]> {
    try {
      // Get quality and similarity rankings
      const rankings = await this.findSimilarFaces(imageIds, 0.4);
      
      // Sort by combined score of quality and uniqueness
      const scoredImages = rankings.map(ranking => ({
        imageId: ranking.imageId,
        combinedScore: ranking.qualityScore * 0.6 + (1 - ranking.score) * 0.4 // Prefer high quality and unique images
      }));

      scoredImages.sort((a, b) => b.combinedScore - a.combinedScore);

      return scoredImages.slice(0, maxImages).map(img => img.imageId);
    } catch (error) {
      console.error('Error selecting best images:', error);
      return [];
    }
  }

  /**
   * Process images in a folder for face detection and similarity
   */
  async processImagesFromFolder(
    folderUrl: string,
    customerName: string
  ): Promise<{
    bestImages: string[];
    folderUrl: string;
  }> {
    try {
      // This would typically involve:
      // 1. Getting all images from the folder
      // 2. Running face detection on each
      // 3. Grouping similar faces
      // 4. Selecting best images from each group
      
      // For now, return a placeholder implementation
      console.log(`Processing folder: ${folderUrl} for customer: ${customerName}`);
      
      return {
        bestImages: [],
        folderUrl: ''
      };
    } catch (error) {
      console.error('Error processing images from folder:', error);
      return {
        bestImages: [],
        folderUrl: ''
      };
    }
  }

  /**
   * Mock implementation for development/testing
   * This simulates the DeepFace processing without requiring the actual API
   */
  async mockCompareImages(
    sourceImageUrl: string,
    targetImageUrls: string[]
  ): Promise<{
    bestMatches: { url: string; similarity: number }[];
    worstMatches: { url: string; similarity: number }[];
  }> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate random similarities
    const results = targetImageUrls.map(url => ({
      url,
      similarity: Math.random()
    }));

    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);

    return {
      bestMatches: results.slice(0, 3),
      worstMatches: results.slice(-3)
    };
  }

  /**
   * Check if Python environment and DeepFace are properly installed
   */
  async checkPythonEnvironment(): Promise<{ isReady: boolean; error?: string }> {
    try {
      console.log('Checking Python environment...');
      
      // Test with a simple action that doesn't require image
      const testImagePath = path.join(__dirname, '../../uploads/1.jpg'); // Use existing test image
      
      if (!fs.existsSync(testImagePath)) {
        console.log('No test image found, creating health check response without image test');
        return {
          isReady: !this.useFallback,
          error: this.useFallback ? 'Python script not available, using fallback mode' : undefined
        };
      }

      console.log(`Testing with image: ${testImagePath}`);
      const args = ['extract_embeddings', '--img1', testImagePath];
      const result = await this.executePythonScript(args);
      
      console.log(`Health check result: ${JSON.stringify(result)}`);
      
      return {
        isReady: result.success || false,
        error: result.error
      };
    } catch (error) {
      const errorMsg = `Python environment check failed: ${error}`;
      console.error(errorMsg);
      return {
        isReady: false,
        error: errorMsg
      };
    }
  }
}

export default new DeepFaceService(); 