<template>
  <div class="user-management">
    <div class="page-header">
      <h1>User Management</h1>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        Add New User
      </el-button>
    </div>
    
    <el-card>
      <el-table :data="users" style="width: 100%" v-loading="loading">
        <el-table-column prop="username" label="Username" />
        <el-table-column prop="email" label="Email" />
        <el-table-column prop="role" label="Role">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'">
              {{ row.role }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="Created At" />
        <el-table-column label="Actions" width="200">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="editUser(row)">
              Edit
            </el-button>
            <el-button size="small" type="danger" @click="deleteUser(row.id)">
              Delete
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- Create/Edit Dialog -->
    <el-dialog
      :title="dialogTitle"
      v-model="showCreateDialog"
      width="400px"
    >
      <el-form :model="userForm" label-width="80px">
        <el-form-item label="Username">
          <el-input v-model="userForm.username" />
        </el-form-item>
        <el-form-item label="Email">
          <el-input v-model="userForm.email" />
        </el-form-item>
        <el-form-item label="Role">
          <el-select v-model="userForm.role" style="width: 100%">
            <el-option label="User" value="user" />
            <el-option label="Admin" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="Password" v-if="!editingUser">
          <el-input v-model="userForm.password" type="password" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">Cancel</el-button>
        <el-button type="primary" @click="handleSaveUser">
          {{ editingUser ? 'Update' : 'Create' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { userApi } from '@/services/api'
import type { User } from '@/types'

const users = ref<User[]>([])
const loading = ref(false)
const showCreateDialog = ref(false)
const editingUser = ref<User | null>(null)

const userForm = reactive({
  username: '',
  email: '',
  role: 'user' as 'admin' | 'user',
  password: ''
})

const dialogTitle = computed(() => {
  return editingUser.value ? 'Edit User' : 'Create New User'
})

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
      }
    ]
  } finally {
    loading.value = false
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
  try {
    if (editingUser.value) {
      await userApi.updateUser(editingUser.value.id, userForm)
      ElMessage.success('User updated successfully')
    } else {
      await userApi.createUser(userForm)
      ElMessage.success('User created successfully')
    }
    
    showCreateDialog.value = false
    resetForm()
    loadUsers()
  } catch (error: any) {
    ElMessage.error(error.message || 'Operation failed')
  }
}

const deleteUser = async (userId: string) => {
  try {
    await ElMessageBox.confirm('Are you sure you want to delete this user?', 'Confirm Delete')
    await userApi.deleteUser(userId)
    ElMessage.success('User deleted successfully')
    loadUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || 'Delete failed')
    }
  }
}

const resetForm = () => {
  editingUser.value = null
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
.user-management {
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}
</style> 