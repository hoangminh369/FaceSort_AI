<template>
  <div class="workflow-management">
    <div class="page-header fade-in-down">
      <h1>Workflow Management</h1>
      <p>Configure and monitor automated system workflows</p>
    </div>

    <el-card class="workflow-card animate-card">
      <template #header>
        <div class="card-header">
          <h2>Available Workflows</h2>
          <el-button 
            type="primary" 
            @click="showCreateDialog = true" 
            class="add-button pulse-on-hover"
          >
            <el-icon><Plus /></el-icon> Create Workflow
          </el-button>
        </div>
      </template>
      
      <div class="table-toolbar" v-if="workflows.length > 0">
        <el-input
          v-model="searchQuery"
          placeholder="Search workflows"
          clearable
          prefix-icon="Search"
          class="search-input"
        />
        
        <el-select 
          v-model="typeFilter" 
          placeholder="Filter by type" 
          clearable 
          class="type-filter"
        >
          <el-option label="All Types" value="" />
          <el-option label="Scan Drive" value="scan_drive" />
          <el-option label="Process Images" value="process_images" />
          <el-option label="Send Notification" value="send_notification" />
        </el-select>
      </div>
      
      <el-table 
        v-loading="loading" 
        :data="filteredWorkflows" 
        border 
        stripe
        style="width: 100%"
        row-key="id"
        class="workflow-table"
      >
        <el-table-column prop="name" label="Name" min-width="180">
          <template #default="{ row }">
            <div class="workflow-name">
              <el-icon class="workflow-icon" :class="getWorkflowIconClass(row.type)">
                <component :is="getWorkflowIcon(row.type)" />
              </el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="description" label="Description" min-width="220" show-overflow-tooltip />
        
        <el-table-column prop="type" label="Type" width="160">
          <template #default="{ row }">
            <el-tag 
              :type="getWorkflowTypeTag(row.type)" 
              effect="light"
              size="small"
              class="type-tag"
            >
              {{ formatWorkflowType(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="Status" width="120">
          <template #default="{ row }">
            <div class="status-container">
              <span 
                class="status-indicator" 
                :class="row.status"
              ></span>
              <el-tag 
                :type="getStatusTag(row.status)" 
                effect="light"
                size="small"
              >
                {{ row.status }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="Schedule" width="180">
          <template #default="{ row }">
            <div class="schedule-info">
              <div v-if="row.lastRun" class="schedule-time">
                <el-icon><Clock /></el-icon>
                <span>{{ row.lastRun ? formatDate(row.lastRun) : 'Never' }}</span>
              </div>
              <div v-if="row.nextRun" class="next-run">
                Next: {{ formatDate(row.nextRun) }}
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="Actions" width="160" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-tooltip content="Run Workflow" placement="top">
                <el-button 
                  type="primary" 
                  size="small" 
                  circle
                  @click="runWorkflow(row)"
                  class="action-button"
                >
                  <el-icon><VideoPlay /></el-icon>
                </el-button>
              </el-tooltip>
              
              <el-tooltip content="Edit Workflow" placement="top">
                <el-button 
                  type="info" 
                  size="small" 
                  circle
                  @click="editWorkflow(row)"
                  class="action-button"
                >
                  <el-icon><Edit /></el-icon>
                </el-button>
              </el-tooltip>
              
              <el-tooltip content="Delete Workflow" placement="top">
                <el-button 
                  type="danger" 
                  size="small" 
                  circle
                  @click="confirmDelete(row)"
                  class="action-button"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="empty-state" v-if="workflows.length === 0 && !loading">
        <el-empty description="No workflows found">
          <el-button type="primary" @click="showCreateDialog = true">Create Workflow</el-button>
        </el-empty>
      </div>
      
      <el-pagination
        v-if="workflows.length > 10"
        class="pagination"
        layout="total, prev, pager, next"
        :total="workflows.length"
        :page-size="10"
      />
    </el-card>
    
    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="showCreateDialog"
      :title="isEditing ? 'Edit Workflow' : 'Create Workflow'"
      width="560px"
      destroy-on-close
      class="workflow-dialog"
    >
      <el-form 
        :model="workflowForm" 
        label-position="top" 
        :rules="formRules"
        ref="workflowFormRef"
        class="workflow-form"
      >
        <el-form-item label="Name" prop="name">
          <el-input 
            v-model="workflowForm.name" 
            placeholder="Workflow Name"
            class="input-animate"
            @focus="handleFocus"
            @blur="handleBlur"
          />
        </el-form-item>
        
        <el-form-item label="Description" prop="description">
          <el-input 
            v-model="workflowForm.description" 
            type="textarea" 
            :rows="2" 
            placeholder="Workflow Description"
            class="input-animate"
            @focus="handleFocus"
            @blur="handleBlur"
          />
        </el-form-item>
        
        <el-form-item label="Type" prop="type">
          <el-select 
            v-model="workflowForm.type" 
            placeholder="Select Workflow Type" 
            style="width: 100%"
            class="select-animate"
          >
            <el-option label="Scan Drive" value="scan_drive">
              <div class="option-with-icon">
                <el-icon><FolderOpened /></el-icon>
                <span>Scan Drive</span>
              </div>
            </el-option>
            <el-option label="Process Images" value="process_images">
              <div class="option-with-icon">
                <el-icon><Picture /></el-icon>
                <span>Process Images</span>
              </div>
            </el-option>
            <el-option label="Send Notification" value="send_notification">
              <div class="option-with-icon">
                <el-icon><Bell /></el-icon>
                <span>Send Notification</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="Status" prop="status">
          <el-select 
            v-model="workflowForm.status" 
            placeholder="Select Status" 
            style="width: 100%"
            class="select-animate"
          >
            <el-option label="Active" value="active">
              <div class="option-with-icon">
                <span class="status-dot active"></span>
                <span>Active</span>
              </div>
            </el-option>
            <el-option label="Inactive" value="inactive">
              <div class="option-with-icon">
                <span class="status-dot inactive"></span>
                <span>Inactive</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showCreateDialog = false">Cancel</el-button>
          <el-button 
            type="primary" 
            @click="saveWorkflow" 
            :loading="saving"
            class="pulse-on-hover"
          >
            Save
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- Success notification -->
    <div class="save-notification" :class="{ 'show-notification': showNotification }">
      <el-icon size="20"><Check /></el-icon>
      <span>{{ notificationMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { workflowApi } from '@/services/api'
import type { Workflow } from '@/types'
import { format } from 'date-fns'

// State
const workflows = ref<Workflow[]>([])
const loading = ref(false)
const saving = ref(false)
const showCreateDialog = ref(false)
const isEditing = ref(false)
const workflowFormRef = ref<FormInstance>()
const searchQuery = ref('')
const typeFilter = ref('')
const showNotification = ref(false)
const notificationMessage = ref('')

// Form
const workflowForm = reactive({
  id: '',
  name: '',
  description: '',
  type: 'scan_drive' as 'scan_drive' | 'process_images' | 'send_notification',
  status: 'active' as 'active' | 'inactive',
  config: {}
})

// Form validation
const formRules = {
  name: [{ required: true, message: 'Name is required', trigger: 'blur' }],
  type: [{ required: true, message: 'Type is required', trigger: 'change' }],
  status: [{ required: true, message: 'Status is required', trigger: 'change' }]
}

// Computed properties
const filteredWorkflows = computed(() => {
  let result = [...workflows.value]
  
  // Apply search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(workflow => 
      workflow.name.toLowerCase().includes(query) || 
      (workflow.description && workflow.description.toLowerCase().includes(query))
    )
  }
  
  // Apply type filter
  if (typeFilter.value) {
    result = result.filter(workflow => workflow.type === typeFilter.value)
  }
  
  return result
})

// Helper functions
const handleFocus = (event: Event) => {
  const target = event.target as HTMLElement
  const parent = target.closest('.el-form-item') as HTMLElement
  if (parent) {
    parent.classList.add('input-focused')
  }
}

const handleBlur = (event: Event) => {
  const target = event.target as HTMLElement
  const parent = target.closest('.el-form-item') as HTMLElement
  if (parent) {
    parent.classList.remove('input-focused')
  }
}

const showSuccessNotification = (message: string) => {
  notificationMessage.value = message
  showNotification.value = true
  setTimeout(() => {
    showNotification.value = false
  }, 3000)
}

// Lifecycle
onMounted(async () => {
  await fetchWorkflows()
})

// Methods
const fetchWorkflows = async () => {
  loading.value = true
  try {
    workflows.value = await workflowApi.getWorkflows()
    // Add mock data if API returns empty
    if (workflows.value.length === 0) {
      workflows.value = [
        { 
          id: '1', 
          name: 'Daily Drive Scanner',
          description: 'Scans Google Drive daily for new photos',
          type: 'scan_drive',
          status: 'active',
          lastRun: '2023-10-15T10:30:00',
          nextRun: '2023-10-16T10:30:00',
          config: {}
        },
        {
          id: '2',
          name: 'Face Detection Processor',
          description: 'Processes images to detect and catalog faces',
          type: 'process_images',
          status: 'running',
          lastRun: '2023-10-15T14:15:00',
          config: {}
        },
        {
          id: '3',
          name: 'Weekly Report',
          description: 'Sends weekly processing report to admins',
          type: 'send_notification',
          status: 'inactive',
          lastRun: '2023-10-08T09:00:00',
          nextRun: '2023-10-15T09:00:00',
          config: {}
        }
      ]
    }
  } catch (error) {
    console.error('Failed to fetch workflows:', error)
    ElMessage({
      message: 'Failed to fetch workflows',
      type: 'error',
      duration: 5000
    })
  } finally {
    setTimeout(() => {
      loading.value = false
    }, 500)
  }
}

const resetForm = () => {
  workflowForm.id = ''
  workflowForm.name = ''
  workflowForm.description = ''
  workflowForm.type = 'scan_drive'
  workflowForm.status = 'active'
  workflowForm.config = {}
  if (workflowFormRef.value) {
    workflowFormRef.value.resetFields()
  }
}

const runWorkflow = async (workflow: Workflow) => {
  try {
    await workflowApi.executeWorkflow(workflow.id)
    showSuccessNotification(`Workflow "${workflow.name}" started successfully`)
    await fetchWorkflows() // Refresh list
  } catch (error) {
    console.error('Failed to run workflow:', error)
    ElMessage({
      message: 'Failed to run workflow',
      type: 'error',
      duration: 5000
    })
  }
}

const editWorkflow = (workflow: Workflow) => {
  isEditing.value = true
  workflowForm.id = workflow.id
  workflowForm.name = workflow.name
  workflowForm.description = workflow.description
  workflowForm.type = workflow.type
  workflowForm.status = workflow.status
  workflowForm.config = workflow.config || {}
  showCreateDialog.value = true
}

const confirmDelete = (workflow: Workflow) => {
  ElMessageBox.confirm(
    `Are you sure you want to delete the workflow "${workflow.name}"?`,
    'Warning',
    {
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await workflowApi.deleteWorkflow(workflow.id)
      showSuccessNotification('Workflow deleted successfully')
      await fetchWorkflows() // Refresh list
    } catch (error) {
      console.error('Failed to delete workflow:', error)
      ElMessage({
        message: 'Failed to delete workflow',
        type: 'error',
        duration: 5000
      })
    }
  }).catch(() => {
    // User canceled
  })
}

const saveWorkflow = async () => {
  if (!workflowFormRef.value) return
  
  await workflowFormRef.value.validate(async (valid) => {
    if (!valid) {
      return false
    }
    
    saving.value = true
    try {
      if (isEditing.value) {
        await workflowApi.updateWorkflow(workflowForm.id, workflowForm)
        showSuccessNotification('Workflow updated successfully')
      } else {
        await workflowApi.createWorkflow(workflowForm)
        showSuccessNotification('Workflow created successfully')
      }
      
      showCreateDialog.value = false
      resetForm()
      isEditing.value = false
      await fetchWorkflows() // Refresh list
    } catch (error) {
      console.error('Failed to save workflow:', error)
      ElMessage({
        message: 'Failed to save workflow',
        type: 'error',
        duration: 5000
      })
    } finally {
      saving.value = false
    }
  })
}

// Formatters and helpers
const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), 'yyyy-MM-dd HH:mm')
  } catch (e) {
    return dateString
  }
}

const formatWorkflowType = (type: string) => {
  const typeMap: Record<string, string> = {
    'scan_drive': 'Scan Drive',
    'process_images': 'Process Images',
    'send_notification': 'Send Notification'
  }
  return typeMap[type] || type
}

const getWorkflowTypeTag = (type: string) => {
  const tagMap: Record<string, string> = {
    'scan_drive': 'info',
    'process_images': 'success',
    'send_notification': 'warning'
  }
  return tagMap[type] || ''
}

const getWorkflowIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    'scan_drive': 'FolderOpened',
    'process_images': 'Picture',
    'send_notification': 'Bell'
  }
  return iconMap[type] || 'Setting'
}

const getWorkflowIconClass = (type: string) => {
  return `workflow-icon-${type}`
}

const getStatusTag = (status: string) => {
  const tagMap: Record<string, string> = {
    'active': 'success',
    'inactive': 'info',
    'running': 'warning',
    'error': 'danger'
  }
  return tagMap[status] || ''
}
</script>

<style scoped>
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

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

@keyframes statusPulse {
  0% { box-shadow: 0 0 0 0 rgba(103, 194, 58, 0.4); }
  70% { box-shadow: 0 0 0 4px rgba(103, 194, 58, 0); }
  100% { box-shadow: 0 0 0 0 rgba(103, 194, 58, 0); }
}

.workflow-management {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  opacity: 0;
  animation: fadeIn 0.5s ease-out forwards;
}

.page-header {
  margin-bottom: 32px;
  animation: fadeInDown 0.5s ease-out forwards;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #333;
  letter-spacing: -0.5px;
}

.page-header p {
  margin: 0;
  color: #666;
  font-size: 16px;
}

.animate-card {
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
  transition: all 0.3s ease;
}

.workflow-card {
  margin-top: 20px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.workflow-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-3px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.add-button {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.pulse-on-hover:hover {
  animation: pulse 1s infinite;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.table-toolbar {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.search-input {
  max-width: 300px;
}

.type-filter {
  width: 180px;
}

.workflow-table {
  transition: all 0.3s ease;
}

.workflow-table :deep(.el-table__row) {
  transition: all 0.3s ease;
}

.workflow-table :deep(.el-table__row:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  z-index: 1;
  position: relative;
}

.workflow-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.workflow-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.workflow-icon-scan_drive {
  background: linear-gradient(135deg, #409EFF, #2980b9);
}

.workflow-icon-process_images {
  background: linear-gradient(135deg, #67C23A, #27ae60);
}

.workflow-icon-send_notification {
  background: linear-gradient(135deg, #E6A23C, #d35400);
}

.type-tag {
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: capitalize;
}

.status-container {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.active {
  background: #67C23A;
  animation: statusPulse 2s infinite;
}

.status-indicator.running {
  background: #E6A23C;
  animation: statusPulse 1s infinite;
}

.status-indicator.inactive {
  background: #909399;
}

.status-indicator.error {
  background: #F56C6C;
}

.schedule-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.schedule-time {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #606266;
}

.next-run {
  font-size: 12px;
  color: #909399;
  margin-left: 20px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-button {
  transition: all 0.3s ease;
}

.action-button:hover {
  transform: translateY(-2px);
}

.empty-state {
  padding: 40px 0;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.workflow-dialog {
  border-radius: 12px;
  overflow: hidden;
}

.workflow-dialog :deep(.el-dialog__header) {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.workflow-dialog :deep(.el-dialog__title) {
  font-weight: 600;
  font-size: 18px;
  color: #333;
}

.workflow-dialog :deep(.el-dialog__body) {
  padding: 24px 20px;
}

.workflow-dialog :deep(.el-dialog__footer) {
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
}

.workflow-form {
  max-width: 100%;
}

.input-animate {
  transition: all 0.3s ease;
  border-radius: 8px;
}

.input-animate:hover {
  transform: translateY(-1px);
}

.input-focused {
  transform: translateY(-2px);
}

.input-focused .el-input__wrapper {
  box-shadow: 0 0 0 1px #409EFF !important;
}

.select-animate {
  transition: all 0.3s ease;
}

.select-animate:hover :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.5) !important;
}

.option-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.active {
  background-color: #67C23A;
}

.status-dot.inactive {
  background-color: #909399;
}

.save-notification {
  position: fixed;
  bottom: -60px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #67C23A;
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  z-index: 9999;
}

.show-notification {
  bottom: 20px;
}

:deep(.el-input__wrapper),
:deep(.el-select .el-input__wrapper),
:deep(.el-textarea__inner) {
  border-radius: 8px;
}

:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
}

:deep(.el-card__header) {
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
  padding: 16px 20px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #333;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .card-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .add-button {
    width: 100%;
    justify-content: center;
  }
  
  .table-toolbar {
    flex-direction: column;
  }
  
  .search-input,
  .type-filter {
    width: 100%;
    max-width: none;
  }
  
  .workflow-dialog {
    width: 95% !important;
  }
}

.fade-in-down {
  animation: fadeInDown 0.5s ease-out forwards;
}
</style> 