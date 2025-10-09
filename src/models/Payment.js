import mongoose from 'mongoose';
import crypto from 'crypto';
import validator from 'validator';

// Payment method schema for nested documents
const paymentMethodSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['card', 'paypal', 'bank_transfer', 'crypto', 'swift', 'eft'],
    required: true
  },
  // For card payments - store only last 4 digits and masked data
  cardDetails: {
    lastFour: {
      type: String,
      maxlength: 4,
      validate: {
        validator: function(v) {
          return !v || /^\d{4}$/.test(v);
        },
        message: 'Last four digits must be exactly 4 digits'
      }
    },
    brand: {
      type: String,
      enum: ['visa', 'mastercard', 'amex', 'discover'],
      lowercase: true
    },
    expiryMonth: {
      type: Number,
      min: 1,
      max: 12
    },
    expiryYear: {
      type: Number,
      min: new Date().getFullYear()
    }
  },
  // For PayPal
  paypalEmail: {
    type: String,
    lowercase: true,
    validate: {
      validator: function(v) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid PayPal email format'
    }
  },
  // For bank transfers (South African format)
  bankDetails: {
    accountType: {
      type: String,
      enum: ['cheque', 'savings', 'transmission', 'business', 'checking'] // Keep 'checking' for backward compatibility
    },
    // South African banking fields
    bankCode: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^\d{6}$/.test(v);
        },
        message: 'Bank code must be exactly 6 digits'
      }
    },
    branchCode: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^\d{6}$/.test(v);
        },
        message: 'Branch code must be exactly 6 digits'
      }
    },
    accountNumber: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^\d{10,12}$/.test(v);
        },
        message: 'Account number must be between 10-12 digits'
      }
    },
    // Legacy US banking fields (for backward compatibility)
    routingNumber: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^\d{9}$/.test(v);
        },
        message: 'Routing number must be 9 digits'
      }
    },
    accountLastFour: {
      type: String,
      maxlength: 4,
      validate: {
        validator: function(v) {
          return !v || /^\d{4}$/.test(v);
        },
        message: 'Account last four must be exactly 4 digits'
      }
    }
  },
  // For SWIFT international payments
  swiftDetails: {
    beneficiaryName: {
      type: String,
      required: function() {
        return this.type === 'swift';
      },
      trim: true,
      maxlength: 100
    },
    beneficiaryAccount: {
      type: String,
      required: function() {
        return this.type === 'swift';
      },
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^[A-Z0-9]{8,34}$/.test(v); // IBAN format
        },
        message: 'Invalid beneficiary account format'
      }
    },
    swiftCode: {
      type: String,
      required: function() {
        return this.type === 'swift';
      },
      trim: true,
      uppercase: true,
      validate: {
        validator: function(v) {
          // Use a safe, strict SWIFT/BIC code check (8 or 11 uppercase letters/digits)
          if (!v) return true;
          if (typeof v !== 'string') return false;
          if (v.length !== 8 && v.length !== 11) return false;
          return /^[A-Z0-9]+$/.test(v);
        },
        message: 'Invalid SWIFT code format'
      }
    },
    bankName: {
      type: String,
      required: function() {
        return this.type === 'swift';
      },
      trim: true,
      maxlength: 100
    },
    bankAddress: {
      type: String,
      trim: true,
      maxlength: 200
    },
    bankCity: {
      type: String,
      trim: true,
      maxlength: 50
    },
    bankCountry: {
      type: String,
      trim: true,
      maxlength: 50
    },
    purpose: {
      type: String,
      enum: ['family_support', 'business_payment', 'education', 'medical', 'investment', 'other'],
      default: 'other'
    },
    reference: {
      type: String,
      trim: true,
      maxlength: 50
    }
  }
}, { _id: false });

// Main payment schema
const paymentSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Transaction details
  transactionId: {
    type: String,
    required: true,
    unique: true,
    default: () => 'TXN' + Date.now() + crypto.randomBytes(4).toString('hex').toUpperCase()
  },
  
  // Payment amount and currency
  amount: {
    type: Number,
    required: true,
    min: 0.01,
    max: 1000000, // $1M max limit
    validate: {
      validator: function(v) {
        return Number.isFinite(v) && v > 0;
      },
      message: 'Amount must be a positive number'
    }
  },
  
  currency: {
    type: String,
    required: true,
    default: 'ZAR',
    enum: ['ZAR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BRL', 'MXN'],
    uppercase: true
  },
  
  // Payment method details
  paymentMethod: {
    type: paymentMethodSchema,
    required: true
  },
  
  // Payment provider information
  provider: {
    type: String,
    required: true,
    enum: ['swift', 'eft', 'paypal', 'card_processor', 'crypto_exchange'],
    default: 'swift'
  },
  
  // Transaction status
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },
  
  // Payment description
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  
  // Security and audit fields
  ipAddress: {
    type: String,
    required: true,
    validate: {
        validator: function(v) {
          // Use validator.js for safe IP validation
          return validator.isIP(v + '') || v === '::1' || v === '127.0.0.1';
        },
      message: 'Invalid IP address format'
    }
  },
  
  userAgent: {
    type: String,
    maxlength: 500
  },
  
  // Fraud detection
  fraudScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  fraudFlags: [{
    type: String,
    enum: ['high_amount', 'unusual_location', 'multiple_attempts', 'suspicious_pattern']
  }],
  
  // Processing details
  processorTransactionId: {
    type: String,
    sparse: true // Allow multiple nulls
  },
  
  processorResponse: {
    code: String,
    message: String,
    rawResponse: mongoose.Schema.Types.Mixed
  },
  
  // Refund information
  refundAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  
  refundReason: {
    type: String,
    maxlength: 500
  },
  
  refundDate: {
    type: Date
  },
  
  // Timestamps
  processedAt: {
    type: Date
  },
  
  completedAt: {
    type: Date
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'payments'
});

// Indexes for performance and security
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
// transactionId index is automatically created by unique: true property
paymentSchema.index({ 'paymentMethod.type': 1 });
paymentSchema.index({ amount: 1, createdAt: -1 });

// Virtual for masked card number display
paymentSchema.virtual('maskedCardNumber').get(function() {
  if (this.paymentMethod.type === 'card' && this.paymentMethod.cardDetails.lastFour) {
    return `****-****-****-${this.paymentMethod.cardDetails.lastFour}`;
  }
  return null;
});

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount);
});

// Pre-save middleware for security
paymentSchema.pre('save', function(next) {
  // Ensure amount has proper decimal places
  if (this.amount) {
    this.amount = Math.round(this.amount * 100) / 100; // Round to 2 decimal places
  }
  
  // Set processed timestamp when status changes to processing
  if (this.isModified('status') && this.status === 'processing') {
    this.processedAt = new Date();
  }
  
  // Set completed timestamp when status changes to completed
  if (this.isModified('status') && this.status === 'completed') {
    this.completedAt = new Date();
  }
  
  next();
});

// Instance methods
paymentSchema.methods.canRefund = function() {
  return this.status === 'completed' && this.refundAmount < this.amount;
};

paymentSchema.methods.getMaxRefundAmount = function() {
  return this.amount - this.refundAmount;
};

paymentSchema.methods.isFraudulent = function() {
  return this.fraudScore > 80 || this.fraudFlags.length > 0;
};

// Static methods
paymentSchema.statics.getUserPayments = function(userId, limit = 50, skip = 0) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'fullName email');
};

paymentSchema.statics.getPaymentStats = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        successfulPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        successfulAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
        },
        failedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Ensure indexes are created
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ userId: 1, status: 1 });

export default mongoose.model('Payment', paymentSchema);
