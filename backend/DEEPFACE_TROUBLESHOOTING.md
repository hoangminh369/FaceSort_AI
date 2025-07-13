# 🛠️ DeepFace Troubleshooting Guide

## 🚨 Common Issues & Solutions

### 1. Python Version Compatibility Error

**Error:**
```
ERROR: Ignored the following versions that require a different python version
ERROR: Could not find a version that satisfies the requirement tensorflow>=2.8.0
```

**Solutions:**

#### Option A: Use Compatible Python Version
- **Recommended**: Python 3.9, 3.10, or 3.11
- Avoid Python 3.12+ (limited TensorFlow support)
- Avoid Python <3.8 (too old)

#### Option B: Manual Installation with CPU-only TensorFlow
```bash
cd backend
python -m venv python-env

# Windows
python-env\Scripts\activate.bat

# Linux/macOS  
source python-env/bin/activate

# Install step by step
pip install --upgrade pip
pip install opencv-python
pip install numpy==1.23.5
pip install pandas==1.5.3
pip install pillow==9.5.0
pip install tensorflow-cpu==2.12.0
pip install deepface
```

#### Option C: Use Minimal Requirements
```bash
pip install -r scripts/python/requirements-minimal.txt
```

### 2. Windows-specific Issues

#### Visual Studio Build Tools Required
**Error:**
```
Microsoft Visual C++ 14.0 is required
```

**Solution:**
1. Download Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/
2. Install "C++ build tools" workload
3. Restart terminal and try again

#### Long Path Names Issue
**Error:**
```
path too long
```

**Solution:**
1. Enable long paths in Windows:
   ```cmd
   # Run as Administrator
   reg add HKLM\SYSTEM\CurrentControlSet\Control\FileSystem /v LongPathsEnabled /t REG_DWORD /d 1
   ```
2. Or move project to shorter path (e.g., `C:\gb\`)

### 3. Memory Issues

#### RAM Requirements
- **Minimum**: 4GB RAM
- **Recommended**: 8GB+ RAM
- Models can use 1-2GB when loaded

#### Reduce Memory Usage
Add to `.env`:
```env
# Reduce TensorFlow memory usage
TF_CPP_MIN_LOG_LEVEL=2
TF_FORCE_GPU_ALLOW_GROWTH=true
CUDA_VISIBLE_DEVICES=""
```

### 4. Model Download Issues

#### Internet Connection Required
Models download on first use (~100-500MB total):
- VGG-Face: ~553MB
- OpenCV Detector: ~10MB
- Other models as needed

#### Manual Model Download
If automatic download fails:
```python
from deepface import DeepFace

# Pre-download models
DeepFace.build_model("VGG-Face")
DeepFace.build_model("opencv")
```

### 5. Python Path Issues

#### Python Not Found
**Error:**
```
python is not recognized as an internal or external command
```

**Solutions:**

**Windows:**
1. Check if Python is installed:
   ```cmd
   py --version
   python --version
   python3 --version
   ```

2. Add Python to PATH:
   - Windows Settings → Apps → App execution aliases
   - Disable Python aliases
   - Add Python installation folder to PATH

**Linux/macOS:**
```bash
# Check available Python versions
which python3
which python

# Create symlink if needed
sudo ln -s /usr/bin/python3 /usr/bin/python
```

### 6. Permissions Issues

#### Write Permission Denied
**Solution:**
```bash
# Linux/macOS
sudo chown -R $USER:$USER python-env/

# Windows - Run as Administrator
```

### 7. Package Conflicts

#### Clean Installation
```bash
# Remove existing environment
rm -rf python-env/  # Linux/macOS
rmdir /s python-env\  # Windows

# Recreate environment
python -m venv python-env
source python-env/bin/activate  # Linux/macOS
python-env\Scripts\activate.bat  # Windows

# Install minimal dependencies first
pip install --upgrade pip
pip install deepface tensorflow-cpu opencv-python
```

## 🔧 Manual Setup (Last Resort)

If automated scripts fail, follow these steps:

### Step 1: Verify Python
```bash
python --version  # Should be 3.8+
```

### Step 2: Create Virtual Environment
```bash
cd backend
python -m venv deepface-env
```

### Step 3: Activate Environment
```bash
# Windows
deepface-env\Scripts\activate.bat

# Linux/macOS
source deepface-env/bin/activate
```

### Step 4: Install Core Dependencies
```bash
pip install --upgrade pip
pip install numpy==1.23.5
pip install opencv-python==4.8.1.78
pip install pillow==9.5.0
```

### Step 5: Install TensorFlow (Choose One)
```bash
# Option A: CPU-only (recommended for most users)
pip install tensorflow-cpu==2.12.0

# Option B: GPU version (if you have CUDA)
pip install tensorflow==2.12.0
```

### Step 6: Install DeepFace
```bash
pip install deepface==0.0.79
```

### Step 7: Test Installation
```python
python -c "
from deepface import DeepFace
import cv2
print('✅ Installation successful!')
"
```

### Step 8: Update Backend Config
Update `backend/.env`:
```env
DEEPFACE_PYTHON_PATH=python  # or full path to python executable
DEEPFACE_MODEL=VGG-Face
DEEPFACE_DETECTOR=opencv
```

## 🏥 Health Check

Test your installation:

### Backend Health Check
```bash
curl -X GET http://localhost:5000/api/images/deepface-health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "isReady": true
  }
}
```

### Python Direct Test
```python
from deepface import DeepFace
import requests

# Test with a sample image
url = "https://raw.githubusercontent.com/serengil/deepface/master/tests/dataset/img1.jpg"
result = DeepFace.analyze(url, actions=['age', 'gender', 'emotion'])
print("✅ DeepFace working correctly!")
print(result)
```

## 📞 Getting Help

If issues persist:

1. **Check Logs**: Look for error details in backend console
2. **Python Version**: Use Python 3.9-3.11 for best compatibility
3. **System Requirements**: Ensure 4GB+ RAM available
4. **Clean Install**: Try removing `python-env/` and starting fresh
5. **Alternative**: Consider using Docker for isolated environment

## 🐳 Docker Alternative (Advanced)

If local installation is problematic:

```dockerfile
# Dockerfile for DeepFace service
FROM python:3.10-slim

WORKDIR /app
COPY scripts/python/requirements-minimal.txt .
RUN pip install -r requirements-minimal.txt

COPY scripts/python/deepface_processor.py .
CMD ["python", "deepface_processor.py"]
```

---

**Remember**: DeepFace setup can be complex due to TensorFlow dependencies. Be patient and try the solutions step by step! 🎯 