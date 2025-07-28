import sys
import json
import argparse
import os
import urllib.request
from pathlib import Path
import math

try:
    import numpy as np
    from numpy import asarray, uint8, fromfile, zeros, where, var, dot, linalg, mean, std, concatenate, histogram
except ImportError:
    print(json.dumps({"success": False, "error": "NumPy not installed. Please run: pip install numpy"}))
    sys.exit(1)

try:
    import cv2
    from cv2 import (CascadeClassifier, imread, imdecode, IMREAD_COLOR, cvtColor, COLOR_BGR2GRAY, 
                    ellipse, matchTemplate, TM_CCOEFF_NORMED, calcHist, resize, Laplacian, CV_64F,
                    HOGDescriptor, equalizeHist, GaussianBlur, Canny, Sobel,
                    getRotationMatrix2D, warpAffine, INTER_LINEAR, MORPH_ELLIPSE, getStructuringElement,
                    morphologyEx, MORPH_CLOSE, MORPH_OPEN, dnn)
except ImportError as e:
    print(json.dumps({"success": False, "error": f"OpenCV import error: {str(e)}"}))
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print(json.dumps({"success": False, "error": "Pillow not installed. Please run: pip install Pillow"}))
    sys.exit(1)

# Add function to load arguments from file
def load_args_from_file(file_path):
    """Load arguments from a JSON file"""
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading arguments from file: {e}", file=sys.stderr)
        return None

class AdvancedFaceProcessor:
    def __init__(self):
        """Initialize advanced face processor with multiple detection models and feature extractors"""
        # Load multiple cascade classifiers for robust detection
        self.face_cascades = []
        self.load_cascade_models()
        
        # Initialize feature extractors
        self.hog = HOGDescriptor()
        
        # Initialize DNN face detector if available
        self.dnn_net = None
        self.load_dnn_model()
        
        # Face quality thresholds - điều chỉnh về mức thấp hơn để nhận diện nhiều mặt hơn
        self.min_face_size = 12  # Giảm từ 18 xuống 12 để nhận diện mặt nhỏ hơn
        self.max_face_size = 1000 # Tăng từ 800 lên 1000
        self.quality_threshold = 0.05  # Giảm từ 0.15 xuống 0.05 để nhận diện mặt kém chất lượng hơn
        
        print(f"Initialized AdvancedFaceProcessor with {len(self.face_cascades)} cascade models", file=sys.stderr)
    
    def load_cascade_models(self):
        """Load multiple cascade models for robust face detection"""
        cascade_files = [
            'haarcascade_frontalface_default.xml',
            'haarcascade_frontalface_alt.xml',
            'haarcascade_frontalface_alt2.xml',
            'haarcascade_profileface.xml'
        ]
        
        for cascade_file in cascade_files:
            try:
                cascade_path = cv2.data.haarcascades + cascade_file
                if os.path.exists(cascade_path):
                    cascade = cv2.CascadeClassifier(cascade_path)
                    if not cascade.empty():
                        self.face_cascades.append((cascade, cascade_file))
                        print(f"Loaded cascade: {cascade_file}", file=sys.stderr)
            except Exception as e:
                print(f"Warning: Could not load {cascade_file}: {e}", file=sys.stderr)
        
        if not self.face_cascades:
            print("Warning: No cascade models loaded", file=sys.stderr)
    
    def load_dnn_model(self):
        """Try to load DNN face detection model"""
        try:
            # Try to use OpenCV's DNN face detector
            # Note: This would require downloading the model files
            # For now, we'll use a placeholder
            self.dnn_net = None
            print("DNN model not available (placeholder)", file=sys.stderr)
        except Exception as e:
            print(f"Could not load DNN model: {e}", file=sys.stderr)
            self.dnn_net = None
    
    def load_image(self, img_path: str):
        """Enhanced image loading with better error handling"""
        try:
            print(f"Loading image: {img_path}", file=sys.stderr)
            
            if img_path.startswith(('http://', 'https://')):
                # Download from URL
                response = urllib.request.urlopen(img_path)
                image_array = asarray(bytearray(response.read()), dtype=uint8)
                img = imdecode(image_array, IMREAD_COLOR)
            else:
                # Local file
                img_path = os.path.abspath(os.path.normpath(img_path))
                
                if not os.path.exists(img_path):
                    return None, f"File not found: {img_path}"
                
                file_size = os.path.getsize(img_path)
                if file_size == 0:
                    return None, f"File is empty: {img_path}"
                
                # Try multiple read methods
                try:
                    img = imread(img_path, IMREAD_COLOR)
                    if img is None:
                        try:
                            file_bytes = fromfile(img_path, dtype=uint8)
                            img = imdecode(file_bytes, IMREAD_COLOR)
                        except Exception:
                            pass
                except Exception:
                    return None, f"Could not read image: {img_path}"
            
            if img is None:
                return None, f"Could not decode image: {img_path}"
            
            # Validate image dimensions
            if len(img.shape) != 3 or img.shape[2] != 3:
                return None, "Invalid image format (not 3-channel)"
            
            print(f"Successfully loaded image: {img.shape}", file=sys.stderr)
            return img, None
            
        except Exception as e:
            return None, f"Error loading image: {str(e)}"
    
    def detect_faces_advanced(self, img_path: str) -> dict:
        """Enhanced face detection pipeline với multiple algorithms và quality assessment"""
        print(f"Starting enhanced face detection pipeline for: {img_path}", file=sys.stderr)
        
        # Load image
        img, error = self.load_image(img_path)
        if img is None:
            print(f"[DEBUG] Could not load image: {error}", file=sys.stderr)
            return {
                'success': False,
                'error': error or 'Could not load image',
                'face_count': 0,
                'faces': []
            }
        
        try:
            # Multi-stage preprocessing để improve detection
            preprocessed_images = self.create_detection_variants(img)
            # Thử thêm các biến thể xoay và tăng sáng
            import cv2
            import numpy as np
            extra_variants = {}
            for angle in [10, -10, 20, -20]:
                (h, w) = img.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                rotated = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
                extra_variants[f'rotated_{angle}'] = rotated
            for alpha in [1.2, 1.4]:
                bright = cv2.convertScaleAbs(img, alpha=alpha, beta=10)
                extra_variants[f'bright_{alpha}'] = bright
            preprocessed_images.update(extra_variants)

            all_detections = []
            detection_sources = []
            
            # Stage 1: Multiple detection algorithms trên original và preprocessed images
            for variant_name, variant_img in preprocessed_images.items():
                print(f"Running detection on variant: {variant_name}", file=sys.stderr)
                
                gray = cvtColor(variant_img, COLOR_BGR2GRAY)
                
                # Method 1: Enhanced cascade detection
                cascade_faces = self.enhanced_cascade_detection(gray, variant_name)
                all_detections.extend(cascade_faces)
                detection_sources.extend([f"cascade_{variant_name}"] * len(cascade_faces))
                
                # Method 2: DNN detection (if available)
                dnn_faces = self.enhanced_dnn_detection(variant_img, variant_name)
                all_detections.extend(dnn_faces)
                detection_sources.extend([f"dnn_{variant_name}"] * len(dnn_faces))
                
                # Method 3: Template-based detection
                template_faces = self.enhanced_template_detection(gray, variant_name)
                all_detections.extend(template_faces)
                detection_sources.extend([f"template_{variant_name}"] * len(template_faces))
                
                # Method 4: Contour-based detection
                contour_faces = self.contour_based_detection(gray, variant_name)
                all_detections.extend(contour_faces)
                detection_sources.extend([f"contour_{variant_name}"] * len(contour_faces))
            
            print(f"Total raw detections: {len(all_detections)}", file=sys.stderr)
            
            # Stage 2: Advanced ensemble và confidence calculation
            ensemble_faces = self.advanced_ensemble_detection(all_detections, detection_sources, img.shape[:2])
            
            # Stage 3: Quality-based filtering và ranking
            quality_faces = self.quality_based_face_filtering(ensemble_faces, cvtColor(img, COLOR_BGR2GRAY))
            
            # Stage 4: Final validation và selection
            final_faces = self.final_face_validation(quality_faces, img)
            
            face_data = []
            for i, face_info in enumerate(final_faces):
                x, y, w, h, confidence, quality, sharpness, frontal_score = face_info
                face_data.append({
                    'face_id': i,
                    'x': int(x),
                    'y': int(y),
                    'width': int(w),
                    'height': int(h),
                    'confidence': float(confidence),
                    'quality_score': float(quality),
                    'sharpness_score': float(sharpness),
                    'frontal_score': float(frontal_score),
                    'overall_score': float((confidence + quality + sharpness + frontal_score) / 4)
                })
            
            # Sort by overall score (best faces first)
            face_data.sort(key=lambda x: x['overall_score'], reverse=True)
            
            print(f"Final face detections: {len(face_data)}", file=sys.stderr)
            for i, face in enumerate(face_data[:3]):  # Log top 3 faces
                print(f"  Face {i+1}: Overall={face['overall_score']:.3f}, Conf={face['confidence']:.3f}, Quality={face['quality_score']:.3f}", file=sys.stderr)
            if len(face_data) == 0:
                print(f"[DEBUG] No faces detected after all variants. Params: min_face_size={self.min_face_size}, quality_threshold={self.quality_threshold}", file=sys.stderr)
            
            return {
                'success': True,
                'face_count': len(face_data),
                'faces': face_data
            }
            
        except Exception as e:
            error_msg = f"Enhanced face detection error: {str(e)}"
            print(error_msg, file=sys.stderr)
            return {
                'success': False,
                'error': error_msg,
                'face_count': 0,
                'faces': []
            }
    
    def create_detection_variants(self, img):
        """Create multiple detection variants - optimized for performance"""
        variants = {}
        
        try:
            # Limit image size to prevent memory issues
            h, w = img.shape[:2]
            max_dimension = 1200  # Reduced from unlimited
            
            if max(h, w) > max_dimension:
                scale_factor = max_dimension / max(h, w)
                img = cv2.resize(img, None, fx=scale_factor, fy=scale_factor)
                print(f"Resized image to: {img.shape}", file=sys.stderr)
            
            # Original image
            variants['original'] = img.copy()
            
            # Enhanced contrast variant only (most effective)
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            lab[:,:,0] = cv2.equalizeHist(lab[:,:,0])
            enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
            variants['enhanced_contrast'] = enhanced
            
            # Only one brightness variant (most balanced)
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            hsv_bright = hsv.copy()
            hsv_bright[:,:,2] = cv2.add(hsv_bright[:,:,2], 20)  # Reduced from 30
            variants['brighter'] = cv2.cvtColor(hsv_bright, cv2.COLOR_HSV2BGR)
            
            print(f"Created {len(variants)} optimized detection variants", file=sys.stderr)
            
        except Exception as e:
            print(f"Error creating detection variants: {e}", file=sys.stderr)
            variants = {'original': img}
        
        return variants
    
    def adjust_gamma(self, image, gamma=1.0):
        """Gamma correction"""
        inv_gamma = 1.0 / gamma
        table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
        return cv2.LUT(image, table)
    
    def enhanced_cascade_detection(self, gray_img, variant_name):
        """Enhanced cascade detection với conservative parameters"""
        detections = []
        
        for cascade, cascade_name in self.face_cascades:
            try:
                # More conservative parameters - ít detection hơn nhưng chính xác hơn
                if 'enhanced' in variant_name or 'gamma' in variant_name:
                    # Parameters for enhanced/gamma corrected images
                    parameter_sets = [
                        {'scaleFactor': 1.15, 'minNeighbors': 5, 'minSize': (50, 50), 'maxSize': (300, 300)},
                        {'scaleFactor': 1.2, 'minNeighbors': 6, 'minSize': (60, 60), 'maxSize': (250, 250)},
                    ]
                else:
                    # Standard parameters - more conservative
                    parameter_sets = [
                        {'scaleFactor': 1.15, 'minNeighbors': 5, 'minSize': (40, 40), 'maxSize': (300, 300)},
                        {'scaleFactor': 1.2, 'minNeighbors': 6, 'minSize': (50, 50), 'maxSize': (250, 250)},
                    ]
                
                for params in parameter_sets:
                    faces = cascade.detectMultiScale(gray_img, **params)
                    for (x, y, w, h) in faces:
                        # Enhanced confidence calculation
                        confidence = self.calculate_enhanced_cascade_confidence(
                            x, y, w, h, cascade_name, variant_name, gray_img.shape
                        )
                        
                        # Only keep high confidence detections
                        if confidence > 0.6:  # Increased threshold from default
                            detections.append((x, y, w, h, confidence, f"cascade_{cascade_name}_{variant_name}"))
                        
            except Exception as e:
                print(f"Error with cascade {cascade_name} on {variant_name}: {e}", file=sys.stderr)
        
        print(f"Cascade detection found {len(detections)} faces on {variant_name}", file=sys.stderr)
        return detections
    
    def calculate_enhanced_cascade_confidence(self, x, y, w, h, cascade_name, variant_name, img_shape):
        """Enhanced confidence calculation cho cascade detection"""
        # Base confidence
        confidence = 0.6
        
        # Size-based adjustment
        face_size = w * h
        img_size = img_shape[0] * img_shape[1]
        size_ratio = face_size / img_size
        
        if 0.015 < size_ratio < 0.25:  # Good size range
            confidence += 0.15
        elif size_ratio > 0.4:  # Too large
            confidence -= 0.2
        elif size_ratio < 0.005:  # Too small
            confidence -= 0.15
        
        # Position-based adjustment
        center_y = y + h // 2
        center_x = x + w // 2
        img_center_y = img_shape[0] // 2
        img_center_x = img_shape[1] // 2
        
        # Faces usually in center area
        distance_from_center = np.sqrt((center_x - img_center_x)**2 + (center_y - img_center_y)**2)
        max_distance = np.sqrt(img_center_x**2 + img_center_y**2)
        center_score = 1 - (distance_from_center / max_distance)
        confidence += center_score * 0.1
        
        # Cascade type adjustment
        if 'frontal' in cascade_name.lower():
            confidence += 0.15
            if 'default' in cascade_name.lower():
                confidence += 0.05  # Default frontal is usually best
        elif 'profile' in cascade_name.lower():
            confidence += 0.08
        
        # Variant-based adjustment
        if variant_name == 'original':
            confidence += 0.05
        elif 'enhanced' in variant_name:
            confidence += 0.08
        elif 'gamma' in variant_name:
            confidence += 0.03
        
        # Aspect ratio check (faces are usually not too wide or tall)
        aspect_ratio = w / h
        if 0.7 < aspect_ratio < 1.4:  # Good aspect ratio
            confidence += 0.1
        elif aspect_ratio < 0.5 or aspect_ratio > 2.0:  # Bad aspect ratio
            confidence -= 0.15
        
        return min(1.0, max(0.1, confidence))
    
    def enhanced_dnn_detection(self, img, variant_name):
        """Enhanced DNN detection - disabled to improve performance"""
        # Temporarily disable DNN detection to reduce false positives
        print(f"DNN detection disabled for performance on {variant_name}", file=sys.stderr)
        return []
    
    def enhanced_template_detection(self, gray_img, variant_name):
        """Enhanced template matching với memory optimization"""
        detections = []
        
        try:
            h, w = gray_img.shape
            # Skip template detection for very large images to prevent memory issues
            if h * w > 1500000:  # 1.5M pixels limit
                print(f"Skipping template detection for large image: {w}x{h}", file=sys.stderr)
                return detections
                
            # Reduced template size for better performance
            base_template_size = min(w, h) // 8  # Increased divisor from 6 to 8
            templates = self.create_enhanced_face_templates(base_template_size)
            
            # More conservative threshold
            base_threshold = 0.45  # Increased from 0.35
            if 'enhanced' in variant_name:
                base_threshold = 0.48  # Increased
            elif 'gamma' in variant_name:
                base_threshold = 0.47  # Increased
            
            detection_count = 0
            max_detections = 100  # Limit detections per template method
            
            for template_idx, template in enumerate(templates):
                if template.size == 0 or detection_count >= max_detections:
                    continue
                
                # Reduced scales for better performance
                scales = [0.8, 1.0, 1.2]  # Reduced from 6 scales to 3
                
                for scale in scales:
                    if detection_count >= max_detections:
                        break
                        
                    template_size = int(template.shape[0] * scale)
                    if template_size < 30 or template_size > min(w, h) // 3:  # More restrictive
                        continue
                    
                    scaled_template = resize(template, (template_size, template_size))
                    
                    # Apply template matching
                    result = matchTemplate(gray_img, scaled_template, TM_CCOEFF_NORMED)
                    
                    # More conservative threshold
                    threshold = base_threshold + (template_idx * 0.05)  # Increased increment
                    locations = where(result >= threshold)
                    
                    for pt in zip(*locations[::-1]):
                        if detection_count >= max_detections:
                            break
                            
                        confidence = float(result[pt[1], pt[0]])
                        
                        # Enhanced confidence calculation
                        enhanced_confidence = self.calculate_template_confidence(
                            confidence, template_idx, scale, template_size, variant_name
                        )
                        
                        if enhanced_confidence > 0.5:  # Higher minimum confidence
                            detections.append((pt[0], pt[1], template_size, template_size, enhanced_confidence, f"template_{variant_name}"))
                            detection_count += 1
                            
        except Exception as e:
            print(f"Enhanced template detection error on {variant_name}: {e}", file=sys.stderr)
        
        print(f"Template detection found {len(detections)} faces on {variant_name}", file=sys.stderr)
        return detections
    
    def create_enhanced_face_templates(self, base_size):
        """Create enhanced face templates với different characteristics"""
        templates = []
        
        try:
            # Template 1: Oval face (most common)
            template1 = zeros((base_size, base_size), dtype=uint8)
            center = (base_size // 2, base_size // 2)
            axes = (base_size // 3, int(base_size * 0.4))
            cv2.ellipse(template1, center, axes, 0, 0, 360, 255, -1)
            
            # Add facial features simulation
            # Eyes
            eye_y = base_size // 3
            eye1_x = base_size // 3
            eye2_x = 2 * base_size // 3
            cv2.circle(template1, (eye1_x, eye_y), base_size // 15, 0, -1)
            cv2.circle(template1, (eye2_x, eye_y), base_size // 15, 0, -1)
            
            # Mouth
            mouth_y = 2 * base_size // 3
            mouth_x = base_size // 2
            cv2.ellipse(template1, (mouth_x, mouth_y), (base_size // 8, base_size // 20), 0, 0, 180, 0, -1)
            
            templates.append(template1)
            
            # Template 2: Square face
            template2 = zeros((base_size, base_size), dtype=uint8)
            cv2.rectangle(template2, (base_size//4, base_size//5), (3*base_size//4, 4*base_size//5), 255, -1)
            
            # Add features
            cv2.circle(template2, (eye1_x, eye_y), base_size // 15, 0, -1)
            cv2.circle(template2, (eye2_x, eye_y), base_size // 15, 0, -1)
            cv2.ellipse(template2, (mouth_x, mouth_y), (base_size // 8, base_size // 20), 0, 0, 180, 0, -1)
            
            templates.append(template2)
            
            # Template 3: Round face
            template3 = zeros((base_size, base_size), dtype=uint8)
            cv2.circle(template3, center, base_size // 2, 255, -1)
            
            # Add features
            cv2.circle(template3, (eye1_x, eye_y), base_size // 15, 0, -1)
            cv2.circle(template3, (eye2_x, eye_y), base_size // 15, 0, -1)
            cv2.ellipse(template3, (mouth_x, mouth_y), (base_size // 8, base_size // 20), 0, 0, 180, 0, -1)
            
            templates.append(template3)
            
            # Template 4: Heart-shaped face
            template4 = zeros((base_size, base_size), dtype=uint8)
            # Create heart shape using polygon
            points = []
            for angle in range(0, 360, 10):
                rad = math.radians(angle)
                if angle <= 180:
                    r = base_size // 3
                else:
                    r = base_size // 3 * (1 - (angle - 180) / 180 * 0.3)
                
                x = int(center[0] + r * math.cos(rad))
                y = int(center[1] + r * math.sin(rad))
                points.append([x, y])
            
            points = np.array(points, dtype=np.int32)
            cv2.fillPoly(template4, [points], 255)
            
            # Add features
            cv2.circle(template4, (eye1_x, eye_y), base_size // 15, 0, -1)
            cv2.circle(template4, (eye2_x, eye_y), base_size // 15, 0, -1)
            cv2.ellipse(template4, (mouth_x, mouth_y), (base_size // 8, base_size // 20), 0, 0, 180, 0, -1)
            
            templates.append(template4)
            
        except Exception as e:
            print(f"Error creating enhanced templates: {e}", file=sys.stderr)
        
        return templates
    
    def calculate_template_confidence(self, base_confidence, template_idx, scale, template_size, variant_name):
        """Calculate enhanced confidence cho template matching"""
        confidence = base_confidence
        
        # Template type bonus
        template_bonuses = [0.1, 0.08, 0.06, 0.05]  # Oval, square, round, heart
        if template_idx < len(template_bonuses):
            confidence += template_bonuses[template_idx]
        
        # Scale bonus (prefer medium scales)
        if 0.8 <= scale <= 1.2:
            confidence += 0.05
        elif scale < 0.6 or scale > 1.6:
            confidence -= 0.05
        
        # Size bonus (prefer reasonable face sizes)
        if 40 <= template_size <= 200:
            confidence += 0.05
        elif template_size < 25 or template_size > 300:
            confidence -= 0.1
        
        # Variant bonus
        if variant_name == 'enhanced_contrast':
            confidence += 0.03
        elif variant_name == 'original':
            confidence += 0.02
        
        return min(1.0, max(0.0, confidence))
    
    def contour_based_detection(self, gray_img, variant_name):
        """Contour-based detection với very conservative approach"""
        detections = []
        
        try:
            # Skip contour detection for large images to improve performance
            h, w = gray_img.shape
            if h * w > 800000:  # 800K pixels limit
                print(f"Skipping contour detection for large image: {w}x{h}", file=sys.stderr)
                return detections
            
            # Edge detection với more conservative parameters
            edges = Canny(gray_img, 80, 180)  # Increased thresholds
            
            # Morphological operations để connect edges
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
            edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
            
            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Very strict filtering
            valid_contours = []
            for contour in contours:
                area = cv2.contourArea(contour)
                if area < 1000 or area > 50000:  # Stricter area limits
                    continue
                
                # Get bounding rectangle
                x, y, w, h = cv2.boundingRect(contour)
                
                # Very strict size filtering
                if w < 60 or h < 60 or w > 200 or h > 200:  # Stricter size limits
                    continue
                
                # Very strict aspect ratio
                aspect_ratio = w / h
                if aspect_ratio < 0.8 or aspect_ratio > 1.3:  # Narrower range
                    continue
                
                valid_contours.append((contour, x, y, w, h))
            
            # Limit number of contour detections
            max_contour_detections = 20  # Strict limit
            for i, (contour, x, y, w, h) in enumerate(valid_contours[:max_contour_detections]):
                # Calculate more conservative confidence
                area_ratio = cv2.contourArea(contour) / (w * h)
                confidence = self.calculate_contour_confidence(contour, area_ratio, w/h, w, h, variant_name)
                
                # Only keep very high confidence contour detections
                if confidence > 0.75:  # Much higher threshold
                    detections.append((x, y, w, h, confidence, f"contour_{variant_name}"))
                    
        except Exception as e:
            print(f"Contour detection error on {variant_name}: {e}", file=sys.stderr)
        
        print(f"Contour detection found {len(detections)} faces on {variant_name}", file=sys.stderr)
        return detections
    
    def calculate_contour_confidence(self, contour, area_ratio, aspect_ratio, w, h, variant_name):
        """Calculate confidence cho contour-based detection"""
        confidence = 0.4
        
        # Area ratio bonus
        if 0.7 < area_ratio < 0.85:
            confidence += 0.15
        elif 0.6 < area_ratio < 0.9:
            confidence += 0.1
        
        # Aspect ratio bonus
        if 0.8 < aspect_ratio < 1.2:
            confidence += 0.1
        elif 0.7 < aspect_ratio < 1.3:
            confidence += 0.05
        
        # Size bonus
        face_size = w * h
        if 2000 < face_size < 40000:
            confidence += 0.1
        elif 1000 < face_size < 60000:
            confidence += 0.05
        
        # Contour complexity (perimeter vs area)
        perimeter = cv2.arcLength(contour, True)
        if face_size > 0:
            complexity = perimeter / np.sqrt(face_size)
            if 8 < complexity < 20:  # Good complexity range for faces
                confidence += 0.08
        
        # Convexity
        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        if hull_area > 0:
            convexity = cv2.contourArea(contour) / hull_area
            if convexity > 0.8:  # Faces are usually quite convex
                confidence += 0.05
        
        # Variant bonus
        if variant_name in ['enhanced_contrast', 'gamma_high']:
            confidence += 0.02
        
        return min(1.0, max(0.0, confidence))
    
    def advanced_ensemble_detection(self, detections, sources, img_shape):
        """Advanced ensemble detection với weighted voting và confidence aggregation"""
        if not detections:
            return []
        
        try:
            # Group nearby detections với improved clustering
            grouped_detections = self.improved_detection_grouping(detections, sources)
            
            ensemble_faces = []
            for group_detections, group_sources in grouped_detections:
                if len(group_detections) >= 2:  # Need at least 2 votes
                    # Calculate ensemble face với weighted voting
                    ensemble_face = self.calculate_weighted_ensemble_face(group_detections, group_sources)
                    ensemble_faces.append(ensemble_face)
                elif len(group_detections) == 1:
                    # Single detection - needs high confidence
                    detection = group_detections[0]
                    if len(detection) >= 5 and detection[4] > 0.75:  # High confidence threshold
                        ensemble_faces.append(detection)
            
            # Apply advanced NMS
            final_faces = self.apply_advanced_nms(ensemble_faces, img_shape)
            
            print(f"Ensemble: {len(detections)} -> {len(grouped_detections)} groups -> {len(final_faces)} final faces", file=sys.stderr)
            
            return final_faces
            
        except Exception as e:
            print(f"Advanced ensemble detection error: {e}", file=sys.stderr)
            return []
    
    def improved_detection_grouping(self, detections, sources, overlap_threshold=0.35):
        """Improved detection grouping với source awareness"""
        grouped = []
        used = set()
        
        for i, det1 in enumerate(detections):
            if i in used:
                continue
            
            group_detections = [det1]
            group_sources = [sources[i]]
            used.add(i)
            
            for j, det2 in enumerate(detections):
                if j in used or i == j:
                    continue
                
                # Calculate overlap
                overlap = self.calculate_overlap(det1[:4], det2[:4])
                
                # Adaptive overlap threshold based on detection sources
                adaptive_threshold = overlap_threshold
                
                # Lower threshold for same-source detections
                if sources[i].split('_')[0] == sources[j].split('_')[0]:
                    adaptive_threshold += 0.1
                
                # Higher confidence detections get more generous grouping
                if len(det1) > 4 and len(det2) > 4:
                    avg_confidence = (det1[4] + det2[4]) / 2
                    if avg_confidence > 0.7:
                        adaptive_threshold -= 0.05
                
                if overlap > adaptive_threshold:
                    group_detections.append(det2)
                    group_sources.append(sources[j])
                    used.add(j)
            
            if len(group_detections) > 0:
                grouped.append((group_detections, group_sources))
        
        return grouped
    
    def calculate_weighted_ensemble_face(self, detections, sources):
        """Calculate weighted ensemble face từ multiple detections"""
        try:
            # Source weights
            source_weights = {
                'cascade': 1.0,
                'dnn': 1.2,
                'template': 0.8,
                'contour': 0.6
            }
            
            # Variant weights
            variant_weights = {
                'original': 1.0,
                'enhanced_contrast': 1.1,
                'gamma_high': 0.9,
                'gamma_low': 0.9,
                'brighter': 0.8,
                'darker': 0.8,
                'scaled_down': 0.7
            }
            
            total_weight = 0
            weighted_x = weighted_y = weighted_w = weighted_h = 0
            weighted_confidence = 0
            
            for detection, source in zip(detections, sources):
                if len(detection) < 5:
                    continue
                
                x, y, w, h, confidence = detection[:5]
                
                # Calculate weight
                source_parts = source.split('_')
                source_type = source_parts[0]
                variant = '_'.join(source_parts[1:]) if len(source_parts) > 1 else 'original'
                
                source_weight = source_weights.get(source_type, 0.5)
                variant_weight = variant_weights.get(variant, 0.5)
                confidence_weight = confidence
                
                total_weight_for_detection = source_weight * variant_weight * confidence_weight
                
                # Weighted sum
                total_weight += total_weight_for_detection
                weighted_x += x * total_weight_for_detection
                weighted_y += y * total_weight_for_detection
                weighted_w += w * total_weight_for_detection
                weighted_h += h * total_weight_for_detection
                weighted_confidence += confidence * total_weight_for_detection
            
            if total_weight > 0:
                final_x = int(weighted_x / total_weight)
                final_y = int(weighted_y / total_weight)
                final_w = int(weighted_w / total_weight)
                final_h = int(weighted_h / total_weight)
                final_confidence = weighted_confidence / total_weight
                
                # Boost confidence based on number of detections
                vote_boost = min(0.2, len(detections) * 0.04)
                final_confidence = min(1.0, final_confidence + vote_boost)
                
                return (final_x, final_y, final_w, final_h, final_confidence, f"ensemble_{len(detections)}_votes")
            else:
                return detections[0]  # Fallback to first detection
                
        except Exception as e:
            print(f"Weighted ensemble calculation error: {e}", file=sys.stderr)
            return detections[0] if detections else None
    
    def apply_advanced_nms(self, detections, img_shape, overlap_threshold=0.4):
        """Advanced Non-Maximum Suppression với quality awareness"""
        if not detections:
            return []
        
        try:
            # Calculate quality scores for each detection
            scored_detections = []
            for detection in detections:
                if len(detection) >= 5:
                    x, y, w, h, confidence = detection[:5]
                    
                    # Calculate composite score
                    size_score = self.calculate_size_score(w, h, img_shape)
                    position_score = self.calculate_position_score(x, y, w, h, img_shape)
                    aspect_score = self.calculate_aspect_score(w, h)
                    
                    composite_score = confidence * 0.5 + size_score * 0.2 + position_score * 0.2 + aspect_score * 0.1
                    
                    scored_detections.append((detection, composite_score))
            
            # Sort by composite score (highest first)
            scored_detections.sort(key=lambda x: x[1], reverse=True)
            
            # NMS with quality awareness
            keep = []
            while scored_detections:
                # Keep the highest scored detection
                current_detection, current_score = scored_detections.pop(0)
                keep.append(current_detection)
                
                # Remove overlapping detections
                remaining = []
                for detection, score in scored_detections:
                    overlap = self.calculate_overlap(current_detection[:4], detection[:4])
                    
                    # Adaptive threshold based on quality difference
                    adaptive_threshold = overlap_threshold
                    score_diff = abs(current_score - score)
                    
                    # If scores are very different, be more lenient
                    if score_diff > 0.3:
                        adaptive_threshold += 0.1
                    
                    if overlap < adaptive_threshold:
                        remaining.append((detection, score))
                
                scored_detections = remaining
            
            return keep
            
        except Exception as e:
            print(f"Advanced NMS error: {e}", file=sys.stderr)
            return detections
    
    def calculate_size_score(self, w, h, img_shape):
        """Calculate size quality score"""
        face_area = w * h
        img_area = img_shape[0] * img_shape[1]
        size_ratio = face_area / img_area
        
        # Ideal size ratio is between 0.02 and 0.15
        if 0.02 <= size_ratio <= 0.15:
            return 1.0
        elif 0.01 <= size_ratio <= 0.25:
            return 0.8
        elif 0.005 <= size_ratio <= 0.35:
            return 0.6
        else:
            return 0.3
    
    def calculate_position_score(self, x, y, w, h, img_shape):
        """Calculate position quality score"""
        center_x = x + w // 2
        center_y = y + h // 2
        img_center_x = img_shape[1] // 2
        img_center_y = img_shape[0] // 2
        
        # Distance from image center
        distance = np.sqrt((center_x - img_center_x)**2 + (center_y - img_center_y)**2)
        max_distance = np.sqrt(img_center_x**2 + img_center_y**2)
        
        # Faces closer to center get higher scores
        position_score = 1.0 - (distance / max_distance)
        
        # Boost for faces in upper 2/3 of image
        if center_y < img_shape[0] * 0.67:
            position_score += 0.1
        
        return min(1.0, position_score)
    
    def calculate_aspect_score(self, w, h):
        """Calculate aspect ratio quality score"""
        aspect_ratio = w / h
        
        # Ideal aspect ratio for faces is around 0.8-1.2
        if 0.8 <= aspect_ratio <= 1.2:
            return 1.0
        elif 0.7 <= aspect_ratio <= 1.4:
            return 0.8
        elif 0.6 <= aspect_ratio <= 1.6:
            return 0.6
        else:
            return 0.3
    
    def calculate_overlap(self, box1, box2):
        """Calculate Intersection over Union (IoU) between two bounding boxes"""
        x1, y1, w1, h1 = box1
        x2, y2, w2, h2 = box2
        
        # Calculate intersection coordinates
        left = max(x1, x2)
        top = max(y1, y2)
        right = min(x1 + w1, x2 + w2)
        bottom = min(y1 + h1, y2 + h2)
        
        # No intersection
        if left >= right or top >= bottom:
            return 0.0
        
        # Calculate intersection area
        intersection = (right - left) * (bottom - top)
        
        # Calculate union area
        area1 = w1 * h1
        area2 = w2 * h2
        union = area1 + area2 - intersection
        
        # Avoid division by zero
        if union == 0:
            return 0.0
        
        # Return IoU
        return intersection / union
    
    def quality_based_face_filtering(self, faces, gray_img):
        """Enhanced quality-based face filtering với multiple metrics - more permissive version"""
        quality_faces = []
        
        for face_info in faces:
            if len(face_info) < 6:
                continue
                
            x, y, w, h, confidence, source = face_info
            
            # Ensure face is within image bounds
            x = max(0, min(x, gray_img.shape[1] - w))
            y = max(0, min(y, gray_img.shape[0] - h))
            w = min(w, gray_img.shape[1] - x)
            h = min(h, gray_img.shape[0] - y)
            
            # More permissive size filtering - only filter extremely small faces
            if w < self.min_face_size or h < self.min_face_size:
                continue
            
            # Extract face region for quality analysis
            face_roi = gray_img[y:y+h, x:x+w]
            
            if face_roi.size == 0:
                continue
            
            # Multiple quality metrics
            sharpness_score = self.calculate_face_sharpness(face_roi)
            contrast_score = self.calculate_face_contrast(face_roi)
            brightness_score = self.calculate_face_brightness(face_roi)
            symmetry_score = self.calculate_face_symmetry(face_roi)
            edge_score = self.calculate_face_edge_quality(face_roi)
            frontal_score = self.calculate_frontal_face_score(face_roi)
            
            # Weighted quality score - prioritize sharpness and contrast
            quality_score = (
                sharpness_score * 0.3 +
                contrast_score * 0.25 +
                brightness_score * 0.15 +
                symmetry_score * 0.1 +
                edge_score * 0.1 +
                frontal_score * 0.1
            )
            
            # Much more permissive threshold logic
            adaptive_threshold = self.quality_threshold
            
            # Lower threshold for high confidence detections
            if confidence > 0.7:
                adaptive_threshold -= 0.2  # Much more reduction for high confidence
            elif confidence > 0.5:
                adaptive_threshold -= 0.1
            
            # Accept face if quality is acceptable or if confidence is high
            if quality_score >= adaptive_threshold or confidence > 0.7:
                quality_faces.append((x, y, w, h, confidence, quality_score, sharpness_score, frontal_score))
        
        # If no faces passed quality filtering but we had detections, return the best one
        if len(quality_faces) == 0 and len(faces) > 0:
            # Find face with highest confidence
            best_face_idx = max(range(len(faces)), key=lambda i: faces[i][4] if len(faces[i]) > 4 else 0)
            best_face = faces[best_face_idx]
            
            if len(best_face) >= 6:
                x, y, w, h, confidence, source = best_face
                
                # Ensure face is within image bounds
                x = max(0, min(x, gray_img.shape[1] - w))
                y = max(0, min(y, gray_img.shape[0] - h))
                w = min(w, gray_img.shape[1] - x)
                h = min(h, gray_img.shape[0] - y)
                
                face_roi = gray_img[y:y+h, x:x+w]
                if face_roi.size > 0:
                    # Calculate basic metrics
                    sharpness_score = self.calculate_face_sharpness(face_roi)
                    frontal_score = self.calculate_frontal_face_score(face_roi)
                    # Assign minimal quality score
                    quality_score = max(0.1, sharpness_score * 0.5)
                    quality_faces.append((x, y, w, h, confidence, quality_score, sharpness_score, frontal_score))
                    print(f"Keeping best face despite low quality. Confidence: {confidence}, Quality: {quality_score}", file=sys.stderr)
        
        return quality_faces
    
    def calculate_face_sharpness(self, face_roi):
        """Calculate face sharpness using multiple methods"""
        try:
            # Laplacian variance
            laplacian = Laplacian(face_roi, CV_64F)
            laplacian_var = var(laplacian)
            sharpness1 = min(1.0, laplacian_var / 1000.0)
            
            # Sobel gradient magnitude
            grad_x = Sobel(face_roi, CV_64F, 1, 0, ksize=3)
            grad_y = Sobel(face_roi, CV_64F, 0, 1, ksize=3)
            magnitude = np.sqrt(grad_x**2 + grad_y**2)
            sharpness2 = min(1.0, np.mean(magnitude) / 100.0)
            
            return (sharpness1 + sharpness2) / 2
        except:
            return 0.5
    
    def calculate_face_contrast(self, face_roi):
        """Calculate face contrast"""
        try:
            contrast = std(face_roi) / 128.0
            return min(1.0, contrast)
        except:
            return 0.5
    
    def calculate_face_brightness(self, face_roi):
        """Calculate face brightness quality"""
        try:
            brightness = mean(face_roi) / 255.0
            # Prefer faces that are not too dark or too bright
            brightness_score = 1.0 - abs(brightness - 0.5) * 2
            return max(0.0, min(1.0, brightness_score))
        except:
            return 0.5
    
    def calculate_face_symmetry(self, face_roi):
        """Calculate face symmetry"""
        try:
            h, w = face_roi.shape[:2]
            left_half = face_roi[:, :w//2]
            right_half = cv2.flip(face_roi[:, w//2:], 1)
            
            if left_half.shape == right_half.shape:
                correlation = cv2.matchTemplate(left_half, right_half, cv2.TM_CCOEFF_NORMED)
                symmetry = correlation[0, 0] if correlation.size > 0 else 0
                return max(0.0, min(1.0, (symmetry + 1) / 2))
            else:
                return 0.5
        except:
            return 0.5
    
    def calculate_face_edge_quality(self, face_roi):
        """Calculate edge quality in face"""
        try:
            edges = Canny(face_roi, 50, 150)
            edge_density = np.sum(edges > 0) / (face_roi.shape[0] * face_roi.shape[1])
            return min(1.0, edge_density * 20)  # Scale appropriately
        except:
            return 0.5
    
    def calculate_frontal_face_score(self, face_roi):
        """Calculate frontal face probability"""
        try:
            h, w = face_roi.shape[:2]
            
            # Eye region analysis (upper third)
            eye_region = face_roi[:h//3, :]
            eye_contrast = np.std(eye_region) if eye_region.size > 0 else 0
            
            # Mouth region analysis (lower third)
            mouth_region = face_roi[2*h//3:, :]
            mouth_contrast = np.std(mouth_region) if mouth_region.size > 0 else 0
            
            # Center vertical analysis
            center_strip = face_roi[:, w//3:2*w//3]
            center_contrast = np.std(center_strip) if center_strip.size > 0 else 0
            
            # Combine features for frontal score
            frontal_score = (eye_contrast / 64.0 * 0.4 + 
                           mouth_contrast / 64.0 * 0.3 + 
                           center_contrast / 64.0 * 0.3)
            
            return min(1.0, max(0.0, frontal_score))
        except:
            return 0.5
    
    def final_face_validation(self, quality_faces, img):
        """Final validation và ranking của detected faces - more permissive version"""
        if not quality_faces:
            return []
        
        try:
            validated_faces = []
            
            for face_info in quality_faces:
                if len(face_info) < 8:
                    continue
                    
                x, y, w, h, confidence, quality, sharpness, frontal_score = face_info
                
                # Final validation checks - much more permissive
                validation_passed = True
                
                # Much lower quality gates
                if quality < 0.05 and sharpness < 0.05 and confidence < 0.1:
                    # Only filter out faces that fail ALL criteria
                    validation_passed = False
                
                # More permissive size validation
                if w < 20 or h < 20:
                    # Only filter out extremely small faces
                    validation_passed = False
                
                # More permissive aspect ratio validation
                aspect_ratio = w / h
                if aspect_ratio < 0.3 or aspect_ratio > 3.0:
                    # Only filter out extremely distorted faces
                    validation_passed = False
                
                # Additional face region analysis - more permissive
                gray = cvtColor(img, COLOR_BGR2GRAY)
                face_roi = gray[y:y+h, x:x+w]
                
                if face_roi.size > 0:
                    # Check for minimum variation in face region - lower threshold
                    face_variance = np.var(face_roi)
                    if face_variance < 50:  # Lower threshold
                        validation_passed = False
                    
                    # Check for reasonable brightness range - lower threshold
                    face_min, face_max = np.min(face_roi), np.max(face_roi)
                    if face_max - face_min < 30:  # Lower threshold
                        validation_passed = False
                
                if validation_passed:
                    validated_faces.append(face_info)
            
            # If no faces passed validation but we had quality faces, return the best one
            if len(validated_faces) == 0 and len(quality_faces) > 0:
                # Find face with highest combined score
                best_face = max(quality_faces, key=lambda f: f[4] + f[5])  # confidence + quality
                validated_faces.append(best_face)
                print(f"Keeping best face despite validation failure. Confidence: {best_face[4]}, Quality: {best_face[5]}", file=sys.stderr)
            
            # Rank faces by composite score
            for i, face_info in enumerate(validated_faces):
                x, y, w, h, confidence, quality, sharpness, frontal_score = face_info
                
                # Calculate composite ranking score - prioritize confidence
                size_bonus = 1.0 if 60 <= max(w, h) <= 300 else 0.8  # More permissive size range
                center_bonus = self.calculate_position_score(x, y, w, h, img.shape[:2])
                
                composite_score = (confidence * 0.4 + quality * 0.3 + 
                                 sharpness * 0.2 + frontal_score * 0.1) * size_bonus * center_bonus
                
                # Update with composite score
                validated_faces[i] = (x, y, w, h, confidence, quality, sharpness, frontal_score)
            
            # Sort by quality (best first) and limit to top faces
            validated_faces.sort(key=lambda x: x[5], reverse=True)  # Sort by quality score
            
            # Return top 10 faces maximum (increased from 5)
            return validated_faces[:10]
            
        except Exception as e:
            print(f"Final face validation error: {e}", file=sys.stderr)
            # In case of error, return all quality faces
            return quality_faces
    
    def extract_advanced_embeddings(self, img_path: str) -> dict:
        """Extract face embeddings with advanced logic, always return embeddings even for low quality faces"""
        detection_result = self.detect_faces_advanced(img_path)
        
        # If no faces detected, try with more permissive settings
        if not detection_result['success'] or detection_result['face_count'] == 0:
            print(f"[DEBUG] No faces detected with standard settings, trying with more permissive settings", file=sys.stderr)
            # Temporarily lower thresholds even more
            original_min_face_size = self.min_face_size
            original_quality_threshold = self.quality_threshold
            
            try:
                self.min_face_size = 8  # Extremely permissive
                self.quality_threshold = 0.01  # Extremely permissive
                detection_result = self.detect_faces_advanced(img_path)
            finally:
                # Restore original settings
                self.min_face_size = original_min_face_size
                self.quality_threshold = original_quality_threshold
        
        # If still no faces detected, return error
        if not detection_result['success'] or detection_result['face_count'] == 0:
            print(f"[DEBUG] Failed to detect any faces even with permissive settings", file=sys.stderr)
            return {
                'success': False,
                'face_count': 0,
                'embeddings': [],
                'extraction_info': detection_result.get('error', 'No faces detected')
            }
            
        try:
            # Always return all detected faces, regardless of quality
            faces = detection_result['faces']
            print(f"[DEBUG] Processing {len(faces)} detected faces for embeddings", file=sys.stderr)
            
            embeddings = []
            for face in faces:
                x, y, w, h = face['x'], face['y'], face['width'], face['height']
                quality = face.get('quality_score', 0)
                overall = face.get('overall_score', 0)
                sharpness = face.get('sharpness_score', 0)
                
                print(f"[DEBUG] Face region: x={x}, y={y}, w={w}, h={h}, quality={quality}, overall={overall}, sharpness={sharpness}", file=sys.stderr)
                
                # Load image and extract face region
                img, _ = self.load_image(img_path)
                if img is None:
                    continue
                    
                # Ensure coordinates are within bounds
                h, w_img, _ = img.shape if len(img.shape) == 3 else (img.shape[0], img.shape[1], 1)
                x = max(0, min(x, w_img - 1))
                y = max(0, min(y, h - 1))
                w = min(w, w_img - x)
                h = min(h, h - y)
                
                if w <= 0 or h <= 0:
                    continue
                
                # Extract face region
                face_img = img[y:y+h, x:x+w]
                
                # Always extract embedding, just add warning if quality is low
                emb = self.extract_enhanced_face_features(face_img, quality)
                
                # If embedding extraction failed, try with basic features
                if emb is None or len(emb) == 0:
                    print(f"[DEBUG] Enhanced feature extraction failed, using basic features", file=sys.stderr)
                    emb = self.extract_basic_robust_features(face_img)
                
                # Ensure we have an embedding
                if emb is None or len(emb) == 0:
                    print(f"[DEBUG] Failed to extract any features, using placeholder", file=sys.stderr)
                    # Use placeholder embedding (all zeros) as last resort
                    emb = [0.0] * 128
                
                embeddings.append({
                    'face_id': face['face_id'],
                    'embedding': emb,
                    'region': {'x': x, 'y': y, 'w': w, 'h': h},
                    'quality': quality,
                    'overall': overall,
                    'sharpness': sharpness,
                    'quality_warning': quality < 0.1 or overall < 0.1
                })
            
            print(f"[DEBUG] Successfully extracted {len(embeddings)} embeddings", file=sys.stderr)
            
            return {
                'success': True,
                'face_count': len(embeddings),
                'embeddings': embeddings,
                'extraction_info': 'OK' if len(embeddings) > 0 else 'No quality embeddings found'
            }
        except Exception as e:
            print(f"[DEBUG] Embedding extraction error: {str(e)}", file=sys.stderr)
            return {
                'success': False,
                'face_count': 0,
                'embeddings': [],
                'extraction_info': f'Embedding extraction error: {str(e)}'
            }
    
    def select_best_faces_for_embedding(self, detected_faces, gray_img):
        """Always return all faces for embedding, just warn if quality is low"""
        # This function is now a passthrough, just returns all faces
        return detected_faces
    
    def preprocess_face_for_embedding(self, gray_img, x, y, w, h):
        """Enhanced preprocessing pentru face before embedding extraction"""
        try:
            # Extract face region với padding
            padding = max(5, min(w, h) // 10)
            x1 = max(0, x - padding)
            y1 = max(0, y - padding)
            x2 = min(gray_img.shape[1], x + w + padding)
            y2 = min(gray_img.shape[0], y + h + padding)
            
            face_roi = gray_img[y1:y2, x1:x2]
            
            if face_roi.size == 0:
                return None
            
            # Stage 1: Illumination normalization
            normalized_face = self.advanced_illumination_normalization(face_roi)
            
            # Stage 2: Noise reduction
            denoised_face = self.adaptive_noise_reduction(normalized_face)
            
            # Stage 3: Enhancement pentru feature extraction
            enhanced_face = self.enhance_for_feature_extraction(denoised_face)
            
            # Stage 4: Standardize size
            standard_size = (160, 160)  # Larger size for better features
            final_face = resize(enhanced_face, standard_size)
            
            return final_face
            
        except Exception as e:
            print(f"Face preprocessing error: {e}", file=sys.stderr)
            return None
    
    def advanced_illumination_normalization(self, face_img):
        """Advanced illumination normalization"""
        try:
            # Method 1: Homomorphic filtering approach
            face_float = face_img.astype(np.float32) + 1.0  # Add 1 to avoid log(0)
            
            # Log transform
            log_img = np.log(face_float)
            
            # Gaussian blur to estimate illumination
            illumination = GaussianBlur(log_img, (41, 41), 15)
            
            # Remove illumination component
            reflectance = log_img - illumination
            
            # Exponential transform back
            enhanced = np.exp(reflectance)
            
            # Normalize to 0-255 range
            enhanced = np.clip(enhanced, 0, 255)
            
            # Method 2: CLAHE (Contrast Limited Adaptive Histogram Equalization)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            clahe_img = clahe.apply(face_img)
            
            # Combine both methods
            combined = (enhanced.astype(np.uint8) * 0.6) + (clahe_img * 0.4)
            
            return np.clip(combined, 0, 255).astype(np.uint8)
            
        except Exception as e:
            print(f"Illumination normalization error: {e}", file=sys.stderr)
            return face_img
    
    def adaptive_noise_reduction(self, face_img):
        """Adaptive noise reduction preserving facial features"""
        try:
            # Bilateral filter to reduce noise while preserving edges
            bilateral = cv2.bilateralFilter(face_img, 9, 75, 75)
            
            # Non-local means denoising
            nlm_denoised = cv2.fastNlMeansDenoising(face_img, None, 10, 7, 21)
            
            # Combine results
            combined = (bilateral * 0.7) + (nlm_denoised * 0.3)
            
            return np.clip(combined, 0, 255).astype(np.uint8)
            
        except Exception as e:
            print(f"Noise reduction error: {e}", file=sys.stderr)
            # Fallback to simple Gaussian blur
            return GaussianBlur(face_img, (3, 3), 1.0)
    
    def enhance_for_feature_extraction(self, face_img):
        """Enhance image specifically for feature extraction"""
        try:
            # Unsharp masking to enhance details
            gaussian = GaussianBlur(face_img, (0, 0), 2.0)
            unsharp_mask = cv2.addWeighted(face_img, 1.5, gaussian, -0.5, 0)
            
            # Adaptive histogram equalization in patches
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4))
            equalized = clahe.apply(unsharp_mask)
            
            # Combine original and enhanced
            final = cv2.addWeighted(face_img, 0.4, equalized, 0.6, 0)
            
            return np.clip(final, 0, 255).astype(np.uint8)
            
        except Exception as e:
            print(f"Enhancement error: {e}", file=sys.stderr)
            return face_img
    
    def extract_enhanced_face_features(self, face_img, quality_score):
        """Extract enhanced face features với quality-aware weighting"""
        try:
            # Use enhanced multi-scale feature extraction
            features = self.extract_multi_scale_features(face_img)
            
            # Quality-aware feature weighting
            quality_weight = min(1.0, max(0.5, quality_score))
            
            # Apply quality weighting to features
            weighted_features = [f * quality_weight for f in features]
            
            # Add quality-specific features
            quality_features = self.extract_quality_aware_features(face_img, quality_score)
            weighted_features.extend(quality_features)
            
            # Final normalization
            final_features = self.normalize_feature_vector(weighted_features)
            
            return final_features
            
        except Exception as e:
            print(f"Enhanced feature extraction error: {e}", file=sys.stderr)
            # Fallback to basic features
            return self.normalize_feature_vector([0.0] * 2048)
    
    def extract_quality_aware_features(self, face_img, quality_score):
        """Extract additional features based on image quality"""
        features = []
        
        try:
            h, w = face_img.shape[:2]
            
            # Quality-dependent feature extraction
            if quality_score > 0.7:
                # High quality - extract fine details
                # Detailed texture analysis
                for window_size in [3, 5, 7]:
                    texture_features = self.extract_texture_window_features(face_img, window_size)
                    features.extend(texture_features)
                
                # High-frequency analysis
                hf_features = self.extract_high_frequency_features(face_img)
                features.extend(hf_features)
                
            elif quality_score > 0.4:
                # Medium quality - extract robust features
                # Focus on major structures
                structure_features = self.extract_structural_features(face_img)
                features.extend(structure_features)
                
                # Medium-frequency analysis
                mf_features = self.extract_medium_frequency_features(face_img)
                features.extend(mf_features)
                
            else:
                # Low quality - extract very robust features
                # Basic shape and intensity features
                basic_features = self.extract_basic_robust_features(face_img)
                features.extend(basic_features)
            
            # Pad to consistent length
            target_length = 256
            if len(features) < target_length:
                features.extend([0.0] * (target_length - len(features)))
            elif len(features) > target_length:
                features = features[:target_length]
            
        except Exception as e:
            print(f"Quality-aware feature extraction error: {e}", file=sys.stderr)
            features = [0.0] * 256
        
        return features
    
    def extract_texture_window_features(self, face_img, window_size):
        """Extract texture features using sliding windows"""
        features = []
        
        try:
            h, w = face_img.shape[:2]
            step = window_size // 2
            
            for y in range(0, h - window_size, step):
                for x in range(0, w - window_size, step):
                    window = face_img[y:y+window_size, x:x+window_size]
                    
                    # Window statistics
                    window_mean = np.mean(window)
                    window_std = np.std(window)
                    window_entropy = self.calculate_entropy(window)
                    
                    features.extend([window_mean / 255.0, window_std / 128.0, window_entropy])
        
        except Exception as e:
            print(f"Texture window extraction error: {e}", file=sys.stderr)
        
        return features[:50]  # Limit features
    
    def calculate_entropy(self, img_patch):
        """Calculate entropy of image patch"""
        try:
            hist = np.histogram(img_patch, bins=32, range=(0, 256))[0]
            hist = hist / np.sum(hist)  # Normalize
            entropy = -np.sum(hist * np.log2(hist + 1e-10))  # Add small epsilon
            return entropy / 5.0  # Normalize to ~[0,1]
        except:
            return 0.0
    
    def extract_high_frequency_features(self, face_img):
        """Extract high-frequency features for high-quality images"""
        features = []
        
        try:
            # High-pass filters
            kernels = [
                np.array([[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]]),  # Laplacian
                np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]),       # Sobel X
                np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]]),       # Sobel Y
            ]
            
            for kernel in kernels:
                filtered = cv2.filter2D(face_img.astype(np.float32), -1, kernel.astype(np.float32))
                features.extend([
                    np.mean(np.abs(filtered)) / 255.0,
                    np.std(filtered) / 128.0,
                    np.percentile(np.abs(filtered), 95) / 255.0
                ])
        
        except Exception as e:
            print(f"High-frequency feature extraction error: {e}", file=sys.stderr)
        
        return features[:20]
    
    def extract_medium_frequency_features(self, face_img):
        """Extract medium-frequency features for medium-quality images"""
        features = []
        
        try:
            # Gaussian filters at different scales
            for sigma in [1.0, 2.0, 4.0]:
                blurred = GaussianBlur(face_img, (0, 0), sigma)
                diff = face_img.astype(np.float32) - blurred.astype(np.float32)
                
                features.extend([
                    np.mean(np.abs(diff)) / 255.0,
                    np.std(diff) / 128.0
                ])
        
        except Exception as e:
            print(f"Medium-frequency feature extraction error: {e}", file=sys.stderr)
        
        return features[:15]
    
    def extract_basic_robust_features(self, face_img):
        """Extract basic robust features for low-quality images"""
        features = []
        
        try:
            h, w = face_img.shape[:2]
            
            # Basic statistics
            features.extend([
                np.mean(face_img) / 255.0,
                np.std(face_img) / 128.0,
                np.median(face_img) / 255.0,
                np.percentile(face_img, 25) / 255.0,
                np.percentile(face_img, 75) / 255.0
            ])
            
            # Regional means (divide into 9 regions)
            for i in range(3):
                for j in range(3):
                    y1, y2 = i * h // 3, (i + 1) * h // 3
                    x1, x2 = j * w // 3, (j + 1) * w // 3
                    region = face_img[y1:y2, x1:x2]
                    if region.size > 0:
                        features.append(np.mean(region) / 255.0)
        
        except Exception as e:
            print(f"Basic feature extraction error: {e}", file=sys.stderr)
        
        return features[:20]
    
    def extract_structural_features(self, face_img):
        """Extract structural features for medium-quality images"""
        features = []
        
        try:
            # Edge-based structural analysis
            edges = Canny(face_img, 50, 150)
            
            # Edge density in different regions
            h, w = face_img.shape[:2]
            regions = [
                edges[:h//2, :],        # Top half
                edges[h//2:, :],        # Bottom half
                edges[:, :w//2],        # Left half
                edges[:, w//2:],        # Right half
                edges[h//4:3*h//4, w//4:3*w//4]  # Center region
            ]
            
            for region in regions:
                if region.size > 0:
                    edge_density = np.sum(region > 0) / region.size
                    features.append(edge_density)
        
        except Exception as e:
            print(f"Structural feature extraction error: {e}", file=sys.stderr)
        
        return features[:10]
    
    def validate_embedding_quality(self, embedding, face_img):
        """Validate quality of extracted embedding"""
        try:
            if not embedding or len(embedding) == 0:
                return 0.0
            
            # Check for all-zero or all-same values
            unique_values = len(set(embedding))
            if unique_values < 10:  # Too few unique values
                return 0.1
            
            # Check for reasonable variance
            embedding_var = np.var(embedding)
            if embedding_var < 1e-6:  # Too low variance
                return 0.2
            
            # Check for extreme values
            max_val = max(abs(x) for x in embedding)
            if max_val > 100:  # Unreasonably large values
                return 0.3
            
            # Check feature distribution
            embedding_std = np.std(embedding)
            embedding_mean = np.mean(embedding)
            
            # Good embeddings should have reasonable distribution
            quality_score = 0.5
            
            # Bonus for good variance
            if 0.1 < embedding_var < 10:
                quality_score += 0.2
            
            # Bonus for good standard deviation
            if 0.5 < embedding_std < 5:
                quality_score += 0.15
            
            # Bonus for reasonable mean
            if abs(embedding_mean) < 2:
                quality_score += 0.1
            
            # Bonus for good uniqueness
            if unique_values > len(embedding) * 0.8:
                quality_score += 0.05
            
            return min(1.0, max(0.0, quality_score))
            
        except Exception as e:
            print(f"Embedding validation error: {e}", file=sys.stderr)
            return 0.3  # Default medium quality
    
    def extract_multi_scale_features(self, face_roi):
        """Extract multiple types of features from face region with improved normalization"""
        features = []
        
        try:
            # Normalize face size với improved preprocessing
            standard_size = (128, 128)
            
            # Preprocessing pipeline for better feature extraction
            face_preprocessed = self.preprocess_face_for_features(face_roi)
            face_normalized = resize(face_preprocessed, standard_size)
            
            # 1. Enhanced multi-scale histogram features with normalization
            hist_features = self.extract_enhanced_histograms(face_normalized)
            features.extend(hist_features)
            
            # 2. Normalized HOG features
            hog_features = self.extract_normalized_hog_features(face_normalized)
            features.extend(hog_features)
            
            # 3. Robust LBP features với uniform patterns
            lbp_features = self.extract_robust_lbp_features(face_normalized)
            features.extend(lbp_features)
            
            # 4. Enhanced geometric features
            geo_features = self.extract_enhanced_geometric_features(face_normalized)
            features.extend(geo_features)
            
            # 5. Advanced texture and gradient features  
            texture_features = self.extract_advanced_texture_features(face_normalized)
            features.extend(texture_features)
            
            # 6. NEW: Deep-inspired features (mimicking CNN-style features)
            deep_features = self.extract_deep_inspired_features(face_normalized)
            features.extend(deep_features)
            
            # Normalize entire feature vector để consistent comparison
            features = self.normalize_feature_vector(features)
            
            print(f"Extracted enhanced features: Hist={len(hist_features)}, HOG={len(hog_features)}, LBP={len(lbp_features)}, Geo={len(geo_features)}, Texture={len(texture_features)}, Deep={len(deep_features)}, Total={len(features)}", file=sys.stderr)
            
        except Exception as e:
            print(f"Enhanced feature extraction error: {e}", file=sys.stderr)
            # Return normalized dummy features if extraction fails
            features = [0.0] * 2048  # Increased feature size
            features = self.normalize_feature_vector(features)
        
        return features
    
    def preprocess_face_for_features(self, face_roi):
        """Preprocessing pipeline để improve feature quality"""
        try:
            # 1. Histogram equalization để cải thiện contrast
            enhanced = equalizeHist(face_roi)
            
            # 2. Gaussian blur to reduce noise nhưng preserve main features
            enhanced = GaussianBlur(enhanced, (3, 3), 0.5)
            
            # 3. Normalize illumination using homomorphic filtering approach
            enhanced = self.normalize_illumination(enhanced)
            
            return enhanced
        except:
            return face_roi
    
    def normalize_illumination(self, img):
        """Normalize illumination using log transform"""
        try:
            # Add small epsilon to avoid log(0)
            epsilon = 1e-7
            img_float = img.astype(np.float32) + epsilon
            
            # Log transform
            log_img = np.log(img_float)
            
            # Gaussian blur để estimate illumination
            illumination = GaussianBlur(log_img, (101, 101), 20)
            
            # Remove illumination component
            reflectance = log_img - illumination
            
            # Exponentiate back
            result = np.exp(reflectance)
            
            # Normalize to 0-255 range
            result = np.clip(result * 255 / np.max(result), 0, 255).astype(uint8)
            
            return result
        except:
            return img
    
    def extract_enhanced_histograms(self, face_img):
        """Enhanced histogram features với better normalization"""
        features = []
        
        try:
            h, w = face_img.shape[:2]
            
            # 1. Full image histogram với multiple bin sizes
            for bins in [32, 64, 128]:
                hist_full = calcHist([face_img], [0], None, [bins], [0, 256])
                # L2 normalize histogram
                hist_normalized = hist_full / (np.linalg.norm(hist_full) + 1e-7)
                features.extend(hist_normalized.flatten().tolist())
            
            # 2. Multi-region histograms (9 regions: 3x3 grid)
            region_h, region_w = h // 3, w // 3
            for i in range(3):
                for j in range(3):
                    y1, y2 = i * region_h, (i + 1) * region_h
                    x1, x2 = j * region_w, (j + 1) * region_w
                    region = face_img[y1:y2, x1:x2]
                    
                    if region.size > 0:
                        hist_region = calcHist([region], [0], None, [32], [0, 256])
                        hist_normalized = hist_region / (np.linalg.norm(hist_region) + 1e-7)
                        features.extend(hist_normalized.flatten().tolist())
            
            # 3. Concentric region histograms (center vs periphery)
            center_mask = np.zeros((h, w), dtype=uint8)
            cv2.ellipse(center_mask, (w//2, h//2), (w//4, h//3), 0, 0, 360, 255, -1)
            
            # Center histogram
            hist_center = calcHist([face_img], [0], [center_mask], [64], [0, 256])
            hist_center_norm = hist_center / (np.linalg.norm(hist_center) + 1e-7)
            features.extend(hist_center_norm.flatten().tolist())
            
            # Periphery histogram (inverted mask)
            periphery_mask = 255 - center_mask
            hist_periphery = calcHist([face_img], [0], [periphery_mask], [64], [0, 256])
            hist_periphery_norm = hist_periphery / (np.linalg.norm(hist_periphery) + 1e-7)
            features.extend(hist_periphery_norm.flatten().tolist())
            
        except Exception as e:
            print(f"Enhanced histogram error: {e}", file=sys.stderr)
        
        return features
    
    def extract_normalized_hog_features(self, face_img):
        """Normalized HOG features với multiple scales"""
        features = []
        
        try:
            # Multiple HOG configurations để capture features ở different scales
            configs = [
                {'win_size': (64, 64), 'cell_size': (8, 8), 'block_size': (16, 16)},
                {'win_size': (128, 128), 'cell_size': (16, 16), 'block_size': (32, 32)},
            ]
            
            for config in configs:
                try:
                    win_size = config['win_size']
                    cell_size = config['cell_size']
                    block_size = config['block_size']
                    block_stride = (cell_size[0], cell_size[1])
                    
                    # Resize face to window size
                    face_resized = resize(face_img, win_size)
                    
                    # Create HOG descriptor
                    hog = HOGDescriptor(win_size, block_size, block_stride, cell_size, 9)
                    
                    # Compute HOG features
                    hog_features = hog.compute(face_resized)
                    
                    # L2 normalize HOG features
                    hog_normalized = hog_features / (np.linalg.norm(hog_features) + 1e-7)
                    features.extend(hog_normalized.flatten().tolist())
                    
                except Exception as config_error:
                    print(f"HOG config error: {config_error}", file=sys.stderr)
                    continue
                    
        except Exception as e:
            print(f"Normalized HOG extraction error: {e}", file=sys.stderr)
        
        return features
    
    def extract_robust_lbp_features(self, face_img):
        """Robust LBP features với uniform patterns"""
        features = []
        
        try:
            h, w = face_img.shape[:2]
            
            # Multiple LBP configurations
            lbp_configs = [
                {'radius': 1, 'points': 8},
                {'radius': 2, 'points': 16},
                {'radius': 3, 'points': 24}
            ]
            
            for config in lbp_configs:
                radius = config['radius']
                n_points = config['points']
                
                # Simple LBP implementation
                lbp_image = zeros((h, w), dtype=uint8)
                
                for i in range(radius, h - radius):
                    for j in range(radius, w - radius):
                        center = face_img[i, j]
                        code = 0
                        
                        # Sample points trong circle
                        for p in range(n_points):
                            angle = 2 * math.pi * p / n_points
                            x = int(j + radius * math.cos(angle))
                            y = int(i + radius * math.sin(angle))
                            
                            if 0 <= x < w and 0 <= y < h:
                                if face_img[y, x] >= center:
                                    code |= (1 << p)
                        
                        lbp_image[i, j] = code
                
                # Calculate LBP histogram với normalization
                max_val = 2 ** n_points
                hist_lbp = calcHist([lbp_image], [0], None, [max_val], [0, max_val])
                hist_lbp_norm = hist_lbp / (np.linalg.norm(hist_lbp) + 1e-7)
                features.extend(hist_lbp_norm.flatten().tolist())
            
        except Exception as e:
            print(f"Robust LBP extraction error: {e}", file=sys.stderr)
        
        return features
    
    def extract_enhanced_geometric_features(self, face_img):
        """Enhanced geometric features"""
        features = []
        
        try:
            h, w = face_img.shape[:2]
            
            # Basic proportions
            aspect_ratio = w / h if h > 0 else 1.0
            features.append(aspect_ratio)
            
            # Enhanced symmetry analysis
            left_half = face_img[:, :w//2]
            right_half = cv2.flip(face_img[:, w//2:], 1)
            
            if left_half.shape == right_half.shape:
                # Multiple symmetry metrics
                correlation = cv2.matchTemplate(left_half, right_half, cv2.TM_CCOEFF_NORMED)
                symmetry_score = correlation[0, 0] if correlation.size > 0 else 0
                features.append(symmetry_score)
                
                # Mean square error symmetry
                mse_symmetry = np.mean((left_half.astype(float) - right_half.astype(float)) ** 2)
                mse_symmetry_norm = 1.0 / (1.0 + mse_symmetry / 1000.0)
                features.append(mse_symmetry_norm)
            else:
                features.extend([0.0, 0.0])
            
            # Edge analysis trong different regions
            edges = Canny(face_img, 50, 150)
            total_pixels = h * w
            
            # Improved region analysis
            regions = [
                edges[:h//3, :],          # Top (forehead)
                edges[h//3:2*h//3, :],    # Middle (eyes, nose)
                edges[2*h//3:, :],        # Bottom (mouth, chin)
                edges[:, :w//3],          # Left side
                edges[:, w//3:2*w//3],    # Center vertical
                edges[:, 2*w//3:],        # Right side
            ]
            
            for region in regions:
                if region.size > 0:
                    edge_density = np.sum(region > 0) / total_pixels
                    features.append(edge_density)
                else:
                    features.append(0.0)
            
            # Centroid analysis
            moments = cv2.moments(edges)
            if moments['m00'] != 0:
                cx = moments['m10'] / moments['m00'] / w  # Normalized centroid x
                cy = moments['m01'] / moments['m00'] / h  # Normalized centroid y
                features.extend([cx, cy])
            else:
                features.extend([0.5, 0.5])  # Center default
                
        except Exception as e:
            print(f"Enhanced geometric feature extraction error: {e}", file=sys.stderr)
            features = [1.0] + [0.0] * 10  # Default values
        
        return features
    
    def extract_advanced_texture_features(self, face_img):
        """Advanced texture and gradient features"""
        features = []
        
        try:
            # Enhanced gradient analysis
            grad_x = Sobel(face_img, CV_64F, 1, 0, ksize=3)
            grad_y = Sobel(face_img, CV_64F, 0, 1, ksize=3)
            
            # Gradient magnitude và direction
            magnitude = np.sqrt(grad_x**2 + grad_y**2)
            direction = np.arctan2(grad_y, grad_x)
            
            # Enhanced gradient statistics
            features.extend([
                np.mean(magnitude),
                np.std(magnitude),
                np.percentile(magnitude, 25),
                np.percentile(magnitude, 75),
                np.mean(direction),
                np.std(direction)
            ])
            
            # Laplacian features với multiple scales
            for kernel_size in [3, 5, 7]:
                laplacian = Laplacian(face_img, CV_64F, ksize=kernel_size)
                features.extend([
                    np.mean(laplacian),
                    np.std(laplacian),
                    var(laplacian)
                ])
            
            # Gabor-like responses (simplified)
            gabor_responses = self.compute_gabor_responses(face_img)
            features.extend(gabor_responses)
            
        except Exception as e:
            print(f"Advanced texture feature extraction error: {e}", file=sys.stderr)
            features = [0.0] * 20  # Default values
        
        return features
    
    def compute_gabor_responses(self, face_img):
        """Simplified Gabor filter responses"""
        responses = []
        
        try:
            # Create simple directional filters
            orientations = [0, 45, 90, 135]  # degrees
            
            for angle in orientations:
                # Create a simple directional filter kernel
                kernel_size = 15
                kernel = np.zeros((kernel_size, kernel_size), dtype=np.float32)
                
                # Simple line filter in given direction
                center = kernel_size // 2
                if angle == 0:  # Horizontal
                    kernel[center, :] = 1.0
                elif angle == 90:  # Vertical
                    kernel[:, center] = 1.0
                elif angle == 45:  # Diagonal
                    for i in range(kernel_size):
                        if 0 <= center + i - center < kernel_size:
                            kernel[i, center + i - center] = 1.0
                elif angle == 135:  # Anti-diagonal
                    for i in range(kernel_size):
                        if 0 <= center - i + center < kernel_size:
                            kernel[i, center - i + center] = 1.0
                
                # Normalize kernel
                kernel = kernel / np.sum(np.abs(kernel)) if np.sum(np.abs(kernel)) > 0 else kernel
                
                # Apply filter
                response = cv2.filter2D(face_img.astype(np.float32), -1, kernel)
                
                # Statistics of response
                responses.extend([
                    np.mean(response),
                    np.std(response),
                    np.max(response) - np.min(response)
                ])
                
        except Exception as e:
            print(f"Gabor response error: {e}", file=sys.stderr)
            responses = [0.0] * 12
        
        return responses
    
    def extract_deep_inspired_features(self, face_img):
        """Deep learning inspired features using traditional CV"""
        features = []
        
        try:
            # Multi-scale analysis (mimicking CNN layers)
            scales = [face_img]
            
            # Create pyramid
            current = face_img.copy()
            for _ in range(3):
                current = cv2.pyrDown(current)
                if current.shape[0] >= 8 and current.shape[1] >= 8:
                    scales.append(current)
            
            # Extract features từ each scale
            for scale_idx, scale_img in enumerate(scales):
                # Convolution-like operations
                kernels = [
                    np.array([[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]]),  # Edge detection
                    np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]),       # Vertical edge
                    np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]]),       # Horizontal edge
                    np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]]),      # Sharpening
                ]
                
                for kernel in kernels:
                    response = cv2.filter2D(scale_img.astype(np.float32), -1, kernel.astype(np.float32))
                    
                    # "Activation" function (ReLU-like)
                    activated = np.maximum(0, response)
                    
                    # "Pooling" operation
                    pooled_mean = np.mean(activated)
                    pooled_max = np.max(activated)
                    
                    features.extend([pooled_mean, pooled_max])
            
            # Global average pooling equivalent
            global_features = [
                np.mean(face_img),
                np.std(face_img),
                np.median(face_img),
                np.percentile(face_img, 25),
                np.percentile(face_img, 75)
            ]
            features.extend(global_features)
            
        except Exception as e:
            print(f"Deep-inspired feature extraction error: {e}", file=sys.stderr)
            features = [0.0] * 40
        
        return features
    
    def normalize_feature_vector(self, features):
        """Normalize entire feature vector for consistent comparison"""
        try:
            features_array = np.array(features, dtype=np.float32)
            
            # Handle NaN và inf values
            features_array = np.nan_to_num(features_array, nan=0.0, posinf=1.0, neginf=-1.0)
            
            # L2 normalization
            norm = np.linalg.norm(features_array)
            if norm > 1e-12:
                features_array = features_array / norm
            
            # Additional scaling to prevent numerical issues
            features_array = np.clip(features_array, -10.0, 10.0)
            
            return features_array.tolist()
            
        except Exception as e:
            print(f"Feature normalization error: {e}", file=sys.stderr)
            return [0.0] * len(features)
    
    def compare_faces_advanced(self, embedding1: list, embedding2: list) -> dict:
        """Advanced face comparison using multiple similarity metrics with cross-validation"""
        try:
            if not embedding1 or not embedding2:
                return {
                    'success': False,
                    'error': 'Invalid embeddings provided',
                    'similarity': 0.0,
                    'distance': 1.0,
                    'confidence': 0.0
                }
            
            # Ensure embeddings have same length
            min_len = min(len(embedding1), len(embedding2))
            emb1 = np.array(embedding1[:min_len])
            emb2 = np.array(embedding2[:min_len])
            
            # CROSS-VALIDATION: Split embeddings and test consistency with stricter checks
            cross_validation_result = self.cross_validate_similarity(emb1, emb2)
            
            if not cross_validation_result['is_consistent']:
                print(f"Cross-validation FAILED: {cross_validation_result['reason']}", file=sys.stderr)
                return {
                    'success': True,
                    'similarity': 0.0,
                    'distance': 1.0,
                    'confidence': 0.0,
                    'cross_validation': cross_validation_result
                }
            
            # Enhanced similarity metrics with robust computation
            similarities = []
            
            # 1. Cosine similarity with multiple normalizations
            cosine_sim = self.robust_cosine_similarity(emb1, emb2)
            similarities.append(('cosine', cosine_sim, 0.35))  
            
            # 2. Pearson correlation with outlier handling
            pearson_sim = self.robust_pearson_correlation(emb1, emb2)
            similarities.append(('pearson', pearson_sim, 0.2))
            
            # 3. Euclidean similarity with adaptive scaling
            euclidean_sim = self.adaptive_euclidean_similarity(emb1, emb2)
            similarities.append(('euclidean', euclidean_sim, 0.2))
            
            # 4. Manhattan similarity with outlier rejection
            manhattan_sim = self.robust_manhattan_similarity(emb1, emb2)
            similarities.append(('manhattan', manhattan_sim, 0.1))
            
            # 5. Chi-square similarity for histogram features
            chi_square_sim = self.robust_chi_square_similarity(emb1, emb2)
            similarities.append(('chi_square', chi_square_sim, 0.1))
            
            # 6. Structural similarity (inspired by SSIM)
            structural_sim = self.structural_similarity(emb1, emb2)
            similarities.append(('structural', structural_sim, 0.05))
            
            # ADAPTIVE weighted ensemble based on feature quality
            total_weight = sum(weight for _, _, weight in similarities)
            weighted_similarity = sum(sim * weight for _, sim, weight in similarities) / total_weight
            
            # ENHANCED confidence calculation with outlier detection
            confidence = self.calculate_enhanced_confidence(similarities, cross_validation_result)
            
            # ADAPTIVE thresholds based on embedding characteristics
            adaptive_adjustments = self.calculate_adaptive_adjustments(emb1, emb2)
            
            # Apply adaptive adjustments
            final_similarity = weighted_similarity * adaptive_adjustments['similarity_boost']
            final_confidence = confidence * adaptive_adjustments['confidence_boost']
            
            # STRICTER quality gates with higher adaptive thresholds
            quality_threshold = 0.42 + adaptive_adjustments['threshold_adjustment']  # Increased from 0.3
            if final_similarity < quality_threshold:
                final_similarity = 0.0
                final_confidence = 0.0
            
            distance = 1.0 - final_similarity
            
            print(f"Advanced similarity metrics: {[(name, sim) for name, sim, _ in similarities]}", file=sys.stderr)
            print(f"Weighted: {weighted_similarity:.3f}, Confidence: {confidence:.3f}, Final: {final_similarity:.3f}", file=sys.stderr)
            print(f"Adaptive adjustments: {adaptive_adjustments}", file=sys.stderr)
            
            return {
                'success': True,
                'similarity': float(max(0.0, min(1.0, final_similarity))),
                'distance': float(distance),
                'confidence': float(max(0.0, min(1.0, final_confidence))),
                'detailed_similarities': {name: float(sim) for name, sim, _ in similarities},
                'cross_validation': cross_validation_result,
                'adaptive_adjustments': adaptive_adjustments
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Advanced comparison error: {str(e)}",
                'similarity': 0.0,
                'distance': 1.0,
                'confidence': 0.0
            }
    
    def cross_validate_similarity(self, emb1, emb2):
        """Cross-validation to test consistency of similarity with stricter validation"""
        try:
            # Split embeddings into multiple segments to test consistency
            segments = 5  # Increased from 4 to 5 for more robust validation
            segment_size = len(emb1) // segments
            
            if segment_size < 10:  # Too small to split reliably
                return {
                    'is_consistent': True,
                    'reason': 'Embeddings too small for cross-validation',
                    'variance': 0.0,
                    'segment_similarities': []
                }
            
            segment_similarities = []
            
            for i in range(segments):
                start_idx = i * segment_size
                end_idx = (i + 1) * segment_size if i < segments - 1 else len(emb1)
                
                seg1 = emb1[start_idx:end_idx]
                seg2 = emb2[start_idx:end_idx]
                
                # Calculate simple cosine similarity for each segment
                seg_sim = self.cosine_similarity(seg1, seg2)
                segment_similarities.append(seg_sim)
            
            # Check consistency across segments
            mean_sim = np.mean(segment_similarities)
            std_sim = np.std(segment_similarities)
            variance = std_sim / (mean_sim + 1e-7)  # Coefficient of variation
            
            # Additional validation: check if any segment has dramatically different similarity
            min_sim = min(segment_similarities)
            max_sim = max(segment_similarities)
            range_sim = max_sim - min_sim
            
            # Stricter consistency criteria
            is_consistent = True
            reason = "Consistent across segments"
            
            # STRICTER consistency checks
            if variance > 0.6:  # Reduced from 0.8 - Lower variance threshold for inconsistency
                is_consistent = False
                reason = f"High variance across segments: {variance:.3f}"
            elif std_sim > 0.25:  # Reduced from 0.3 - Lower standard deviation threshold
                is_consistent = False
                reason = f"High standard deviation: {std_sim:.3f}"
            elif range_sim > 0.4:  # Reduced from 0.5 - Lower acceptable range
                is_consistent = False
                reason = f"Large similarity range: {range_sim:.3f}"
            elif mean_sim < 0.3:  # New check - Reject overall low similarity
                is_consistent = False
                reason = f"Overall low mean similarity: {mean_sim:.3f}"
            
            # Check if minimum similarity is too low compared to mean
            if is_consistent and min_sim < mean_sim * 0.7:  # New check - Ensure no segment is dramatically worse
                is_consistent = False
                reason = f"Outlier segment with low similarity: {min_sim:.3f} vs mean {mean_sim:.3f}"
            
            return {
                'is_consistent': is_consistent,
                'reason': reason,
                'variance': float(variance),
                'segment_similarities': [float(s) for s in segment_similarities],
                'mean_similarity': float(mean_sim),
                'std_similarity': float(std_sim)
            }
            
        except Exception as e:
            return {
                'is_consistent': False,
                'reason': f"Cross-validation error: {str(e)}",
                'variance': 1.0,
                'segment_similarities': []
            }
    
    def robust_cosine_similarity(self, a, b):
        """Robust cosine similarity với outlier handling"""
        try:
            # Remove outliers before calculation
            a_clean, b_clean = self.remove_embedding_outliers(a, b)
            
            dot_product = dot(a_clean, b_clean)
            norm_a = linalg.norm(a_clean)
            norm_b = linalg.norm(b_clean)
            
            if norm_a == 0 or norm_b == 0:
                return 0.0
            
            similarity = dot_product / (norm_a * norm_b)
            
            # Enhanced normalization với smoother transition
            normalized_sim = (similarity + 1) / 2
            
            # Apply sigmoid-like smoothing để reduce extreme values
            smoothed_sim = 1 / (1 + np.exp(-10 * (normalized_sim - 0.5)))
            
            return max(0.0, min(1.0, smoothed_sim))
        except:
            return 0.0
    
    def remove_embedding_outliers(self, a, b, threshold=3):
        """Remove outliers từ embeddings using z-score"""
        try:
            # Calculate z-scores
            a_mean, a_std = np.mean(a), np.std(a)
            b_mean, b_std = np.mean(b), np.std(b)
            
            if a_std == 0 or b_std == 0:
                return a, b
            
            a_z_scores = np.abs((a - a_mean) / a_std)
            b_z_scores = np.abs((b - b_mean) / b_std)
            
            # Keep only values within threshold standard deviations
            mask = (a_z_scores < threshold) & (b_z_scores < threshold)
            
            if np.sum(mask) < len(a) * 0.5:  # Too many outliers, keep original
                return a, b
            
            return a[mask], b[mask]
        except:
            return a, b
    
    def robust_pearson_correlation(self, a, b):
        """Robust Pearson correlation với outlier handling"""
        try:
            if len(a) < 3 or len(b) < 3:
                return 0.0
            
            # Remove outliers
            a_clean, b_clean = self.remove_embedding_outliers(a, b)
            
            if len(a_clean) < 3:
                return 0.0
            
            correlation = np.corrcoef(a_clean, b_clean)[0, 1]
            if np.isnan(correlation):
                return 0.0
            
            # Robust normalization
            normalized = (correlation + 1) / 2
            return max(0.0, min(1.0, normalized))
        except:
            return 0.0
    
    def adaptive_euclidean_similarity(self, a, b):
        """Adaptive Euclidean similarity với scaling"""
        try:
            # Adaptive scaling dựa trên embedding characteristics
            feature_variance = (np.var(a) + np.var(b)) / 2
            scale_factor = 1.0 / (1.0 + feature_variance * 0.1)
            
            distance = np.sqrt(np.sum((a - b) ** 2))
            
            # Adaptive max distance calculation
            norm_a, norm_b = np.linalg.norm(a), np.linalg.norm(b)
            max_distance = norm_a + norm_b
            
            if max_distance == 0:
                return 1.0
            
            # Apply adaptive scaling
            scaled_distance = distance * scale_factor
            scaled_max = max_distance * scale_factor
            
            similarity = 1.0 - (scaled_distance / scaled_max)
            return max(0.0, min(1.0, similarity))
        except:
            return 0.0
    
    def robust_manhattan_similarity(self, a, b):
        """Robust Manhattan similarity với outlier rejection"""
        try:
            # Remove outliers
            a_clean, b_clean = self.remove_embedding_outliers(a, b)
            
            distance = np.sum(np.abs(a_clean - b_clean))
            max_distance = np.sum(np.abs(a_clean)) + np.sum(np.abs(b_clean))
            
            if max_distance == 0:
                return 1.0
            
            similarity = 1.0 - (distance / max_distance)
            return max(0.0, min(1.0, similarity))
        except:
            return 0.0
    
    def robust_chi_square_similarity(self, a, b):
        """Robust Chi-square similarity with better handling"""
        try:
            # Ensure positive values for chi-square
            epsilon = 1e-10
            a_pos = np.maximum(np.abs(a), epsilon)
            b_pos = np.maximum(np.abs(b), epsilon)
            
            # Remove extreme outliers before chi-square calculation
            a_clean, b_clean = self.remove_embedding_outliers(a_pos, b_pos, threshold=2)
            
            chi_square = np.sum(((a_clean - b_clean) ** 2) / (a_clean + b_clean))
            
            # Adaptive normalization
            similarity = 1.0 / (1.0 + chi_square / (len(a_clean) * 0.5))
            return max(0.0, min(1.0, similarity))
        except:
            return 0.0
    
    def structural_similarity(self, a, b):
        """Structural similarity inspired by SSIM"""
        try:
            # Constants for stability
            C1, C2, C3 = 1e-4, 1e-4, 1e-4
            
            # Mean values
            mu_a, mu_b = np.mean(a), np.mean(b)
            
            # Variances
            var_a, var_b = np.var(a), np.var(b)
            
            # Covariance
            cov_ab = np.mean((a - mu_a) * (b - mu_b))
            
            # SSIM-like formula adapted for 1D embeddings
            luminance = (2 * mu_a * mu_b + C1) / (mu_a**2 + mu_b**2 + C1)
            contrast = (2 * np.sqrt(var_a * var_b) + C2) / (var_a + var_b + C2)
            structure = (cov_ab + C3) / (np.sqrt(var_a * var_b) + C3)
            
            ssim = luminance * contrast * structure
            
            # Normalize to [0, 1]
            normalized_ssim = (ssim + 1) / 2
            return max(0.0, min(1.0, normalized_ssim))
        except:
            return 0.0
    
    def calculate_enhanced_confidence(self, similarities, cross_validation_result):
        """Enhanced confidence calculation với multiple factors"""
        try:
            sim_values = [sim for _, sim, _ in similarities]
            
            if len(sim_values) < 2:
                return 0.5
            
            # Base confidence từ similarity agreement
            mean_sim = np.mean(sim_values)
            std_sim = np.std(sim_values)
            base_confidence = max(0.1, min(1.0, 1.0 - (std_sim * 1.5)))
            
            # Cross-validation confidence boost/penalty
            cv_confidence = 1.0
            if cross_validation_result['is_consistent']:
                cv_confidence = 1.2  # Boost for consistency
            else:
                cv_confidence = 0.3  # Strong penalty for inconsistency
            
            # Agreement confidence (how many metrics agree)
            high_sim_count = sum(1 for sim in sim_values if sim > 0.6)
            agreement_confidence = 0.5 + (high_sim_count / len(sim_values)) * 0.5
            
            # Combined confidence
            final_confidence = base_confidence * cv_confidence * agreement_confidence
            
            # Quality boost for high average similarity
            if mean_sim > 0.75:
                final_confidence *= 1.3
            elif mean_sim > 0.6:
                final_confidence *= 1.1
            elif mean_sim < 0.3:
                final_confidence *= 0.5
            
            return min(1.0, final_confidence)
        except:
            return 0.3
    
    def calculate_adaptive_adjustments(self, emb1, emb2):
        """Calculate adaptive adjustments based on embedding characteristics with enhanced differentiation"""
        try:
            # Feature quality analysis
            var1, var2 = np.var(emb1), np.var(emb2)
            mean_var = (var1 + var2) / 2
            
            # Check for variance difference - different people often have different variance patterns
            var_ratio = min(var1, var2) / (max(var1, var2) + 1e-7)
            
            # Embedding magnitude analysis
            norm1, norm2 = np.linalg.norm(emb1), np.linalg.norm(emb2)
            norm_ratio = min(norm1, norm2) / (max(norm1, norm2) + 1e-7)
            
            # Feature distribution analysis
            skew1 = self.calculate_skewness(emb1)
            skew2 = self.calculate_skewness(emb2)
            skew_diff = abs(skew1 - skew2)
            
            # Feature correlation analysis (new)
            corr_coef = np.corrcoef(emb1, emb2)[0, 1] if len(emb1) == len(emb2) else 0
            
            # Check for consistent differences (new)
            # Different people often have consistent sign differences across embedding dimensions
            sign_diff = np.mean(np.sign(emb1) != np.sign(emb2))
            
            # Calculate adjustments
            similarity_boost = 1.0
            confidence_boost = 1.0
            threshold_adjustment = 0.0
            
            # High variance features might be more distinctive
            if mean_var > 0.5:
                similarity_boost *= 1.05  # Reduced boost from 1.1
                confidence_boost *= 1.05  # Reduced boost from 1.1
            elif mean_var < 0.1:
                similarity_boost *= 0.85  # More aggressive penalty (was 0.9)
            
            # Variance ratio analysis - different people often have different variance patterns
            if var_ratio < 0.7:  # Significant variance difference
                similarity_boost *= 0.9
                threshold_adjustment += 0.05
            
            # Similar norms indicate comparable feature quality
            if norm_ratio > 0.9:  # Increased from 0.8 - stricter requirement for high similarity
                confidence_boost *= 1.1  # Reduced from 1.2
                threshold_adjustment -= 0.03  # Reduced adjustment from -0.05
            elif norm_ratio < 0.7:  # Increased from 0.5 - more sensitive to norm differences
                confidence_boost *= 0.6  # More aggressive penalty (was 0.7)
                threshold_adjustment += 0.1  # Higher threshold for mismatched quality
            
            # Similar distributions indicate good alignment
            if skew_diff < 0.3:  # Reduced from 0.5 - stricter requirement
                similarity_boost *= 1.1
            elif skew_diff > 1.0:  # Reduced from 1.5 - more sensitive to distribution differences
                similarity_boost *= 0.75  # More aggressive penalty (was 0.8)
                threshold_adjustment += 0.05  # New: increase threshold for different distributions
            
            # Correlation coefficient analysis (new)
            if corr_coef > 0.8:
                similarity_boost *= 1.1
                threshold_adjustment -= 0.05
            elif corr_coef < 0.4:
                similarity_boost *= 0.8
                threshold_adjustment += 0.1
            
            # Sign difference analysis (new)
            if sign_diff > 0.4:  # More than 40% of dimensions have different signs
                similarity_boost *= 0.85
                threshold_adjustment += 0.1
            
            # Apply limits to avoid extreme adjustments
            similarity_boost = max(0.6, min(1.3, similarity_boost))
            confidence_boost = max(0.4, min(1.5, confidence_boost))
            threshold_adjustment = max(-0.15, min(0.25, threshold_adjustment))
            
            return {
                'similarity_boost': float(similarity_boost),
                'confidence_boost': float(confidence_boost),
                'threshold_adjustment': float(threshold_adjustment),
                'feature_variance': float(mean_var),
                'variance_ratio': float(var_ratio),
                'norm_ratio': float(norm_ratio),
                'skew_difference': float(skew_diff),
                'correlation': float(corr_coef),
                'sign_difference': float(sign_diff)
            }
            
        except Exception as e:
            print(f"Adaptive adjustment error: {e}", file=sys.stderr)
            return {
                'similarity_boost': 1.0,
                'confidence_boost': 1.0,
                'threshold_adjustment': 0.0,
                'feature_variance': 0.0,
                'variance_ratio': 1.0,
                'norm_ratio': 1.0,
                'skew_difference': 0.0,
                'correlation': 0.0,
                'sign_difference': 0.0
            }
    
    def calculate_skewness(self, data):
        """Calculate skewness of data distribution"""
        try:
            mean_val = np.mean(data)
            std_val = np.std(data)
            
            if std_val == 0:
                return 0.0
            
            skewness = np.mean(((data - mean_val) / std_val) ** 3)
            return skewness
        except:
            return 0.0
    
    # Legacy method aliases for compatibility
    def detect_faces(self, img_path: str) -> dict:
        """Legacy method - calls advanced detection"""
        return self.detect_faces_advanced(img_path)
    
    def extract_embeddings(self, img_path: str) -> dict:
        """Legacy method - calls advanced extraction"""
        return self.extract_advanced_embeddings(img_path)
    
    def compare_faces(self, embedding1: list, embedding2: list) -> dict:
        """Legacy method - calls advanced comparison"""
        return self.compare_faces_advanced(embedding1, embedding2)
    
    def assess_quality(self, img_path: str) -> dict:
        """Legacy method - calls advanced quality assessment"""
        return self.assess_quality_advanced(img_path)

    def assess_quality_advanced(self, img_path: str) -> dict:
        """Advanced image quality assessment với adaptive scoring"""
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
            gray = cvtColor(img, COLOR_BGR2GRAY)
            
            # Enhanced quality metrics với adaptive scoring
            quality_metrics = {}
            
            # 1. Enhanced sharpness detection (multiple methods)
            sharpness_scores = self.calculate_enhanced_sharpness(gray)
            quality_metrics.update(sharpness_scores)
            
            # 2. Multi-scale contrast analysis
            contrast_scores = self.calculate_multi_scale_contrast(gray)
            quality_metrics.update(contrast_scores)
            
            # 3. Illumination quality
            illumination_score = self.assess_illumination_quality(gray)
            quality_metrics['illumination'] = illumination_score
            
            # 4. Noise estimation
            noise_score = self.enhanced_noise_estimation(gray)
            quality_metrics['noise'] = 100 - noise_score
            
            # 5. Face-specific quality metrics
            face_quality_score = self.assess_face_specific_quality(gray)
            quality_metrics['face_quality'] = face_quality_score
            
            # 6. Resolution and detail assessment
            detail_score = self.assess_detail_quality(gray)
            quality_metrics['detail'] = detail_score
            
            # ADAPTIVE weighted scoring dựa trên image characteristics
            weights = self.calculate_adaptive_quality_weights(quality_metrics, gray)
            
            # Overall quality calculation với adaptive weights
            overall_score = sum(quality_metrics[metric] * weights.get(metric, 0) 
                              for metric in quality_metrics if metric in weights)
            
            # Apply adaptive normalization
            normalized_score = self.normalize_quality_score(overall_score, quality_metrics)
            
            return {
                'success': True,
                'quality_score': round(max(0, min(100, normalized_score)), 2),
                'detailed_metrics': {k: round(v, 2) for k, v in quality_metrics.items()},
                'adaptive_weights': {k: round(v, 3) for k, v in weights.items()},
                'image_info': {
                    'width': width,
                    'height': height,
                    'total_pixels': width * height
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Advanced quality assessment error: {str(e)}",
                'quality_score': 0
            }
    
    def calculate_enhanced_sharpness(self, gray_img):
        """Enhanced sharpness calculation với multiple methods"""
        sharpness_metrics = {}
        
        try:
            # 1. Laplacian variance (traditional)
            laplacian = Laplacian(gray_img, CV_64F)
            laplacian_var = var(laplacian)
            sharpness_metrics['laplacian_sharpness'] = min(100, (laplacian_var / 2000) * 100)
            
            # 2. Sobel gradient magnitude
            grad_x = Sobel(gray_img, CV_64F, 1, 0, ksize=3)
            grad_y = Sobel(gray_img, CV_64F, 0, 1, ksize=3)
            gradient_magnitude = np.sqrt(grad_x**2 + grad_y**2)
            sobel_sharpness = np.mean(gradient_magnitude)
            sharpness_metrics['sobel_sharpness'] = min(100, (sobel_sharpness / 50) * 100)
            
            # 3. High-frequency content analysis
            fft_img = np.fft.fft2(gray_img)
            fft_shifted = np.fft.fftshift(fft_img)
            magnitude_spectrum = np.abs(fft_shifted)
            
            # Focus on high-frequency components
            h, w = gray_img.shape
            center_y, center_x = h // 2, w // 2
            high_freq_mask = np.zeros((h, w))
            
            # Create high-frequency mask (outer region)
            for y in range(h):
                for x in range(w):
                    distance = np.sqrt((y - center_y)**2 + (x - center_x)**2)
                    if distance > min(h, w) * 0.3:  # High frequency region
                        high_freq_mask[y, x] = 1
            
            high_freq_energy = np.sum(magnitude_spectrum * high_freq_mask)
            total_energy = np.sum(magnitude_spectrum)
            
            if total_energy > 0:
                hf_ratio = high_freq_energy / total_energy
                sharpness_metrics['frequency_sharpness'] = min(100, hf_ratio * 1000)
            else:
                sharpness_metrics['frequency_sharpness'] = 0
                
        except Exception as e:
            print(f"Enhanced sharpness calculation error: {e}", file=sys.stderr)
            sharpness_metrics = {
                'laplacian_sharpness': 50,
                'sobel_sharpness': 50,
                'frequency_sharpness': 50
            }
        
        return sharpness_metrics
    
    def calculate_multi_scale_contrast(self, gray_img):
        """Multi-scale contrast analysis"""
        contrast_metrics = {}
        
        try:
            # 1. Global contrast (standard deviation)
            global_contrast = std(gray_img)
            contrast_metrics['global_contrast'] = min(100, (global_contrast / 128) * 100)
            
            # 2. Local contrast analysis
            kernel_sizes = [3, 5, 9, 15]
            local_contrasts = []
            
            for kernel_size in kernel_sizes:
                # Local mean
                kernel = np.ones((kernel_size, kernel_size)) / (kernel_size * kernel_size)
                local_mean = cv2.filter2D(gray_img.astype(np.float32), -1, kernel)
                
                # Local standard deviation
                local_sq_mean = cv2.filter2D((gray_img.astype(np.float32))**2, -1, kernel)
                local_std = np.sqrt(np.maximum(0, local_sq_mean - local_mean**2))
                
                # Average local contrast
                avg_local_contrast = np.mean(local_std)
                local_contrasts.append(avg_local_contrast)
            
            # Multi-scale contrast score
            contrast_metrics['local_contrast'] = min(100, (np.mean(local_contrasts) / 64) * 100)
            
            # 3. Edge-based contrast
            edges = Canny(gray_img, 50, 150)
            edge_density = np.sum(edges > 0) / (gray_img.shape[0] * gray_img.shape[1])
            contrast_metrics['edge_contrast'] = min(100, edge_density * 1000)
            
        except Exception as e:
            print(f"Multi-scale contrast calculation error: {e}", file=sys.stderr)
            contrast_metrics = {
                'global_contrast': 50,
                'local_contrast': 50,
                'edge_contrast': 50
            }
        
        return contrast_metrics
    
    def assess_illumination_quality(self, gray_img):
        """Assess illumination uniformity and quality"""
        try:
            # 1. Overall brightness distribution
            brightness_mean = mean(gray_img)
            brightness_score = 100 * (1 - abs(brightness_mean - 128) / 128)
            
            # 2. Illumination uniformity
            # Divide image into blocks and analyze brightness variation
            h, w = gray_img.shape
            block_size = min(h, w) // 8
            
            if block_size > 10:
                brightness_values = []
                for y in range(0, h - block_size, block_size):
                    for x in range(0, w - block_size, block_size):
                        block = gray_img[y:y+block_size, x:x+block_size]
                        brightness_values.append(np.mean(block))
                
                if len(brightness_values) > 1:
                    uniformity = 100 * (1 - np.std(brightness_values) / (np.mean(brightness_values) + 1e-7))
                    uniformity = max(0, min(100, uniformity))
                else:
                    uniformity = brightness_score
            else:
                uniformity = brightness_score
            
            # Combined illumination score
            illumination_score = (brightness_score * 0.6 + uniformity * 0.4)
            
            return max(0, min(100, illumination_score))
            
        except Exception as e:
            print(f"Illumination assessment error: {e}", file=sys.stderr)
            return 50
    
    def enhanced_noise_estimation(self, gray_img):
        """Enhanced noise estimation"""
        try:
            # 1. High-frequency noise detection
            laplacian = Laplacian(gray_img, CV_64F)
            
            # 2. Median filtering approach
            median_filtered = cv2.medianBlur(gray_img, 5)
            noise_map = np.abs(gray_img.astype(np.float32) - median_filtered.astype(np.float32))
            noise_level = np.mean(noise_map)
            
            # 3. Wavelet-inspired approach (simplified)
            # Use difference between original and smoothed image
            smoothed = GaussianBlur(gray_img, (5, 5), 2.0)
            detail_noise = np.abs(gray_img.astype(np.float32) - smoothed.astype(np.float32))
            detail_noise_level = np.std(detail_noise)
            
            # Combined noise estimation
            combined_noise = (noise_level * 0.6 + detail_noise_level * 0.4)
            
            # Normalize to 0-100 scale
            noise_score = min(100, (combined_noise / 20) * 100)
            return noise_score
            
        except Exception as e:
            print(f"Enhanced noise estimation error: {e}", file=sys.stderr)
            return 50
    
    def assess_face_specific_quality(self, gray_img):
        """Assess quality metrics specific to face images"""
        try:
            h, w = gray_img.shape
            
            # 1. Symmetry quality (important for faces)
            left_half = gray_img[:, :w//2]
            right_half = cv2.flip(gray_img[:, w//2:], 1)
            
            if left_half.shape == right_half.shape:
                symmetry_correlation = cv2.matchTemplate(left_half, right_half, cv2.TM_CCOEFF_NORMED)[0, 0]
                symmetry_score = max(0, min(100, (symmetry_correlation + 1) * 50))
            else:
                symmetry_score = 50
            
            # 2. Eye region analysis (if detectable)
            eye_region_quality = self.assess_eye_region_quality(gray_img)
            
            # 3. Mouth region analysis
            mouth_region_quality = self.assess_mouth_region_quality(gray_img)
            
            # Combined face-specific score
            face_quality = (symmetry_score * 0.4 + eye_region_quality * 0.3 + mouth_region_quality * 0.3)
            
            return max(0, min(100, face_quality))
            
        except Exception as e:
            print(f"Face-specific quality assessment error: {e}", file=sys.stderr)
            return 50
    
    def assess_eye_region_quality(self, gray_img):
        """Assess quality of eye region"""
        try:
            h, w = gray_img.shape
            
            # Focus on upper third of image (likely eye region)
            eye_region = gray_img[:h//3, :]
            
            # Check for sufficient detail and contrast in eye region
            eye_contrast = np.std(eye_region)
            eye_detail = var(Laplacian(eye_region, CV_64F))
            
            eye_quality = min(100, (eye_contrast / 64 * 50) + (eye_detail / 1000 * 50))
            
            return max(0, min(100, eye_quality))
            
        except Exception as e:
            return 50
    
    def assess_mouth_region_quality(self, gray_img):
        """Assess quality of mouth region"""
        try:
            h, w = gray_img.shape
            
            # Focus on lower third of image (likely mouth region)
            mouth_region = gray_img[2*h//3:, :]
            
            # Check for sufficient detail and contrast in mouth region
            mouth_contrast = np.std(mouth_region)
            mouth_edges = np.sum(Canny(mouth_region, 50, 150) > 0)
            mouth_edge_density = mouth_edges / (mouth_region.shape[0] * mouth_region.shape[1])
            
            mouth_quality = min(100, (mouth_contrast / 64 * 50) + (mouth_edge_density * 10000))
            
            return max(0, min(100, mouth_quality))
            
        except Exception as e:
            return 50
    
    def assess_detail_quality(self, gray_img):
        """Assess overall detail and resolution quality"""
        try:
            h, w = gray_img.shape
            
            # 1. Resolution score
            pixel_count = h * w
            resolution_score = min(100, (pixel_count / (640 * 480)) * 100)  # Base on VGA resolution
            
            # 2. Detail richness (edge density)
            edges = Canny(gray_img, 30, 100)
            edge_density = np.sum(edges > 0) / (h * w)
            detail_score = min(100, edge_density * 500)
            
            # 3. Texture richness
            texture_score = self.assess_texture_richness(gray_img)
            
            # Combined detail quality
            combined_detail = (resolution_score * 0.3 + detail_score * 0.4 + texture_score * 0.3)
            
            return max(0, min(100, combined_detail))
            
        except Exception as e:
            print(f"Detail quality assessment error: {e}", file=sys.stderr)
            return 50
    
    def assess_texture_richness(self, gray_img):
        """Assess texture richness using LBP-like analysis"""
        try:
            # Simple texture analysis
            h, w = gray_img.shape
            
            # Calculate local variance
            kernel = np.ones((5, 5)) / 25
            local_mean = cv2.filter2D(gray_img.astype(np.float32), -1, kernel)
            local_sq_mean = cv2.filter2D((gray_img.astype(np.float32))**2, -1, kernel)
            local_variance = np.maximum(0, local_sq_mean - local_mean**2)
            
            # Texture score based on variance distribution
            texture_score = min(100, np.mean(local_variance) / 500 * 100)
            
            return max(0, min(100, texture_score))
            
        except Exception as e:
            return 50
    
    def calculate_adaptive_quality_weights(self, quality_metrics, gray_img):
        """Calculate adaptive weights based on image characteristics"""
        try:
            h, w = gray_img.shape
            
            # Base weights
            weights = {
                'laplacian_sharpness': 0.15,
                'sobel_sharpness': 0.10,
                'frequency_sharpness': 0.10,
                'global_contrast': 0.12,
                'local_contrast': 0.08,
                'edge_contrast': 0.05,
                'illumination': 0.15,
                'noise': 0.10,
                'face_quality': 0.10,
                'detail': 0.05
            }
            
            # Adaptive adjustments based on image characteristics
            
            # If image is small, emphasize sharpness more
            if h * w < 100000:  # Less than ~316x316
                weights['laplacian_sharpness'] *= 1.3
                weights['sobel_sharpness'] *= 1.2
                weights['detail'] *= 0.8
            
            # If image has low contrast, emphasize contrast metrics
            overall_contrast = np.std(gray_img)
            if overall_contrast < 30:
                weights['global_contrast'] *= 1.4
                weights['local_contrast'] *= 1.3
                weights['edge_contrast'] *= 1.2
            
            # If noise is detected, emphasize noise metric
            noise_estimate = self.enhanced_noise_estimation(gray_img)
            if noise_estimate > 60:
                weights['noise'] *= 1.5
            
            # Normalize weights to sum to 1
            total_weight = sum(weights.values())
            if total_weight > 0:
                weights = {k: v / total_weight for k, v in weights.items()}
            
            return weights
            
        except Exception as e:
            print(f"Adaptive weights calculation error: {e}", file=sys.stderr)
            # Return default weights
            return {
                'laplacian_sharpness': 0.15,
                'sobel_sharpness': 0.10,
                'frequency_sharpness': 0.10,
                'global_contrast': 0.12,
                'local_contrast': 0.08,
                'edge_contrast': 0.05,
                'illumination': 0.15,
                'noise': 0.10,
                'face_quality': 0.10,
                'detail': 0.05
            }
    
    def normalize_quality_score(self, raw_score, quality_metrics):
        """Apply final normalization and adjustments to quality score"""
        try:
            # Apply sigmoid-like normalization to avoid extreme values
            normalized = 100 / (1 + np.exp(-0.1 * (raw_score - 50)))
            
            # Apply penalty for extremely poor metrics
            critical_metrics = ['laplacian_sharpness', 'global_contrast', 'illumination']
            poor_critical_count = sum(1 for metric in critical_metrics 
                                    if quality_metrics.get(metric, 0) < 20)
            
            if poor_critical_count >= 2:
                normalized *= 0.5  # Heavy penalty for multiple poor critical metrics
            elif poor_critical_count == 1:
                normalized *= 0.7  # Moderate penalty
            
            # Boost for consistently high quality
            high_quality_count = sum(1 for v in quality_metrics.values() if v > 80)
            if high_quality_count >= len(quality_metrics) * 0.7:
                normalized = min(100, normalized * 1.2)
            
            return max(0, min(100, normalized))
            
        except Exception as e:
            print(f"Quality normalization error: {e}", file=sys.stderr)
            return max(0, min(100, raw_score))

    # --- Fix: provide simple alias for compatibility ---
    def cosine_similarity(self, a, b):
        """Alias wrapper to maintain compatibility with older code paths."""
        return self.robust_cosine_similarity(a, b)

def main():
    parser = argparse.ArgumentParser(description='Advanced face processing with ensemble methods')
    parser.add_argument('action', nargs='?', choices=['detect_faces', 'extract_embeddings', 'compare_embeddings', 'quality'],
                       help='Action to perform')
    parser.add_argument('--img1', help='Path to the first image')
    parser.add_argument('--img2', help='Path to the second image (for comparison)')
    parser.add_argument('--emb1', help='First embedding as JSON string')
    parser.add_argument('--emb2', help='Second embedding as JSON string')
    parser.add_argument('--args-file', help='Path to JSON file containing arguments')
    
    args = parser.parse_args()
    
    # Handle arguments from file if specified
    if args.args_file:
        print(f"Loading arguments from file: {args.args_file}", file=sys.stderr)
        file_args = load_args_from_file(args.args_file)
        if file_args:
            # First argument is the action
            action = file_args[0] if file_args else None
            
            # Parse the rest of the arguments
            arg_dict = {}
            i = 1
            while i < len(file_args):
                if file_args[i].startswith('--'):
                    arg_name = file_args[i][2:]  # Remove -- prefix
                    if i + 1 < len(file_args) and not file_args[i + 1].startswith('--'):
                        arg_dict[arg_name] = file_args[i + 1]
                        i += 2
                    else:
                        arg_dict[arg_name] = True
                        i += 1
                else:
                    i += 1
            
            # Override args with file values
            if action:
                args.action = action
            if 'img1' in arg_dict:
                args.img1 = arg_dict['img1']
            if 'img2' in arg_dict:
                args.img2 = arg_dict['img2']
            if 'emb1' in arg_dict:
                args.emb1 = arg_dict['emb1']
            if 'emb2' in arg_dict:
                args.emb2 = arg_dict['emb2']
    
    if not args.action:
        print(json.dumps({'success': False, 'error': 'No action specified'}))
        return
    
    processor = AdvancedFaceProcessor()
    
    try:
        if args.action == 'detect_faces':
            if not args.img1:
                print(json.dumps({'success': False, 'error': 'Image path required for detect_faces'}))
                return
            result = processor.detect_faces_advanced(args.img1)
        elif args.action == 'extract_embeddings':
            if not args.img1:
                print(json.dumps({'success': False, 'error': 'Image path required for extract_embeddings'}))
                return
            result = processor.extract_advanced_embeddings(args.img1)
        elif args.action == 'compare_embeddings':
            if args.emb1 and args.emb2:
                emb1 = json.loads(args.emb1)
                emb2 = json.loads(args.emb2)
                result = processor.compare_faces_advanced(emb1, emb2)
            else:
                result = {'success': False, 'error': 'Two embeddings required for comparison'}
        elif args.action == 'quality':
            if not args.img1:
                print(json.dumps({'success': False, 'error': 'Image path required for quality assessment'}))
                return
            result = processor.assess_quality_advanced(args.img1)
        else:
            result = {'success': False, 'error': f'Unknown action: {args.action}'}
        
        print(json.dumps(result))
    
    except Exception as e:
        print(json.dumps({'success': False, 'error': f'Script error: {str(e)}'}))

if __name__ == '__main__':
    main() 