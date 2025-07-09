"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const { google } = require('googleapis')

class GoogleDriveService {
  /**
   * Build an authenticated drive client
   */
  getClient (driveConfig) {
    const { clientId, clientSecret, refreshToken } = driveConfig

    if (!clientId || !clientSecret) {
      throw new Error('Google Drive client ID and client secret are required')
    }

    const redirectUri = 'http://localhost:5000/api/drive/oauth2callback'
    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

    if (!refreshToken) {
      throw new Error('No refresh token available. Please authorize the application first.')
    }

    oAuth2Client.setCredentials({ refresh_token: refreshToken })
    return google.drive({ version: 'v3', auth: oAuth2Client })
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl (driveConfig, state = '') {
    const { clientId, clientSecret } = driveConfig

    if (!clientId || !clientSecret) {
      throw new Error('Google Drive client ID and client secret are required')
    }

    const redirectUri = 'http://localhost:5000/api/drive/oauth2callback'
    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

    return oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.metadata.readonly'
      ],
      prompt: 'consent',
      state
    })
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens (driveConfig, code) {
    const { clientId, clientSecret } = driveConfig
    if (!clientId || !clientSecret) {
      throw new Error('Google Drive client ID and client secret are required')
    }

    const redirectUri = 'http://localhost:5000/api/drive/oauth2callback'
    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    const { tokens } = await oAuth2Client.getToken(code)
    return tokens
  }

  /**
   * List folders in Google Drive
   */
  async listFolders (driveConfig, parentId = 'root') {
    try {
      const drive = this.getClient(driveConfig)
      const res = await drive.files.list({
        q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name, mimeType, parents)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      })
      return res.data.files || []
    } catch (error) {
      console.error('Error listing folders:', error)
      const msg = error?.errors?.[0]?.message || error.message || 'Unknown error'
      throw new Error(`Failed to list folders: ${msg}`)
    }
  }

  /**
   * List files in Google Drive folder
   */
  async listFiles (driveConfig, parentId = 'root', fileType = '') {
    try {
      const drive = this.getClient(driveConfig)
      let query = `'${parentId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`
      if (fileType) {
        query += ` and mimeType = '${fileType}'`
      }

      const res = await drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, thumbnailLink, webViewLink, size, modifiedTime)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      })
      return res.data.files || []
    } catch (error) {
      console.error('Error listing files:', error)
      const msg = error?.errors?.[0]?.message || error.message || 'Unknown error'
      throw new Error(`Failed to list files: ${msg}`)
    }
  }
}

module.exports = new GoogleDriveService()
