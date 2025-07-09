import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User, { IUser } from '../models/User';
import config from '../config/config';

// Generate JWT token
const generateToken = (id: string, role: string): string => {
  return jwt.sign({ id, role }, config.jwtSecret, {
    expiresIn: '30d',
  });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Check if username and password are provided
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide username and password',
      });
    }

    // Find user by username
    const user = await User.findOne({ username });

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Generate token
    const userId = user._id as mongoose.Types.ObjectId;
    const token = generateToken(userId.toString(), user.role);

    // Return user and token
    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: userId,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Private/Admin
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'User already exists',
      });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      role: role || 'user',
    });

    const userId = user._id as mongoose.Types.ObjectId;

    res.status(201).json({
      success: true,
      data: {
        id: userId,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
}; 