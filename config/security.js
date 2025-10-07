export const securityConfig = {
  // CSP Configuration - Environment aware
  csp: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'self'", "'nonce-{nonce}'"], // Will be replaced with actual nonce
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
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
      max: 10, // limit each IP to 10 API requests per windowMs
      message: 'Too many API requests from this IP, please try again later.'
    }
  }
};