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
 */

import { validationResult } from 'express-validator';

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Log validation errors for debugging
    console.error('Validation Errors:', JSON.stringify(errors.array(), null, 2));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
      timestamp: new Date().toISOString()
    });
  }

  next();
}

//----------------------------- END OF FILE -----------------------------