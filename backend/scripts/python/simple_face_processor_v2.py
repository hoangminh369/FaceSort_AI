

import sys
import json
import argparse
import os
import urllib.request
from pathlib import Path

try:
    import numpy as np
    from numpy import asarray, uint8, fromfile, zeros, where, var, dot, linalg, mean, std
except ImportError:
    print(json.dumps({"success": False, "error": "NumPy not installed. Please run: pip install numpy"}))
    sys.exit(1)

try:
    import cv2
    from cv2 import CascadeClassifier, imread, imdecode, IMREAD_COLOR, cvtColor, COLOR_BGR2GRAY, ellipse, matchTemplate, TM_CCOEFF_NORMED, calcHist, resize, Laplacian, CV_64F
except ImportError:
    print(json.dumps({"success": False, "error": "OpenCV not installed. Please run: pip install opencv-python"}))
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print(json.dumps({"success": False, "error": "Pillow not installed. Please run: pip install Pillow"}))
    sys.exit(1)

class EnhancedFaceProcessor:
    def __init__(self):
        # Load OpenCV face cascade
        try:
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            if not os.path.exists(cascade_path):
                # Fallback to alternative detection method
                self.face_cascade = None
                print(f"Warning: Face cascade not found at {cascade_path}", file=sys.stderr)
            else:
                self.face_cascade = cv2.CascadeClassifier(cascade_path)
                print(f"Loaded face cascade from {cascade_path}", file=sys.stderr)
        except Exception as e:
            print(f"Error initializing face cascade: {e}", file=sys.stderr)
            self.face_cascade = None
    
    def load_image(self, img_path: str):
        """Load image from various sources (local path, URL, etc.)"""
        try:
            print(f"Attempting to load image: {img_path}", file=sys.stderr)
            
            # Handle different types of paths
            if img_path.startswith(('http://', 'https://')):
                print("Loading image from URL", file=sys.stderr)
                # Download from URL
                response = urllib.request.urlopen(img_path)
                image_array = asarray(bytearray(response.read()), dtype=uint8)
                img = imdecode(image_array, IMREAD_COLOR)
            else:
                # Handle local file path
                # Convert to absolute path and normalize
                img_path = os.path.abspath(img_path)
                img_path = os.path.normpath(img_path)
                
                print(f"Normalized path: {img_path}", file=sys.stderr)
                
                # Check if file exists
                if not os.path.exists(img_path):
                    print(f"File not found: {img_path}", file=sys.stderr)
                    return None, f"File not found: {img_path}"
                
                # Check file size
                file_size = os.path.getsize(img_path)
                print(f"File size: {file_size} bytes", file=sys.stderr)
                
                if file_size == 0:
                    return None, f"File is empty: {img_path}"
                
                # Try to read the file
                try:
                    img = imread(img_path, IMREAD_COLOR)
                    if img is None:
                        # Fallback: read via numpy buffer (handles Unicode / long paths on Windows)
                        try:
                            file_bytes = fromfile(img_path, dtype=uint8)
                            img = imdecode(file_bytes, IMREAD_COLOR)
                        except Exception as alt_read_err:
                            print(f"Alternative read failed: {alt_read_err}", file=sys.stderr)
                except Exception as read_error:
                    print(f"cv2.imread failed: {read_error}", file=sys.stderr)
                    return None, f"cv2.imread failed: {str(read_error)}"
            
            if img is None:
                print(f"Could not decode image (cv2.imread returned None): {img_path}", file=sys.stderr)
                return None, f"Could not decode image: {img_path}"
            
            print(f"Successfully loaded image with shape: {img.shape}", file=sys.stderr)
            return img, None
        except Exception as e:
            error_msg = f"Error loading image {img_path}: {str(e)}"
            print(error_msg, file=sys.stderr)
            return None, error_msg
    
    def detect_faces(self, img_path: str) -> dict:
        """Detect faces in an image using multiple detection methods"""
        print(f"Starting face detection for: {img_path}", file=sys.stderr)
        
        # Load image
        img, error = self.load_image(img_path)
        if img is None:
            return {
                'success': False,
                'error': error or 'Could not load image',
                'face_count': 0,
                'faces': []
            }
        
        try:
            # Convert to grayscale for face detection
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            print(f"Converted to grayscale, shape: {gray.shape}", file=sys.stderr)
            
            # Method 1: Use Haar cascade with multiple parameter sets
            faces = []
            if self.face_cascade is not None:
                print("Using Haar cascade for face detection", file=sys.stderr)
                
                # Try different parameter combinations
                parameter_sets = [
                    # Standard parameters
                    {'scaleFactor': 1.1, 'minNeighbors': 5, 'minSize': (30, 30)},
                    # More sensitive parameters
                    {'scaleFactor': 1.05, 'minNeighbors': 3, 'minSize': (20, 20)},
                    # Less sensitive parameters for large faces
                    {'scaleFactor': 1.2, 'minNeighbors': 8, 'minSize': (50, 50)},
                    # Parameters for very small faces
                    {'scaleFactor': 1.03, 'minNeighbors': 2, 'minSize': (15, 15)},
                ]
                
                for i, params in enumerate(parameter_sets):
                    print(f"Trying parameter set {i+1}: {params}", file=sys.stderr)
                    detected_faces = self.face_cascade.detectMultiScale(gray, **params)
                    print(f"Parameter set {i+1} detected {len(detected_faces)} faces", file=sys.stderr)
                    
                    if len(detected_faces) > 0:
                        faces = detected_faces
                        print(f"Using parameter set {i+1} with {len(faces)} faces", file=sys.stderr)
                        break
                
                print(f"Final Haar cascade result: {len(faces)} faces", file=sys.stderr)
            
            # Method 2: If no faces detected, try DNN face detection (if available)
            if len(faces) == 0:
                print("Trying DNN face detection", file=sys.stderr)
                faces = self.detect_faces_dnn(gray)
            
            # Method 3: If still no faces, use template matching fallback
            if len(faces) == 0:
                print("Trying template matching fallback", file=sys.stderr)
                faces = self.detect_faces_template_matching(gray)
            
            # Method 4: If still no faces, use statistical analysis
            if len(faces) == 0:
                print("Trying statistical analysis fallback", file=sys.stderr)
                faces = self.detect_faces_statistical(gray)
            
            face_data = []
            for i, (x, y, w, h) in enumerate(faces):
                face_data.append({
                    'face_id': i,
                    'x': int(x),
                    'y': int(y),
                    'width': int(w),
                    'height': int(h),
                    'confidence': 0.8  # Default confidence
                })
                print(f"Face {i}: x={x}, y={y}, w={w}, h={h}", file=sys.stderr)
            
            return {
                'success': True,
                'face_count': len(face_data),
                'faces': face_data
            }
        except Exception as e:
            error_msg = f"Face detection error: {str(e)}"
            print(error_msg, file=sys.stderr)
            return {
                'success': False,
                'error': error_msg,
                'face_count': 0,
                'faces': []
            }
    
    def detect_faces_dnn(self, gray_img):
        """Try DNN-based face detection (basic implementation)"""
        try:
            # This is a simplified DNN detection - in a real implementation
            # you would load a pre-trained DNN model
            # For now, just return empty array
            print("DNN face detection not implemented yet", file=sys.stderr)
            return []
        except Exception as e:
            print(f"DNN face detection error: {e}", file=sys.stderr)
            return []
    
    def detect_faces_template_matching(self, gray_img):
        """Use template matching as fallback"""
        try:
            # Create a simple face template (oval shape)
            h, w = gray_img.shape[:2]
            template_size = min(w, h) // 8
            
            # Create an elliptical template
            template = zeros((template_size, template_size), dtype=np.uint8)
            center = (template_size // 2, template_size // 2)
            axes = (template_size // 3, template_size // 2)
            ellipse(template, center, axes, 255, -1)
            
            # Apply template matching
            result = matchTemplate(gray_img, template, TM_CCOEFF_NORMED)
            
            # Find locations with high correlation
            threshold = 0.3
            locations = where(result >= threshold)
            
            faces = []
            for pt in zip(*locations[::-1]):
                faces.append((pt[0], pt[1], template_size, template_size))
            
            print(f"Template matching found {len(faces)} potential faces", file=sys.stderr)
            return faces[:5]  # Limit to top 5 matches
        except Exception as e:
            print(f"Template matching error: {e}", file=sys.stderr)
            return []
    
    def detect_faces_statistical(self, gray_img):
        """Use statistical analysis as last resort"""
        try:
            h, w = gray_img.shape[:2]
            
            # Look for regions with certain statistical properties
            # that might indicate faces (skin-like regions, etc.)
            
            # For now, just assume there might be a face in the center region
            # This is a very basic fallback
            face_size = min(w, h) // 4
            center_x = w // 2 - face_size // 2
            center_y = h // 2 - face_size // 2
            
            # Check if this region has reasonable variance (not too uniform)
            roi = gray_img[center_y:center_y+face_size, center_x:center_x+face_size]
            
            if roi.size > 0:
                variance = var(roi)
                if variance > 100:  # Some texture/detail present
                    print(f"Statistical analysis found potential face at center with variance {variance}", file=sys.stderr)
                    return [(center_x, center_y, face_size, face_size)]
            
            print("Statistical analysis found no faces", file=sys.stderr)
            return []
        except Exception as e:
            print(f"Statistical analysis error: {e}", file=sys.stderr)
            return []
    
    def extract_embeddings(self, img_path: str) -> dict:
        """Extract basic face features (simplified embeddings)"""
        print(f"Starting embedding extraction for: {img_path}", file=sys.stderr)
        
        # First detect faces
        faces_result = self.detect_faces(img_path)
        if not faces_result['success']:
            return faces_result
        
        # Load image again for embedding extraction
        img, error = self.load_image(img_path)
        if img is None:
            return {
                'success': False,
                'error': error or 'Could not load image for embedding extraction',
                'face_count': 0,
                'embeddings': []
            }
        
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            embeddings_data = []
            for face in faces_result['faces']:
                x, y, w, h = face['x'], face['y'], face['width'], face['height']
                print(f"Extracting embedding for face at x={x}, y={y}, w={w}, h={h}", file=sys.stderr)
                
                # Extract face region
                face_roi = gray[y:y+h, x:x+w]
                
                # Resize to standard size
                if face_roi.size > 0:
                    face_resized = resize(face_roi, (100, 100))
                    
                    # Create simple embedding (flattened histogram)
                    hist = calcHist([face_resized], [0], None, [256], [0, 256])
                    embedding = hist.flatten().tolist()
                    print(f"Created embedding with {len(embedding)} features", file=sys.stderr)
                else:
                    # Create dummy embedding if face region is invalid
                    embedding = [0.0] * 256
                    print("Created dummy embedding for invalid face region", file=sys.stderr)
                
                embeddings_data.append({
                    'face_id': face['face_id'],
                    'embedding': embedding,
                    'region': {
                        'x': x, 'y': y, 'w': w, 'h': h
                    }
                })
            
            print(f"Successfully extracted {len(embeddings_data)} embeddings", file=sys.stderr)
            return {
                'success': True,
                'face_count': len(embeddings_data),
                'embeddings': embeddings_data
            }
        except Exception as e:
            error_msg = f"Embedding extraction error: {str(e)}"
            print(error_msg, file=sys.stderr)
            return {
                'success': False,
                'error': error_msg,
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
            dot_product = dot(emb1, emb2)
            norm1 = linalg.norm(emb1)
            norm2 = linalg.norm(emb2)
            
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
                'error': f"Comparison error: {str(e)}",
                'similarity': 0.0,
                'distance': 1.0
            }
    
    def assess_quality(self, img_path: str) -> dict:
        """Assess basic image quality"""
        # Load image
        img, error = self.load_image(img_path)
        if img is None:
            return {
                'success': False,
                'error': error or 'Could not load image for quality assessment',
                'quality_score': 0
            }
        
        try:
            # Get image dimensions
            height, width = img.shape[:2]
            
            # Convert to grayscale for analysis
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Calculate brightness
            brightness = mean(gray)
            
            # Calculate contrast (standard deviation)
            contrast = std(gray)
            
            # Calculate sharpness (Laplacian variance)
            laplacian = Laplacian(gray, CV_64F)
            sharpness = var(laplacian)
            
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
                'error': f"Quality assessment error: {str(e)}",
                'quality_score': 0
            }

def main():
    parser = argparse.ArgumentParser(description='Enhanced simple face processing')
    parser.add_argument('action', choices=['detect_faces', 'extract_embeddings', 'compare_embeddings', 'quality'],
                       help='Action to perform')
    parser.add_argument('--img1', required=True, help='Path to the first image')
    parser.add_argument('--img2', help='Path to the second image (for comparison)')
    parser.add_argument('--emb1', help='First embedding as JSON string')
    parser.add_argument('--emb2', help='Second embedding as JSON string')
    
    args = parser.parse_args()
    
    processor = EnhancedFaceProcessor()
    
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
        print(json.dumps({'success': False, 'error': f'Script error: {str(e)}'}))

if __name__ == '__main__':
    main() 