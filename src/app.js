/*
 * Main Express Application
 * -------------------------------------------------------------
 * This file initializes the Express app, configures global middleware,
 * and sets up all API routes. It is the central entry point for all
 * HTTP requests and enforces security, validation, and error handling.
 *
 *  Security & Best Practices
 *   - Loads security, validation, and sanitization middleware globally
 *   - Configures CORS, CSRF, and secure session management
 *   - Handles errors and logging in a centralized way
 *
 * Usage:
 *   import app from './app.js';
 * 
 * REFERENCES:
 *  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
 *  - https://www.npmjs.com/package/csurf
 *  - https://expressjs.com/en/advanced/best-practice-security.html
 */
import express from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import cookieParser from 'cookie-parser';

import csurf from 'csurf';

import cors from 'cors';

// Import middleware
import { setupSecurity } from './middleware/security.js';
import { generalLimiter, apiLimiter } from './middleware/rateLimiting.js';
import { regexValidator, sanitizeInput } from './middleware/validation.js';
import { sanitizeInput as enhancedSanitizeInput, cspSanitize, sanitizationLimiter } from './middleware/sanitization.js';

// Import session configuration
import { sessionConfig } from './auth/session.js';

const secureSessionConfig = {
  ...sessionConfig,
  cookie: {
    ...((sessionConfig && sessionConfig.cookie) || {}),
    secure: true
  }
}

// Import routes
import secretRoutes from './routes/secret.js';
import healthRoutes from './routes/health.js';
import staticRoutes from './routes/static.js';
import userRoutes from './routes/users.js';
import paymentRoutes from './routes/payments.js';
import staffRoutes from './routes/staff.js';
import testRoutes from './routes/test.js';

dotenv.config();

const app = express();

// Basic middleware
app.use(express.json({ limit: '100kb' })); // Lowered size limit for DoS protection
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// Secure CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  // Add production domains here, e.g. 'https://yourdomain.com'
];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      // Block CORS for disallowed origins, but do not throw error (prevents 500)
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept',
    'csrf-token',
    'xsrf-token',
    'x-csrf-token',
    'x-xsrf-token'
  ],
  exposedHeaders: ['Set-Cookie']
}));

// Session middleware (before security setup)
app.use(session(secureSessionConfig));

// CSRF protection (use csurf, after cookie/session middleware, before routes)
app.use(csurf({ cookie: true }));

// Expose CSRF token to views/APIs
app.use((req, res, next) => {
  if (req.csrfToken) {
    res.locals.csrfToken = req.csrfToken();
  }
  next();
});

// Serve static files from the 'public' directory (except index.html)
app.use(express.static('public', { index: false }));

// Setup security middleware
setupSecurity(app);

// Rate limiting middleware
app.use(generalLimiter);
app.use('/api', apiLimiter);

// Defense in Depth: Input validation and sanitization
// Layer 1: Regex whitelist validation (blocks malformed input)
app.use(regexValidator);
// Layer 2: Enhanced input sanitization (XSS & NoSQL injection protection)
app.use(enhancedSanitizeInput);
// Layer 3: Legacy sanitization (backup)
app.use(sanitizeInput);
// Layer 4: Additional security headers
app.use(cspSanitize);
// Layer 5: Sanitization rate limiting
app.use(sanitizationLimiter);

// Routes
app.use('/', healthRoutes);
app.use('/', secretRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api', testRoutes);
app.use('/', staticRoutes);

// CSRF error handler (must be after routes)
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    console.error('CSRF token validation failed');
    console.error('Request headers:', {
      'csrf-token': req.headers['csrf-token'],
      'x-csrf-token': req.headers['x-csrf-token'],
      'xsrf-token': req.headers['xsrf-token'],
      'x-xsrf-token': req.headers['x-xsrf-token']
    });
    console.error('Cookies:', Object.keys(req.cookies || {}));
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next(err);
});

// 404 handler with CSP-compliant response
app.use((req, res) => {
  const nonce = res.locals.nonce;
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>404 - Page Not Found</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style nonce="${nonce}">
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
               text-align: center; padding: 50px; background: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: white; 
                    padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #dc3545; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/">← Back to Home</a>
      </div>
    </body>
    </html>
  `);
});

export default app;

//----------------------------------------------End of File----------------------------------------------