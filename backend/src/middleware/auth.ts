import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import User from '../models/User';
import { createError } from './errorHandler';

interface JwtPayload {
  id: string;
  role: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(createError('Authentication required. No token provided.', 401));
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      
      // Check if user still exists
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(createError('User no longer exists', 401));
      }
      
      // Add user info to request
      req.user = {
        id: decoded.id,
        role: decoded.role
      };
      
      next();
    } catch (error) {
      return next(createError('Invalid token', 401));
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return next(createError('Server authentication error', 500));
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(createError('Not authorized to access this resource', 403));
    }
    
    next();
  };
}; 