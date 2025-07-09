import axios from 'axios';
import config from '../config/config';
import Image, { IImage } from '../models/Image';

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

class DeepFaceService {
  private apiBaseUrl: string;

  constructor() {
    // Using a default API URL if not configured
    this.apiBaseUrl = 'http://localhost:5000/api/deepface';
  }

  /**
   * Extract face embeddings from an image
   */
  async extractFaceEmbeddings(imageUrl: string): Promise<FaceEmbedding | null> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/extract`, {
        imageUrl,
        model: 'VGG-Face', // or other models like 'Facenet', 'OpenFace', etc.
        detector_backend: 'opencv'
      });

      return response.data;
    } catch (error) {
      console.error('Error extracting face embeddings:', error);
      return null;
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
      const response = await axios.post(`${this.apiBaseUrl}/compare`, {
        sourceEmbedding,
        targetEmbedding,
        metric: 'cosine'  // or 'euclidean', 'euclidean_l2'
      });

      return response.data;
    } catch (error) {
      console.error('Error comparing face embeddings:', error);
      return { similarity: 0 };
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
      const response = await axios.post(`${this.apiBaseUrl}/compare-multiple`, {
        sourceImageId,
        targetImageIds
      });

      return response.data.comparisons;
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
    similarityThreshold: number = 0.6
  ): Promise<ImageRanking[]> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/find-similar`, {
        imageIds,
        similarityThreshold
      });

      return response.data.rankings;
    } catch (error) {
      console.error('Error finding similar faces:', error);
      return [];
    }
  }

  /**
   * Analyze image quality
   * This evaluates aspects like sharpness, brightness, contrast, etc.
   */
  async analyzeImageQuality(imageUrl: string): Promise<{ qualityScore: number }> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/quality`, {
        imageUrl
      });

      return response.data;
    } catch (error) {
      console.error('Error analyzing image quality:', error);
      return { qualityScore: 0 };
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
      const response = await axios.post(`${this.apiBaseUrl}/select-best`, {
        imageIds,
        maxImages
      });

      return response.data.selectedImageIds;
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
      const response = await axios.post(`${this.apiBaseUrl}/process-folder`, {
        folderUrl,
        customerName
      });

      return response.data;
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
}

export default new DeepFaceService(); 