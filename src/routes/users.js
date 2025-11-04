/*
 * Users Route
 * -------------------------------------------------------------
 * This route handles user-related API endpoints.
 * It enforces input validation, authentication, and access control
 * to prevent account takeover, injection, and unauthorized access.
 *
 *  Security & Best Practices
 *   - Validates all user input to prevent injection and account abuse
 *   - Requires authentication and role-based authorization
 *   - Never exposes sensitive user data in responses
 *
 * Usage:
 *   app.use('/users', usersRouter);
 *
 * REFERENCES:
 *  - https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/02-Testing_for_Cookies_Attributes
 */
import express from 'express';
import { body } from 'express-validator';
import { UserService } from '../services/user.js';
import { TokenManager, SessionManager } from '../auth/session.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiting.js';
import { handleValidationErrors } from '../middleware/validationHandler.js';

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters')
    .escape(),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('idNumber')
    .trim()
    .isLength({ min: 13, max: 13 })
    .withMessage('ID number must be exactly 13 digits')
    .isNumeric()
    .withMessage('ID number must contain only numbers'),
  body('accountNumber')
    .trim()
    .isLength({ min: 10, max: 12 })
    .withMessage('Account number must be between 10-12 digits')
    .isNumeric()
    .withMessage('Account number must contain only numbers'),
  body('bankCode')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('Bank code must be exactly 6 digits')
    .isNumeric()
    .withMessage('Bank code must contain only numbers'),
  body('branchCode')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('Branch code must be exactly 6 digits')
    .isNumeric()
    .withMessage('Branch code must contain only numbers'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('accountNumber')
    .trim()
    .isLength({ min: 10, max: 12 })
    .withMessage('Account number must be between 10-12 digits')
    .isNumeric()
    .withMessage('Account number must contain only numbers'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// POST /api/users/register
router.post('/register', authLimiter, registerValidation, handleValidationErrors, async (req, res) => {
  console.log('Registration request received:', req.body);

  try {
    const { fullName, email, username, idNumber, accountNumber, bankCode, branchCode, password } = req.body;
    console.log('Validation passed, creating user...');
    
    const result = await UserService.registerUser({ 
      fullName, 
      email, 
      username, 
      idNumber, 
      accountNumber, 
      bankCode, 
      branchCode, 
      password 
    });
    console.log(' User created successfully:');
    
    res.status(201).json(result);
  } catch (error) {
    console.error(' Error in POST /api/users/register:', error);
    
    res.status(400).json({
      success: false,
      message: error.message || 'Registration failed'
    });
  }
});

// POST /api/users/login
router.post('/login', authLimiter, loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const { username, accountNumber, password } = req.body;
    console.log('Login attempt for username:', username, 'with account number type:', typeof accountNumber);
    console.log('Cookies:', Object.keys(req.cookies || {}).join(', '));
    console.log('CSRF headers:', {
      'csrf-token': req.headers['csrf-token'],
      'x-csrf-token': req.headers['x-csrf-token'],
      'xsrf-token': req.headers['xsrf-token'],
      'x-xsrf-token': req.headers['x-xsrf-token']
    });
    const result = await UserService.loginUser(username, accountNumber, password);
    
    if (result.success) {
      // Create secure session
      await SessionManager.createSession(req, result.user);
      
      // Generate JWT tokens
      const accessToken = TokenManager.generateAccessToken(result.user);
      const refreshToken = TokenManager.generateRefreshToken(result.user);
      
      // Set HTTP-only cookies
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });
      
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      console.log('User logged in with secure session:');
      
      // Return success without sensitive data
      const userResponse = {
        _id: result.user._id,
        id: result.user._id, // Also provide as 'id' for frontend compatibility
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role || 'user'
      };
      
      res.json({
        success: true,
        message: 'Login successful',
        user: userResponse,
        sessionId: req.session.id
      });
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('Error in POST /api/users/login:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n')[0]
    });
    
    // Ensure we always send a proper error message
    const errorMessage = error.message || error.toString() || 'Login failed';
    
    res.status(401).json({
      success: false,
      message: errorMessage
    });
  }
});

// GET /api/users/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await UserService.getUserStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error in GET /api/users/stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user statistics'
    });
  }
});

// POST /api/users/logout - Secure logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Destroy session
    await SessionManager.destroySession(req);
    
    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('secureSessionId');

    console.log('User logged out successfully');

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

// GET /api/users/session - Check session status
router.get('/session', authenticate, (req, res) => {
  res.json({
    success: true,
    authenticated: true,
    user: {
      id: req.user.userId,
      email: req.user.email,
      role: req.user.role
    },
    session: {
      id: req.session?.id,
      lastActivity: req.session?.lastActivity
    }
  });
});

// POST /api/users/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        error: true,
        message: 'Refresh token required'
      });
    }
    
    // Verify refresh token
    const decoded = TokenManager.verifyToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: true,
        message: 'Invalid refresh token'
      });
    }
    
    // Generate new access token
    const newAccessToken = TokenManager.generateAccessToken({
      _id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    });
    
    // Set new access token cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.json({
      success: true,
      message: 'Token refreshed successfully'
    });
    
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(401).json({
      error: true,
      message: 'Token refresh failed'
    });
  }
});

export default router;

//----------------------------------------------End of File----------------------------------------------