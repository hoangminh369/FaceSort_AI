#!/usr/bin/env python3
"""
Simple face processor using only OpenCV
Provides basic face detection for Node.js integration
"""

import sys
import json
import argparse
import os

try:
    import numpy as np
except ImportError:
    print(json.dumps({"error": "NumPy not installed. Please run: pip install numpy"}))
    sys.exit(1)

try:
    import cv2
except ImportError:
    print(json.dumps({"error": "OpenCV not installed. Please run: pip install opencv-python"}))
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print(json.dumps({"error": "Pillow not installed. Please run: pip install Pillow"}))
    sys.exit(1)

class SimpleFaceProcessor:
    def __init__(self):
        # Load OpenCV face cascade
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    def detect_faces(self, img_path: str) -> dict:
        """Detect faces in an image using OpenCV"""
        try:
            # Read image
            img = cv2.imread(img_path)
            if img is None:
                return {
                    'success': False,
                    'error': 'Could not load image',
                    'face_count': 0,
                    'faces': []
                }
            
            # Convert to grayscale for face detection
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Detect faces
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30)
            )
            
            face_data = []
            for i, (x, y, w, h) in enumerate(faces):
                face_data.append({
                    'face_id': i,
                    'x': int(x),
                    'y': int(y),
                    'width': int(w),
                    'height': int(h),
                    'confidence': 0.8  # Default confidence for OpenCV
                })
            
            return {
                'success': True,
                'face_count': len(face_data),
                'faces': face_data
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'face_count': 0,
                'faces': []
            }
    
    def extract_embeddings(self, img_path: str) -> dict:
        """Extract basic face features (simplified embeddings)"""
        try:
            faces_result = self.detect_faces(img_path)
            if not faces_result['success']:
                return faces_result
            
            img = cv2.imread(img_path)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            embeddings_data = []
            for face in faces_result['faces']:
                x, y, w, h = face['x'], face['y'], face['width'], face['height']
                
                # Extract face region
                face_roi = gray[y:y+h, x:x+w]
                
                # Resize to standard size
                face_resized = cv2.resize(face_roi, (100, 100))
                
                # Create simple embedding (flattened histogram)
                hist = cv2.calcHist([face_resized], [0], None, [256], [0, 256])
                embedding = hist.flatten().tolist()
                
                embeddings_data.append({
                    'face_id': face['face_id'],
                    'embedding': embedding,
                    'region': {
                        'x': x, 'y': y, 'w': w, 'h': h
                    }
                })
            
            return {
                'success': True,
                'face_count': len(embeddings_data),
                'embeddings': embeddings_data
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'face_count': 0,
                'embeddings': []
            }
    
    def compare_faces(self, embedding1: list, embedding2: list) -> dict:
        """Compare two face embeddings using cosine similarity"""
        try:
            # Convert to numpy arrays
            emb1 = np.array(embedding1)
            emb2 = np.array(embedding2)
            
            # Calculate cosine similarity
            dot_product = np.dot(emb1, emb2)
            norm1 = np.linalg.norm(emb1)
            norm2 = np.linalg.norm(emb2)
            
            if norm1 == 0 or norm2 == 0:
                similarity = 0
            else:
                similarity = dot_product / (norm1 * norm2)
            
            # Convert to 0-1 range
            similarity = (similarity + 1) / 2
            
            return {
                'success': True,
                'similarity': float(similarity),
                'distance': float(1 - similarity)
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'similarity': 0.0,
                'distance': 1.0
            }
    
    def assess_quality(self, img_path: str) -> dict:
        """Assess basic image quality"""
        try:
            img = cv2.imread(img_path)
            if img is None:
                return {
                    'success': False,
                    'error': 'Could not load image',
                    'quality_score': 0
                }
            
            # Get image dimensions
            height, width = img.shape[:2]
            
            # Convert to grayscale for analysis
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Calculate brightness
            brightness = np.mean(gray)
            
            # Calculate contrast (standard deviation)
            contrast = np.std(gray)
            
            # Calculate sharpness (Laplacian variance)
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            sharpness = np.var(laplacian)
            
            # Normalize scores
            brightness_score = min(100, max(0, (brightness / 255) * 100))
            contrast_score = min(100, (contrast / 128) * 100)
            sharpness_score = min(100, (sharpness / 1000) * 100)
            resolution_score = min(100, ((width * height) / (1920 * 1080)) * 100)
            
            # Overall quality score
            quality_score = (brightness_score * 0.25 + contrast_score * 0.25 + 
                           sharpness_score * 0.25 + resolution_score * 0.25)
            
            return {
                'success': True,
                'quality_score': round(quality_score, 2),
                'metrics': {
                    'brightness': round(brightness_score, 2),
                    'contrast': round(contrast_score, 2),
                    'sharpness': round(sharpness_score, 2),
                    'resolution': round(resolution_score, 2),
                    'width': width,
                    'height': height
                }
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'quality_score': 0
            }

def main():
    parser = argparse.ArgumentParser(description='Simple face processing')
    parser.add_argument('action', choices=['detect_faces', 'extract_embeddings', 'compare_embeddings', 'quality'],
                       help='Action to perform')
    parser.add_argument('--img1', required=True, help='Path to the first image')
    parser.add_argument('--img2', help='Path to the second image (for comparison)')
    parser.add_argument('--emb1', help='First embedding as JSON string')
    parser.add_argument('--emb2', help='Second embedding as JSON string')
    
    args = parser.parse_args()
    
    processor = SimpleFaceProcessor()
    
    try:
        if args.action == 'detect_faces':
            result = processor.detect_faces(args.img1)
        elif args.action == 'extract_embeddings':
            result = processor.extract_embeddings(args.img1)
        elif args.action == 'compare_embeddings':
            if args.emb1 and args.emb2:
                emb1 = json.loads(args.emb1)
                emb2 = json.loads(args.emb2)
                result = processor.compare_faces(emb1, emb2)
            else:
                result = {'success': False, 'error': 'Two embeddings required for comparison'}
        elif args.action == 'quality':
            result = processor.assess_quality(args.img1)
        else:
            result = {'success': False, 'error': f'Unknown action: {args.action}'}
        
        print(json.dumps(result))
    
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))

if __name__ == '__main__':
    main() 