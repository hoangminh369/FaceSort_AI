<template>
  <div class="drive-explorer">
    <div class="page-header fade-in-down">
      <h1>Google Drive Explorer</h1>
      <p>Browse your connected Google Drive folders</p>
      
      <el-tooltip
        content="Keyboard Shortcuts"
        placement="right"
        :show-after="500"
      >
        <el-button
          class="keyboard-help-btn"
          circle
          size="small"
          @click="showKeyboardShortcuts"
        >
          <el-icon><QuestionFilled /></el-icon>
        </el-button>
      </el-tooltip>
    </div>

    <el-alert
      v-if="configError"
      type="warning"
      :title="configError"
      description="Please configure your Google Drive settings first."
      show-icon
      :closable="false"
      class="mb-4"
    >
      <template #default>
        <div class="mt-3">
          <el-button type="primary" @click="goToSetup">Configure Drive</el-button>
          <el-button @click="checkConfig">Retry Connection</el-button>
        </div>
      </template>
    </el-alert>

    <el-row :gutter="24" v-if="!configError">
      <!-- Main toolbar -->
      <el-col :span="24" class="mb-4">
        <el-card class="toolbar-card animate-card">
          <div class="drive-toolbar">
            <div class="toolbar-left">
              <el-button-group>
                <el-button @click="refreshExplorer" :loading="isRefreshing">
                  <el-icon><Refresh /></el-icon>
                  <span class="hidden-xs-only">Refresh</span>
                </el-button>
                <el-button @click="navigateUp" :disabled="breadcrumbs.length <= 1">
                  <el-icon><ArrowUp /></el-icon>
                  <span class="hidden-xs-only">Up</span>
                </el-button>
              </el-button-group>
              
              <el-button-group class="ml-2">
                <el-button @click="changeViewMode('grid')" :type="viewMode === 'grid' ? 'primary' : ''">
                  <el-icon><Grid /></el-icon>
                </el-button>
                <el-button @click="changeViewMode('table')" :type="viewMode === 'table' ? 'primary' : ''">
                  <el-icon><List /></el-icon>
                </el-button>
              </el-button-group>
            </div>
            
            <div class="toolbar-center">
              <div class="breadcrumb-container">
                <el-breadcrumb separator="/">
                  <el-breadcrumb-item v-for="(crumb, index) in breadcrumbs" :key="index">
                    <span @click="navigateToFolder(crumb)" :class="{ 'breadcrumb-link': index < breadcrumbs.length - 1 }">
                      {{ crumb.name === 'root' ? 'Root' : crumb.name }}
                    </span>
                  </el-breadcrumb-item>
                </el-breadcrumb>
              </div>
            </div>
            
            <div class="toolbar-right">
              <div class="search-box">
                <el-input
                  v-model="searchQuery"
                  placeholder="Search files..."
                  clearable
                  @input="filterItems"
                >
                  <template #prefix>
                    <el-icon><Search /></el-icon>
                  </template>
                </el-input>
              </div>
              
              <el-dropdown class="ml-2 hidden-xs-only" trigger="click">
                <el-button>
                  <el-icon><Sort /></el-icon>
                  <span>Sort</span>
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="sortFiles('name', 'asc')">
                      <el-icon><SortUp /></el-icon> Name (A-Z)
                    </el-dropdown-item>
                    <el-dropdown-item @click="sortFiles('name', 'desc')">
                      <el-icon><SortDown /></el-icon> Name (Z-A)
                    </el-dropdown-item>
                    <el-dropdown-item @click="sortFiles('modifiedTime', 'desc')">
                      <el-icon><Timer /></el-icon> Modified (Newest)
                    </el-dropdown-item>
                    <el-dropdown-item @click="sortFiles('modifiedTime', 'asc')">
                      <el-icon><Timer /></el-icon> Modified (Oldest)
                    </el-dropdown-item>
                    <el-dropdown-item @click="sortFiles('size', 'desc')">
                      <el-icon><Files /></el-icon> Size (Largest)
                    </el-dropdown-item>
                    <el-dropdown-item @click="sortFiles('size', 'asc')">
                      <el-icon><Files /></el-icon> Size (Smallest)
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <!-- Folder tree -->
      <el-col :xs="24" :sm="24" :md="8" :lg="6" :xl="5">
        <el-card header="Folders" class="folder-card animate-card" v-loading="loadingTree">
          <div v-if="loadingTree" class="loading-placeholder">
            <el-skeleton :rows="5" animated />
          </div>
          
          <el-tree
            v-else-if="treeData.length > 0"
            :data="treeData"
            node-key="id"
            :props="defaultProps"
            @node-click="handleNodeClick"
            :expand-on-click-node="false"
            highlight-current
            default-expand-all
            class="drive-folder-tree"
          >
            <template #default="{ node, data }">
              <div class="folder-node">
                <el-icon><Folder /></el-icon>
                <span class="folder-name">{{ node.label }}</span>
                <div class="folder-actions" @click.stop>
                  <el-dropdown trigger="click" size="small">
                    <el-button type="text" size="small">
                      <el-icon><MoreFilled /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item @click="refreshFolder(data)">
                          <el-icon><Refresh /></el-icon> Refresh
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </div>
            </template>
          </el-tree>
          
          <div v-else class="empty-folder">
            <el-icon><Folder /></el-icon>
            <p>No folders found in this location</p>
          </div>
        </el-card>
      </el-col>
      
      <!-- Files content -->
      <el-col :xs="24" :sm="24" :md="16" :lg="18" :xl="19">
        <el-card class="items-card animate-card">
          <template #header>
            <div class="card-header-with-actions">
              <span>Files in {{ currentFolder.name || 'Root' }}</span>
              <span class="item-count" v-if="filteredItems.length > 0">{{ filteredItems.length }} items</span>
            </div>
          </template>
          
          <div v-if="loadingItems" class="loading-placeholder">
            <el-skeleton :rows="8" animated />
          </div>
          
          <div v-else-if="filteredItems.length === 0" class="empty-state">
            <el-empty description="">
              <template #image>
                <el-icon class="empty-icon"><Document /></el-icon>
              </template>
              <template #description>
                <div class="empty-text">
                  <p class="empty-title">No files found in this folder</p>
                  <p class="empty-subtitle">Try a different folder or refresh</p>
                </div>
              </template>
              <el-button @click="loadFiles(currentFolder.id)">Refresh</el-button>
            </el-empty>
          </div>
          
          <div v-else-if="viewMode === 'grid'" 
            class="file-grid"
            @dragover.prevent
            @drop.prevent="onDrop">
            <el-card 
              v-for="item in filteredItems" 
              :key="item.id" 
              class="file-card"
              shadow="hover"
              :body-style="{ padding: '0' }"
              @dblclick="handleFileAction(item)"
              @contextmenu.prevent="openContextMenu($event, item)"
              :class="{ 'selected-file': selectedFiles.includes(item.id) }"
              @click="handleFileSelection(item, $event)"
            >
              <div class="file-preview">
                <img 
                  v-if="item.thumbnailLink" 
                  :src="item.thumbnailLink" 
                  :alt="item.name" 
                  class="thumbnail"
                  loading="lazy"
                />
                <div v-else class="file-icon">
                  <el-icon v-if="isImageFile(item.mimeType)"><Picture /></el-icon>
                  <el-icon v-else-if="isDocumentFile(item.mimeType)"><Document /></el-icon>
                  <el-icon v-else-if="isVideoFile(item.mimeType)"><VideoPlay /></el-icon>
                  <el-icon v-else><Files /></el-icon>
                </div>
              </div>
              <div class="file-info">
                <div class="file-name" :title="item.name">{{ item.name }}</div>
                <div class="file-meta">
                  <span>{{ formatFileSize(item.size) }}</span>
                  <span>{{ formatDate(item.modifiedTime) }}</span>
                </div>
                <div class="file-actions">
                  <el-button-group size="small">
                    <el-button size="small" v-if="item.webViewLink" @click.stop="openFileLink(item.webViewLink)">
                      <el-icon><View /></el-icon>
                    </el-button>
                    <el-dropdown size="small" trigger="click">
                      <el-button size="small" @click.stop>
                        <el-icon><MoreFilled /></el-icon>
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item @click="openFileLink(item.webViewLink)">
                            <el-icon><View /></el-icon> Open
                          </el-dropdown-item>
                          <el-dropdown-item v-if="isImageFile(item.mimeType) || canPreviewInIframe(item.mimeType)" 
                              @click="previewFileItem(item)">
                            <el-icon><ZoomIn /></el-icon> Preview
                          </el-dropdown-item>
                          <el-dropdown-item @click="downloadFile(item)">
                            <el-icon><Download /></el-icon> Download
                          </el-dropdown-item>
                          <el-dropdown-item @click="copyFileLink(item)">
                            <el-icon><Link /></el-icon> Copy link
                          </el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </el-button-group>
                </div>
              </div>
            </el-card>
          </div>
          
          <el-table 
            v-else 
            :data="filteredItems" 
            style="width: 100%"
            @selection-change="handleTableSelection"
            @row-dblclick="handleFileAction"
            @row-contextmenu="openContextMenu"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column prop="name" label="Name" min-width="200">
              <template #default="{row}">
                <div class="file-row">
                  <el-icon v-if="isImageFile(row.mimeType)"><Picture /></el-icon>
                  <el-icon v-else-if="isDocumentFile(row.mimeType)"><Document /></el-icon>
                  <el-icon v-else-if="isVideoFile(row.mimeType)"><VideoPlay /></el-icon>
                  <el-icon v-else><Files /></el-icon>
                  <span>{{ row.name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="mimeType" label="Type" width="150">
              <template #default="{row}">
                {{ formatMimeType(row.mimeType) }}
              </template>
            </el-table-column>
            <el-table-column label="Size" width="100">
              <template #default="{row}">
                {{ formatFileSize(row.size) }}
              </template>
            </el-table-column>
            <el-table-column label="Modified" width="150">
              <template #default="{row}">
                {{ formatDate(row.modifiedTime) }}
              </template>
            </el-table-column>
            <el-table-column label="Actions" width="120" fixed="right">
              <template #default="{row}">
                <el-button-group size="small">
                  <el-button 
                    size="small"
                    v-if="row.webViewLink"
                    @click.stop="openFileLink(row.webViewLink)"
                  >
                    <el-icon><View /></el-icon>
                  </el-button>
                  <el-dropdown size="small" trigger="click">
                    <el-button size="small" @click.stop>
                      <el-icon><MoreFilled /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item @click="openFileLink(row.webViewLink)">
                          <el-icon><View /></el-icon> Open
                        </el-dropdown-item>
                        <el-dropdown-item v-if="isImageFile(row.mimeType) || canPreviewInIframe(row.mimeType)" 
                            @click="previewFileItem(row)">
                          <el-icon><ZoomIn /></el-icon> Preview
                        </el-dropdown-item>
                        <el-dropdown-item @click="downloadFile(row)">
                          <el-icon><Download /></el-icon> Download
                        </el-dropdown-item>
                        <el-dropdown-item @click="copyFileLink(row)">
                          <el-icon><Link /></el-icon> Copy link
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- Context Menu -->
    <div 
      v-show="contextMenuVisible"
      class="context-menu"
      :style="{
        left: `${contextMenuX}px`,
        top: `${contextMenuY}px`
      }"
    >
      <ul>
        <li v-if="contextMenuItem?.webViewLink" @click="openFileLink(contextMenuItem.webViewLink)">
          <el-icon><View /></el-icon> Open
        </li>
        <li v-if="contextMenuItem && (isImageFile(contextMenuItem.mimeType) || canPreviewInIframe(contextMenuItem.mimeType))" 
            @click="previewFileItem(contextMenuItem)">
          <el-icon><ZoomIn /></el-icon> Preview
        </li>
        <li @click="downloadFile(contextMenuItem)">
          <el-icon><Download /></el-icon> Download
        </li>
        <li v-if="contextMenuItem?.webViewLink" @click="copyFileLink(contextMenuItem)">
          <el-icon><Link /></el-icon> Copy link
        </li>
        <li class="divider"></li>
        <li @click="refreshExplorer">
          <el-icon><Refresh /></el-icon> Refresh
        </li>
      </ul>
    </div>

    <!-- Keyboard shortcuts dialog -->
    <el-dialog
      v-model="showShortcutsDialog"
      title="Keyboard Shortcuts"
      width="400px"
      destroy-on-close
      align-center
    >
      <div class="shortcuts-container">
        <div class="shortcut-group">
          <h4>Navigation</h4>
          <div class="shortcut-item">
            <span class="key-combo">
              <span class="key">Alt</span> + <span class="key">↑</span>
            </span>
            <span class="shortcut-desc">Go up one folder</span>
          </div>
        </div>
        
        <div class="shortcut-group">
          <h4>Actions</h4>
          <div class="shortcut-item">
            <span class="key-combo">
              <span class="key">F5</span>
            </span>
            <span class="shortcut-desc">Refresh files</span>
          </div>
          <div class="shortcut-item">
            <span class="key-combo">
              <span class="key">Ctrl</span> + <span class="key">R</span>
            </span>
            <span class="shortcut-desc">Refresh files</span>
          </div>
          <div class="shortcut-item">
            <span class="key-combo">
              <span class="key">Enter</span>
            </span>
            <span class="shortcut-desc">Open selected file</span>
          </div>
          <div class="shortcut-item">
            <span class="key-combo">
              <span class="key">Ctrl</span> + <span class="key">A</span>
            </span>
            <span class="shortcut-desc">Select all files</span>
          </div>
          <div class="shortcut-item">
            <span class="key-combo">
              <span class="key">Ctrl</span> + <span class="key">C</span>
            </span>
            <span class="shortcut-desc">Copy selected file link</span>
          </div>
          <div class="shortcut-item">
            <span class="key-combo">
              <span class="key">Esc</span>
            </span>
            <span class="shortcut-desc">Close context menu</span>
          </div>
        </div>
        
        <div class="shortcut-group">
          <h4>Selection</h4>
          <div class="shortcut-item">
            <span class="key-combo">
              <span class="key">Ctrl</span> + <span class="key">Click</span>
            </span>
            <span class="shortcut-desc">Multi-select files</span>
          </div>
          <div class="shortcut-item">
            <span class="key-combo">
              <span class="key">Shift</span> + <span class="key">Click</span>
            </span>
            <span class="shortcut-desc">Range select files</span>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- File Preview Dialog -->
    <el-dialog
      v-model="showPreviewDialog"
      :title="previewFile?.name || 'File Preview'"
      width="80%"
      destroy-on-close
      class="file-preview-dialog"
    >
      <div class="file-preview-container">
        <!-- Image preview -->
        <img 
          v-if="isImageFile(previewFile?.mimeType || '')" 
          :src="previewFile?.webViewLink" 
          class="preview-image" 
        />
        
        <!-- Document preview (iframe for PDF or Google Docs) -->
        <iframe
          v-else-if="canPreviewInIframe(previewFile?.mimeType || '')"
          :src="previewFile?.webViewLink"
          class="preview-iframe"
          allow="fullscreen"
        ></iframe>
        
        <!-- Default preview (no preview available) -->
        <div v-else class="preview-not-available">
          <div class="preview-icon">
            <el-icon v-if="isDocumentFile(previewFile?.mimeType || '')"><Document /></el-icon>
            <el-icon v-else-if="isVideoFile(previewFile?.mimeType || '')"><VideoPlay /></el-icon>
            <el-icon v-else><Files /></el-icon>
          </div>
          <h3>Preview not available</h3>
          <p>This file type cannot be previewed. Please open it externally.</p>
          <el-button @click="openFileLink(previewFile?.webViewLink || '')">
            Open File
          </el-button>
        </div>
      </div>
      
      <template #footer>
        <div class="preview-footer">
          <div class="file-info">
            <strong>Type:</strong> {{ formatMimeType(previewFile?.mimeType || '') }}
            <span class="info-divider">|</span>
            <strong>Size:</strong> {{ formatFileSize(previewFile?.size || '') }}
          </div>
          <div class="preview-actions">
            <el-button @click="downloadFile(previewFile)">
              <el-icon><Download /></el-icon> Download
            </el-button>
            <el-button type="primary" @click="openFileLink(previewFile?.webViewLink || '')">
              <el-icon><View /></el-icon> Open in Drive
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { driveApi } from '@/services/api'
import { useRouter } from 'vue-router'
import { Document, View, Grid, List, Folder, Refresh, Search, Picture, VideoPlay, Files, ArrowUp, MoreFilled, Sort, SortUp, SortDown, Timer, Download, Link, ArrowDown, Check, QuestionFilled, ZoomIn } from '@element-plus/icons-vue'

interface FolderNode {
  id: string
  name: string
  mimeType: string
  children?: FolderNode[]
}

interface FileItem {
  id: string
  name: string
  mimeType: string
  thumbnailLink?: string
  webViewLink?: string
  size?: string
  modifiedTime?: string
}

const router = useRouter()
const treeData = ref<FolderNode[]>([])
const defaultProps = { label: 'name', children: 'children' }
const loadingTree = ref(false)
const loadingItems = ref(false)
const items = ref<FileItem[]>([])
const configError = ref<string | null>(null)
const viewMode = ref<'grid' | 'table'>('grid')

// Root folder id comes from DriveConfig; default to 'root'
const rootFolderId = ref<string>('root')

const breadcrumbs = ref<FolderNode[]>([])
const currentFolder = ref<FolderNode>({ id: '', name: '', mimeType: '' })
const searchQuery = ref('')
const isRefreshing = ref(false)

// New state for enhanced features
const selectedFiles = ref<string[]>([])
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuItem = ref<FileItem | null>(null)
const sortField = ref<string>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')

// Close context menu when clicking anywhere else
const closeContextMenu = () => {
  contextMenuVisible.value = false
}

document.addEventListener('click', closeContextMenu)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeContextMenu()
})

// Sort filtered items based on current sort field and order
const filteredItems = computed(() => {
  let result = items.value

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(item => 
      item.name.toLowerCase().includes(query) || 
      formatMimeType(item.mimeType).toLowerCase().includes(query)
    )
  }
  
  // Apply sorting
  return result.sort((a, b) => {
    let fieldA: any = a[sortField.value as keyof FileItem] || ''
    let fieldB: any = b[sortField.value as keyof FileItem] || ''
    
    // Special handling for size which might be a string
    if (sortField.value === 'size' && typeof fieldA === 'string' && typeof fieldB === 'string') {
      fieldA = parseInt(fieldA) || 0
      fieldB = parseInt(fieldB) || 0
    }
    
    if (fieldA < fieldB) return sortOrder.value === 'asc' ? -1 : 1
    if (fieldA > fieldB) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
})

// Sort files by specified field and order
const sortFiles = (field: string, order: 'asc' | 'desc') => {
  sortField.value = field
  sortOrder.value = order
}

const loadFolders = async (parentId: string) => {
  loadingTree.value = true
  try {
    const folders = await driveApi.listDriveFolders(parentId)
    return folders.map((f: any) => ({ ...f, children: [] }))
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || error.message || 'Failed to load folders'
    if (error.response?.status === 404 || errorMsg.includes('configuration not found')) {
      configError.value = 'Google Drive configuration not found'
    } else if (error.response?.status === 400 || errorMsg.includes('not linked')) {
      configError.value = 'Google Drive not properly linked'
    } else {
      ElMessage.error(errorMsg)
    }
    return []
  } finally {
    loadingTree.value = false
  }
}

const loadFiles = async (parentId: string) => {
  loadingItems.value = true
  try {
    const files = await driveApi.listDriveFiles(parentId)
    items.value = files
    selectedFiles.value = [] // Reset selection when loading new files
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || error.message || 'Failed to load files'
    ElMessage.error(errorMsg)
    items.value = []
  } finally {
    loadingItems.value = false
  }
}

const refreshExplorer = async () => {
  isRefreshing.value = true
  try {
    await Promise.all([
      buildTree(),
      loadFiles(currentFolder.value.id || rootFolderId.value)
    ])
    ElMessage.success('Files refreshed successfully')
  } catch (error) {
    ElMessage.error('Failed to refresh files')
  } finally {
    isRefreshing.value = false
  }
}

const refreshFolder = async (folder: FolderNode) => {
  try {
    // If it's the current folder, reload files
    if (folder.id === currentFolder.value.id) {
      loadFiles(folder.id)
    }
    
    // Refresh folder's children
    folder.children = await loadFolders(folder.id)
    ElMessage.success('Folder refreshed successfully')
  } catch (error) {
    ElMessage.error('Failed to refresh folder')
  }
}

const navigateUp = () => {
  if (breadcrumbs.value.length <= 1) return
  
  // Navigate to parent folder (second last in breadcrumbs)
  const parentIndex = breadcrumbs.value.length - 2
  const parentFolder = breadcrumbs.value[parentIndex]
  navigateToFolder(parentFolder)
}

const checkConfig = async () => {
  configError.value = null
  try {
    const cfg = await driveApi.getDriveConfig()
    rootFolderId.value = cfg.folderId || 'root'

    // Initialize breadcrumbs and current folder
    breadcrumbs.value = [{
      id: rootFolderId.value,
      name: rootFolderId.value === 'root' ? 'Root' : 'Selected',
      mimeType: ''
    }]
    currentFolder.value = { id: rootFolderId.value, name: breadcrumbs.value[0].name, mimeType: '' }

    buildTree()
    loadFiles(rootFolderId.value)
  } catch (error: any) {
    configError.value = 'Google Drive configuration not found'
  }
}

const buildTree = async () => {
  treeData.value = await loadFolders(rootFolderId.value)
}

const handleNodeClick = async (data: FolderNode) => {
  currentFolder.value = data
  
  // Update breadcrumbs
  const index = breadcrumbs.value.findIndex(crumb => crumb.id === data.id)
  if (index > -1) {
    // If already in breadcrumbs, trim to this point
    breadcrumbs.value = breadcrumbs.value.slice(0, index + 1)
  } else {
    // Add to breadcrumbs
    breadcrumbs.value.push(data)
  }
  
  // Load files for this folder
  loadFiles(data.id)
  
  // Load subfolders if needed
  if (data.children && data.children.length === 0) {
    data.children = await loadFolders(data.id)
  }
}

const navigateToFolder = (folder: FolderNode) => {
  const index = breadcrumbs.value.findIndex(crumb => crumb.id === folder.id)
  if (index > -1) {
    breadcrumbs.value = breadcrumbs.value.slice(0, index + 1)
    currentFolder.value = folder
    loadFiles(folder.id)
  }
}

// Handle file action on double click (open file)
const handleFileAction = (file: FileItem) => {
  // If it's an image or a previewable document, show preview
  if (isImageFile(file.mimeType) || canPreviewInIframe(file.mimeType)) {
    previewFileItem(file)
  } else if (file.webViewLink) {
    openFileLink(file.webViewLink)
  }
}

// Handle file selection with click or multi-select with Ctrl/Shift
const handleFileSelection = (item: FileItem, event: MouseEvent) => {
  // For multi-select with Ctrl key
  if (event.ctrlKey || event.metaKey) {
    const index = selectedFiles.value.indexOf(item.id)
    if (index > -1) {
      // Remove from selection
      selectedFiles.value.splice(index, 1)
    } else {
      // Add to selection
      selectedFiles.value.push(item.id)
    }
  } 
  // For range select with Shift key
  else if (event.shiftKey && selectedFiles.value.length > 0) {
    const allItems = filteredItems.value
    const lastSelectedId = selectedFiles.value[selectedFiles.value.length - 1]
    const lastSelectedIndex = allItems.findIndex(f => f.id === lastSelectedId)
    const currentIndex = allItems.findIndex(f => f.id === item.id)
    
    const start = Math.min(lastSelectedIndex, currentIndex)
    const end = Math.max(lastSelectedIndex, currentIndex)
    
    // Select all items in the range
    const newSelection = allItems.slice(start, end + 1).map(f => f.id)
    selectedFiles.value = [...new Set([...selectedFiles.value, ...newSelection])]
  }
  // Single select
  else {
    selectedFiles.value = [item.id]
  }
}

// Handle table selection change
const handleTableSelection = (selection: FileItem[]) => {
  selectedFiles.value = selection.map(item => item.id)
}

// Open context menu for file item
const openContextMenu = (event: MouseEvent | { clientX: number, clientY: number }, item: FileItem) => {
  event.preventDefault?.()
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuItem.value = item
  contextMenuVisible.value = true
  
  // Add the item to selection if not already selected
  if (!selectedFiles.value.includes(item.id)) {
    selectedFiles.value = [item.id]
  }
  
  // Make sure the context menu doesn't go off-screen
  nextTick(() => {
    const menu = document.querySelector('.context-menu') as HTMLElement
    if (!menu) return
    
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    if (contextMenuX.value + menu.offsetWidth > viewportWidth) {
      contextMenuX.value = viewportWidth - menu.offsetWidth - 10
    }
    
    if (contextMenuY.value + menu.offsetHeight > viewportHeight) {
      contextMenuY.value = viewportHeight - menu.offsetHeight - 10
    }
  })
}

// Handle drag and drop for files
const onDrop = async (event: DragEvent) => {
  // This would typically upload files, but we'll just show a message
  const files = event.dataTransfer?.files
  
  if (files && files.length > 0) {
    ElMessage({
      message: `Dropped ${files.length} file(s). Upload functionality not implemented yet.`,
      type: 'info'
    })
  }
}

const goToSetup = () => {
  router.push('/admin/system-config')
}

const changeViewMode = (mode: 'grid' | 'table') => {
  viewMode.value = mode
}

const filterItems = () => {
  // This is handled by the computed property
}

// Download file implementation
const downloadFile = (item: FileItem | null) => {
  if (!item?.webViewLink) {
    ElMessage.warning('Download link not available')
    return
  }
  
  // In a real implementation, you would make an API call to get a download URL
  // For now, just open the web view link which usually allows downloading
  window.open(item.webViewLink, '_blank')
  ElMessage.success('Downloading file...')
}

// Copy link to clipboard
const copyFileLink = (item: FileItem | null) => {
  if (!item?.webViewLink) {
    ElMessage.warning('File link not available')
    return
  }
  
  navigator.clipboard.writeText(item.webViewLink)
    .then(() => {
      ElMessage({
        message: 'Link copied to clipboard',
        type: 'success',
        icon: Check,
        duration: 2000
      })
    })
    .catch(() => {
      ElMessage.error('Failed to copy link')
    })
}

const formatFileSize = (size?: string) => {
  if (!size) return '-'
  const sizeNum = parseInt(size, 10)
  if (isNaN(sizeNum)) return size
  
  if (sizeNum < 1024) return `${sizeNum} B`
  if (sizeNum < 1024 * 1024) return `${(sizeNum / 1024).toFixed(1)} KB`
  if (sizeNum < 1024 * 1024 * 1024) return `${(sizeNum / (1024 * 1024)).toFixed(1)} MB`
  return `${(sizeNum / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString()
}

const formatMimeType = (mimeType: string) => {
  if (!mimeType) return 'Unknown'
  
  if (mimeType.includes('image/')) return 'Image'
  if (mimeType.includes('video/')) return 'Video'
  if (mimeType.includes('audio/')) return 'Audio'
  if (mimeType.includes('text/')) return 'Text'
  if (mimeType.includes('application/pdf')) return 'PDF'
  if (mimeType.includes('application/vnd.google-apps.document')) return 'Google Doc'
  if (mimeType.includes('application/vnd.google-apps.spreadsheet')) return 'Google Sheet'
  if (mimeType.includes('application/vnd.google-apps.presentation')) return 'Google Slides'
  
  return mimeType.split('/').pop() || mimeType
}

const isImageFile = (mimeType: string) => {
  return mimeType && (mimeType.includes('image/') || mimeType.includes('google-apps.drawing'))
}

const isDocumentFile = (mimeType: string) => {
  return mimeType && (
    mimeType.includes('text/') || 
    mimeType.includes('application/pdf') ||
    mimeType.includes('google-apps.document') ||
    mimeType.includes('google-apps.spreadsheet')
  )
}

const isVideoFile = (mimeType: string) => {
  return mimeType && mimeType.includes('video/')
}

const openFileLink = (url: string) => {
  window.open(url, '_blank')
}

// Add keyboard navigation
const setupKeyboardNavigation = () => {
  document.addEventListener('keydown', handleKeyDown)
}

const handleKeyDown = (e: KeyboardEvent) => {
  // Only process keyboard events when not inside an input field
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return
  }

  // Navigation commands
  if (e.key === 'ArrowUp' && e.altKey) {
    e.preventDefault()
    navigateUp()
  }
  // Refresh with F5 or Ctrl+R
  else if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
    e.preventDefault()
    refreshExplorer()
  }
  // Select all with Ctrl+A
  else if (e.ctrlKey && e.key === 'a') {
    e.preventDefault()
    selectedFiles.value = filteredItems.value.map(item => item.id)
  }
  // Copy link with Ctrl+C when a file is selected
  else if (e.ctrlKey && e.key === 'c' && selectedFiles.value.length === 1) {
    e.preventDefault()
    const selectedFile = filteredItems.value.find(file => file.id === selectedFiles.value[0])
    if (selectedFile) {
      copyFileLink(selectedFile)
    }
  }
  // Open with Enter key
  else if (e.key === 'Enter' && selectedFiles.value.length === 1) {
    e.preventDefault()
    const selectedFile = filteredItems.value.find(file => file.id === selectedFiles.value[0])
    if (selectedFile) {
      handleFileAction(selectedFile)
    }
  }
}

const showShortcutsDialog = ref(false)

const showKeyboardShortcuts = () => {
  showShortcutsDialog.value = true
}

const showPreviewDialog = ref(false)
const previewFile = ref<FileItem | null>(null)

const previewFileItem = (item: FileItem) => {
  previewFile.value = item
  showPreviewDialog.value = true
}

const canPreviewInIframe = (mimeType: string): boolean => {
  return (
    mimeType.includes('application/pdf') ||
    mimeType.includes('google-apps.document') ||
    mimeType.includes('google-apps.spreadsheet') ||
    mimeType.includes('google-apps.presentation')
  )
}

onMounted(() => {
  checkConfig()
  setupKeyboardNavigation()
})

// Clean up event listeners on component unmount
onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
  document.removeEventListener('keydown', closeContextMenu)
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.drive-explorer {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
  position: relative;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
}

.page-header p {
  color: #666;
  margin: 0;
}

.fade-in-down {
  animation: fadeInDown 0.5s ease forwards;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-card {
  transition: all 0.3s ease;
  animation: fadeIn 0.4s ease forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.folder-card, .items-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  overflow: hidden;
}

.items-card {
  height: calc(100vh - 280px);
  overflow-y: auto;
}

.folder-card {
  height: calc(100vh - 280px);
  overflow-y: auto;
}

.toolbar-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  margin-bottom: 16px;
}

.drive-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-center {
  flex-grow: 2;
  display: flex;
  justify-content: center;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.breadcrumb-container {
  padding: 8px 16px;
  background-color: #f9f9f9;
  border-radius: 8px;
  width: 100%;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: thin;
}

.breadcrumb-link {
  cursor: pointer;
  color: #409EFF;
  transition: all 0.2s ease;
}

.breadcrumb-link:hover {
  text-decoration: underline;
  color: #337ecc;
}

.search-box {
  width: 250px;
}

@media (max-width: 768px) {
  .search-box {
    width: 100%;
  }
  
  .toolbar-center {
    order: -1;
    width: 100%;
    margin-bottom: 12px;
  }
  
  .toolbar-left, .toolbar-right {
    width: 100%;
    justify-content: space-between;
  }
}

.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  grid-gap: 16px;
  padding: 8px;
}

.file-card {
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
  height: 230px;
  display: flex;
  flex-direction: column;
}

.file-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.12);
}

.selected-file {
  box-shadow: 0 0 0 2px #409EFF !important;
  transform: scale(1.02);
}

.file-preview {
  height: 140px;
  background-color: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.file-card:hover .thumbnail {
  transform: scale(1.05);
}

.file-icon {
  font-size: 48px;
  color: #909399;
}

.file-info {
  padding: 12px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.file-meta {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  display: flex;
  justify-content: space-between;
}

.file-actions {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.folder-node {
  display: flex;
  align-items: center;
  padding: 4px 0;
  width: 100%;
}

.folder-name {
  flex: 1;
  margin-left: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.folder-node:hover .folder-actions {
  opacity: 1;
}

.drive-folder-tree {
  height: calc(100vh - 320px);
  overflow-y: auto;
}

.drive-folder-tree :deep(.el-tree-node__content) {
  height: 36px;
  border-radius: 4px;
}

.drive-folder-tree :deep(.el-tree-node__content:hover) {
  background-color: #f0f7ff;
}

.drive-folder-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background-color: #ecf5ff;
}

.empty-folder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #909399;
}

.empty-folder .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state {
  padding: 40px 0;
}

.empty-icon {
  font-size: 64px;
  color: #909399;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  margin: 16px 0 8px;
}

.empty-subtitle {
  color: #909399;
}

.loading-placeholder {
  padding: 20px;
}

.context-menu {
  position: fixed;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0,0,0,0.15);
  padding: 4px 0;
  min-width: 180px;
  z-index: 1000;
  animation: fadeIn 0.15s ease;
}

.context-menu ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.context-menu li {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
  transition: all 0.2s ease;
}

.context-menu li:hover {
  background-color: #f0f7ff;
  color: #409EFF;
}

.context-menu .divider {
  height: 1px;
  background-color: #eee;
  margin: 4px 0;
}

.card-header-with-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-count {
  font-size: 14px;
  color: #909399;
  font-weight: normal;
}

:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-table th) {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 600;
}

:deep(.el-table__row.hover-row > td.el-table__cell) {
  background-color: #f0f7ff;
}

:deep(.el-table__row.current-row > td.el-table__cell) {
  background-color: #ecf5ff;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-3 {
  margin-top: 12px;
}

.ml-2 {
  margin-left: 8px;
}

@media (max-width: 576px) {
  .hidden-xs-only {
    display: none;
  }
}

:deep(.el-card__header) {
  padding: 16px 20px;
  font-weight: 600;
}

:deep(.el-tree-node__label) {
  font-size: 14px;
}

.keyboard-help-btn {
  position: absolute;
  top: 0;
  right: 0;
  opacity: 0.7;
  transition: all 0.2s ease;
}

.keyboard-help-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.shortcuts-container {
  padding: 0 10px;
}

.shortcut-group {
  margin-bottom: 20px;
}

.shortcut-group h4 {
  margin: 0 0 10px 0;
  padding-bottom: 5px;
  border-bottom: 1px solid #eee;
  color: #409EFF;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.key-combo {
  display: flex;
  align-items: center;
  gap: 4px;
}

.key {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #f5f7fa;
  border: 1px solid #dcdfe6;
  box-shadow: 0 2px 0 #d9d9d9;
  font-size: 12px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.shortcut-desc {
  color: #606266;
}

.file-preview-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.file-preview-container {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
}

.preview-image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.preview-iframe {
  width: 100%;
  height: 70vh;
  border: none;
}

.preview-not-available {
  text-align: center;
  padding: 40px;
}

.preview-icon {
  font-size: 64px;
  color: #909399;
  margin-bottom: 20px;
}

.preview-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.file-info {
  color: #606266;
}

.info-divider {
  margin: 0 10px;
  color: #dcdfe6;
}

.preview-actions {
  display: flex;
  gap: 10px;
}
</style> 