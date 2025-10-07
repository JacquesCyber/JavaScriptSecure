import crypto from 'crypto';
import helmet from 'helmet';
import { securityConfig } from '../../config/security.js';

export function setupSecurity(app) {
  // Nonce middleware for CSP
  app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
  });

  // Set security-related HTTP headers using Helmet
  app.use(helmet(securityConfig.helmet));

  // Additional security headers
  app.use((req, res, next) => {
    Object.entries(securityConfig.headers).forEach(([header, value]) => {
      res.setHeader(header, value);
    });
    next();
  });

  // Content Security Policy with nonces
  app.use((req, res, next) => {
    const nonce = res.locals.nonce;
    
    helmet.contentSecurityPolicy({
      useDefaults: false,
      directives: {
        ...securityConfig.csp.directives,
        scriptSrc: ["'self'", `'nonce-${nonce}'`] // Replace placeholder with actual nonce
      }
    })(req, res, next);
  });

  // Request logging middleware
  app.use((req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    
    console.log(`📝 [${timestamp}] ${method} ${url} - IP: ${clientIP}`);
    next();
  });
}