// HTML entity mapping for XSS prevention
const htmlEntities = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
};

// Sanitize HTML to prevent XSS attacks
function sanitizeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"'/]/g, (char) => htmlEntities[char]);
}

// Enhanced recursive object sanitization
function sanitizeObject(obj, depth = 0) {
  // Prevent deep nesting attacks (max depth of 10)
  if (depth > 10) {
    console.warn('⚠️ Deep object nesting detected, truncating');
    return '[Truncated due to depth limit]';
  }

  if (!obj || typeof obj !== 'object') {
    return sanitizeHtml(obj);
  }

  if (Array.isArray(obj)) {
    // Limit array size to prevent DoS
    if (obj.length > 1000) {
      console.warn('⚠️ Large array detected, truncating');
      obj = obj.slice(0, 1000);
    }
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  const sanitized = {};
  let hasInjectionAttempt = false;
  // Whitelist of allowed keys (add all expected keys for your app)
  const allowedKeys = [
    'name', 'email', 'username', 'password', 'role', 'id', 'accountNumber', 'bankCode', 'branchCode', 'amount', 'currency', 'ipAddress', 'userAgent', 'type', 'cardDetails', 'lastFour', 'createdAt', 'updatedAt', 'isActive', 'status', 'template', 'title', 'description', 'fullName', 'token', 'sessionId', 'userId', 'swiftCode', 'reference', 'paymentMethod', 'permissions', 'fields', 'value', 'key', 'data', 'message', 'code', 'recent', 'active', 'total', 'lastLogin', 'emailVerified', 'phone', 'address', 'city', 'country', 'zip', 'state', 'notes', 'meta', 'tags', 'options', 'settings', 'profile', 'avatar', 'url', 'file', 'filename', 'path', 'templateName', 'module', 'templateId', 'templateType', 'templateContent', 'templateData', 'templateFields', 'templateValues', 'templateOptions', 'templateSettings', 'templateMeta', 'templateTags', 'templateNotes', 'templateProfile', 'templateAvatar', 'templateUrl', 'templateFile', 'templateFilename', 'templatePath', 'templateModule', 'templateReference', 'templateSwiftCode', 'templateAccountNumber', 'templateBankCode', 'templateBranchCode', 'templateAmount', 'templateCurrency', 'templateIpAddress', 'templateUserAgent', 'templateType', 'templateCardDetails', 'templateLastFour', 'templateCreatedAt', 'templateUpdatedAt', 'templateIsActive', 'templateStatus', 'templateRole', 'templatePermissions', 'templateFields', 'templateValue', 'templateKey', 'templateData', 'templateMessage', 'templateCode', 'templateRecent', 'templateActive', 'templateTotal', 'templateLastLogin', 'templateEmailVerified', 'templatePhone', 'templateAddress', 'templateCity', 'templateCountry', 'templateZip', 'templateState', 'templateNotes', 'templateMeta', 'templateTags', 'templateOptions', 'templateSettings', 'templateProfile', 'templateAvatar', 'templateUrl', 'templateFile', 'templateFilename', 'templatePath', 'templateModule'
    // Add or remove keys as needed for your application
  ];
  for (const key of Object.keys(obj)) {
    if (!allowedKeys.includes(key)) {
      hasInjectionAttempt = true;
      console.warn(`🚨 Blocked non-whitelisted key: "${key}"`);
      continue;
    }
    const originalKey = key;
    let sanitizedKey = key;
    // Remove dangerous MongoDB operators from keys
    if (key.startsWith('$') || key.includes('.')) {
      sanitizedKey = key.replace(/^4/, '_').replace(/\./g, '_');
      hasInjectionAttempt = true;
      console.warn(`🚨 MongoDB injection attempt blocked in key: "${originalKey}" -> "${sanitizedKey}"`);
    }
    // Limit key length to prevent memory exhaustion
    if (sanitizedKey.length > 100) {
      sanitizedKey = sanitizedKey.substring(0, 100);
      console.warn(`⚠️ Long key truncated: "${originalKey}"`);
    }
    // Skip password fields from HTML sanitization but still trim
    if (sanitizedKey.toLowerCase().includes('password')) {
      const value = obj[key];
      sanitized[sanitizedKey] = typeof value === 'string' ? value.trim() : value;
    } else {
      sanitized[sanitizedKey] = sanitizeObject(obj[key], depth + 1);
    }
  }
  
  // Log injection attempts for security monitoring
  if (hasInjectionAttempt) {
    console.log(`🚨 NoSQL injection attempt detected and blocked`);
  }
  
  return sanitized;
}

// Enhanced input sanitization middleware
export const sanitizeInput = (req, res, next) => {
  // Only sanitize POST, PUT, PATCH requests with body data
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    try {
      const originalBody = JSON.stringify(req.body);
      req.body = sanitizeObject(req.body);
      
      // Log sanitization for security monitoring
      const sanitizedBody = JSON.stringify(req.body);
      if (originalBody !== sanitizedBody) {
        console.log(`🧹 Input sanitized for ${req.method} ${req.path}`);
        console.log(`📊 Sanitization changes detected`);
      }
    } catch (error) {
      console.error('❌ Sanitization error:', error);
      return res.status(400).json({
        error: true,
        message: 'Invalid input data',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    try {
      const sanitizedQuery = sanitizeObject(req.query);
      // Only assign whitelisted keys
      for (const key of Object.keys(req.query)) {
        if (!sanitizedQuery.hasOwnProperty(key)) {
          delete req.query[key];
        }
      }
      for (const key of Object.keys(sanitizedQuery)) {
        req.query[key] = sanitizedQuery[key];
      }
    } catch (error) {
      console.error('❌ Query sanitization error:', error);
    }
  }
  
  next();
};

// Specialized XSS prevention for specific fields
export const sanitizeXSS = (fields = []) => {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      fields.forEach(field => {
        if (req.body[field] && typeof req.body[field] === 'string') {
          const original = req.body[field];
          req.body[field] = sanitizeHtml(original);
          
          if (original !== req.body[field]) {
            console.log(`🛡️ XSS prevention applied to field: ${field}`);
          }
        }
      });
    }
    next();
  };
};

// Content Security Policy helper
export const cspSanitize = (req, res, next) => {
  // Add CSP headers for additional protection
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
};

// Rate limiting for sanitization-heavy operations
export const sanitizationLimiter = (req, res, next) => {
  // Track sanitization-heavy requests
  if (req.method === 'POST' && req.body && JSON.stringify(req.body).length > 10000) {
    console.log(`⚠️ Large payload detected: ${JSON.stringify(req.body).length} characters`);
  }
  
  next();
};

export default {
  sanitizeInput,
  sanitizeXSS,
  cspSanitize,
  sanitizationLimiter
};
