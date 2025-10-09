/* eslint-disable security/detect-object-injection */

const htmlEntities = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
};

// Sanitize HTML to prevent XSS
function sanitizeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char);
}

// Recursive object sanitization with whitelist and depth limit
function sanitizeObject(obj, depth = 0) {
  if (depth > 10) return '[Truncated due to depth limit]';
  if (!obj || typeof obj !== 'object') return sanitizeHtml(obj);

  if (Array.isArray(obj)) {
    if (obj.length > 1000) obj = obj.slice(0, 1000);
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  const sanitized = {};
  let hasInjectionAttempt = false;

  const allowedKeys = new Set([
    // User fields
    'name','email','username','password','role','id','fullName','idNumber',
    // Account fields
    'accountNumber','bankCode','branchCode',
    // Payment fields
    'amount','currency','description','userId','paymentMethod','provider',
    // Payment method nested objects
    'type','cardDetails','paypalEmail','bankDetails','swiftDetails',
    // Card details
    'lastFour','brand','expiryMonth','expiryYear',
    // Bank details
    'accountType',
    // SWIFT details
    'beneficiaryName','beneficiaryAccount','swiftCode','bankName','bankCountry','purpose','reference',
    // System fields
    'ipAddress','userAgent','createdAt','updatedAt','isActive','status',
    'token','sessionId','permissions','fields','value','key','data','message','code',
    'recent','active','total','lastLogin','emailVerified','phone',
    'address','city','country','zip','state','notes','meta','tags',
    'options','settings','profile','avatar','url','file','filename','path',
    // Template fields
    'template','title','templateName','module','templateId','templateType',
    'templateContent','templateData','templateFields','templateValues',
    'templateOptions','templateSettings','templateMeta','templateTags',
    'templateNotes','templateProfile','templateAvatar','templateUrl',
    'templateFile','templateFilename','templatePath','templateModule'
  ]);

  for (const key of Object.keys(obj)) {
    if (!allowedKeys.has(key)) {
      hasInjectionAttempt = true;
      console.warn(`🚨 Blocked non-whitelisted key: "${key}"`);
      continue;
    }

    let sanitizedKey = key;
    if (key.startsWith('$') || key.includes('.')) {
      sanitizedKey = key.replace(/^\$/, '_').replace(/\./g, '_');
      hasInjectionAttempt = true;
      console.warn(`🚨 MongoDB injection attempt blocked in key: "${key}" -> "${sanitizedKey}"`);
    }

    if (sanitizedKey.length > 100) sanitizedKey = sanitizedKey.slice(0, 100);

    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
    if (!descriptor || descriptor.value === undefined) continue;

    if (sanitizedKey.toLowerCase().includes('password')) {
      sanitized[sanitizedKey] = typeof descriptor.value === 'string'
        ? descriptor.value.trim()
        : descriptor.value;
    } else {
      sanitized[sanitizedKey] = sanitizeObject(descriptor.value, depth + 1);
    }
  }

  if (hasInjectionAttempt) console.log('🚨 NoSQL injection attempt detected and blocked');

  return sanitized;
}

// Middleware: sanitize body and query
export const sanitizeInput = (req, res, next) => {
  try {
    if (['POST','PUT','PATCH'].includes(req.method) && req.body) {
      const originalBody = JSON.stringify(req.body);
      req.body = sanitizeObject(req.body);
      if (originalBody !== JSON.stringify(req.body)) {
        console.log(`🧹 Input sanitized for ${req.method} ${req.path}`);
      }
    }

    if (req.query && typeof req.query === 'object') {
      const sanitizedQuery = sanitizeObject(req.query);
      for (const key of Object.keys(req.query)) if (!(key in sanitizedQuery)) delete req.query[key];
      for (const key of Object.keys(sanitizedQuery)) req.query[key] = sanitizedQuery[key];
    }
  } catch (error) {
    console.error('❌ Sanitization error:', error);
    return res.status(400).json({ error: true, message: 'Invalid input data', timestamp: new Date().toISOString() });
  }
  next();
};

// Middleware: XSS-specific sanitization for fields
export const sanitizeXSS = (fields = []) => (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    fields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        const value = req.body[field];
        if (typeof value === 'string') {
          const sanitized = sanitizeHtml(value);
          if (sanitized !== value) console.log(`🛡️ XSS prevention applied to field: ${field}`);
          req.body[field] = sanitized;
        }
      }
    });
  }
  next();
};

// Middleware: Content Security Policy headers
export const cspSanitize = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};

// Middleware: warn on large sanitization-heavy requests
export const sanitizationLimiter = (req, res, next) => {
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

/* eslint-enable security/detect-object-injection */