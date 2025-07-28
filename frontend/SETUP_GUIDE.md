# Frontend Setup Guide

## Cài đặt và Cấu hình

### 1. Environment Configuration

Tạo file `.env` trong thư mục `frontend/` với nội dung:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:5000/api

# Development
NODE_ENV=development
VITE_APP_TITLE=Image Gallery Manager
VITE_APP_DESCRIPTION=AI-powered photo management system

# Optional: Mock API for development (khi backend chưa sẵn sàng)
VITE_USE_MOCK_API=false
```

### 2. Cài đặt Dependencies

```bash
cd frontend
npm install
```

### 3. Chạy Development Server

```bash
npm run dev
```

## Các tính năng đã cập nhật

### ImageGallery.vue
- ✅ Kết nối API thực tế thay vì mock data
- ✅ Upload ảnh với drag & drop
- ✅ Hiển thị ảnh với URL đúng format
- ✅ Filter và search ảnh
- ✅ Delete ảnh với xác nhận
- ✅ Processing ảnh qua API
- ✅ Lightbox modal xem chi tiết ảnh
- ✅ Pagination và stats
- ✅ Error handling và loading states
- ✅ Responsive design

### UserDashboard.vue  
- ✅ Stats overview từ API thực tế
- ✅ Quick upload với preview
- ✅ Recent photos từ API
- ✅ Processing queue với progress
- ✅ Upload & Process trong một lần
- ✅ Image detail modal
- ✅ Error handling khi API thất bại
- ✅ Loading states

### API Integration
- ✅ Enhanced error handling
- ✅ Proper URL formatting cho images
- ✅ Fallback khi API connection thất bại
- ✅ Retry logic và timeout handling
- ✅ Authentication headers
- ✅ Progress tracking

## Troubleshooting

### API Connection Issues
1. Kiểm tra backend server đang chạy trên port 5000
2. Kiểm tra CORS configuration trong backend
3. Verify VITE_API_BASE_URL trong .env file

### Image Upload Issues
1. Kiểm tra file size (max 10MB)
2. Kiểm tra file format (jpg, png, gif)
3. Verify upload endpoint `/api/images/upload`
4. Check authentication token

### Image Display Issues
1. Kiểm tra URL formatting trong getImageUrl()
2. Verify static file serving từ backend
3. Check browser console cho network errors

## API Endpoints sử dụng

- `GET /api/images` - Lấy danh sách ảnh
- `POST /api/images/upload` - Upload ảnh mới
- `DELETE /api/images/:id` - Xóa ảnh
- `POST /api/images/process` - Process ảnh
- `GET /api/auth/profile` - Lấy thông tin user

## Development Tips

1. **Mock API**: Set `VITE_USE_MOCK_API=true` khi backend chưa sẵn sàng
2. **Hot Reload**: File changes sẽ auto-reload trong dev mode
3. **Error Logging**: Check browser console để debug API issues
4. **Network Tab**: Sử dụng DevTools để monitor API calls
5. **Component State**: Vue DevTools để debug component state

## UI/UX Features

- 🎨 Modern, responsive design với Element Plus
- 🌊 Smooth animations và transitions  
- 📱 Mobile-friendly interface
- 🔄 Loading states và progress indicators
- ❌ Comprehensive error handling
- 🎯 Toast notifications cho user feedback
- 🖼️ Image lightbox và detail modals
- 📊 Real-time stats và counters

## Next Steps

1. Kết nối với backend API thực tế
2. Test tất cả chức năng upload/display/delete
3. Configure production environment
4. Setup deployment pipeline 