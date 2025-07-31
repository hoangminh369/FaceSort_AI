# Backend - Smart Photo Manager

## Mô tả chức năng

Backend cung cấp API RESTful để xử lý toàn bộ logic nghiệp vụ của hệ thống quản lý ảnh thông minh. Hệ thống tích hợp AI để phân tích khuôn mặt, so sánh ảnh và tự động chọn ảnh đẹp nhất.

## Các chức năng chính

### 🔐 Xác thực và phân quyền (Auth)
- **Đăng nhập/đăng ký** người dùng với JWT tokens
- **Phân quyền** admin/user với middleware authentication
- **Quản lý users** (CRUD operations cho admin)
- **Middleware bảo mật** với error handling và rate limiting

### 📸 Xử lý ảnh (Images)  
- **Upload ảnh** đa định dạng với multer
- **Lưu trữ metadata** ảnh trong MongoDB
- **Tích hợp DeepFace** để phân tích khuôn mặt
- **So sánh embeddings** để tìm ảnh tương tự
- **Đánh giá chất lượng** ảnh tự động

### 🔗 Tích hợp Google Drive
- **OAuth2 authentication** với Google Drive API  
- **Quét thư mục** tự động để tìm ảnh mới
- **Download/upload** ảnh từ/lên Drive
- **Tạo thư mục** và sao chép ảnh tự động
- **Thiết lập quyền public** cho thư mục kết quả

### 🤖 Chatbot AI
- **Webhook handlers** cho Zalo và Facebook Messenger
- **Xử lý tin nhắn** và phân tích intent
- **Workflow tự động** để xử lý ảnh khách hàng:
  - Nhận ảnh từ chatbot
  - So sánh với thư mục Drive của admin
  - Tìm ảnh matching và chọn ảnh đẹp nhất  
  - Tạo thư mục kết quả và chia sẻ link
- **Thống kê hệ thống** và trạng thái processing

### ⚙️ Tích hợp N8N Workflows
- **REST API calls** đến N8N workflows
- **Trigger workflows** cho:
  - Google Drive scanning
  - DeepFace processing 
  - Image comparison và selection
  - Chatbot notifications
- **Workflow orchestration** để xử lý các tác vụ phức tạp

## Công nghệ sử dụng

- **Node.js + Express.js** - Web framework
- **TypeScript** - Type safety
- **MongoDB + Mongoose** - Database và ODM
- **JWT** - Authentication
- **Multer** - File upload handling  
- **Axios** - HTTP client cho external APIs
- **Python scripts** - DeepFace integration
- **Google Drive API** - Cloud storage integration

## Cấu trúc thư mục

```
src/
├── config/         # Database và cấu hình hệ thống
├── controllers/    # Business logic và API handlers  
├── middleware/     # Authentication, error handling
├── models/         # MongoDB schemas và models
├── routes/         # API routing definitions
├── services/       # External integrations (Google Drive, N8N, DeepFace)
└── index.ts        # Entry point và server setup
```

## API Endpoints chính

- **Auth**: `/api/auth/*` - Authentication và user management
- **Images**: `/api/images/*` - Image upload và processing
- **Drive**: `/api/drive/*` - Google Drive integration
- **Chatbot**: `/api/chatbot/*` - Chatbot webhooks và messaging
- **Workflows**: `/api/workflows/*` - N8N workflow management
- **System**: `/api/system/*` - System statistics và health checks

## Workflow xử lý ảnh

1. **Upload ảnh** khách hàng qua chatbot hoặc web interface
2. **Extract embeddings** từ ảnh khách hàng bằng DeepFace
3. **Quét Google Drive** của admin để lấy tất cả ảnh
4. **So sánh embeddings** để tìm ảnh matching
5. **Đánh giá chất lượng** và tính điểm tổng hợp
6. **Chọn ảnh đẹp nhất** dựa trên similarity + quality scores
7. **Tạo thư mục kết quả** trên Google Drive
8. **Sao chép ảnh** được chọn vào thư mục mới
9. **Thiết lập public permission** và trả về link chia sẻ

## Default Accounts

- Admin: `admin@example.com` / `admin123`
- User: `user@example.com` / `user123` 