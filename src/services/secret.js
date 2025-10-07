import mongoose from 'mongoose';
import Secret from '../models/secret.js';
import { encryptHybrid, decryptHybrid } from '../utils/crypto.js';

export class SecretService {
  static async storeSecret(data, title = null) {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection not available');
    }

    try {
      const encrypted = encryptHybrid(data);

      const secret = new Secret({
        encryptedData: encrypted.encryptedData,
        encryptedKey: encrypted.encryptedKey,
        encryptedIV: encrypted.encryptedIV,
        authTag: encrypted.authTag,
        title: title,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours expiry
      });

      const saved = await secret.save();

      return {
        id: saved._id,
        message: 'Secret stored securely',
        expiresAt: saved.expiresAt
      };
    } catch (error) {
      console.error('❌ Error storing secret:', error);
      throw new Error('Failed to store secret');
    }
  }

  static async retrieveSecret(id) {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection not available');
    }

    try {
      const secret = await Secret.findById(id);

      if (!secret) {
        throw new Error('Secret not found');
      }

      // Check if secret has expired
      if (secret.expiresAt && secret.expiresAt < new Date()) {
        // Clean up expired secret
        await Secret.findByIdAndDelete(id);
        throw new Error('Secret has expired');
      }

      // Decrypt the secret
      const decrypted = decryptHybrid({
        encryptedData: secret.encryptedData,
        encryptedKey: secret.encryptedKey,
        encryptedIV: secret.encryptedIV,
        authTag: secret.authTag
      });

      // Delete the secret after retrieval (one-time use)
      await Secret.findByIdAndDelete(id);

      return {
        data: decrypted,
        title: secret.title,
        retrievedAt: new Date(),
        wasCreatedAt: secret.createdAt
      };
    } catch (error) {
      console.error('❌ Error retrieving secret:', error);
      
      if (error.message === 'Secret not found' || error.message === 'Secret has expired') {
        throw error;
      }
      
      throw new Error('Failed to retrieve secret');
    }
  }

  static async getSecretStats() {
    if (mongoose.connection.readyState !== 1) {
      return {
        connected: false,
        message: 'Database not connected'
      };
    }

    try {
      const count = await Secret.countDocuments();
      const oldestSecret = await Secret.findOne().sort({ createdAt: 1 });
      
      return {
        connected: true,
        totalSecrets: count,
        oldestSecretAge: oldestSecret ? 
          Math.floor((Date.now() - oldestSecret.createdAt) / (1000 * 60 * 60 * 24)) : 0
      };
    } catch (error) {
      console.error('❌ Error getting secret stats:', error);
      throw new Error('Failed to get secret statistics');
    }
  }
}