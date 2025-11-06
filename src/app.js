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
import { basicAuth } from './middleware/basicAuth.js';
import { setupSecurity } from './middleware/security.js';
import { generalLimiter, apiLimiter } from './middleware/rateLimiting.js';
import { regexValidator, sanitizeInput } from './middleware/validation.js';
import { sanitizeInput as enhancedSanitizeInput, cspSanitize, sanitizationLimiter } from './middleware/sanitization.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

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
import internationalPaymentsRoutes from './routes/internationalPayments.js';

dotenv.config();

const app = express();

// Apply HTTP Basic Auth FIRST (only in production on Render)
// This creates the "YouTube private link" experience
if (process.env.NODE_ENV === 'production') {
  console.log('HTTP Basic Authentication ENABLED - Private demo mode');
  app.use(basicAuth);
}

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
// Exclude login endpoints from CSRF protection (they use rate limiting instead)
app.use((req, res, next) => {
  // Skip CSRF for login endpoints (protected by rate limiting)
  if (req.path === '/api/users/login' || req.path === '/api/staff/login') {
    return next();
  }
  // Apply CSRF protection to all other routes
  csurf({ cookie: true })(req, res, next);
});

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
app.use('/api/international-payments', internationalPaymentsRoutes);
app.use('/api/staff', staffRoutes);
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

// 404 Not Found handler
app.use(notFoundHandler);

// Centralized error handler (must be last)
app.use(errorHandler);

export default app;

//----------------------------------------------End of File----------------------------------------------