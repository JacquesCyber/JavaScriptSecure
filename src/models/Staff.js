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
    enum: ['payments', 'compliance', 'operations', 'support'],
    default: 'payments'
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
staffSchema.index({ username: 1 });
staffSchema.index({ email: 1 });
staffSchema.index({ department: 1 });

export default mongoose.model('Staff', staffSchema);

