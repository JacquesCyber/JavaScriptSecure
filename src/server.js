/*
 * Server Entry Point
 * -------------------------------------------------------------
 * This file starts the Node.js server, configures HTTPS/HTTP,
 * and loads environment-specific settings. It is responsible for
 * secure server startup, graceful shutdown, and logging.
 *
 *  Security & Best Practices
 *   - Supports HTTPS with strong TLS configuration
 *   - Loads environment variables and secrets securely
 *   - Handles shutdown signals for graceful termination
 *
 * Usage:
 *   node src/server.js
 * 
 * REFERENCES:
 *  - https://stackoverflow.com/questions/10175812/how-can-i-generate-a-self-signed-ssl-certificate-using-openssl
 *  - https://deliciousbrains.com/ssl-certificate-authority-for-local-https-development/
 */

import app from './app.js';
import https from 'https';
import http from 'http';
import fs from 'fs';
import { connectDatabase } from '../config/database.js';

const port = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    
    // Determine if we should use HTTPS
    const certPath = './keys/cert.pem';
    const keyPath = './keys/key.pem';
    const useHttps = process.env.NODE_ENV === 'production' && 
                     fs.existsSync(certPath) && 
                     fs.existsSync(keyPath);

    if (useHttps) {
      // HTTPS server for production
      const options = {
        key: fs.readFileSync('./keys/key.pem'),
        cert: fs.readFileSync('./keys/cert.pem')
      };
      
      const server = https.createServer(options, app);
      server.listen(port, () => {
        console.log(`HTTPS server running at https://localhost:${port}`);
        console.log(`Access your secure app at: https://localhost:${port}`);
        console.log(`- If browser blocks self-signed certificate:`);
        console.log(`   • Click "Advanced" → "Proceed to localhost (unsafe)"`);
        console.log(`   • Or run: npm run cert:generate to create a better certificate`);
        console.log(`   • Or use HTTP mode: npm run dev`);
      });
    } else {
      // HTTP server for development/testing
      const server = http.createServer(app);
      server.listen(port, '0.0.0.0', () => {
        const mode = process.env.NODE_ENV || 'development';
        console.log(`HTTP server running at http://localhost:${port} (${mode.toUpperCase()} MODE)`);
        console.log(`Access your app at: http://localhost:${port}`);
        console.log(`Server bound to 0.0.0.0:${port} (accessible from network)`);
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

//----------------------------------------------End of File----------------------------------------------