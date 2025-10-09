import { TokenManager, SessionManager } from '../auth/session.js';

// Authentication middleware - verifies JWT tokens
export const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from request
    const token = TokenManager.extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        error: true,
        message: 'Access token required',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    const decoded = TokenManager.verifyToken(token);
    req.user = decoded;

    // Update session activity if session exists
    SessionManager.updateActivity(req);
    
    next();
  } catch (error) {
    // Fixed: Added 'error' parameter to catch block
    console.log('❌ Authentication failed:', error.message);
    return res.status(401).json({
      error: true,
      message: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
};

// Session-based authentication middleware
export const authenticateSession = (req, res, next) => {
  if (!SessionManager.isValidSession(req)) {
    return res.status(401).json({
      error: true,
      message: 'Invalid or expired session',
      code: 'INVALID_SESSION'
    });
  }

  // Add user info to request
  req.user = {
    userId: req.session.userId,
    email: req.session.email,
    role: req.session.role
  };

  // Update activity timestamp
  SessionManager.updateActivity(req);
  
  next();
};

// Combined authentication (JWT + Session)
export const authenticate = async (req, res, next) => {
  // Try JWT first, fallback to session
  const token = TokenManager.extractToken(req);
  
  if (token) {
    // Use JWT authentication
    return authenticateToken(req, res, next);
  } else if (req.session && req.session.userId) {
    // Use session authentication
    return authenticateSession(req, res, next);
  } else {
    return res.status(401).json({
      error: true,
      message: 'Authentication required',
      code: 'NO_AUTH'
    });
  }
};

// Role-based authorization middleware
export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required for authorization',
        code: 'NO_USER'
      });
    }

    const userRole = req.user.role || 'user';
    
    if (allowedRoles.length === 0 || allowedRoles.includes(userRole)) {
      next();
    } else {
      console.log(`❌ Authorization failed: User role '${userRole}' not in allowed roles [${allowedRoles.join(', ')}]`);
      return res.status(403).json({
        error: true,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: userRole
      });
    }
  };
};

// Optional authentication (doesn't fail if no auth)
export const optionalAuth = async (req, res, next) => {
  try {
    const token = TokenManager.extractToken(req);
    
    if (token) {
      const decoded = TokenManager.verifyToken(token);
      req.user = decoded;
    } else if (req.session && req.session.userId) {
      req.user = {
        userId: req.session.userId,
        email: req.session.email,
        role: req.session.role
      };
    }
    
    next();
  } catch {
    // Fixed: Removed unused 'error' parameter
    // Continue without authentication
    next();
  }
};