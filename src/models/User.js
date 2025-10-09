import mongoose from 'mongoose';
import { encryptIdNumber, decryptIdNumber } from '../utils/encryption.js';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  idNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    set: function(value) {
      // Encrypt the ID number for privacy protection
      return encryptIdNumber(value);
    },
    get: function(value) {
      // Decrypt when retrieving the ID number
      return value ? decryptIdNumber(value) : value;
    },
    validate: {
      validator: function(v) {
        // Handle both encrypted and unencrypted values
        if (!v || typeof v !== 'string') return false;
        
        const cleanedValue = v.trim();
        
        // Check if it's already encrypted (base64 pattern)
        if (cleanedValue.length > 13 && /^[A-Za-z0-9+/=]+$/.test(cleanedValue)) {
          return true; // Already encrypted, assume valid
        }
        
        // Validate unencrypted ID number format
        return /^\d{13}$/.test(cleanedValue);
      },
      message: 'ID number must be exactly 13 digits'
    }
  },
  accountNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        // South African bank account number validation (typically 10-12 digits)
        return /^\d{10,12}$/.test(v);
      },
      message: 'Account number must be between 10-12 digits'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['customer', 'staff', 'admin'],
    default: 'customer'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  // Banking-specific fields
  bankCode: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        // South African bank codes are typically 6 digits
        return /^\d{6}$/.test(v);
      },
      message: 'Bank code must be exactly 6 digits'
    }
  },
  branchCode: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        // South African branch codes are typically 6 digits
        return /^\d{6}$/.test(v);
      },
      message: 'Branch code must be exactly 6 digits'
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for performance
userSchema.index({ createdAt: -1 });
// username and email indexes are automatically created by unique: true properties

export default mongoose.model('User', userSchema);