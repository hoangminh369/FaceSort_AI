# n8n Backend Workflows

This directory contains the n8n workflows for the Smart Photo Management System.

## 📋 Structure

```
n8n-workflows/
├── core-workflows/        # Main system workflows
│   ├── google-drive-scanner.json
│   ├── deepface-processing.json
│   ├── image-selection.json
│   └── chatbot-response.json
├── ai-integration/        # AI specific workflows
│   ├── face-detection.json
│   ├── quality-assessment.json
│   └── best-photo-selection.json
├── chatbot-integration/   # Chatbot integration workflows
│   ├── zalo-webhooks.json
│   ├── facebook-webhooks.json
│   └── message-processing.json
└── security/              # Security related workflows
    ├── authentication.json
    ├── rate-limiting.json
    └── error-handling.json
```

## 🚀 Setup Instructions

### Prerequisites

1. Install Node.js (v14 or later)
2. Install n8n globally:

```bash
npm install n8n -g
```

### Configuration

1. Create a `.env` file in the root directory with the following variables:

```
# n8n Configuration
N8N_PORT=5678
N8N_PROTOCOL=http
N8N_HOST=localhost
N8N_PATH=/
N8N_USER_FOLDER=./.n8n

# Database Configuration
DB_TYPE=sqlite
DB_PATH=./.n8n/database.sqlite

# Google Drive API
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_DRIVE_FOLDER_ID=your_folder_id

# DeepFace Local Configuration (No API key required)
# DeepFace is now integrated locally via Python scripts

# Chatbot Integration
ZALO_ACCESS_TOKEN=your_zalo_token
FACEBOOK_PAGE_TOKEN=your_facebook_token
WEBHOOK_SECRET=your_webhook_secret
```

### Running n8n

Start the n8n server:

```bash
n8n start
```

Access the n8n editor at: http://localhost:5678

### Importing Workflows

1. Open n8n editor
2. Go to Workflows
3. Click "Import from File"
4. Select the workflow JSON file you want to import

## 📋 Workflow Descriptions

### Core Workflows

- **Google Drive Scanner**: Scans specified Google Drive folders for new images
- **DeepFace Processing**: Processes images with DeepFace API for face detection
- **Image Selection**: Selects the best images based on quality scores
- **Chatbot Response**: Sends notifications to users via Zalo/Facebook

### AI Integration

- **Face Detection**: Detects faces in images and stores metadata
- **Quality Assessment**: Assesses image quality based on multiple factors
- **Best Photo Selection**: Algorithm to select the best photos of each person

### Chatbot Integration

- **Zalo Webhooks**: Handles incoming messages from Zalo
- **Facebook Webhooks**: Handles incoming messages from Facebook Messenger
- **Message Processing**: Processes user commands and responds accordingly

### Security

- **Authentication**: Handles user authentication and token management
- **Rate Limiting**: Implements API rate limiting to prevent abuse
- **Error Handling**: Centralized error handling and logging 