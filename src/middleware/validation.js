import { body } from 'express-validator';

export function setupValidation(app) {
  // Input validation helpers
  app.locals.validators = {
    // Secret data validation
    secretData: [
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
    ],

    // MongoDB ObjectId validation
    mongoId: (paramName = 'id') => (req, res, next) => {
      // Use safe parameter access to prevent object injection
      let id;
      switch (paramName) {
        case 'id':
          id = req.params.id;
          break;
        case 'secretId':
          id = req.params.secretId;
          break;
        case 'userId':
          id = req.params.userId;
          break;
        default:
          return res.status(500).json({ error: 'Invalid parameter configuration' });
      }
      
      if (!/^[0-9a-fA-F]{24}$/.test(id)) {
        return res.status(400).json({
          error: 'Invalid ID format',
          message: 'The provided ID is not a valid MongoDB ObjectId'
        });
      }
      next();
    }
  };
}