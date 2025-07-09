<template>
  <div class="user-management">
    <div class="page-header fade-in-down">
      <h1>User Management</h1>
      <el-button 
        type="primary" 
        @click="showCreateDialog = true"
        class="add-button pulse-on-hover"
      >
        <el-icon><Plus /></el-icon>
        Add New User
      </el-button>
    </div>
    
    <el-card class="users-card animate-card">
      <div class="table-toolbar" v-if="users.length > 0">
        <el-input
          v-model="searchQuery"
          placeholder="Search by username or email"
          class="search-input"
          clearable
          prefix-icon="Search"
        >
        </el-input>
        
        <el-select v-model="roleFilter" placeholder="Filter by role" clearable class="role-filter">
          <el-option label="All Roles" value="" />
          <el-option label="Admin" value="admin" />
          <el-option label="User" value="user" />
        </el-select>
      </div>
      
      <el-table 
        :data="filteredUsers" 
        style="width: 100%" 
        v-loading="loading"
        row-key="id"
        class="user-table"
      >
        <el-table-column prop="username" label="Username" min-width="140">
          <template #default="{ row }">
            <div class="user-name">
              <el-avatar :size="32" :icon="UserFilled" class="user-avatar" />
              <span>{{ row.username }}</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="email" label="Email" min-width="180" />
        
        <el-table-column prop="role" label="Role" width="100">
          <template #default="{ row }">
            <el-tag 
              :type="row.role === 'admin' ? 'danger' : 'primary'"
              effect="light"
              size="small"
              class="role-tag"
            >
              {{ row.role }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="createdAt" label="Created At" width="130" />
        
        <el-table-column label="Actions" width="160" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-tooltip content="Edit User" placement="top">
                <el-button 
                  size="small" 
                  type="primary" 
                  @click="editUser(row)"
                  circle
                  class="action-button"
                >
                  <el-icon><Edit /></el-icon>
                </el-button>
              </el-tooltip>
              
              <el-tooltip content="Delete User" placement="top">
                <el-button 
                  size="small" 
                  type="danger" 
                  @click="deleteUser(row.id)"
                  circle
                  class="action-button"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="empty-state" v-if="users.length === 0 && !loading">
        <el-empty description="No users found">
          <el-button type="primary" @click="showCreateDialog = true">Add User</el-button>
        </el-empty>
      </div>
    </el-card>
    
    <!-- Create/Edit Dialog -->
    <el-dialog
      :title="dialogTitle"
      v-model="showCreateDialog"
      width="460px"
      destroy-on-close
      class="user-dialog"
    >
      <el-form 
        :model="userForm" 
        label-width="100px"
        :rules="userRules"
        ref="userFormRef"
      >
        <el-form-item label="Username" prop="username">
          <el-input 
            v-model="userForm.username" 
            placeholder="Enter username"
            class="input-animate"
            @focus="handleFocus"
            @blur="handleBlur"
          />
        </el-form-item>
        
        <el-form-item label="Email" prop="email">
          <el-input 
            v-model="userForm.email" 
            placeholder="Enter email"
            class="input-animate"
            @focus="handleFocus"
            @blur="handleBlur"
          />
        </el-form-item>
        
        <el-form-item label="Role" prop="role">
          <el-select 
            v-model="userForm.role" 
            style="width: 100%"
            class="select-animate"
          >
            <el-option label="User" value="user" />
            <el-option label="Admin" value="admin" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="Password" prop="password" v-if="!editingUser">
          <el-input 
            v-model="userForm.password" 
            type="password"
            placeholder="Enter password"
            class="input-animate" 
            show-password
            @focus="handleFocus"
            @blur="handleBlur"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showCreateDialog = false">Cancel</el-button>
          <el-button 
            type="primary" 
            @click="handleSaveUser"
            class="pulse-on-hover"
          >
            {{ editingUser ? 'Update' : 'Create' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userApi } from '@/services/api'
import type { User } from '@/types'
import type { FormInstance, FormRules } from 'element-plus'

const users = ref<User[]>([])
const loading = ref(false)
const showCreateDialog = ref(false)
const editingUser = ref<User | null>(null)
const searchQuery = ref('')
const roleFilter = ref('')
const userFormRef = ref<FormInstance>()

const userForm = reactive({
  username: '',
  email: '',
  role: 'user' as 'admin' | 'user',
  password: ''
})

const userRules: FormRules = {
  username: [
    { required: true, message: 'Please enter username', trigger: 'blur' },
    { min: 3, message: 'Username must be at least 3 characters', trigger: 'blur' }
  ],
  email: [
    { required: true, message: 'Please enter email', trigger: 'blur' },
    { type: 'email', message: 'Please enter a valid email', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Please enter password', trigger: 'blur' },
    { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' }
  ],
  role: [
    { required: true, message: 'Please select a role', trigger: 'change' }
  ]
}

const dialogTitle = computed(() => {
  return editingUser.value ? 'Edit User' : 'Create New User'
})

// Filter users by search query and role filter
const filteredUsers = computed(() => {
  let result = [...users.value]
  
  // Apply search query filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(user => 
      user.username.toLowerCase().includes(query) || 
      user.email.toLowerCase().includes(query)
    )
  }
  
  // Apply role filter
  if (roleFilter.value) {
    result = result.filter(user => user.role === roleFilter.value)
  }
  
  return result
})

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

const loadUsers = async () => {
  loading.value = true
  try {
    const response = await userApi.getUsers(1, 100)
    users.value = response.data
  } catch (error) {
    // Use demo data if API fails
    users.value = [
      {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        createdAt: '2024-01-15',
        updatedAt: '2024-01-15'
      },
      {
        id: '2',
        username: 'user1',
        email: 'user1@example.com',
        role: 'user',
        createdAt: '2024-01-16',
        updatedAt: '2024-01-16'
      },
      {
        id: '3',
        username: 'user2',
        email: 'user2@example.com',
        role: 'user',
        createdAt: '2024-02-10',
        updatedAt: '2024-02-10'
      }
    ]
  } finally {
    setTimeout(() => {
      loading.value = false
    }, 500)
  }
}

const editUser = (user: User) => {
  editingUser.value = user
  userForm.username = user.username
  userForm.email = user.email
  userForm.role = user.role
  showCreateDialog.value = true
}

const handleSaveUser = async () => {
  if (!userFormRef.value) return
  
  await userFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    try {
      if (editingUser.value) {
        await userApi.updateUser(editingUser.value.id, userForm)
        ElMessage({
          message: 'User updated successfully',
          type: 'success',
          duration: 3000
        })
      } else {
        await userApi.createUser(userForm)
        ElMessage({
          message: 'User created successfully',
          type: 'success',
          duration: 3000
        })
      }
      
      showCreateDialog.value = false
      resetForm()
      loadUsers()
    } catch (error: any) {
      ElMessage({
        message: error.message || 'Operation failed',
        type: 'error',
        duration: 5000
      })
    }
  })
}

const deleteUser = async (userId: string) => {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to delete this user?', 
      'Confirm Delete',
      {
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }
    )
    await userApi.deleteUser(userId)
    ElMessage({
      message: 'User deleted successfully',
      type: 'success',
      duration: 3000
    })
    loadUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage({
        message: error.message || 'Delete failed',
        type: 'error',
        duration: 5000
      })
    }
  }
}

const resetForm = () => {
  editingUser.value = null
  if (userFormRef.value) {
    userFormRef.value.resetFields()
  }
  Object.assign(userForm, {
    username: '',
    email: '',
    role: 'user',
    password: ''
  })
}

onMounted(() => {
  loadUsers()
})
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

.user-management {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  opacity: 0;
  animation: fadeIn 0.5s ease-out forwards;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  animation: fadeInDown 0.5s ease-out forwards;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: #333;
  letter-spacing: -0.5px;
}

.add-button {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  padding: 12px 20px;
  height: auto;
  font-weight: 500;
  transition: all 0.3s ease;
}

.pulse-on-hover:hover {
  animation: pulse 1s infinite;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.users-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
  opacity: 0;
  animation: fadeInUp 0.6s ease-out 0.2s forwards;
}

.table-toolbar {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.search-input {
  max-width: 300px;
}

.role-filter {
  width: 140px;
}

.user-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  background: linear-gradient(135deg, #409EFF, #2980b9);
}

.user-table {
  transition: all 0.3s ease;
}

.user-table :deep(.el-table__row) {
  transition: all 0.3s ease;
}

.user-table :deep(.el-table__row:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  z-index: 1;
  position: relative;
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

.role-tag {
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: capitalize;
}

.user-dialog {
  border-radius: 12px;
  overflow: hidden;
}

.user-dialog :deep(.el-dialog__header) {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.user-dialog :deep(.el-dialog__title) {
  font-weight: 600;
  font-size: 18px;
  color: #333;
}

.user-dialog :deep(.el-dialog__body) {
  padding: 24px 20px;
}

.user-dialog :deep(.el-dialog__footer) {
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
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

.empty-state {
  padding: 40px 0;
}

:deep(.el-input__wrapper),
:deep(.el-select .el-input__wrapper) {
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

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .add-button {
    width: 100%;
    justify-content: center;
  }
  
  .table-toolbar {
    flex-direction: column;
  }
  
  .search-input,
  .role-filter {
    width: 100%;
    max-width: none;
  }
}

.animate-card {
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
  transition: all 0.3s ease;
}

.fade-in-down {
  animation: fadeInDown 0.5s ease-out forwards;
}
</style> 