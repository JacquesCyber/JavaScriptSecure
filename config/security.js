/*
 * Security Configuration & Secure Headers
 * -------------------------------------------------------------
 * This file defines the security configuration for the Express application,
 * including Content Security Policy (CSP), secure HTTP headers, and rate limiting.
 * It is designed to provide a robust, environment-aware security foundation
 * for high-security Node.js/Express deployments.
 *
* XSS Mitigation
 *   - Strict CSP: Disallows all by default (default-src 'none')
 *   - Only allows scripts/styles from self and trusted CDNs
 *   - Uses nonces for inline scripts (server-generated only)
 *   - Restricts images, fonts, and connections to self or data URIs
 *   - In production: enforces HTTPS and blocks mixed content
 *
* Secure Headers
 *   - X-Content-Type-Options: nosniff (prevents MIME sniffing)
 *   - X-XSS-Protection: 1; mode=block (enables browser XSS filter)
 *   - X-Frame-Options: DENY (prevents clickjacking)
 *   - Referrer-Policy: strict-origin-when-cross-origin
 *   - Cache-Control, Pragma, Expires: disables caching of sensitive data
 *   - HSTS: enforced in production for HTTPS
 *
* Rate Limiting
 *   - General: 100 requests per 15 minutes per IP
 *   - API: 100 requests per 15 minutes per IP
 *
* Environment Awareness
 *   - HSTS disabled in development to avoid SSL issues
 *   - CSP less strict in development for browser compatibility
 *
 * This configuration provides a robust security foundation for the Express application,
 * balancing security needs with development convenience.
 *
 * REFERENCES:
 *   - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
 *   - https://owasp.org/www-project-secure-headers/
 */

export const securityConfig = {
  // CSP Configuration - Environment aware
  csp: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'self'", "'nonce-{nonce}'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"], // Will be replaced with actual nonce
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
      connectSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      manifestSrc: ["'self'"],
      mediaSrc: ["'none'"],
      workerSrc: ["'none'"],
      childSrc: ["'none'"],
      // Only upgrade to HTTPS in production
      ...(process.env.NODE_ENV === 'production' ? { 
        upgradeInsecureRequests: [],
        blockAllMixedContent: []
      } : {
        // In development, don't include blockAllMixedContent or upgradeInsecureRequests
        // to prevent Safari SSL issues
      })
    }
  },

  // Helmet Configuration
  helmet: {
    contentSecurityPolicy: false, // We handle CSP manually
    crossOriginEmbedderPolicy: false,
    hsts: process.env.NODE_ENV === 'production' ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    } : false // Disable HSTS in development to prevent SSL issues
  },

  // Additional Security Headers
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    // Explicitly prevent HTTPS upgrade in development
    ...(process.env.NODE_ENV !== 'production' ? {
      'Strict-Transport-Security': 'max-age=0; includeSubDomains'
    } : {})
  },

  // Rate Limiting Configuration
  rateLimit: {
    store: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    },
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 API requests per windowMs (increased for normal usage)
      message: 'Too many API requests from this IP, please try again later.'
    }
  }
};

//----------------------------------------------End of File----------------------------------------------