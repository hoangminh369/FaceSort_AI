<template>
  <div class="workflow-management">
    <h1>Workflow Management</h1>
    <el-card class="workflow-card">
      <template #header>
        <div class="card-header">
          <h2>Available Workflows</h2>
          <el-button type="primary" @click="showCreateDialog = true">
            <el-icon><Plus /></el-icon> Create Workflow
          </el-button>
        </div>
      </template>
      
      <el-table 
        v-loading="loading" 
        :data="workflows" 
        border 
        stripe
        style="width: 100%"
      >
        <el-table-column prop="name" label="Name" />
        <el-table-column prop="description" label="Description" />
        <el-table-column prop="type" label="Type">
          <template #default="{ row }">
            <el-tag :type="getWorkflowTypeTag(row.type)">{{ formatWorkflowType(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="Status">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastRun" label="Last Run">
          <template #default="{ row }">
            {{ row.lastRun ? formatDate(row.lastRun) : 'Never' }}
          </template>
        </el-table-column>
        <el-table-column prop="nextRun" label="Next Run">
          <template #default="{ row }">
            {{ row.nextRun ? formatDate(row.nextRun) : 'Not scheduled' }}
          </template>
        </el-table-column>
        <el-table-column label="Actions">
          <template #default="{ row }">
            <el-button-group>
              <el-button type="primary" size="small" @click="runWorkflow(row)">
                <el-icon><VideoPlay /></el-icon>
              </el-button>
              <el-button type="info" size="small" @click="editWorkflow(row)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button type="danger" size="small" @click="confirmDelete(row)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- Create/Edit Dialog -->
    <el-dialog
      v-model="showCreateDialog"
      :title="isEditing ? 'Edit Workflow' : 'Create Workflow'"
      width="50%"
    >
      <el-form 
        :model="workflowForm" 
        label-position="top" 
        :rules="formRules"
        ref="workflowFormRef"
      >
        <el-form-item label="Name" prop="name">
          <el-input v-model="workflowForm.name" placeholder="Workflow Name" />
        </el-form-item>
        
        <el-form-item label="Description" prop="description">
          <el-input 
            v-model="workflowForm.description" 
            type="textarea" 
            :rows="2" 
            placeholder="Workflow Description" 
          />
        </el-form-item>
        
        <el-form-item label="Type" prop="type">
          <el-select v-model="workflowForm.type" placeholder="Select Workflow Type" style="width: 100%">
            <el-option label="Scan Drive" value="scan_drive" />
            <el-option label="Process Images" value="process_images" />
            <el-option label="Send Notification" value="send_notification" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="Status" prop="status">
          <el-select v-model="workflowForm.status" placeholder="Select Status" style="width: 100%">
            <el-option label="Active" value="active" />
            <el-option label="Inactive" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">Cancel</el-button>
        <el-button type="primary" @click="saveWorkflow" :loading="saving">
          Save
        </el-button>
      </template>
    </el-dialog>
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

// Lifecycle
onMounted(async () => {
  await fetchWorkflows()
})

// Methods
const fetchWorkflows = async () => {
  loading.value = true
  try {
    workflows.value = await workflowApi.getWorkflows()
  } catch (error) {
    console.error('Failed to fetch workflows:', error)
    ElMessage.error('Failed to fetch workflows')
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  workflowForm.id = ''
  workflowForm.name = ''
  workflowForm.description = ''
  workflowForm.type = 'scan_drive'
  workflowForm.status = 'active'
  workflowForm.config = {}
}

const runWorkflow = async (workflow: Workflow) => {
  try {
    await workflowApi.executeWorkflow(workflow.id)
    ElMessage.success(`Workflow "${workflow.name}" started successfully`)
    await fetchWorkflows() // Refresh list
  } catch (error) {
    console.error('Failed to run workflow:', error)
    ElMessage.error('Failed to run workflow')
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
      ElMessage.success('Workflow deleted successfully')
      await fetchWorkflows() // Refresh list
    } catch (error) {
      console.error('Failed to delete workflow:', error)
      ElMessage.error('Failed to delete workflow')
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
        ElMessage.success('Workflow updated successfully')
      } else {
        await workflowApi.createWorkflow(workflowForm)
        ElMessage.success('Workflow created successfully')
      }
      
      showCreateDialog.value = false
      resetForm()
      isEditing.value = false
      await fetchWorkflows() // Refresh list
    } catch (error) {
      console.error('Failed to save workflow:', error)
      ElMessage.error('Failed to save workflow')
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
.workflow-management {
  padding: 20px;
}

.workflow-card {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
}
</style> 