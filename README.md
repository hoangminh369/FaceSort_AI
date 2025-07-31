# 🤖 Hệ Thống Quản Lý Ảnh Thông Minh (Smart Photo Management System)

## 📋 Tổng Quan Dự Án

Hệ thống quản lý ảnh thông minh tích hợp AI nhận diện khuôn mặt, chatbot, và Google Drive để tự động phân tích, chọn lọc và tổ chức ảnh.

### 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vue.js FE     │◄──►│   Backend API   │◄──►│  n8n Workflows  │
│                 │    │                 │    │                 │
│ • Admin Panel   │    │ • Auth API      │    │ • Core Workflows│
│ • User Dashboard│    │ • Image API     │    │ • AI Processing │
│ • Image Gallery │    │ • Drive API     │    │ • Chatbot Logic │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      ▲
                                                      │
                                                      ▼
                                            ┌─────────────────┐
                                            │  External APIs  │
                                            │                 │
                                            │ • Google Drive  │
                                            │ • DeepFace API  │
                                            │ • Zalo/FB Bot   │
                                            └─────────────────┘
```

### 👥 Tác Nhân (Actors)

1. **Admin**: Quản trị hệ thống, cấu hình workflows, xem báo cáo
2. **User**: Sử dụng chatbot, xem kết quả xử lý ảnh
3. **AI System**: Tự động phân tích, xử lý ảnh thông qua DeepFace

### 🔄 Workflow Chính

1. **Quét ảnh từ Google Drive** → 2. **Phân tích khuôn mặt (DeepFace)** → 3. **Chọn ảnh đẹp nhất** → 4. **Tạo folder mới & sao chép** → 5. **Thông báo qua chatbot**

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: Vue.js 3 + Composition API + TypeScript
- **Backend API**: Node.js + Express + TypeScript + MongoDB
- **Workflow Engine**: n8n Workflow Automation
- **AI**: DeepFace cho nhận diện khuôn mặt
- **Storage**: Google Drive API
- **Chatbot**: Zalo Official Account, Facebook Messenger
- **UI Framework**: Element Plus / Quasar

---

## 📂 Cấu Trúc Dự Án

```
📁 Gogi/                          # Root project directory
├── 📁 backend/                   # Backend API (Node.js + TypeScript)
│   ├── src/
│   ├── scripts/python/          
│   │   ├── requirements.txt    
│   │   ├── requirements-minimal.txt 
│   │   ├── simple_face_processor_v2.py
│   │   └── 📁 venv/              # Python Virtual Environment
│   │       ├── Scripts/         
│   │       ├── bin/             
│   │       └── Lib/             
│   ├── package.json
│   └── .env.example
├── 📁 frontend/                  # Frontend Web (Vue.js 3)
│   ├── src/
│   ├── package.json
│   └── .env.example
├── 📁 n8n-workflows/             # n8n Automation workflows
│   ├── ai-integration/
│   ├── chatbot-integration/
│   ├── core-workflows/
│   └── security/
└── README.md
```

---
# 🚀 HƯỚNG DẪN CHẠY DỰ ÁN

## 📋 Tổng Quan

Dự án Smart Photo Management System bao gồm 3 thành phần chính:
- **Backend API** (Node.js + Express + TypeScript + MongoDB)
- **Frontend Web** (Vue.js 3 + TypeScript + Element Plus)
- **n8n Workflows** (Automation & AI Processing)

---

## 🔧 Yêu Cầu Hệ Thống

### Phần Mềm Cần Thiết:
- **Node.js** >= 18.0.0
- **MongoDB** >= 6.0
- **Python** 3.7 ≤ python ≤ 3.10 (cho DeepFace)
- **n8n** >= 1.0.0
- **Git**

---

## 📦 Cài Đặt & Thiết Lập để chạy GOGI

### 1️⃣ Clone Repository

```bash
git clone https://github.com/HoangAnh1122/Gogi.git
cd Gogi
code .
```

### 2️⃣ Cài Đặt MongoDB

```bash
# Cài Đặt MongoDB
# - Tải và cài đặt MongoDB từ trang chính thức: https://www.mongodb.com/try/download/community
# - Hoặc sử dụng MongoDB Atlas (cloud)
# - Tạo database có tên `smart-photo-management`
```

### 3️⃣ Cấu Hình Environment

#### Backend Configuration:
```bash
cd backend
cp .env.example .env
```

#### Frontend Configuration:
```bash
cd frontend
cp .env.example .env
```

---

## 🏃‍♂️ Chạy Dự Án

### 0️⃣ Kích Hoạt Python Virtual Environment (Quan Trọng!)

```bash
# Mở terminal kiểm tra version python chỉ hỗ trợ Python 3.7–3.10
py -3.10 --version

# Nếu chưa có Python 3.10, tải từ:
# https://www.python.org/ftp/python/3.10.0/python-3.10.0-amd64.exe

# Sau khi cài xong Python 3.7–3.10, tại thư mục:
cd c:\Gogi\backend\scripts\python

# Kích hoạt venv (dạng đúng: (venv) PS C:\Gogi\backend\scripts\python>)
.\venv\Scripts\Activate 

# Update pip
python -m pip install --upgrade pip

# Cài 2 thư viện
pip install -r requirements-min.txt
pip install -r requirements-minimal.txt
```

### 1️⃣ Khởi Động Backend API

```bash
cd backend

# Cài dependencies
npm install

# Chạy development mode
npm run dev
```

**Backend sẽ chạy tại:** `http://localhost:5000`

### 2️⃣ Khởi Động Frontend

```bash
cd frontend

# Cài dependencies (bản thấp sẽ gặp 1 số lỗ hổng)
npm install

# Chạy development server
npm run dev
```

**Frontend sẽ chạy tại:** `http://localhost:3000`

### 3️⃣ Khởi Động n8n

```bash
# Cài n8n (nếu chưa có)
npm install -g n8n

# Chạy n8n
n8n
```

**n8n sẽ chạy tại:** `http://localhost:5678`

---

## 👥 Tài Khoản Mặc Định

Hệ thống tự động tạo các tài khoản mặc định:

### Admin Account:
- **Email:** `admin@example.com`
- **Password:** `admin123`
- **Role:** `admin`

### Test User:
- **Email:** `user@example.com`
- **Password:** `user123`
- **Role:** `user`

---


