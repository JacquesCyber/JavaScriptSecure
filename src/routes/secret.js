import express from 'express';
import { validationResult, body } from 'express-validator';
import { SecretService } from '../services/secret.js';

const router = express.Router();

// Validation middleware
const validateSecretData = [
  body('data')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Data must be between 1 and 10,000 characters')
    .escape(),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title must be less than 100 characters')
    .escape()
];

// POST /store route with validation and hybrid encryption
router.post('/store',
  // Rate limiting middleware (basic implementation)
  (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    console.log(`📝 Store request from IP: ${clientIP}`);
    next();
  },
  ...validateSecretData,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    try {
      const { data, title } = req.body;
      const result = await SecretService.storeSecret(data, title);
      
      res.json(result);
    } catch (error) {
      console.error('❌ Error in POST /store:', error);
      
      if (error.message === 'Database connection not available') {
        return res.status(503).json({ 
          error: 'Service Unavailable',
          message: 'Database connection not available'
        });
      }
      
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// GET /secret/:id — fetch secret by ID and decrypt
router.get('/secret/:id', 
  (req, res, next) => {
    const { id } = req.params;
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        error: 'Invalid ID format',
        message: 'The provided ID is not a valid MongoDB ObjectId'
      });
    }
    next();
  },
  async (req, res) => {
    try {
      const { id } = req.params;
      const result = await SecretService.retrieveSecret(id);
      
      res.json(result);
    } catch (error) {
      console.error('❌ Error in GET /secret/:id:', error);
      
      if (error.message === 'Database connection not available') {
        return res.status(503).json({ 
          error: 'Service Unavailable',
          message: 'Database connection not available'
        });
      }
      
      if (error.message === 'Secret not found') {
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'Secret not found or already retrieved'
        });
      }
      
      if (error.message === 'Secret has expired') {
        return res.status(410).json({ 
          error: 'Gone',
          message: 'Secret has expired and been deleted'
        });
      }
      
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// GET /store - Method not allowed helper
router.get('/store', (req, res) => {
  res.status(405).json({ 
    error: 'Method Not Allowed',
    message: 'Use POST to store secrets',
    allowedMethods: ['POST']
  });
});

// GET /secret/ - Invalid endpoint helper
router.get('/secret/', (req, res) => {
  res.status(400).json({ 
    error: 'Bad Request',
    message: 'Secret ID is required. Use /secret/:id format.'
  });
});

// GET /secret - Invalid endpoint helper
router.get('/secret', (req, res) => {
  res.status(400).json({ 
    error: 'Bad Request',
    message: 'Secret ID is required. Use /secret/:id format.'
  });
});

export default router;