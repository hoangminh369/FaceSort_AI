import { Request, Response } from 'express';
import User from '../models/User';
import Image from '../models/Image';

// @desc    Get overall system statistics
// @route   GET /api/system/stats
// @access  Private/Admin
export const getSystemStats = async (req: Request, res: Response) => {
  try {
    const [totalUsers, totalImages, processedImages, facesData, storageAgg] = await Promise.all([
      User.countDocuments({}),
      Image.countDocuments({}),
      Image.countDocuments({ status: 'processed' }),
      Image.aggregate([
        { $group: { _id: null, faces: { $sum: '$faceCount' } } }
      ]),
      Image.aggregate([
        { $group: { _id: null, storage: { $sum: '$size' } } }
      ])
    ])

    const totalFacesDetected = facesData.length > 0 ? facesData[0].faces : 0
    const storageUsed = storageAgg.length > 0 ? storageAgg[0].storage : 0

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalImages,
        totalProcessed: processedImages,
        totalFacesDetected,
        storageUsed
      }
    })
  } catch (error) {
    console.error('Get system stats error:', error)
    res.status(500).json({ success: false, error: 'Server error' })
  }
} 