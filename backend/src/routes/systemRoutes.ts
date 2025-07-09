import express from 'express'
import { getSystemStats } from '../controllers/systemController'
import { authenticate, authorize } from '../middleware/auth'

const router = express.Router()

router.use(authenticate)
router.use(authorize('admin'))

router.get('/stats', getSystemStats)

export default router 