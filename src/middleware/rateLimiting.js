/*
 * Rate Limiting Middleware
 * -------------------------------------------------------------
 * This module enforces rate limiting for Express routes.
 * It is designed to prevent:
 *   - Brute-force attacks (login, API abuse)
 *   - Denial-of-Service (DoS) and resource exhaustion
 *
 *  Security & Best Practices
 *   - Limits requests per IP per time window
 *   - Customizable for general and API-specific routes
 *   - Returns clear error messages on limit exceeded
 *
 * Usage:
 *   app.use(rateLimitingMiddleware);
 *
 *  REFERENCES:
 *  - https://www.cloudflare.com/learning/bots/what-is-rate-limiting/
 *  - https://medium.com/@ignatovich.dm/creating-a-simple-api-rate-limiter-with-node-a834d03bad7a
 */


import rateLimit from 'express-rate-limit';
import { securityConfig } from '../../config/security.js';


// General Rate Limiter
// Limits all requests to 100 per 15 minutes per IP
// Skips health endpoint to allow monitoring
export const generalLimiter = rateLimit({
  windowMs: securityConfig.rateLimit.store.windowMs,
  max: securityConfig.rateLimit.store.max,
  message: {
    error: true,
    message: securityConfig.rateLimit.store.message
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health'
});


// API Rate Limiter
// Limits API endpoints to 10 requests per 15 minutes per IP
// More restrictive for API endpoints
export const apiLimiter = rateLimit({
  windowMs: securityConfig.rateLimit.api.windowMs,
  max: securityConfig.rateLimit.api.max,
  message: {
    error: true,
    message: securityConfig.rateLimit.api.message
  },
  standardHeaders: true,
  legacyHeaders: false
});


// Authentication Rate Limiter
// Limits login/register attempts to 5 per 15 minutes per IP
// Skips successful requests to only limit failed attempts
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: true,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: true,
      message: 'Too many login attempts. Please try again in 15 minutes.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Strict Rate Limiter for sensitive operations
// For password reset, account recovery, etc.
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    error: true,
    message: 'Too many attempts. Please try again in 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Strict rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: true,
      message: 'Too many attempts. Please try again in 1 hour.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

//----------------------------------------------End of File----------------------------------------------