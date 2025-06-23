# 🤖 Hệ Thống Quản Lý Ảnh Thông Minh (Smart Photo Management System)

## 📋 Tổng Quan Dự Án

Hệ thống quản lý ảnh thông minh tích hợp AI nhận diện khuôn mặt, chatbot, và Google Drive để tự động phân tích, chọn lọc và tổ chức ảnh.

### 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vue.js FE     │◄──►│   n8n Backend   │◄──►│  External APIs  │
│                 │    │                 │    │                 │
│ • Admin Panel   │    │ • Workflows     │    │ • Google Drive  │
│ • User Dashboard│    │ • AI Processing │    │ • DeepFace API  │
│ • Image Gallery │    │ • Chatbot Logic │    │ • Zalo/FB Bot   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 👥 Tác Nhân (Actors)

1. **Admin**: Quản trị hệ thống, cấu hình workflows, xem báo cáo
2. **User**: Sử dụng chatbot, xem kết quả xử lý ảnh
3. **AI System**: Tự động phân tích, xử lý ảnh thông qua DeepFace

### 🔄 Workflow Chính

1. **Quét ảnh từ Google Drive** → 2. **Phân tích khuôn mặt (DeepFace)** → 3. **Chọn ảnh đẹp nhất** → 4. **Tạo folder mới & sao chép** → 5. **Thông báo qua chatbot**

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: Vue.js 3 + Composition API + TypeScript
- **Backend**: n8n Workflow Automation
- **AI**: DeepFace cho nhận diện khuôn mặt
- **Storage**: Google Drive API
- **Chatbot**: Zalo Official Account, Facebook Messenger
- **UI Framework**: Element Plus / Quasar

## 📂 Cấu Trúc Project

```
Gbot/
├── frontend/              # Vue.js Frontend
├── n8n-workflows/         # n8n Workflow Files
├── docs/                  # Documentation
├── scripts/               # Setup & Utility Scripts
└── .venv/                 # Python Virtual Environment
```

## 🚀 Quick Start

### 1. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

### 2. Setup n8n Backend
```bash
# Kích hoạt .venv
.venv\Scripts\activate    # Windows
source .venv/bin/activate # Linux/Mac

# Install n8n
pip install n8n

# Start n8n
n8n start
```

### 3. Truy cập
- Frontend: http://localhost:3000
- n8n Backend: http://localhost:5678

## 📋 TODO LIST - PHASE 1: FRONTEND

### ✅ Setup & Infrastructure
- [ ] Tạo Vue.js project với TypeScript
- [ ] Cấu hình routing (Vue Router)
- [ ] Setup state management (Pinia)
- [ ] Cài đặt UI framework (Element Plus)
- [ ] Cấu hình API client (Axios)

### 🎨 UI Components
- [ ] Layout: Header, Sidebar, Main Content
- [ ] Login/Authentication pages
- [ ] Admin Dashboard
- [ ] User Dashboard
- [ ] Image Gallery Component
- [ ] File Upload Component
- [ ] Chatbot Integration Interface

### 📱 Pages & Features
- [ ] **Admin Panel**:
  - [ ] Overview Dashboard
  - [ ] Workflow Management
  - [ ] User Management
  - [ ] System Configuration
  - [ ] Reports & Analytics
  
- [ ] **User Dashboard**:
  - [ ] Personal Image Gallery
  - [ ] Upload Interface
  - [ ] Processing Status
  - [ ] Chatbot Interface

### 🔌 API Integration
- [ ] Authentication API endpoints
- [ ] Image upload/management endpoints
- [ ] Google Drive integration endpoints
- [ ] n8n workflow trigger endpoints
- [ ] Chatbot webhook endpoints

### 🧪 Testing & Documentation
- [ ] Unit tests setup
- [ ] E2E tests
- [ ] API documentation
- [ ] User guide

## 📋 TODO LIST - PHASE 2: BACKEND (n8n)

### 🔄 Core Workflows
- [ ] Google Drive Scanner Workflow
- [ ] DeepFace AI Processing Workflow
- [ ] Image Selection & Copying Workflow
- [ ] Chatbot Response Workflow

### 🤖 AI Integration
- [ ] DeepFace API setup
- [ ] Face detection workflow
- [ ] Image quality assessment
- [ ] Best photo selection algorithm

### 💬 Chatbot Integration
- [ ] Zalo Official Account setup
- [ ] Facebook Messenger setup
- [ ] Webhook handling
- [ ] Message processing workflows

## 🔒 Security & Performance
- [ ] Authentication & Authorization
- [ ] Rate limiting
- [ ] Image processing optimization
- [ ] Error handling & logging
- [ ] Data backup strategies

---

## ✅ HOÀN THÀNH FRONTEND

**Frontend Vue.js đã được tạo hoàn chỉnh!** 🎉

### 🚀 Quick Start

```bash
# Chuyển vào thư mục frontend
cd frontend

# Cài đặt dependencies  
npm install

# Khởi chạy development server
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:3000**

### 🔑 Demo Accounts
- **Admin**: `admin` / `admin123`
- **User**: `user` / `user123`

### 📱 Tính Năng Đã Hoàn Thành

#### 🔐 Authentication System
- ✅ Login/Logout với JWT
- ✅ Role-based routing (Admin/User)
- ✅ Demo accounts sẵn sàng

#### 👨‍💼 Admin Panel Complete
- ✅ **Dashboard**: Statistics, Quick Actions, System Status
- ✅ **User Management**: CRUD operations với dialog
- ✅ **Workflow Management**: n8n integration ready
- ✅ **System Config**: Google Drive, Chatbot, AI settings

#### 👤 User Interface Complete  
- ✅ **User Dashboard**: Stats, Upload, Processing Queue
- ✅ **Image Gallery**: Grid view, Search, Filter, Lightbox
- ✅ **Chatbot Interface**: Zalo/Facebook chat simulation

#### 🎨 UI/UX Features
- ✅ Modern Element Plus components
- ✅ Responsive design (mobile-friendly)
- ✅ Dark/Light theme support
- ✅ Smooth animations & transitions
- ✅ Custom scrollbars & hover effects

#### 🔧 Technical Stack
- ✅ **Vue 3** + Composition API + TypeScript
- ✅ **Pinia** state management  
- ✅ **Vue Router** với navigation guards
- ✅ **Axios** API client với interceptors
- ✅ **Element Plus** UI framework
- ✅ **Vite** build tool

### 📁 Project Structure
```
frontend/
├── src/
│   ├── layouts/           # AdminLayout, UserLayout
│   ├── pages/            # All pages complete
│   │   ├── admin/        # Dashboard, Users, Workflows, Config
│   │   ├── user/         # Dashboard, Gallery, Chatbot  
│   │   └── LoginPage.vue
│   ├── router/           # Vue Router config
│   ├── services/         # API services
│   ├── stores/           # Pinia stores (auth)
│   ├── types/            # TypeScript definitions
│   └── ...
```

---

**Next Steps**: 
1. ✅ ~~Frontend hoàn thành~~
2. 🔄 **Setup n8n Backend workflows**
3. 🔄 **Integrate Google Drive API**  
4. 🔄 **Setup DeepFace AI processing**
5. 🔄 **Configure Zalo/Facebook chatbots** 