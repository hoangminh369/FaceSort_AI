import { google } from 'googleapis'
import { IDriveConfig } from '../models/DriveConfig'
import config from '../config/config'

export interface DriveFolder {
  id: string
  name: string
  mimeType: string
  parents?: string[]
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  thumbnailLink?: string
  webViewLink?: string
  size?: string
  modifiedTime?: string
}

class GoogleDriveService {
  private getClient(driveConfig: IDriveConfig) {
    const { clientId, clientSecret, refreshToken } = driveConfig
    
    // Use config values if not specified in driveConfig
    const finalClientId = clientId || config.googleDrive.clientId
    const finalClientSecret = clientSecret || config.googleDrive.clientSecret
    
    if (!finalClientId || !finalClientSecret) {
      throw new Error('Google Drive client ID and client secret are required')
    }
    
    // Set up redirect URI - this should match what's registered in Google Cloud Console
    const redirectUri = 'http://localhost:5000/api/drive/oauth2callback'
    
    const oAuth2Client = new google.auth.OAuth2(finalClientId, finalClientSecret, redirectUri)
    
    if (refreshToken) {
      oAuth2Client.setCredentials({ refresh_token: refreshToken })
    } else {
      throw new Error('No refresh token available. Please authorize the application first.')
    }
    
    return google.drive({ version: 'v3', auth: oAuth2Client })
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(driveConfig: IDriveConfig, state: string = ''): string {
    const { clientId, clientSecret } = driveConfig
    
    // Use config values if not specified in driveConfig
    const finalClientId = clientId || config.googleDrive.clientId
    const finalClientSecret = clientSecret || config.googleDrive.clientSecret
    
    if (!finalClientId || !finalClientSecret) {
      throw new Error('Google Drive client ID and client secret are required')
    }
    
    const redirectUri = 'http://localhost:5000/api/drive/oauth2callback'
    const oAuth2Client = new google.auth.OAuth2(finalClientId, finalClientSecret, redirectUri)
    
    const url = oAuth2Client.generateAuthUrl({
      access_type: 'offline', // Required for refresh token
      scope: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.metadata.readonly',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive'
      ],
      prompt: 'consent', // Force to show the consent screen
      state // Pass any state to be returned with the callback
    })
    
    return url
  }
  
  /**
   * Exchange authorization code for tokens
   */
  async getTokens(driveConfig: IDriveConfig, code: string) {
    const { clientId, clientSecret } = driveConfig
    
    // Use config values if not specified in driveConfig
    const finalClientId = clientId || config.googleDrive.clientId
    const finalClientSecret = clientSecret || config.googleDrive.clientSecret
    
    if (!finalClientId || !finalClientSecret) {
      throw new Error('Google Drive client ID and client secret are required')
    }
    
    const redirectUri = 'http://localhost:5000/api/drive/oauth2callback'
    const oAuth2Client = new google.auth.OAuth2(finalClientId, finalClientSecret, redirectUri)
    
    try {
      const { tokens } = await oAuth2Client.getToken(code)
      return tokens
    } catch (error) {
      console.error('Error getting tokens:', error)
      throw new Error('Failed to exchange authorization code for tokens')
    }
  }

  /**
   * List folders in Google Drive
   */
  async listFolders(driveConfig: IDriveConfig, parentId: string = 'root'): Promise<DriveFolder[]> {
    try {
      const drive = this.getClient(driveConfig)
      const res = await drive.files.list({
        q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name, mimeType, parents)'
      })
      return res.data.files as DriveFolder[] || []
    } catch (error: any) {
      console.error('Error listing folders:', error)
      
      // Specific error messages based on error type
      if (error.message?.includes('invalid_grant')) {
        throw new Error('Authorization expired. Please re-authorize the application.')
      }
      
      if (error.message?.includes('refresh token')) {
        throw new Error('Missing refresh token. Please authorize the application.')
      }
      
      throw new Error(`Failed to list folders: ${error.message || 'Unknown error'}`)
    }
  }
  
  /**
   * List files in Google Drive folder
   */
  async listFiles(driveConfig: IDriveConfig, parentId: string = 'root', fileType: string = ''): Promise<DriveFile[]> {
    try {
      const drive = this.getClient(driveConfig)
      
      let query = `'${parentId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`
      
      // Filter by file type if specified
      if (fileType) {
        query += ` and mimeType = '${fileType}'`
      }
      
      const res = await drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, thumbnailLink, webViewLink, size, modifiedTime)'
      })
      
      return res.data.files as DriveFile[] || []
    } catch (error: any) {
      console.error('Error listing files:', error)
      
      if (error.message?.includes('invalid_grant')) {
        throw new Error('Authorization expired. Please re-authorize the application.')
      }
      
      throw new Error(`Failed to list files: ${error.message || 'Unknown error'}`)
    }
  }
  
  /**
   * Create a new folder in Google Drive
   */
  async createFolder(driveConfig: IDriveConfig, folderName: string, parentId: string = 'root'): Promise<DriveFolder> {
    try {
      const drive = this.getClient(driveConfig)
      
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
      }
      
      const response = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, mimeType, parents'
      })
      
      return response.data as DriveFolder
    } catch (error: any) {
      console.error('Error creating folder:', error)
      
      if (error.message?.includes('invalid_grant')) {
        throw new Error('Authorization expired. Please re-authorize the application.')
      }
      
      throw new Error(`Failed to create folder: ${error.message || 'Unknown error'}`)
    }
  }
  
  /**
   * Copy a file to another folder in Google Drive
   */
  async copyFile(driveConfig: IDriveConfig, fileId: string, destinationFolderId: string, newName?: string): Promise<DriveFile> {
    try {
      const drive = this.getClient(driveConfig)
      
      // First, get the original file to preserve its metadata
      const originalFile = await drive.files.get({
        fileId,
        fields: 'name,mimeType'
      })
      
      // Copy the file
      const copiedFile = await drive.files.copy({
        fileId,
        requestBody: {
          name: newName || originalFile.data.name,
          parents: [destinationFolderId]
        },
        fields: 'id, name, mimeType, thumbnailLink, webViewLink'
      })
      
      return copiedFile.data as DriveFile
    } catch (error: any) {
      console.error('Error copying file:', error)
      
      if (error.message?.includes('invalid_grant')) {
        throw new Error('Authorization expired. Please re-authorize the application.')
      }
      
      throw new Error(`Failed to copy file: ${error.message || 'Unknown error'}`)
    }
  }
  
  /**
   * Set public permissions for a file or folder
   */
  async setPublicPermission(driveConfig: IDriveConfig, fileId: string): Promise<string> {
    try {
      const drive = this.getClient(driveConfig)
      
      // Create a public permission
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      })
      
      // Get the file to retrieve its web view link
      const file = await drive.files.get({
        fileId,
        fields: 'webViewLink,webContentLink'
      })
      
      // Return the public URL
      return file.data.webViewLink || file.data.webContentLink || ''
    } catch (error: any) {
      console.error('Error setting public permission:', error)
      
      if (error.message?.includes('invalid_grant')) {
        throw new Error('Authorization expired. Please re-authorize the application.')
      }
      
      throw new Error(`Failed to set public permission: ${error.message || 'Unknown error'}`)
    }
  }
  
  /**
   * Get all image files from Google Drive (across folders)
   */
  async getAllImageFiles(driveConfig: IDriveConfig, maxResults: number = 1000): Promise<DriveFile[]> {
    try {
      const drive = this.getClient(driveConfig)
      
      // Query for all image files
      const query = "mimeType contains 'image/' and trashed = false"
      
      const res = await drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, thumbnailLink, webViewLink, size, modifiedTime)',
        pageSize: maxResults
      })
      
      return res.data.files as DriveFile[] || []
    } catch (error: any) {
      console.error('Error listing image files:', error)
      
      if (error.message?.includes('invalid_grant')) {
        throw new Error('Authorization expired. Please re-authorize the application.')
      }
      
      throw new Error(`Failed to list image files: ${error.message || 'Unknown error'}`)
    }
  }
}

export default new GoogleDriveService()