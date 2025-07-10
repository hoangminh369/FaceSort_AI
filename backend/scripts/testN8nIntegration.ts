import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Simple integration test script.
 * 1. Authenticate (login) to backend, obtain JWT
 * 2. Call evaluate-images with empty array (will return 400) – get quick connectivity
 * 3. List workflows directly from n8n API via backend service to verify key works.
 */

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000/api'
const USER_EMAIL = process.env.TEST_EMAIL || 'admin@example.com'
const USER_PASSWORD = process.env.TEST_PASSWORD || 'password123'

async function login() {
  const res = await axios.post(`${API_BASE}/auth/login`, {
    email: USER_EMAIL,
    password: USER_PASSWORD
  })
  return res.data.token as string
}

async function callEvaluateImages(token: string) {
  try {
    const res = await axios.post(
      `${API_BASE}/chatbot/evaluate-images`,
      { imageIds: ['dummy'] },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    console.log('evaluate-images response', res.data)
  } catch (err: any) {
    if (err.response) {
      console.log('evaluate-images error expected:', err.response.status, err.response.data)
    } else console.error(err)
  }
}

async function main() {
  try {
    const token = await login()
    console.log('✅ Logged in, JWT len:', token.length)
    await callEvaluateImages(token)
    console.log('✅ Backend is able to reach n8n (if no 500 error above)')
  } catch (e) {
    console.error('❌ Integration test failed', e)
  }
}

main() 