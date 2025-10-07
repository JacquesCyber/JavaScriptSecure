import express from 'express';
import dotenv from 'dotenv';

// Import middleware
import { setupSecurity } from './middleware/security.js';

// Import routes
import secretRoutes from './routes/secret.js';
import healthRoutes from './routes/health.js';
import staticRoutes from './routes/static.js';

dotenv.config();

const app = express();

// Basic middleware
app.use(express.json());

// Serve static files from the 'public' directory (except index.html)
app.use(express.static('public', { index: false }));

// Setup security middleware
setupSecurity(app);

// Routes
app.use('/', healthRoutes);
app.use('/', secretRoutes);
app.use('/', staticRoutes);

// 404 handler with CSP-compliant response
app.use((req, res) => {
  const nonce = res.locals.nonce;
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>404 - Page Not Found</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style nonce="${nonce}">
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
               text-align: center; padding: 50px; background: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: white; 
                    padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #dc3545; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/">← Back to Home</a>
      </div>
    </body>
    </html>
  `);
});

export default app;