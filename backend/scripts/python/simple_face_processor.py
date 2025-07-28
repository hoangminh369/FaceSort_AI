#!/usr/bin/env python3
import sys
import json
import argparse
import os
import numpy as np
import cv2
from pathlib import Path

# Check for deepface
try:
    from deepface import DeepFace
    from deepface.commons import functions
    from deepface.detectors import FaceDetector
except ImportError:
    print(json.dumps({"success": False, "error": "DeepFace not installed. Please run: pip install deepface"}))
    sys.exit(1)

class SimpleFaceProcessor:
    def __init__(self):
        # Initialize with reasonable defaults
        self.detector_backend = "opencv"  # Use opencv for faster detection
        self.model_name = "Facenet"       # Use Facenet for embeddings
        self.distance_metric = "cosine"
        self.enforce_detection = True
        self.align = True
        
        # Minimum face size as percentage of image dimensions
        self.min_face_ratio = 0.05
        
        # Quality thresholds
        self.min_sharpness = 0.2
        self.min_brightness = 0.2
        self.max_brightness = 0.8
        
        # Initialize detector
        self.detector = None
        try:
            self.detector = FaceDetector.build_model(self.detector_backend)
            print(f"[INFO] Successfully loaded {self.detector_backend} face detector", file=sys.stderr)
        except Exception as e:
            print(f"[ERROR] Failed to initialize face detector: {str(e)}", file=sys.stderr)
    
    def load_image(self, img_path):
        """Load image from path or URL"""
        try:
            if img_path.startswith(('http://', 'https://')):
                # Load from URL
                import requests
                from io import BytesIO
                response = requests.get(img_path)
                img = cv2.imdecode(np.frombuffer(response.content, np.uint8), cv2.IMREAD_COLOR)
            else:
                # Load from file
                img = cv2.imread(img_path)
                
            if img is None:
                return None, "Failed to load image"
                
            return img, None
        except Exception as e:
            return None, f"Error loading image: {str(e)}"
    
    def detect_faces(self, img_path):
        """Detect faces in image with quality assessment"""
        img, error = self.load_image(img_path)
        if img is None:
            return {
                "success": False,
                "error": error,
                "face_count": 0,
                "faces": []
            }
        
        try:
            # Convert to grayscale for some operations
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
            
            # Get image dimensions
            img_height, img_width = img.shape[:2]
            min_face_size = int(min(img_height, img_width) * self.min_face_ratio)
            
            # Detect faces
            faces = []
            face_objs = FaceDetector.detect_faces(self.detector, self.detector_backend, img, align=False)
            
            for i, face_obj in enumerate(face_objs):
                if self.detector_backend == "opencv":
                    x, y, w, h = face_obj[1]  # opencv returns (confidence, (x, y, w, h))
                    confidence = face_obj[0]
                else:
                    x, y, w, h = face_obj["facial_area"].values()
                    confidence = face_obj.get("confidence", 0.9)  # Default high if not provided
                
                # Skip faces that are too small
                if w < min_face_size or h < min_face_size:
                    continue
                
                # Extract face region
                face_roi = gray[y:y+h, x:x+w]
                
                # Calculate quality metrics
                quality_metrics = self.assess_face_quality(face_roi)
                
                # Calculate overall quality score
                quality_score = self.calculate_quality_score(quality_metrics)
                
                # Add face with quality metrics
                faces.append({
                    "face_id": i,
                    "x": int(x),
                    "y": int(y),
                    "width": int(w),
                    "height": int(h),
                    "confidence": float(confidence),
                    "quality_score": float(quality_score),
                    "sharpness_score": float(quality_metrics["sharpness"]),
                    "brightness_score": float(quality_metrics["brightness"]),
                    "contrast_score": float(quality_metrics["contrast"]),
                    "overall_score": float(quality_score)
                })
            
            # Sort faces by quality score (best first)
            faces.sort(key=lambda x: x["quality_score"], reverse=True)
            
            return {
                "success": True,
                "face_count": len(faces),
                "faces": faces
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Face detection error: {str(e)}",
                "face_count": 0,
                "faces": []
            }
    
    def assess_face_quality(self, face_roi):
        """Assess quality of face region"""
        if face_roi is None or face_roi.size == 0:
            return {
                "sharpness": 0,
                "brightness": 0,
                "contrast": 0
            }
        
        try:
            # Sharpness - using Laplacian variance
            laplacian = cv2.Laplacian(face_roi, cv2.CV_64F)
            sharpness = np.var(laplacian) / 100  # Normalize
            sharpness = min(1.0, max(0.0, sharpness))
            
            # Brightness - average pixel value
            brightness = np.mean(face_roi) / 255.0
            
            # Contrast - standard deviation of pixel values
            contrast = np.std(face_roi) / 128.0
            contrast = min(1.0, max(0.0, contrast))
            
            return {
                "sharpness": sharpness,
                "brightness": brightness,
                "contrast": contrast
            }
        except Exception as e:
            print(f"[ERROR] Quality assessment error: {str(e)}", file=sys.stderr)
            return {
                "sharpness": 0,
                "brightness": 0,
                "contrast": 0
            }
    
    def calculate_quality_score(self, metrics):
        """Calculate overall quality score from metrics"""
        try:
            # Check if brightness is in acceptable range
            brightness_ok = self.min_brightness <= metrics["brightness"] <= self.max_brightness
            
            # Check if sharpness is acceptable
            sharpness_ok = metrics["sharpness"] >= self.min_sharpness
            
            # Base score
            score = 0.4 * metrics["sharpness"] + 0.3 * metrics["contrast"]
            
            # Penalize if brightness is out of range
            if not brightness_ok:
                score *= 0.5
            
            # Penalize if sharpness is too low
            if not sharpness_ok:
                score *= 0.5
            
            return min(1.0, max(0.0, score))
        except Exception as e:
            print(f"[ERROR] Quality score calculation error: {str(e)}", file=sys.stderr)
            return 0.0
    
    def extract_embeddings(self, img_path):
        """Extract face embeddings with quality assessment"""
        # First detect faces
        detection_result = self.detect_faces(img_path)
        
        if not detection_result["success"] or detection_result["face_count"] == 0:
            return {
                "success": False,
                "face_count": 0,
                "embeddings": [],
                "error": detection_result.get("error", "No faces detected")
            }
        
        try:
            # Load image
            img, _ = self.load_image(img_path)
            if img is None:
                return {
                    "success": False,
                    "face_count": 0,
                    "embeddings": [],
                    "error": "Failed to load image"
                }
            
            embeddings = []
            
            # Process each detected face
            for face in detection_result["faces"]:
                x, y, w, h = face["x"], face["y"], face["width"], face["height"]
                quality = face["quality_score"]
                
                try:
                    # Extract face region with margin
                    margin_ratio = 0.2
                    x_margin = int(w * margin_ratio)
                    y_margin = int(h * margin_ratio)
                    
                    # Ensure coordinates are within bounds
                    img_h, img_w = img.shape[:2]
                    x1 = max(0, x - x_margin)
                    y1 = max(0, y - y_margin)
                    x2 = min(img_w, x + w + x_margin)
                    y2 = min(img_h, y + h + y_margin)
                    
                    # Extract face region
                    face_img = img[y1:y2, x1:x2]
                    
                    # Get embedding using DeepFace
                    embedding_obj = DeepFace.represent(
                        img_path=face_img,
                        model_name=self.model_name,
                        enforce_detection=False,  # Already detected
                        detector_backend="skip",
                        align=self.align,
                        normalization="base"
                    )
                    
                    # Extract embedding vector
                    embedding = embedding_obj[0]["embedding"] if isinstance(embedding_obj, list) else embedding_obj["embedding"]
                    
                    # Validate embedding quality
                    embedding_quality = self.validate_embedding(embedding)
                    
                    # Only add if embedding quality is good
                    if embedding_quality > 0.5:
                        embeddings.append({
                            "face_id": face["face_id"],
                            "embedding": embedding,
                            "region": {"x": x, "y": y, "w": w, "h": h},
                            "quality": quality,
                            "overall": quality,
                            "embedding_quality": embedding_quality,
                            "sharpness": face["sharpness_score"]
                        })
                    else:
                        print(f"[WARNING] Low quality embedding for face {face['face_id']}, quality={embedding_quality}", file=sys.stderr)
                
                except Exception as e:
                    print(f"[ERROR] Failed to extract embedding for face {face['face_id']}: {str(e)}", file=sys.stderr)
            
            return {
                "success": True,
                "face_count": len(embeddings),
                "embeddings": embeddings
            }
            
        except Exception as e:
            return {
                "success": False,
                "face_count": 0,
                "embeddings": [],
                "error": f"Embedding extraction error: {str(e)}"
            }
    
    def validate_embedding(self, embedding):
        """Validate quality of extracted embedding"""
        try:
            if embedding is None or len(embedding) == 0:
                return 0.0
            
            # Convert to numpy array
            emb = np.array(embedding)
            
            # Check for NaN or Inf values
            if np.isnan(emb).any() or np.isinf(emb).any():
                return 0.0
            
            # Check variance
            variance = np.var(emb)
            if variance < 1e-4:  # Too low variance
                return 0.1
            
            # Check for reasonable range of values
            if np.max(np.abs(emb)) > 10:
                return 0.3
            
            # Calculate quality score based on statistical properties
            quality = 0.7  # Base score
            
            # Bonus for good variance
            if 0.01 < variance < 1.0:
                quality += 0.2
            
            # Bonus for good distribution
            std = np.std(emb)
            if 0.1 < std < 1.0:
                quality += 0.1
            
            return min(1.0, quality)
        
        except Exception as e:
            print(f"[ERROR] Embedding validation error: {str(e)}", file=sys.stderr)
            return 0.0
    
    def compare_faces(self, embedding1, embedding2):
        """Compare two face embeddings"""
        try:
            if not embedding1 or not embedding2 or len(embedding1) == 0 or len(embedding2) == 0:
                return {
                    "success": False,
                    "error": "Invalid embeddings",
                    "similarity": 0.0,
                    "distance": 1.0,
                    "confidence": 0.0
                }
            
            # Convert to numpy arrays
            emb1 = np.array(embedding1)
            emb2 = np.array(embedding2)
            
            # Ensure same length
            min_len = min(len(emb1), len(emb2))
            emb1 = emb1[:min_len]
            emb2 = emb2[:min_len]
            
            # Calculate cosine similarity
            similarity = self.cosine_similarity(emb1, emb2)
            
            # Calculate Euclidean distance (normalized)
            euclidean_dist = np.linalg.norm(emb1 - emb2)
            max_dist = np.sqrt(2)  # Max possible distance for normalized vectors
            euclidean_sim = 1 - min(euclidean_dist / max_dist, 1.0)
            
            # Calculate Pearson correlation
            pearson = np.corrcoef(emb1, emb2)[0, 1] if min_len > 1 else 0
            pearson_sim = (pearson + 1) / 2 if not np.isnan(pearson) else 0
            
            # Weighted combination
            weighted_sim = 0.6 * similarity + 0.25 * euclidean_sim + 0.15 * pearson_sim
            
            # Calculate confidence based on consistency
            metrics = [similarity, euclidean_sim, pearson_sim]
            mean_sim = np.mean(metrics)
            std_sim = np.std(metrics)
            confidence = max(0, 1 - (std_sim / (mean_sim + 1e-6)))
            
            # Apply threshold
            threshold = 0.5
            final_sim = weighted_sim if weighted_sim >= threshold else 0.0
            
            return {
                "success": True,
                "similarity": float(final_sim),
                "distance": float(1.0 - final_sim),
                "confidence": float(confidence),
                "metrics": {
                    "cosine": float(similarity),
                    "euclidean": float(euclidean_sim),
                    "pearson": float(pearson_sim)
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Comparison error: {str(e)}",
                "similarity": 0.0,
                "distance": 1.0,
                "confidence": 0.0
            }
    
    def cosine_similarity(self, a, b):
        """Calculate cosine similarity between two vectors"""
        try:
            dot_product = np.dot(a, b)
            norm_a = np.linalg.norm(a)
            norm_b = np.linalg.norm(b)
            
            if norm_a == 0 or norm_b == 0:
                return 0.0
                
            similarity = dot_product / (norm_a * norm_b)
            
            # Normalize to [0, 1]
            normalized_sim = (similarity + 1) / 2
            
            return max(0.0, min(1.0, normalized_sim))
        except Exception as e:
            print(f"[ERROR] Cosine similarity error: {str(e)}", file=sys.stderr)
            return 0.0

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Simple Face Processing Tool")
    parser.add_argument("--action", required=True, choices=["detect", "extract", "compare"],
                        help="Action to perform: detect faces, extract embeddings, or compare faces")
    parser.add_argument("--img", help="Path to image for detection or embedding extraction")
    parser.add_argument("--emb1", help="Path to JSON file with first embedding for comparison")
    parser.add_argument("--emb2", help="Path to JSON file with second embedding for comparison")
    parser.add_argument("--output", help="Path to output JSON file")
    
    return parser.parse_args()

def main():
    """Main function"""
    # Parse arguments
    try:
        args = parse_arguments()
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Argument parsing error: {str(e)}"}))
        sys.exit(1)
    
    # Initialize processor
    processor = SimpleFaceProcessor()
    
    # Perform requested action
    result = None
    
    if args.action == "detect":
        if not args.img:
            result = {"success": False, "error": "Image path required for detection"}
        else:
            result = processor.detect_faces(args.img)
            
    elif args.action == "extract":
        if not args.img:
            result = {"success": False, "error": "Image path required for embedding extraction"}
        else:
            result = processor.extract_embeddings(args.img)
            
    elif args.action == "compare":
        if not args.emb1 or not args.emb2:
            result = {"success": False, "error": "Two embedding files required for comparison"}
        else:
            try:
                # Load embeddings from files
                with open(args.emb1, 'r') as f:
                    emb1 = json.load(f)
                with open(args.emb2, 'r') as f:
                    emb2 = json.load(f)
                    
                result = processor.compare_faces(emb1, emb2)
            except Exception as e:
                result = {"success": False, "error": f"Failed to load embeddings: {str(e)}"}
    
    # Output result
    if args.output:
        try:
            with open(args.output, 'w') as f:
                json.dump(result, f)
            print(json.dumps({"success": True, "message": f"Result saved to {args.output}"}))
        except Exception as e:
            print(json.dumps({"success": False, "error": f"Failed to save output: {str(e)}"}))
    else:
        print(json.dumps(result))

if __name__ == "__main__":
    main() 