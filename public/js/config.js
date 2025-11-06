/*
 * Frontend App Configuration
 * -------------------------------------------------------------
 * This file defines client-side configuration constants and settings
 * for the JavaScript frontend. It is intended to centralize all
 * environment-specific and security-relevant options for the browser app.
 *
 * Centralized Config
 *   - API endpoints, environment flags, and feature toggles
 *   - All sensitive values should be injected at build time, not hardcoded
 *
 * Security & Best Practices
 *   - Never store secrets or credentials in frontend config
 *   - Use environment variables or server-injected values for sensitive data
 *   - Document all config options for maintainability
 *
 * Usage:
 *   import { API_URL } from './config.js';
 * 
 */

// Application Configuration - Best Practice
export const AppConfig = {
  // Environment Detection
  environment: {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test'
  },

  // Frontend Configuration
  frontend: {
    // Cache settings
    templateCacheEnabled: true,
    templateCacheMaxSize: 50,
    
    // API settings
    apiTimeout: 10000, // 10 seconds
    retryAttempts: 3,
    
    // UI settings
    notificationDuration: 3000,
    loadingDelay: 100,
    
    // Security settings
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxUploadSize: 10 * 1024 * 1024, // 10MB
    
    // Feature flags
    features: {
      enablePayments: true,
      enableTransactionHistory: true,
      enableUserRegistration: true,
      enableNotifications: true
    }
  },

  // Routes Configuration
  routes: {
    defaultRoute: 'register',
    protectedRoutes: ['dashboard', 'payment', 'validator'],
    publicRoutes: ['register', 'login'],
    
    // Route metadata
    routeConfig: {
      register: {
        title: 'Create Account',
        requiresAuth: false
      },
      login: {
        title: 'Sign In',
        requiresAuth: false
      },
      dashboard: {
        title: 'Dashboard',
        requiresAuth: true
      },
      payment: {
        title: 'Payment',
        requiresAuth: true
      },
      validator: {
        title: 'Transactions',
        requiresAuth: true
      }
    }
  },

  // API Endpoints
  api: {
    baseUrl: process.env.API_BASE_URL || '/api',
    endpoints: {
      auth: '/auth',
      users: '/users',
      payments: '/payments',
      transactions: '/transactions'
    }
  },

  // Storage Configuration
  storage: {
    prefix: 'secureApp_',
    keys: {
      user: 'user',
      transactions: 'transactions',
      preferences: 'preferences',
      session: 'session'
    }
  },

  // Validation Rules
  validation: {
    password: {
      minLength: 8,
      requireNumbers: true,
      requireSpecialChars: true,
      requireUppercase: true
    },
    payment: {
      minAmount: 0.01,
      maxAmount: 10000.00,
      allowedMethods: ['card', 'paypal', 'bank']
    }
  },

  // Error Messages
  messages: {
    errors: {
      network: 'Network error. Please check your connection.',
      validation: 'Please check your input and try again.',
      authentication: 'Invalid credentials. Please try again.',
      authorization: 'You do not have permission to access this resource.',
      notFound: 'The requested resource was not found.',
      server: 'Server error. Please try again later.'
    },
    success: {
      login: 'Login successful!',
      register: 'Account created successfully!',
      payment: 'Payment processed successfully!',
      save: 'Changes saved successfully!'
    }
  }
};

// Configuration getter with environment overrides
export function getConfig(path) {
  const keys = path.split('.');
  let value = AppConfig;
  
  for (const key of keys) {
    value = value[key];
    if (value === undefined) {
      console.warn(`Configuration key '${path}' not found`);
      return null;
    }
  }
  
  return value;
}

// Feature flag checker
export function isFeatureEnabled(featureName) {
  return getConfig(`frontend.features.${featureName}`) === true;
}

// Environment checker
export function isDevelopment() {
  return getConfig('environment.isDevelopment');
}

export function isProduction() {
  return getConfig('environment.isProduction');
}

//----------------------------------------------End of File----------------------------------------------