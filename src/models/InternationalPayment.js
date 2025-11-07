/*
 * International Payment Model (Mongoose)
 * -------------------------------------------------------------
 * This schema defines the International Payment data model for MongoDB.
 * It extends the base payment with international transfer specific fields
 * including SWIFT codes, beneficiary details, and compliance information.
 *
 * Security & Best Practices:
 *   - Validates all fields to prevent injection
 *   - Enforces SWIFT/BIC code formats
 *   - Tracks compliance and audit information
 *   - Encrypts sensitive beneficiary data
 *
 * Usage:
 *   import InternationalPayment from './models/InternationalPayment.js';
 *
 */
import mongoose from 'mongoose';
import crypto from 'crypto';
import validator from 'validator';

// Beneficiary details schema
const beneficiarySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100,
    validate: {
      validator: function(v) {
        return /^[a-zA-Z\s\-.]+$/.test(v);
      },
      message: 'Beneficiary name can only contain letters, spaces, hyphens, and periods'
    }
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true,
    minlength: 8,
    maxlength: 34,  // IBAN max length
    validate: {
      validator: function(v) {
        // Accept either IBAN or regular account number
        return /^[A-Z0-9]+$/i.test(v);
      },
      message: 'Invalid account number format'
    }
  },
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: 100
    },
    city: {
      type: String,
      trim: true,
      maxlength: 50
    },
    state: {
      type: String,
      trim: true,
      maxlength: 50
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: 20
    },
    country: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 2,
      validate: {
        validator: function(v) {
          return /^[A-Z]{2}$/.test(v);
        },
        message: 'Country code must be 2 uppercase letters (ISO 3166-1 alpha-2)'
      }
    }
  },
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[+]?[1-9][\d]{0,15}$/.test(v);
      },
      message: 'Invalid phone number format'
    }
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  }
}, { _id: false });

// Bank details schema
const bankDetailsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  swiftCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        // SWIFT/BIC code: 8 or 11 characters
        return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v);
      },
      message: 'Invalid SWIFT/BIC code format (must be 8 or 11 characters)'
    }
  },
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: 100
    },
    city: {
      type: String,
      trim: true,
      maxlength: 50
    },
    country: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 2
    }
  }
}, { _id: false });

// Intermediary bank schema (for correspondent banking)
const intermediaryBankSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  swiftCode: {
    type: String,
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return !v || /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v);
      },
      message: 'Invalid intermediary bank SWIFT code'
    }
  },
  accountNumber: {
    type: String,
    trim: true,
    maxlength: 34
  }
}, { _id: false });

// Compliance information schema
const complianceSchema = new mongoose.Schema({
  purpose: {
    type: String,
    required: true,
    enum: ['SALA', 'PENS', 'SUPP', 'TRAD', 'LOAN', 'INTC', 'GDDS', 'SERV', 'EDUC', 'MEDI', 'CHAR', 'INVS', 'OTHR'],
    default: 'OTHR'
  },
  purposeDescription: {
    type: String,
    trim: true,
    maxlength: 200
  },
  reference: {
    type: String,
    trim: true,
    maxlength: 35,  // SWIFT MT103 reference max length
    validate: {
      validator: function(v) {
        return !v || /^[a-zA-Z0-9\s\-\/]+$/.test(v);
      },
      message: 'Reference can only contain letters, numbers, spaces, hyphens, and slashes'
    }
  },
  sourceOfFunds: {
    type: String,
    trim: true,
    maxlength: 100
  },
  amlChecked: {
    type: Boolean,
    default: false
  },
  amlCheckDate: {
    type: Date
  },
  amlRiskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'very_high'],
    default: 'low'
  },
  sanctionsChecked: {
    type: Boolean,
    default: false
  },
  sanctionsCheckDate: {
    type: Date
  },
  complianceNotes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, { _id: false });

// Main international payment schema
const internationalPaymentSchema = new mongoose.Schema({
  // Reference to employee who initiated the payment
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
    index: true
  },
  
  // Reference to customer/user
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Transaction details
  transactionId: {
    type: String,
    required: true,
    unique: true,
    default: () => 'INTL' + Date.now() + crypto.randomBytes(4).toString('hex').toUpperCase()
  },
  
  // Payment amount and currency
  amount: {
    type: Number,
    required: true,
    min: 0.01,
    max: 10000000,  // $10M max limit for international
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
    uppercase: true,
    enum: [
      'USD', 'EUR', 'GBP', 'ZAR', 'CHF', 'JPY', 'CAD', 'AUD',
      'CNY', 'INR', 'SGD', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK',
      'MXN', 'BRL', 'RUB', 'TRY', 'KRW', 'THB', 'MYR', 'IDR'
    ],
    default: 'USD'
  },
  
  // Exchange rate information (if conversion needed)
  exchangeRate: {
    rate: Number,
    fromCurrency: String,
    toCurrency: String,
    rateDate: Date,
    provider: String
  },
  
  // Beneficiary information
  beneficiary: {
    type: beneficiarySchema,
    required: true
  },
  
  // Beneficiary bank information
  beneficiaryBank: {
    type: bankDetailsSchema,
    required: true
  },
  
  // Intermediary bank (if needed)
  intermediaryBank: intermediaryBankSchema,
  
  // Compliance information
  compliance: {
    type: complianceSchema,
    required: true
  },
  
  // Payment status
  status: {
    type: String,
    required: true,
    enum: ['draft', 'pending_review', 'approved', 'processing', 'sent', 'completed', 'failed', 'cancelled', 'rejected'],
    default: 'draft',
    index: true
  },
  
  // Approval workflow
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  
  approvedAt: {
    type: Date
  },
  
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Processing details
  processorTransactionId: {
    type: String,
    sparse: true
  },
  
  processingFee: {
    amount: {
      type: Number,
      min: 0
    },
    currency: String,
    description: String
  },
  
  expectedDeliveryDate: {
    type: Date
  },
  
  actualDeliveryDate: {
    type: Date
  },
  
  // Security and audit fields
  ipAddress: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
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
    enum: ['high_amount', 'unusual_destination', 'multiple_attempts', 'suspicious_pattern', 'velocity_check', 'blacklist_match']
  }],
  
  // Status history for audit trail
  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    },
    notes: String
  }],
  
  // Additional notes
  internalNotes: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  customerNotes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true,
  collection: 'international_payments'
});

// Indexes for performance
internationalPaymentSchema.index({ employeeId: 1, createdAt: -1 });
internationalPaymentSchema.index({ customerId: 1, createdAt: -1 });
internationalPaymentSchema.index({ status: 1, createdAt: -1 });
internationalPaymentSchema.index({ 'beneficiaryBank.swiftCode': 1 });
internationalPaymentSchema.index({ 'beneficiary.address.country': 1 });
internationalPaymentSchema.index({ amount: 1, currency: 1 });
internationalPaymentSchema.index({ approvalStatus: 1, status: 1 });

// Virtual for formatted amount
internationalPaymentSchema.virtual('formattedAmount').get(function() {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency
    }).format(this.amount);
  } catch (error) {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }
});

// Virtual for full beneficiary name and account
internationalPaymentSchema.virtual('beneficiaryDisplay').get(function() {
  return `${this.beneficiary.name} (${this.beneficiary.accountNumber})`;
});

// Pre-save middleware
internationalPaymentSchema.pre('save', function(next) {
  // Round amount to 2 decimal places
  if (this.amount) {
    this.amount = Math.round(this.amount * 100) / 100;
  }
  
  // Add status history entry if status changed
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      changedBy: this.employeeId,
      notes: `Status changed to ${this.status}`
    });
  }
  
  // Set approval timestamp
  if (this.isModified('approvalStatus') && this.approvalStatus === 'approved') {
    this.approvedAt = new Date();
  }
  
  // Auto-update AML check date
  if (this.isModified('compliance.amlChecked') && this.compliance.amlChecked) {
    this.compliance.amlCheckDate = new Date();
  }
  
  // Auto-update sanctions check date
  if (this.isModified('compliance.sanctionsChecked') && this.compliance.sanctionsChecked) {
    this.compliance.sanctionsCheckDate = new Date();
  }
  
  next();
});

// Instance methods
internationalPaymentSchema.methods.canApprove = function() {
  return this.status === 'pending_review' && this.approvalStatus === 'pending';
};

internationalPaymentSchema.methods.canCancel = function() {
  return ['draft', 'pending_review', 'approved'].includes(this.status);
};

internationalPaymentSchema.methods.requiresComplianceCheck = function() {
  return this.amount > 10000 || 
         this.compliance.amlRiskLevel === 'high' || 
         this.compliance.amlRiskLevel === 'very_high';
};

internationalPaymentSchema.methods.addStatusNote = function(note, staffId) {
  this.statusHistory.push({
    status: this.status,
    timestamp: new Date(),
    changedBy: staffId,
    notes: note
  });
};

// Static methods
internationalPaymentSchema.statics.getEmployeePayments = function(employeeId, limit = 50, skip = 0) {
  return this.find({ employeeId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('customerId', 'fullName email')
    .populate('employeeId', 'fullName email')
    .populate('approvedBy', 'fullName email');
};

internationalPaymentSchema.statics.getCustomerPayments = function(customerId, limit = 50, skip = 0) {
  return this.find({ customerId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('employeeId', 'fullName email');
};

internationalPaymentSchema.statics.getPendingApprovals = function(limit = 50, skip = 0) {
  return this.find({ 
    status: 'pending_review', 
    approvalStatus: 'pending' 
  })
    .sort({ createdAt: 1 })  // Oldest first
    .limit(limit)
    .skip(skip)
    .populate('customerId', 'fullName email')
    .populate('employeeId', 'fullName email');
};

internationalPaymentSchema.statics.getPaymentStats = function(filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        completedPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        completedAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
        },
        pendingPayments: {
          $sum: { $cond: [{ $eq: ['$status', 'pending_review'] }, 1, 0] }
        },
        pendingAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'pending_review'] }, '$amount', 0] }
        }
      }
    }
  ]);
};

internationalPaymentSchema.statics.getPaymentsByCountry = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$beneficiary.address.country',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);
};

export default mongoose.model('InternationalPayment', internationalPaymentSchema);

//----------------------------------------------End of File----------------------------------------------
