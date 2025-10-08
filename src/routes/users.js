import express from 'express';
import { body, validationResult } from 'express-validator';
import { UserService } from '../services/user.js';
import { TokenManager, SessionManager } from '../auth/session.js';
import { authenticate, authorize } from '../middleware/auth.js';

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
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// POST /api/users/register
router.post('/register', registerValidation, async (req, res) => {
  console.log('📝 Registration request received:', req.body);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { fullName, email, password } = req.body;
    console.log('✅ Validation passed, creating user...');
    
    const result = await UserService.registerUser({ fullName, email, password });
    console.log('✅ User created successfully:', result.user.email);
    
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Error in POST /api/users/register:', error);
    
    res.status(400).json({
      success: false,
      message: error.message || 'Registration failed'
    });
  }
});

// POST /api/users/login
router.post('/login', loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  try {
    const { email, password } = req.body;
    const result = await UserService.loginUser(email, password);
    
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
      
      console.log('✅ User logged in with secure session:', result.user.email);
      
      // Return success without sensitive data
      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: result.user._id,
          email: result.user.email,
          fullName: result.user.fullName,
          role: result.user.role || 'user'
        },
        sessionId: req.session.id
      });
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('❌ Error in POST /api/users/login:', error);
    
    res.status(401).json({
      success: false,
      message: error.message || 'Login failed'
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
    console.error('❌ Error in GET /api/users/stats:', error);
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
    
    console.log('✅ User logged out successfully');
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('❌ Error during logout:', error);
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
    console.error('❌ Token refresh failed:', error);
    res.status(401).json({
      error: true,
      message: 'Token refresh failed'
    });
  }
});

export default router;