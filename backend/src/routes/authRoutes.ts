import express from 'express';
import { login, getProfile, register } from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';
import User, { IUser } from '../models/User';
import mongoose from 'mongoose';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/register', register);

// Protected routes
router.get('/profile', authenticate, getProfile);

// Add user management routes
// These routes will be protected by authentication middleware
router.get('/users', authenticate, authorize('admin'), (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  Promise.all([
    User.find().select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments()
  ])
  .then(([users, total]) => {
    const totalPages = Math.ceil(total / limit);
    
    res.status(200).json({
      success: true,
      data: {
        data: users,
        total,
        page,
        limit,
        totalPages
      }
    });
  })
  .catch((error: Error) => {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching users'
    });
  });
});

router.post('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide username, email, and password'
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Enhanced validation (optional)
    const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordStrengthRegex.test(password)) {
      // Only warn about this, don't reject
      console.warn('Weak password detected during user creation');
    }

    // Username validation
    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Username must be at least 3 characters long'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
    }

    // Role validation
    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Role must be either "admin" or "user"'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      // More specific error message
      if (existingUser.email === email && existingUser.username === username) {
        return res.status(400).json({
          success: false,
          error: 'Both username and email already exist'
        });
      } else if (existingUser.email === email) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Username already exists'
        });
      }
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      role: role || 'user'
    });

    // Log user creation
    console.log(`User created: ${username} (${role || 'user'}) with ID: ${user._id}`);

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Provide more specific error messages based on MongoDB errors
    if (error.name === 'ValidationError') {
      const validationErrors: string[] = [];
      for (const field in error.errors) {
        validationErrors.push(error.errors[field].message);
      }
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors.join(', ')
      });
    }
    
    // Duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'User with this email or username already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error while creating user'
    });
  }
});

router.put('/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password, role } = req.body;

    // Basic validation
    if (!username && !email && !password && !role) {
      return res.status(400).json({
        success: false,
        error: 'No update data provided'
      });
    }

    // Role validation if provided
    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Role must be either "admin" or "user"'
      });
    }

    // Email validation if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid email address'
        });
      }

      // Check if email already exists for another user
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already in use by another user'
        });
      }
    }

    // Username validation if provided
    if (username) {
      if (username.length < 3) {
        return res.status(400).json({
          success: false,
          error: 'Username must be at least 3 characters long'
        });
      }

      // Check if username already exists for another user
      const existingUser = await User.findOne({ username, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username already in use by another user'
        });
      }
    }

    // Handle user update
    let user;
    if (password) {
      // If password is being updated, we need to get the user first
      // so the password hashing middleware can run
      user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Password validation
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long'
        });
      }

      // Update user fields
      if (username) user.username = username;
      if (email) user.email = email;
      if (role) user.role = role;
      user.password = password;

      // Save the user to trigger the password hashing middleware
      await user.save();
    } else {
      // For non-password updates, use findByIdAndUpdate
      const updateData: Partial<IUser> = {};
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      if (role) updateData.role = role;

      user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
    }

    // Log the update
    console.log(`User updated: ${id} (${user.username})`);

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error: any) {
    console.error('Error updating user:', error);

    // Handle specific errors
    if (error.name === 'ValidationError') {
      const validationErrors: string[] = [];
      for (const field in error.errors) {
        validationErrors.push(error.errors[field].message);
      }
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors.join(', ')
      });
    }
    
    // Duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'User with this email or username already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error while updating user'
    });
  }
});

router.delete('/users/:id', authenticate, authorize('admin'), (req, res) => {
  const { id } = req.params;

  User.findByIdAndDelete(id)
    .then((user: IUser | null) => {
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    })
    .catch((error: Error) => {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        error: 'Server error while deleting user'
      });
    });
});

export default router; 