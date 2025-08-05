import mongoose from 'mongoose';

const secretSchema = new mongoose.Schema({
  encryptedData: String,
  encryptedKey: String,
  encryptedIV: String,
  authTag: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Secret', secretSchema);