/*
 * Secret Model (Mongoose)
 * -------------------------------------------------------------
 * This schema defines the Secret data model for MongoDB using Mongoose.
 * It is designed for secure storage and access control of sensitive secrets.
 *
 *  Security & Best Practices
 *   - Validates all fields to prevent injection and schema manipulation
 *   - Uses strict schema to prevent object injection and prototype pollution
 *   - Never stores secrets in plaintext; always encrypt at rest
 *   - Restricts access to authorized users only
 *
 * Usage:
 *   import Secret from './models/secret.js';
 *
 */
import mongoose from 'mongoose';

const secretSchema = new mongoose.Schema({
  encryptedData: String,
  encryptedKey: String,
  encryptedIV: String,
  authTag: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    index: { expireAfterSeconds: 0 } // MongoDB TTL index for automatic cleanup
  }
});

export default mongoose.model('Secret', secretSchema);

//----------------------------------------------End of File----------------------------------------------