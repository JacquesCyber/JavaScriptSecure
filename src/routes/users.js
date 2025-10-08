import express from 'express';
import { body, validationResult } from 'express-validator';
import { UserService } from '../services/user.js';
import { authLimiter } from '../middleware/rateLimiting.js';

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
router.post('/register', authLimiter, registerValidation, async (req, res) => {
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
router.post('/login', authLimiter, loginValidation, async (req, res) => {
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
    
    res.json(result);
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

export default router;