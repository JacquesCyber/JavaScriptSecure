/*
 * Database Connection Management (Mongoose)
 * -------------------------------------------------------------
 * This module manages the MongoDB connection for the application using Mongoose.
 * It provides environment-aware connection logic, robust error handling, and
 * graceful shutdown for high-availability Node.js deployments.
 *
 * Environment Awareness
 *   - Uses MONGODB_URI from environment variables
 *   - Allows server to start without DB in test/dev if URI is missing
 *
 * Robust Error Handling
 *   - Logs connection errors and handles test environment gracefully
 *   - Throws on connection failure in production
 *
 * Graceful Shutdown
 *   - Closes MongoDB connection on SIGINT (Ctrl+C)
 *   - Logs disconnect and close events for observability
 *
 * Security & Best Practices:
 *   - Never log sensitive connection details
 *   - Use environment variables for credentials
 *   - Ensure proper error handling to avoid leaking stack traces
 *
 * Usage:
 *   import { connectDatabase } from './config/database.js';
 *   await connectDatabase();
 * 
 * REFERENCES:
 *   - https://mongoosejs.com/docs/connections.html
 *   - https://www.mongodb.com/docs/manual/reference/connection-string/
 */
import mongoose from 'mongoose';

export async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
  console.log('No MongoDB URI provided, starting server without database');
    return false;
  }

  try {
    await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB via Mongoose');
    return true;
  } catch (error) {
  console.error('MongoDB connection error:', error.message);
    
    // In test environment, continue without MongoDB
    if (process.env.NODE_ENV === 'test') {
  console.log('Starting server without MongoDB for testing');
      return false;
    } else {
      throw error;
    }
  }
}

// Handle MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
  console.log('MongoDB connection closed.');
  } catch (error) {
  console.error('Error closing MongoDB connection:', error);
  }
});

//----------------------------------------------End of File----------------------------------------------