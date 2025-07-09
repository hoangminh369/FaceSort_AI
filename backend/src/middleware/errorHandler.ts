import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  // name is already in Error interface, no need to redefine it
}

/**
 * Custom error handler middleware for API errors
 * Provides consistent error response format
 */
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle JWT and authentication errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token. Please log in again.',
    });
  }

  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message || 'Validation error',
    });
  }

  // Handle cast errors (invalid IDs, etc)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid data format',
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const isOperational = err.isOperational || false;

  // Log error
  console.error(`[ERROR] ${statusCode} - ${message}`);
  if (!isOperational) {
    console.error(err.stack);
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

/**
 * Create an operational error with status code
 * @param message Error message
 * @param statusCode HTTP status code
 * @returns ApiError
 */
export const createError = (message: string, statusCode: number): ApiError => {
  const error: ApiError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

/**
 * Not found error handler middleware
 * Catches 404 errors for routes that don't exist
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error: ApiError = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.isOperational = true;
  next(error);
}; 