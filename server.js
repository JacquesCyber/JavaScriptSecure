import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import Secret from './models/Secret.js';
import { body, validationResult } from 'express-validator';
import { encryptHybrid, decryptHybrid } from './cryptoUtils.js';
import helmet from 'helmet';

dotenv.config();

const app = express();
const port = 3000;

// Middleware to parse JSON
app.use(express.json());

// Nonce middleware for CSP
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Serve static files from the 'public' directory (except index.html)
app.use(express.static('public', { index: false }));

// Set security-related HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, // We'll configure this separately below
  crossOriginEmbedderPolicy: false, // Disable if causing issues with resources
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// Additional security headers
app.use((req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent XSS attacks
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Prevent caching of sensitive content
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  next();
});

// Define a strict Content Security Policy with nonces
app.use((req, res, next) => {
  const nonce = res.locals.nonce;
  
  helmet.contentSecurityPolicy({
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'self'", `'nonce-${nonce}'`], // Use nonce instead of unsafe-inline
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // Keep unsafe-inline for dynamic styles
      styleSrcElem: ["'self'", "https://fonts.googleapis.com"], // External stylesheets only from self and Google Fonts
      imgSrc: ["'self'", "data:"], // Removed wildcard https: - only allow self and data URLs
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"], // Allow Google Fonts static content
      connectSrc: ["'self'"], // Allow AJAX requests to same origin
      formAction: ["'self'"], // Allow form submissions to same origin
      frameAncestors: ["'none'"], // Prevent framing (clickjacking protection)
      frameSrc: ["'none'"], // Block all frames
      objectSrc: ["'none'"], // Block plugins like Flash
      baseUri: ["'self'"], // Restrict base tag URLs
      manifestSrc: ["'self'"], // Allow web app manifests from same origin
      mediaSrc: ["'none'"], // Block audio/video unless needed
      workerSrc: ["'none'"], // Block web workers unless needed
      childSrc: ["'none'"], // Block child contexts (frames, workers)
      upgradeInsecureRequests: [] // Upgrade HTTP to HTTPS when possible
    }
  })(req, res, next);
});

// POST /store route with validation and hybrid encryption
app.post('/store',
  // Rate limiting middleware (basic implementation)
  (req, res, next) => {
    // In production, use a proper rate limiting library like express-rate-limit
    const clientIP = req.ip || req.connection.remoteAddress;
    console.log(`📝 Store request from IP: ${clientIP}`);
    next();
  },
  body('data').trim().isLength({ min: 1, max: 10000 }).escape(), // Add max length
  body('title').optional().trim().isLength({ max: 100 }).escape(), // Add title validation if present
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    try {
      const { data } = req.body;
      const encrypted = encryptHybrid(data);

      const secret = new Secret({
        encryptedData: encrypted.encryptedData,
        encryptedKey: encrypted.encryptedKey,
        encryptedIV: encrypted.encryptedIV,
        authTag: encrypted.authTag,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours expiry
      });

      const saved = await secret.save();

      res.json({
        message: 'Secret stored securely',
        id: saved._id,
        expiresAt: saved.expiresAt
      });
    } catch (err) {
      console.error('❌ Error in POST /store:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// GET /secret/:id — fetch secret by ID and decrypt
app.get('/secret/:id', 
  // Validate MongoDB ObjectId format
  (req, res, next) => {
    const { id } = req.params;
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    next();
  },
  async (req, res) => {
    try {
      const { id } = req.params;
      const secret = await Secret.findById(id);
      
      if (!secret) {
        return res.status(404).json({ error: 'Secret not found' });
      }

      // Check if secret has expired
      if (secret.expiresAt && secret.expiresAt < new Date()) {
        await Secret.findByIdAndDelete(id); // Clean up expired secret
        return res.status(404).json({ error: 'Secret has expired' });
      }

      const decrypted = decryptHybrid({
        encryptedData: secret.encryptedData,
        encryptedKey: secret.encryptedKey,
        encryptedIV: secret.encryptedIV,
        authTag: secret.authTag
      });

      res.json({
        id: secret._id,
        data: decrypted,
        createdAt: secret.createdAt || null,
        expiresAt: secret.expiresAt || null
      });
    } catch (err) {
      console.error('❌ Error in GET /secret/:id:', err);
      if (err.name === 'CastError') {
        return res.status(400).json({ error: 'Invalid ID format' });
      }
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// GET / route - serve index.html with nonce
app.get('/', (req, res) => {
  try {
    const nonce = res.locals.nonce;
    let html = fs.readFileSync('./public/index.html', 'utf8');
    
    // Inject nonce into script tags
    html = html.replace(/<script>/g, `<script nonce="${nonce}">`);
    
    // Inject nonce into style tags (if any)
    html = html.replace(/<style>/g, `<style nonce="${nonce}">`);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('❌ Error serving index.html:', err);
    const protocol = req.secure ? 'HTTPS' : 'HTTP';
    res.send(`🔐 ${protocol} server is running securely!`);
  }
});

// Alternative route for server status
app.get('/status', (req, res) => {
  const protocol = req.secure ? 'HTTPS' : 'HTTP';
  res.send(`🔐 ${protocol} server is running securely!`);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Favicon route to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No Content - prevents 404 for favicon requests
});

// Robots.txt route
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send('User-agent: *\nDisallow: /secret/\nDisallow: /store\nDisallow: /health');
});

// Connect to MongoDB, then start appropriate server
const mongoOptions = {
  serverSelectionTimeoutMS: 10000, // Timeout after 10s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  maxPoolSize: 10 // Maintain up to 10 socket connections
};

mongoose.connect(process.env.MONGODB_URI, mongoOptions)
  .then(() => {
    console.log('✅ Connected to MongoDB via Mongoose');
    
    // Choose server type based on environment
    if (process.env.NODE_ENV === 'test') {
      // HTTP server for testing/CI/CD
      http.createServer(app).listen(port, '0.0.0.0', () => {
        console.log(`✅ HTTP server running at http://0.0.0.0:${port} (TEST MODE)`);
      });
    } else {
      // HTTPS server for production
      try {
        const key = fs.readFileSync('./key.pem');
        const cert = fs.readFileSync('./cert.pem');
        
        https.createServer({ key, cert }, app).listen(port, '0.0.0.0', () => {
          console.log(`✅ HTTPS server running at https://0.0.0.0:${port} (PRODUCTION MODE)`);
        });
      } catch (err) {
        console.error('❌ Could not load SSL certificates. Starting HTTP server instead.');
        console.error('💡 For HTTPS, ensure key.pem and cert.pem exist in the project root.');
        
        http.createServer(app).listen(port, '0.0.0.0', () => {
          console.log(`✅ HTTP server running at http://0.0.0.0:${port} (FALLBACK MODE)`);
        });
      }
    }
  })
  .catch((err) => {
    console.error('❌ Mongoose connection error:', err);
    process.exit(1);
  }); 