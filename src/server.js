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
    const useHttps = process.env.NODE_ENV === 'production' && 
                     fs.existsSync('./keys/cert.pem') && 
                     fs.existsSync('./keys/key.pem');

    if (useHttps) {
      // HTTPS server for production
      const options = {
        key: fs.readFileSync('./keys/key.pem'),
        cert: fs.readFileSync('./keys/cert.pem')
      };
      
      const server = https.createServer(options, app);
      server.listen(port, () => {
        console.log(`🔒 HTTPS server running at https://localhost:${port}`);
      });
    } else {
      // HTTP server for development/testing
      const server = http.createServer(app);
      server.listen(port, '0.0.0.0', () => {
        const mode = process.env.NODE_ENV || 'development';
        console.log(`🚀 HTTP server running at http://0.0.0.0:${port} (${mode.toUpperCase()} MODE)`);
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