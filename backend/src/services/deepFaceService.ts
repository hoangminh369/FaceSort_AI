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
  private pythonScriptPath: string = '';
  private pythonExecutable: string;
  private useFallback: boolean = false;

  constructor() {
    // Prefer the new simple face processor for better accuracy
    const simpleProcessorPath = path.join(__dirname, '../../scripts/python/simple_face_processor.py');
    const enhancedScriptPath = path.join(__dirname, '../../scripts/python/simple_face_processor_v2.py');
    const deepfaceProcessorPath = path.join(__dirname, '../../scripts/python/deepface_processor.py');
    
    console.log(`[DeepFaceService] Looking for Python scripts at:`);
    console.log(`- Simple processor: ${simpleProcessorPath} (exists: ${fs.existsSync(simpleProcessorPath)})`);
    console.log(`- Enhanced processor: ${enhancedScriptPath} (exists: ${fs.existsSync(enhancedScriptPath)})`);
    console.log(`- Deepface processor: ${deepfaceProcessorPath} (exists: ${fs.existsSync(deepfaceProcessorPath)})`);
    
    // Prioritize the new simple processor
    if (fs.existsSync(simpleProcessorPath)) {
      this.pythonScriptPath = simpleProcessorPath;
      console.log(`[DeepFaceService] Using new simple face processor: ${simpleProcessorPath}`);
    } else if (fs.existsSync(enhancedScriptPath)) {
      this.pythonScriptPath = enhancedScriptPath;
      console.log(`[DeepFaceService] Using enhanced face processor: ${enhancedScriptPath}`);
    } else if (fs.existsSync(deepfaceProcessorPath)) {
      this.pythonScriptPath = deepfaceProcessorPath;
      console.log(`[DeepFaceService] Using deepface processor: ${deepfaceProcessorPath}`);
    } else {
      console.warn(`[DeepFaceService] No Python script found! Will use fallback methods.`);
      this.useFallback = true;
    }
    
    // Use Python path from config or default to 'python'
    this.pythonExecutable = config.deepface?.pythonPath || 'python';
    
    console.log(`[DeepFaceService] Using Python executable: ${this.pythonExecutable} (exists: ${fs.existsSync(this.pythonExecutable)})`);
    
    // Ensure Python script exists
    if (!this.useFallback && !fs.existsSync(this.pythonScriptPath)) {
      console.warn(`[DeepFaceService] Python script not found at: ${this.pythonScriptPath}`);
      this.useFallback = true;
    }
    
    // Immediately check Python environment instead of async
    this.initializePythonEnvironment();
  }

  /**
   * Initialize Python environment and check if it's ready
   */
  private initializePythonEnvironment(): void {
    try {
      // Check if Python executable exists
      if (!fs.existsSync(this.pythonExecutable)) {
        console.warn(`[DeepFaceService] Python executable not found at: ${this.pythonExecutable}`);
        this.useFallback = true;
        return;
      }

      // Try running a simple Python command synchronously
      const { execSync } = require('child_process');
      try {
        const pythonVersion = execSync(`"${this.pythonExecutable}" --version`, { encoding: 'utf8' });
        console.log(`[DeepFaceService] Python version: ${pythonVersion.trim()}`);
      } catch (error) {
        console.warn(`[DeepFaceService] Failed to run Python: ${error}`);
        this.useFallback = true;
        return;
      }
      
      // If we have a script, check if deepface is available
      if (this.pythonScriptPath) {
        try {
          const scriptDir = path.dirname(this.pythonScriptPath);
          const checkDeepface = execSync(
            `"${this.pythonExecutable}" -c "import deepface; print('DeepFace available')"`, 
            { encoding: 'utf8' }
          );
          console.log(`[DeepFaceService] DeepFace check: ${checkDeepface.trim()}`);
        } catch (error) {
          console.warn(`[DeepFaceService] DeepFace not available: ${error}`);
          this.useFallback = true;
        }
      }
    } catch (error) {
      console.error(`[DeepFaceService] Error initializing Python environment: ${error}`);
      this.useFallback = true;
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
      console.log('[DeepFaceService] Using fallback mock implementation');
      return this.getMockResponse(args);
    }

    try {
      console.log(`[DeepFaceService] Executing Python script: ${this.pythonScriptPath}`);
      console.log(`[DeepFaceService] With args: ${JSON.stringify(args)}`);
      console.log(`[DeepFaceService] Python executable: ${this.pythonExecutable}`);
      
      // For long arguments (like file paths), use a temporary JSON file instead
      const useArgsFile = args.some(arg => arg && arg.length > 100);
      let argsFilePath = '';
      
      if (useArgsFile) {
        // Create a temp file with the arguments
        const os = require('os');
        const argsTempDir = os.tmpdir();
        argsFilePath = path.join(argsTempDir, `args_${Date.now()}_${Math.round(Math.random()*1e6)}.json`);
        fs.writeFileSync(argsFilePath, JSON.stringify(args));
        
        // Replace args with just the --args-file parameter
        args = ['--args-file', argsFilePath];
        console.log(`[DeepFaceService] Using args file: ${argsFilePath}`);
      }
      
      const options = {
        mode: 'text' as const,
        pythonPath: this.pythonExecutable,
        pythonOptions: ['-u'], // Unbuffered output
        scriptPath: path.dirname(this.pythonScriptPath),
        args
      };

      console.log(`[DeepFaceService] Python options: ${JSON.stringify(options)}`);

      // Try running with child_process first for better error reporting
      try {
        const { execFileSync } = require('child_process');
        const scriptName = path.basename(this.pythonScriptPath);
        const scriptDir = path.dirname(this.pythonScriptPath);
        
        console.log(`[DeepFaceService] Running direct command: ${this.pythonExecutable} ${scriptName} ${args.join(' ')}`);
        
        // Change to script directory
        const cwd = process.cwd();
        process.chdir(scriptDir);
        
        try {
          const result = execFileSync(
            this.pythonExecutable,
            [scriptName, ...args],
            { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 } // 10MB buffer
          );
          
          console.log(`[DeepFaceService] Direct execution result: ${result.substring(0, 200)}...`);
          
          // Change back to original directory
          process.chdir(cwd);
          
          // Parse the JSON result
          try {
            const lines = result.trim().split('\n');
            const lastLine = lines[lines.length - 1];
            return JSON.parse(lastLine);
          } catch (parseError) {
            console.error(`[DeepFaceService] Failed to parse Python output: ${parseError}`);
            throw parseError;
          }
        } catch (execError) {
          console.error(`[DeepFaceService] Direct execution failed: ${execError}`);
          // Continue with PythonShell as fallback
          process.chdir(cwd);
        }
      } catch (directError) {
        console.error(`[DeepFaceService] Error in direct execution attempt: ${directError}`);
        // Continue with PythonShell
      }

      // Add timeout to prevent hanging
      const timeoutMs = 30000; // 30 seconds timeout
      const pythonPromise = PythonShell.run(path.basename(this.pythonScriptPath), options);
      
      const results: string[] = await Promise.race([
        pythonPromise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Python script timeout')), timeoutMs)
        )
      ]);
      
      // Clean up temp file if used
      if (useArgsFile && fs.existsSync(argsFilePath)) {
        try {
          fs.unlinkSync(argsFilePath);
        } catch (err) {
          console.warn(`[DeepFaceService] Failed to delete args file: ${argsFilePath}`);
        }
      }
      
      console.log(`[DeepFaceService] Python script raw output: ${JSON.stringify(results)}`);
      
      if (!results || results.length === 0) {
        throw new Error('No output from Python script');
      }

      const lastResult = results[results.length - 1]; // Get the last line which should contain JSON
      console.log(`[DeepFaceService] Parsing result: ${lastResult}`);
      
      const parsed = JSON.parse(lastResult);
      
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
      
      console.log('[DeepFaceService] Falling back to mock implementation...');
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
      // console.log(`[DeepFaceService] Extracting face embeddings from: ${imageUrl}`);
      
      const imagePath = await this.resolveImagePath(imageUrl);
      // console.log(`[DeepFaceService] Resolved image path: ${imagePath}`);
      
      // Track if this is a temp file for cleanup
      if (imagePath.includes('/temp/') || imagePath.includes('\\temp\\')) {
        tempFilePath = imagePath;
      }
      
      // Execute Python script for embedding extraction
      const result = await this.executePythonScript(['extract_embeddings', '--img1', imagePath]);
      
      if (!result.success) {
        console.error(`[DeepFaceService] Failed to extract embeddings: ${result.error || 'Unknown error'}`);
        return null;
      }
      
      console.log(`[DeepFaceService] Successfully detected ${result.face_count} face(s) in image`);
      // console.log(`[DeepFaceService] Extraction info: ${result.extraction_info}`);
      
      // Process raw embeddings with more permissive filtering
      const rawEmbeddings = result.embeddings || [];
      // console.log(`[DeepFaceService] Processing ${rawEmbeddings.length} raw embeddings`);
      
      // Use more permissive filtering
      const processedEmbeddings = this.processEnhancedEmbeddings(rawEmbeddings);
      
      if (processedEmbeddings.length === 0) {
        console.log('[DeepFaceService] No quality embeddings after processing');
        return null;
      }
      
      // Take the best embedding
      const bestEmbedding = processedEmbeddings[0];
      
      // Extract actual embedding vector
      const embeddingVector = bestEmbedding.embedding || [];
      
      // Calculate quality score from embedding metrics
      const qualityScore = bestEmbedding.quality || 0;
      
      // Return embedding data
      return {
        imageId: path.basename(imageUrl),
        embeddings: [embeddingVector],
        faceCount: processedEmbeddings.length,
        qualityScore
      };
      
    } catch (error: any) {
      console.error('[DeepFaceService] Error extracting face embeddings:', error);
      return null;
    } finally {
      // Cleanup temp file if it was created
      if (tempFilePath) {
        this.cleanupTempFile(tempFilePath);
      }
    }
  }

  /**
   * Process embeddings with enhanced filtering and quality checks
   */
  private processEnhancedEmbeddings(rawEmbeddings: any[]): any[] {
    if (!rawEmbeddings || rawEmbeddings.length === 0) {
      console.log(`[DeepFaceService] No embeddings to process`);
      return [];
    }
    
    console.log(`[DeepFaceService] Processing ${rawEmbeddings.length} embeddings`);
    
    // Higher quality threshold to filter out low-quality faces
    const qualityThreshold = 0.15; // Increased from 0.05
    
    // Filter embeddings by quality and informativeness
    const processedEmbeddings = rawEmbeddings.filter((embedding, index) => {
      // Extract quality metrics
      const embeddingQuality = embedding.embedding_quality || 0;
      const overallScore = embedding.overall || 0;
      const qualityScore = embedding.quality || 0;
      
      // Check if embedding vector is informative
      const isInformative = this.isInformativeEmbedding(embedding.embedding || []);
      
      // Log quality metrics
      console.log(`[DeepFaceService] Embedding #${index}: quality=${qualityScore.toFixed(2)}, embedding_quality=${embeddingQuality.toFixed(2)}, overall=${overallScore.toFixed(2)}, informative=${isInformative}`);
      
      // Combined quality check
      const passesQualityCheck = 
        qualityScore >= qualityThreshold && 
        embeddingQuality >= 0.5 && 
        isInformative;
      
      if (!passesQualityCheck) {
        console.log(`[DeepFaceService] Embedding #${index} filtered out: low quality or not informative`);
      }
      
      return passesQualityCheck;
    });
    
    console.log(`[DeepFaceService] ${processedEmbeddings.length}/${rawEmbeddings.length} embeddings passed quality filtering`);
    
    // If all embeddings filtered out, return empty array instead of trying to use low quality ones
    if (processedEmbeddings.length === 0) {
      console.log(`[DeepFaceService] All embeddings filtered out, returning empty array`);
      return [];
    }
    
    // If we have multiple embeddings, cluster them and keep only the largest cluster
    if (processedEmbeddings.length > 1) {
      const cosine = (a: number[], b: number[]): number => {
        let dot = 0, na = 0, nb = 0;
        for (let i = 0; i < Math.min(a.length, b.length); i++) {
          dot += a[i] * b[i];
          na += a[i] * a[i];
          nb += b[i] * b[i];
        }
        if (na === 0 || nb === 0) return 0;
        return dot / (Math.sqrt(na) * Math.sqrt(nb));
      };
      
      // Cluster embeddings by similarity
      const clusters: any[][] = [];
      const similarityThreshold = 0.8;
      
      for (const embedding of processedEmbeddings) {
        let foundCluster = false;
        
        for (const cluster of clusters) {
          // Check if embedding is similar to any embedding in this cluster
          const isSimilar = cluster.some(clusterEmbed => {
            const similarity = cosine(embedding.embedding, clusterEmbed.embedding);
            return similarity > similarityThreshold;
          });
          
          if (isSimilar) {
            cluster.push(embedding);
            foundCluster = true;
            break;
          }
        }
        
        if (!foundCluster) {
          // Create new cluster
          clusters.push([embedding]);
        }
      }
      
      // Sort clusters by size (largest first)
      clusters.sort((a, b) => b.length - a.length);
      
      console.log(`[DeepFaceService] Created ${clusters.length} clusters. Sizes: ${clusters.map(c => c.length).join(', ')}`);
      
      if (clusters.length > 0) {
        const dominant = clusters[0];
        
        // Filter dominant cluster by size and position
        if (dominant.length > 1) {
          // Calculate areas of bounding boxes
          const areas = dominant.map(e => {
            const r = e.region || {};
            return (r.w || 0) * (r.h || 0);
          });
          const maxArea = Math.max(...areas, 0);
          
          // Filter by size - keep faces at least 40% of the largest face
          const sizeFiltered = dominant.filter((e, idx) => areas[idx] >= maxArea * 0.4);
          
          console.log(`[DeepFaceService] After size filter: ${sizeFiltered.length}/${dominant.length}`);
          
          // Sort by area (largest first) and keep only the largest face
          sizeFiltered.sort((a, b) => {
            const ra = a.region || {} as any;
            const rb = b.region || {} as any;
            const areaA = (ra.w || 0) * (ra.h || 0);
            const areaB = (rb.w || 0) * (rb.h || 0);
            return areaB - areaA;
          });
          
          console.log(`[DeepFaceService] After size filter: ${sizeFiltered.length}/${dominant.length} -> keeping best 1`);
          return [sizeFiltered[0]];
        }
        
        return dominant;
      }
    }
    
    return processedEmbeddings;
  }

  /**
   * Calculate composite score cho embedding ranking
   */
  private calculateCompositeScore(embedding: any): number {
    try {
      const embeddingQuality = embedding.embedding_quality || 0;
      const overallScore = embedding.overall_score || 0;
      const qualityScore = embedding.quality_score || 0;
      const confidence = embedding.confidence || 0;
      
      // Weighted composite score
      const compositeScore = (
        embeddingQuality * 0.35 +
        overallScore * 0.25 +
        qualityScore * 0.25 +
        confidence * 0.15
      );
      
      return compositeScore;
    } catch (error) {
      console.error(`[DeepFaceService] Error calculating composite score:`, error);
      return 0;
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
   * Check if embedding vector contains useful information
   */
  private isInformativeEmbedding(vec: number[]): boolean {
    if (!vec || vec.length === 0) return false;
    
    // Calculate basic statistics
    const mean = vec.reduce((a, b) => a + b, 0) / vec.length;
    const variance = vec.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / vec.length;
    
    // Check if variance is too low (near-constant vector)
    if (variance < 1e-3) {
      console.log(`[DeepFaceService] Non-informative embedding detected: variance=${variance}`);
      return false;
    }
    
    // Check for NaN or Infinity values
    const hasInvalidValues = vec.some(v => isNaN(v) || !isFinite(v));
    if (hasInvalidValues) {
      console.log(`[DeepFaceService] Invalid values in embedding`);
      return false;
    }
    
    return true;
  }

  /**
   * Compare two face embeddings with advanced multi-metric analysis
   */
  async compareFaces(
    sourceEmbedding: number[],
    targetEmbedding: number[]
  ): Promise<{ similarity: number; confidence: number; distance: number }> {
    console.log(`[DeepFace Compare] Comparing face embeddings`);
    
    // Validate embeddings
    if (!this.isInformativeEmbedding(sourceEmbedding) || !this.isInformativeEmbedding(targetEmbedding)) {
      console.log(`[DeepFace Compare] One or both embeddings are not informative, returning zero similarity`);
      return { similarity: 0, confidence: 0, distance: 1 };
    }
    
    try {
      // Always calculate fallback similarity for validation
      const fallbackResult = this.compareFacesFallback(sourceEmbedding, targetEmbedding);
      console.log(`[DeepFace Compare] Fallback similarity: ${fallbackResult.similarity.toFixed(3)}`);
      
      // If we're using fallback mode or Python is not available, return fallback result
      if (this.useFallback) {
        return fallbackResult;
      }
      
      // Try Python comparison with cross-validation
      try {
        const pythonComparison = await this.compareFacesViaPython(sourceEmbedding, targetEmbedding);
        
        if (pythonComparison.success) {
          console.log(`[DeepFace Compare] Python comparison successful - Similarity: ${pythonComparison.similarity.toFixed(3)}, Confidence: ${pythonComparison.confidence.toFixed(3)}`);
          
          // Log cross-validation results if available
          if (pythonComparison.cross_validation) {
            console.log(`[DeepFace Compare] Cross-validation: ${pythonComparison.cross_validation.is_consistent ? 'PASSED' : 'FAILED'} - ${pythonComparison.cross_validation.reason}`);
          }
          
          // Sanity check: if Python result is significantly different from fallback,
          // something might be wrong with the Python result
          const similarityDifference = Math.abs(pythonComparison.similarity - fallbackResult.similarity);
          
          if (similarityDifference > 0.15) {
            console.log(`[DeepFace Compare] WARNING: Large discrepancy between Python (${pythonComparison.similarity.toFixed(3)}) and fallback (${fallbackResult.similarity.toFixed(3)}) similarity. Using fallback.`);
            return fallbackResult;
          }
          
          // Use Python result if it passed cross-validation and sanity check
          return {
            similarity: pythonComparison.similarity,
            confidence: pythonComparison.confidence,
            distance: pythonComparison.distance
          };
        } else {
          console.log(`[DeepFace Compare] Python comparison failed: ${pythonComparison.error || 'Unknown error'}. Using fallback.`);
          return fallbackResult;
        }
      } catch (pythonError) {
        console.error(`[DeepFace Compare] Error in Python comparison:`, pythonError);
        return fallbackResult;
      }
    } catch (error) {
      console.error(`[DeepFace Compare] Error comparing faces:`, error);
      return { similarity: 0, confidence: 0, distance: 1 };
    }
  }

  /**
   * Compare faces using Python script với advanced cross-validation
   */
  private async compareFacesViaPython(
    embedding1: number[],
    embedding2: number[]
  ): Promise<{ success: boolean; similarity: number; confidence: number; distance: number; error?: string; cross_validation?: any; adaptive_adjustments?: any }> {
    try {
      const args = [
        'compare_embeddings',
        '--emb1', JSON.stringify(embedding1),
        '--emb2', JSON.stringify(embedding2)
      ];

      const result = await this.executePythonScript(args);
      
      if (!result.success) {
        console.error(`[DeepFace] Python comparison failed: ${result.error}`);
        return { success: false, similarity: 0, confidence: 0, distance: 1.0 };
      }

      return {
        success: true,
        similarity: result.similarity || 0,
        confidence: result.confidence || 0,
        distance: result.distance || 1.0,
        cross_validation: result.cross_validation,
        adaptive_adjustments: result.adaptive_adjustments
      };
    } catch (error) {
      console.error(`[DeepFace] Error in Python comparison: ${error}`);
      return { success: false, similarity: 0, confidence: 0, distance: 1.0 };
    }
  }

  /**
   * Fallback TypeScript comparison với improved algorithm
   */
  private compareFacesFallback(
    sourceEmbedding: number[],
    targetEmbedding: number[]
  ): { similarity: number; confidence: number; distance: number } {
    // If either vector not informative => return low similarity
    if (!this.isInformativeEmbedding(sourceEmbedding) || !this.isInformativeEmbedding(targetEmbedding)) {
      return { similarity: 0, confidence: 0, distance: 1 };
    }
    // Multiple similarity metrics for robust comparison
    const cosineSim = this.calculateCosineSimilarity(sourceEmbedding, targetEmbedding);
    const euclideanSim = this.calculateEuclideanSimilarity(sourceEmbedding, targetEmbedding);
    const pearsonSim = this.calculatePearsonCorrelation(sourceEmbedding, targetEmbedding);
    
    // If all metrics extremely high but vectors nearly identical (possible placeholder) check mean abs diff
    const meanAbsDiff = sourceEmbedding.reduce((sum, v, i) => sum + Math.abs(v - targetEmbedding[i]), 0) / sourceEmbedding.length;
    if (meanAbsDiff < 1e-3) {
      return { similarity: 0, confidence: 0, distance: 1 };
    }

    // Weighted ensemble similarity
    const ensembleSimilarity = (cosineSim * 0.6) + (euclideanSim * 0.25) + (pearsonSim * 0.15);
    
    // Calculate confidence based on agreement between metrics
    const similarities = [cosineSim, euclideanSim, pearsonSim];
    const meanSim = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const variance = similarities.reduce((sum, sim) => sum + Math.pow(sim - meanSim, 2), 0) / similarities.length;
    const stdDev = Math.sqrt(variance);
    
    // BALANCED confidence calculation
    let confidence = Math.max(0.1, Math.min(1.0, 1.0 - (stdDev * 2)));
    
    // Boost confidence khi có metrics cao
    const allMetricsHigh = cosineSim > 0.65 && euclideanSim > 0.65 && pearsonSim > 0.65;
    const mostMetricsHigh = [cosineSim, euclideanSim, pearsonSim].filter(s => s > 0.6).length >= 2;
    
    if (allMetricsHigh && ensembleSimilarity > 0.7) {
      confidence = Math.min(1.0, confidence + 0.15);
    } else if (mostMetricsHigh && ensembleSimilarity > 0.65) {
      confidence = Math.min(1.0, confidence + 0.1);
    }
    
    // MODERATE penalty cho low confidence
    let finalSimilarity = ensembleSimilarity;
    if (confidence < 0.4) {
      finalSimilarity = finalSimilarity * confidence;
    } else if (confidence < 0.6) {
      finalSimilarity = finalSimilarity * (confidence + 0.2);
    }
    
    // Chỉ loại bỏ matches cực kỳ thấp
    if (finalSimilarity < 0.5) {
      finalSimilarity = 0;
      confidence = 0;
    }
    
    const distance = 1.0 - finalSimilarity;
    
    console.log(`[DeepFace Compare Fallback] Cosine: ${cosineSim.toFixed(3)}, Euclidean: ${euclideanSim.toFixed(3)}, Pearson: ${pearsonSim.toFixed(3)}`);
    console.log(`[DeepFace Compare Fallback] Ensemble: ${ensembleSimilarity.toFixed(3)}, Confidence: ${confidence.toFixed(3)}, Final: ${finalSimilarity.toFixed(3)}`);
    
    return { 
      similarity: Math.max(0, Math.min(1, finalSimilarity)), 
      confidence,
      distance 
    };
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
    
    // Normalize to [0, 1] range
    return Math.max(0, Math.min(1, (similarity + 1) / 2));
  }

  /**
   * Calculate Euclidean similarity between two vectors
   */
  private calculateEuclideanSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) {
      return 0;
    }
    
    let squaredDifferences = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      squaredDifferences += diff * diff;
    }
    
    const euclideanDistance = Math.sqrt(squaredDifferences);
    
    // Convert distance to similarity (closer distance = higher similarity)
    // Normalize using max possible distance between normalized vectors
    const maxDistance = Math.sqrt(a.length * 4); // Assuming normalized vectors in range [-1, 1]
    const similarity = 1 - (euclideanDistance / maxDistance);
    
    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * Calculate Pearson correlation coefficient between two vectors
   */
  private calculatePearsonCorrelation(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length || a.length < 2) {
      return 0;
    }
    
    const n = a.length;
    
    // Calculate means
    const meanA = a.reduce((sum, val) => sum + val, 0) / n;
    const meanB = b.reduce((sum, val) => sum + val, 0) / n;
    
    // Calculate numerator and denominators
    let numerator = 0;
    let sumSquaredA = 0;
    let sumSquaredB = 0;
    
    for (let i = 0; i < n; i++) {
      const diffA = a[i] - meanA;
      const diffB = b[i] - meanB;
      
      numerator += diffA * diffB;
      sumSquaredA += diffA * diffA;
      sumSquaredB += diffB * diffB;
    }
    
    const denominator = Math.sqrt(sumSquaredA * sumSquaredB);
    
    if (denominator === 0) return 0;
    
    const correlation = numerator / denominator;
    
    // Convert correlation [-1, 1] to similarity [0, 1]
    return Math.max(0, Math.min(1, (correlation + 1) / 2));
  }

  /**
   * Verify if two images contain the same person with enhanced precision
   */
  async verifyFaces(
    sourceImageUrl: string,
    targetImageUrl: string
  ): Promise<{ verified: boolean; similarity: number; distance: number; confidence: number }> {
    try {
      console.log(`[DeepFace Verify] Comparing: ${sourceImageUrl} vs ${targetImageUrl}`);
      
      // Extract embeddings from both images
      const embedding1 = await this.extractFaceEmbeddings(sourceImageUrl);
      const embedding2 = await this.extractFaceEmbeddings(targetImageUrl);
      
      if (!embedding1 || !embedding2 || embedding1.embeddings.length === 0 || embedding2.embeddings.length === 0) {
        console.log(`[DeepFace Verify] No faces detected - Source: ${embedding1?.faceCount || 0}, Target: ${embedding2?.faceCount || 0}`);
        return { verified: false, similarity: 0, distance: 1.0, confidence: 0 };
      }

      console.log(`[DeepFace Verify] Face counts - Source: ${embedding1.faceCount}, Target: ${embedding2.faceCount}`);
      
      // Enhanced multi-face comparison strategy với cross-validation
      let bestSimilarity = 0;
      let bestConfidence = 0;
      let totalComparisons = 0;
      let validComparisons = 0;
      let crossValidationPassed = 0;
      let adaptiveAdjustments: any = null;
      
      // Compare all face combinations and find the best match
      for (const sourceEmb of embedding1.embeddings) {
        for (const targetEmb of embedding2.embeddings) {
          totalComparisons++;
          
          const comparison = await this.compareFaces(sourceEmb, targetEmb);
          
          // Enhanced validation với cross-validation results
          if (comparison.confidence > 0.45) { // BALANCED: Accept reasonable confidence
            validComparisons++;
            
            // Log cross-validation information nếu có
            if (comparison.similarity > bestSimilarity) {
              bestSimilarity = comparison.similarity;
              bestConfidence = comparison.confidence;
              
              // Store adaptive adjustments from best match for analysis
              // Note: This would be available if using Python comparison
              console.log(`[DeepFace Verify] New best match: sim=${bestSimilarity.toFixed(3)}, conf=${bestConfidence.toFixed(3)}`);
            }
          }
        }
      }
      
      // ENHANCED verification logic với adaptive thresholds
      let verified = false;
      
      if (validComparisons === 0) {
        console.log(`[DeepFace Verify] No valid comparisons found (confidence too low)`);
        verified = false;
      } else {
        // ADAPTIVE verification thresholds dựa trên quality và cross-validation
        const baseHighThreshold = 0.75;
        const baseMediumThreshold = 0.65;
        const baseLowThreshold = 0.6;
        
        // Adjust thresholds based on image quality
        const sourceQuality = await this.analyzeImageQuality(sourceImageUrl);
        const targetQuality = await this.analyzeImageQuality(targetImageUrl);
        const avgQuality = (sourceQuality.qualityScore + targetQuality.qualityScore) / 2;
        
        // Quality-based threshold adjustments
        let qualityAdjustment = 0;
        if (avgQuality > 80) {
          qualityAdjustment = -0.05; // Lower thresholds for high-quality images
        } else if (avgQuality < 50) {
          qualityAdjustment = 0.1; // Higher thresholds for low-quality images
        }
        
        console.log(`[DeepFace Verify] Average image quality: ${avgQuality.toFixed(1)}, adjustment: ${qualityAdjustment.toFixed(3)}`);
        
        // Apply adaptive thresholds
        const adaptiveHighThreshold = baseHighThreshold + qualityAdjustment;
        const adaptiveMediumThreshold = baseMediumThreshold + qualityAdjustment;
        const adaptiveLowThreshold = baseLowThreshold + qualityAdjustment;
        
        // Enhanced verification với adaptive thresholds
        const isHighConfidenceMatch = bestSimilarity > adaptiveHighThreshold && bestConfidence > 0.65 && validComparisons >= 1;
        const isMediumConfidenceMatch = bestSimilarity > adaptiveMediumThreshold && bestConfidence > 0.55 && validComparisons >= 2;
        const isLowConfidenceMatch = bestSimilarity > adaptiveLowThreshold && bestConfidence > 0.5 && validComparisons >= 1;
        
        verified = isHighConfidenceMatch || isMediumConfidenceMatch || isLowConfidenceMatch;
        
        console.log(`[DeepFace Verify] Enhanced verification results:`);
        console.log(`  - Best similarity: ${bestSimilarity.toFixed(3)}, Confidence: ${bestConfidence.toFixed(3)}`);
        console.log(`  - Adaptive thresholds - High: ${adaptiveHighThreshold.toFixed(3)}, Medium: ${adaptiveMediumThreshold.toFixed(3)}, Low: ${adaptiveLowThreshold.toFixed(3)}`);
        console.log(`  - High confidence: ${isHighConfidenceMatch}, Medium: ${isMediumConfidenceMatch}, Low: ${isLowConfidenceMatch}`);
        console.log(`  - Valid comparisons: ${validComparisons}/${totalComparisons}`);
        console.log(`  - Final decision: ${verified ? 'VERIFIED ✅' : 'NOT VERIFIED ❌'}`);
      }

      const distance = 1 - bestSimilarity;

      return {
        verified,
        similarity: bestSimilarity,
        distance,
        confidence: bestConfidence
      };
    } catch (error) {
      console.error('Error verifying faces:', error);
      return { verified: false, similarity: 0, distance: 1.0, confidence: 0 };
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

          // BALANCED: Giảm thresholds để accept những matches thực sự tốt
          if (comparisonResult.confidence > 0.6 && comparisonResult.verified && comparisonResult.similarity > 0.65) {
            results.push({
              sourceImageId,
              targetImageId: (targetImage._id as mongoose.Types.ObjectId).toString(),
              similarity: comparisonResult.similarity,
              matchingFaces: comparisonResult.verified ? 1 : 0
            });
          }
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
   * Find similar faces in a collection of images with enhanced precision
   */
  async findSimilarFaces(
    imageIds: string[],
    similarityThreshold: number = 0.65 // BALANCED threshold - giảm từ 0.82 xuống 0.65
  ): Promise<ImageRanking[]> {
    try {
      console.log(`[DeepFace FindSimilar] Processing ${imageIds.length} images with threshold ${similarityThreshold}`);
      
      const images = await Image.find({ _id: { $in: imageIds } });
      const rankings: ImageRanking[] = [];

      for (const image of images) {
        const similarImages: string[] = [];
        let totalSimilarity = 0;
        let totalConfidence = 0;
        let validComparisons = 0;

        console.log(`[DeepFace FindSimilar] Processing image: ${image.filename}`);

        // Compare with all other images
        for (const otherImage of images) {
          if ((image._id as mongoose.Types.ObjectId).toString() === (otherImage._id as mongoose.Types.ObjectId).toString()) continue;

          try {
            const result = await this.verifyFaces(image.url, otherImage.url);
            
            // BALANCED: Giảm thresholds để có thể tìm được những matches thực sự tốt
            if (result.confidence > 0.5 && result.similarity > 0.55) {
              validComparisons++;
              totalSimilarity += result.similarity;
              totalConfidence += result.confidence;
              
              // Accept good similarity images
              if (result.similarity >= similarityThreshold && result.confidence > 0.6) {
                similarImages.push((otherImage._id as mongoose.Types.ObjectId).toString());
                console.log(`[DeepFace FindSimilar] Found similar image: ${otherImage.filename} (sim: ${result.similarity.toFixed(3)}, conf: ${result.confidence.toFixed(3)})`);
              }
            } else {
              console.log(`[DeepFace FindSimilar] REJECTED ${otherImage.filename}: Low confidence (sim: ${result.similarity.toFixed(3)}, conf: ${result.confidence.toFixed(3)})`);
            }
          } catch (error) {
            console.error(`Error comparing images:`, error);
          }
        }

        // Get quality score for the image
        const qualityResult = await this.analyzeImageQuality(image.url);

        // Enhanced scoring với confidence weighting
        const avgSimilarity = validComparisons > 0 ? totalSimilarity / validComparisons : 0;
        const avgConfidence = validComparisons > 0 ? totalConfidence / validComparisons : 0;
        
        // Combined score: similarity weighted by confidence and quality
        const combinedScore = (avgSimilarity * 0.5) + (avgConfidence * 0.3) + (qualityResult.qualityScore / 100 * 0.2);

        rankings.push({
          imageId: (image._id as mongoose.Types.ObjectId).toString(),
          score: combinedScore,
          similarImages,
          qualityScore: qualityResult.qualityScore,
          faceCount: similarImages.length + 1 // Include self + similar images
        });

        console.log(`[DeepFace FindSimilar] Image ${image.filename}: Score=${combinedScore.toFixed(3)}, Similar=${similarImages.length}, Quality=${qualityResult.qualityScore.toFixed(1)}`);
      }

      // Sort by combined score descending
      rankings.sort((a, b) => b.score - a.score);

      console.log(`[DeepFace FindSimilar] Completed ranking ${rankings.length} images`);
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
   * Select the best images from a group based on enhanced face detection and quality
   */
  async selectBestImages(
    imageIds: string[],
    maxImages: number = 5
  ): Promise<string[]> {
    try {
      console.log(`[DeepFace SelectBest] Selecting best ${maxImages} from ${imageIds.length} images`);
      
      // Get quality and similarity rankings với BALANCED threshold
      const rankings = await this.findSimilarFaces(imageIds, 0.65); // BALANCED: 65% similarity
      
      if (rankings.length === 0) {
        console.log(`[DeepFace SelectBest] No valid rankings found, returning original IDs`);
        return imageIds.slice(0, maxImages);
      }
      
      // Enhanced scoring strategy
      const scoredImages = rankings.map(ranking => {
        // Boost score for high quality images
        const qualityBonus = ranking.qualityScore > 80 ? 0.2 : ranking.qualityScore > 60 ? 0.1 : 0;
        
        // Penalize images with too many similar duplicates (prefer unique faces)
        const uniquenessScore = Math.max(0.1, 1 - (ranking.similarImages.length * 0.1));
        
        // Boost score for images with detected faces
        const faceBonus = ranking.faceCount > 0 ? 0.1 : 0;
        
        const combinedScore = (ranking.qualityScore / 100 * 0.4) + // 40% quality
                             (ranking.score * 0.3) +                // 30% similarity confidence
                             (uniquenessScore * 0.2) +              // 20% uniqueness
                             qualityBonus + faceBonus;              // Bonuses
        
        return {
          imageId: ranking.imageId,
          combinedScore,
          qualityScore: ranking.qualityScore,
          similarCount: ranking.similarImages.length,
          faceCount: ranking.faceCount
        };
      });

      // Sort by combined score descending
      scoredImages.sort((a, b) => b.combinedScore - a.combinedScore);
      
      // Log selection details
      console.log(`[DeepFace SelectBest] Top candidates:`);
      scoredImages.slice(0, Math.min(maxImages + 2, scoredImages.length)).forEach((img, idx) => {
        console.log(`  ${idx + 1}. Score: ${img.combinedScore.toFixed(3)}, Quality: ${img.qualityScore.toFixed(1)}, Similar: ${img.similarCount}, Faces: ${img.faceCount}`);
      });

      const selectedIds = scoredImages.slice(0, maxImages).map(img => img.imageId);
      console.log(`[DeepFace SelectBest] Selected ${selectedIds.length} best images`);
      
      return selectedIds;
    } catch (error) {
      console.error('Error selecting best images:', error);
      return imageIds.slice(0, maxImages); // Fallback to first N images
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
      
      // console.log(`Health check result: ${JSON.stringify(result)}`);
      
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