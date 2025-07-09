# 🚀 Frontend Setup Guide

## 📋 Prerequisites

- Node.js 18+ 
- npm hoặc yarn
- Git

## 🛠️ Installation Steps

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd Gbot/frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environmen/t Configuration
```bash
# C/
"/opy environment file
cp .env.example .env

# Edit .env file với thông tin của bạn
VITE_API_BASE_URL=http://localhost:5678/api
VITE_GOOGLE_DRIVE_CLIENT_ID=your_client_id
# ... other configurations
```

### 4. Start Development Server
```bash
npm run dev
```

Frontend sẽ chạy tại: http://localhost:3000

## 🔑 Demo Accounts

### Admin Account
- Username: `admin`
- Password: `admin123`

### User Account  
- Username: `user`
- Password: `user123`

## 📱 Features

### 🔐 Authentication
- Login/Logout functionality
- Role-based access (Admin/User)
- JWT token management

### 👨‍💼 Admin Panel
- **Dashboard**: System overview và statistics
- **User Management**: Quản lý users
- **Workflow Management**: Cấu hình n8n workflows
- **System Config**: Cấu hình Google Drive, Chatbot, AI

### 👤 User Interface
- **Dashboard**: Personal photo overview
- **Image Gallery**: Browse và quản lý photos
- **Upload**: Drag & drop photo upload
- **Chatbot**: Tương tác với Zalo/Facebook bot

## 🎨 UI Components

### Element Plus Integration
- Modern UI components
- Responsive design
- Dark/Light theme support
- Icons pack included

### Custom Styling
- Custom scrollbars
- Hover effects
- Smooth transitions
- Modern card designs

## 📊 Key Pages

### `/login`
- Authentication form
- Demo account buttons
- Responsive design

### `/admin/dashboard`
- System statistics cards
- Quick action buttons
- Recent activity
- System status

### `/admin/users`
- User management table
- Create/Edit/Delete users
- Role assignment

### `/admin/workflows`
- n8n workflow management
- Execute workflows
- Status tracking

### `/admin/config`
- Google Drive settings
- Chatbot configuration (Zalo/Facebook)
- AI model settings

### `/user/dashboard`
- Personal statistics
- Photo upload interface
- Processing status
- Recent photos grid

### `/user/gallery`
- Photo grid với pagination
- Search và filter
- Lightbox view
- Download/Delete actions

### `/user/chatbot`
- Chat interface
- Platform selection (Zalo/Facebook)
- Quick action buttons
- Message templates

## 🔧 Development Tools

### TypeScript
- Full type safety
- IntelliSense support
- Better code organization

### Vue 3 Composition API
- Modern Vue development
- Better code reusability
- Improved performance

### Pinia State Management
- Centralized state
- TypeScript support
- Dev tools integration

### Axios HTTP Client
- API communication
- Request/Response interceptors
- Error handling

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable components
│   │   ├── AdminLayout.vue
│   │   └── UserLayout.vue
│   ├── pages/              # Page components
│   │   ├── admin/
│   │   │   ├── AdminDashboard.vue
│   │   │   ├── UserManagement.vue
│   │   │   ├── WorkflowManagement.vue
│   │   │   └── SystemConfig.vue
│   │   ├── user/
│   │   │   ├── UserDashboard.vue
│   │   │   ├── ImageGallery.vue
│   │   │   └── ChatbotInterface.vue
│   │   └── LoginPage.vue
│   ├── router/             # Vue Router config
│   ├── services/           # API services
│   ├── stores/             # Pinia stores
│   ├── types/              # TypeScript types
│   ├── App.vue
│   └── main.ts
├── public/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── .env.example
```

## 🚀 Build & Deploy

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 🔄 API Integration

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout  
- `GET /api/auth/profile` - Get user profile

### Image Endpoints
- `GET /api/images` - Get user images
- `POST /api/images/upload` - Upload images
- `DELETE /api/images/:id` - Delete image
- `POST /api/images/process` - Process images

### Workflow Endpoints
- `GET /api/workflows` - Get workflows
- `POST /api/workflows` - Create workflow
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow
- `POST /api/workflows/:id/execute` - Execute workflow

### Chatbot Endpoints
- `GET /api/chatbot/messages` - Get messages
- `POST /api/chatbot/send` - Send message
- `GET /api/chatbot/config` - Get config
- `PUT /api/chatbot/config` - Update config

## 📝 Next Steps

1. **Setup Backend**: Cấu hình n8n workflows
2. **Google Drive Integration**: Setup OAuth credentials
3. **Chatbot Setup**: Cấu hình Zalo/Facebook webhooks
4. **DeepFace Integration**: Setup AI processing service
5. **Production Deploy**: Deploy to production server

## 🆘 Troubleshooting

### Common Issues

**Port already in use**
```bash
# Kill process using port 3000
npx kill-port 3000
```

**Module not found**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors**
```bash
# Check TypeScript config
npx tsc --noEmit
```

**Build errors**
```bash
# Clean build
rm -rf dist
npm run build
```

## 📞 Support

- Check console errors
- Verify API endpoints
- Check network requests
- Review TypeScript errors

---
