import mongoSanitize from 'express-mongo-sanitize';

const htmlEntities ={
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    "/": '&#x2F;'
};

function sanitizeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"'/]/g, (char) => htmlEntities[char]);
}

function sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return sanitizeHtml(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (key.toLowerCase().includes('password')) {
            sanitized[key] = typeof value === 'string' ? value.trim() : value;
        } else {
            sanitized[key] = sanitizeObject(value);
        }
    }
    return sanitized;
}

export const sanitizeInput = (req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        if (req.body) {
            req.body = sanitizeObject(req.body);
        }
        console.log(`🧹 Sanitized ${req.method} request to ${req.path}`);
    }
    next();
};

export const mongoSanitizer = mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        console.log(`⚠️ MongoDB injection attempt blocked: ${key} in ${req.path}`);
    }
});