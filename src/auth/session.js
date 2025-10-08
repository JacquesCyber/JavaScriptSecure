import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// JWT configuration
export const jwtConfig = {
  // Secret key for signing JWTs (should be in .env in production)
  secret: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
  
  // Token expiration times
  accessTokenExpiry: '15m',     // Short-lived access token
  refreshTokenExpiry: '7d',     // Longer-lived refresh token
  
  // JWT signing options
  signOptions: {
    issuer: 'JavaScriptSecure',
    audience: 'secure-portal-users',
    algorithm: 'HS256'
  }
};

// Session configuration
export const sessionConfig = {
  // Session settings
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  name: 'secureSessionId', // Don't use default 'connect.sid'
  
  // Cookie settings
  cookie: {
    httpOnly: true,           // Prevent XSS access
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',       // CSRF protection
    maxAge: 15 * 60 * 1000,   // 15 minutes
    domain: process.env.NODE_ENV === 'production' ? '.yourdomain.com' : undefined
  },
  
  // Session options
  resave: false,              // Don't save unchanged sessions
  saveUninitialized: false,   // Don't save empty sessions
  rolling: true,              // Reset expiry on activity
  
  // Security headers
  genid: () => {
    // Custom session ID generation
    return crypto.randomBytes(32).toString('hex');
  }
};

// Token utilities
export class TokenManager {
  
  // Generate JWT access token
  static generateAccessToken(user) {
    const payload = {
      userId: user._id || user.id,
      email: user.email,
      role: user.role || 'user',
      sessionId: crypto.randomBytes(16).toString('hex')
    };
    
    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.accessTokenExpiry,
      ...jwtConfig.signOptions
    });
  }
  
  // Generate refresh token
  static generateRefreshToken(user) {
    const payload = {
      userId: user._id || user.id,
      type: 'refresh',
      sessionId: crypto.randomBytes(16).toString('hex')
    };
    
    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.refreshTokenExpiry,
      ...jwtConfig.signOptions
    });
  }
  
  // Verify token
  static verifyToken(token) {
    try {
      return jwt.verify(token, jwtConfig.secret, jwtConfig.signOptions);
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }
  
  // Extract token from request
  static extractToken(req) {
    // Try Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Try cookies
    return req.cookies?.accessToken;
  }
  
  // Decode token without verification (for expired token info)
  static decodeToken(token) {
    return jwt.decode(token);
  }
}

// Session utilities
export class SessionManager {
  
  // Create secure session
  static createSession(req, user) {
    req.session.userId = user._id || user.id;
    req.session.email = user.email;
    req.session.role = user.role || 'user';
    req.session.loginTime = new Date();
    req.session.lastActivity = new Date();
    
    // Regenerate session ID for security
    return new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) reject(err);
        else resolve(req.session);
      });
    });
  }
  
  // Update session activity
  static updateActivity(req) {
    if (req.session) {
      req.session.lastActivity = new Date();
    }
  }
  
  // Destroy session securely
  static destroySession(req) {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  
  // Check session validity
  static isValidSession(req) {
    if (!req.session || !req.session.userId) {
      return false;
    }
    
    // Check session timeout (15 minutes of inactivity)
    const maxInactivity = 15 * 60 * 1000; // 15 minutes
    const lastActivity = new Date(req.session.lastActivity);
    const now = new Date();
    
    return (now - lastActivity) < maxInactivity;
  }
}