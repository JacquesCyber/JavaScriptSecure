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