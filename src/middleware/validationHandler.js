/**
 * Validation Error Handler Middleware
 * -------------------------------------------------------------
 * Centralized middleware for handling express-validator errors.
 * Eliminates duplicate validation error handling across routes.
 *
 * Usage:
 *   import { handleValidationErrors } from '../middleware/validationHandler.js';
 *   
 *   router.post('/login',
 *     body('username').notEmpty(),
 *     body('password').notEmpty(),
 *     handleValidationErrors,  // Add this middleware
 *     async (req, res) => {
 *       // Handler logic - validation already passed
 *     }
 *   );
 *
 * Last reviewed: 2025-11-04
 * Maintainer: Backend Team <backend@securebank.com>
 */

import { validationResult } from 'express-validator';

/**
 * Middleware to handle validation errors from express-validator
 * 
 * If validation errors exist, responds with 400 and error details.
 * If validation passes, calls next() to continue to the route handler.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
      timestamp: new Date().toISOString()
    });
  }
  
  next();
}
