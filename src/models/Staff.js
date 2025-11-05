/*
 * Staff Model (Mongoose)
 * -------------------------------------------------------------
 * This schema defines the Staff data model for MongoDB using Mongoose.
 * It enforces data integrity, validation, and security best practices.
 *
 *  Security & Best Practices
 *   - Validates all fields to prevent injection and schema manipulation
 *   - Uses strict schema to prevent object injection and prototype pollution
 *   - Never stores plaintext passwords; always hash and salt
 *   - Enforces unique constraints to prevent privilege escalation
 *
 * Usage:
 *   import Staff from './models/Staff.js';
 *
 */
import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
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
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^EMP[0-9]{6}$/, 'Employee ID must be in format EMP######']
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['staff', 'supervisor', 'admin'],
    default: 'staff'
  },
  department: {
    type: String,
    required: true,
    default: 'International Payments'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  // Permissions for payment portal
  permissions: {
    canViewAllPayments: {
      type: Boolean,
      default: true
    },
    canApprovePayments: {
      type: Boolean,
      default: false
    },
    canRejectPayments: {
      type: Boolean,
      default: false
    },
    canViewSensitiveData: {
      type: Boolean,
      default: false
    },
    canExportData: {
      type: Boolean,
      default: false
    }
  },
  // Audit trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for performance
staffSchema.index({ createdAt: -1 });
// username and email indexes are automatically created by unique: true properties
staffSchema.index({ department: 1 });

export default mongoose.model('Staff', staffSchema);

//----------------------------------------------End of File----------------------------------------------