import express from 'express';
import fs from 'fs';
import { SecretService } from '../services/secret.js';

const router = express.Router();

// Home route - serve the main HTML page
router.get('/', (req, res) => {
  const nonce = res.locals.nonce;
  
  try {
    let htmlContent = fs.readFileSync('./public/index.html', 'utf8');
    // Replace nonce placeholder in HTML if it exists
    htmlContent = htmlContent.replace(/\{nonce\}/g, nonce);
    res.send(htmlContent);
  } catch (error) {
    console.error('❌ Error serving index.html:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Service Unavailable</title>
        <style nonce="${nonce}">
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #dc3545; }
        </style>
      </head>
      <body>
        <h1 class="error">Service Unavailable</h1>
        <p>The application is temporarily unavailable. Please try again later.</p>
      </body>
      </html>
    `);
  }
});

// Status endpoint for monitoring
router.get('/status', async (req, res) => {
  try {
    const stats = await SecretService.getSecretStats();
    res.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: stats
    });
  } catch (error) {
    res.status(500).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      error: error.message || 'Database error'
    });
  }
});

// Health check endpoint for load balancers
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

export default router;