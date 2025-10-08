/*
The server.js file is the entry point of the application. 
It sets up and starts the HTTP or HTTPS server based on the environment and available SSL certificates. 
It also handles database connection initialization and graceful shutdown of the server.
✅ SSL : Once run in production mode (npm run dev:https) all traffic is encrypted via HTTPS TLS version 1.3. Certs are stored in the keys/ directory.
Note: Certificates are self-signed for development purposes. In a real production environment, use certificates from a trusted CA (cost money).
Key Features:
- Automatic HTTPS Detection: The server checks for the presence of SSL certificate files and the environment to decide whether to start an HTTPS or HTTP server.
- Environment Awareness: In production, it attempts to start an HTTPS server if certificates are available; otherwise, it falls back to HTTP in development or testing environments.
- Graceful Shutdown: Listens for termination signals (SIGINT, SIGTERM) to allow for clean shutdowns.
- Database Connection: Initializes the database connection before starting the server, ensuring that the application is ready to handle requests.
- Informative Logging: Provides clear console messages about the server status, access URLs, and instructions for handling self-signed certificates in development.
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
        console.log(`🔒 HTTPS server running at https://localhost:${port}`);
        console.log(`📱 Access your secure app at: https://localhost:${port}`);
        console.log(`⚠️  If browser blocks self-signed certificate:`);
        console.log(`   • Click "Advanced" → "Proceed to localhost (unsafe)"`);
        console.log(`   • Or run: npm run cert:generate to create a better certificate`);
        console.log(`   • Or use HTTP mode: npm run dev`);
      });
    } else {
      // HTTP server for development/testing
      const server = http.createServer(app);
      server.listen(port, '0.0.0.0', () => {
        const mode = process.env.NODE_ENV || 'development';
        console.log(`🚀 HTTP server running at http://localhost:${port} (${mode.toUpperCase()} MODE)`);
        console.log(`📱 Access your app at: http://localhost:${port}`);
        console.log(`🌐 Server bound to 0.0.0.0:${port} (accessible from network)`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();