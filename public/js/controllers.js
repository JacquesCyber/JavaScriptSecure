/*
 * Frontend Controllers (MVC)
 * -------------------------------------------------------------
 * This file contains controller logic for the browser-based JavaScript app.
 * Controllers handle user interactions, update the UI, and communicate
 * with backend APIs. This structure supports maintainable, testable code.
 *
 * Separation of Concerns
 *   - Controllers should not contain direct DOM manipulation (use views)
 *   - All API calls and business logic should be centralized here
 *
 * Security & Best Practices
 *   - Sanitize all user input before sending to backend
 *   - Handle API errors gracefully and avoid leaking sensitive info
 *   - Avoid direct access to window or document unless necessary
 *
 * Usage:
 *   import { loginController } from './controllers.js';
 *
 *  REFERENCES:
 *  - https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
 */


// Helper function to get CSRF token
function getCsrfToken() {
  // Primary: Get from meta tag (injected by server)
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  if (metaTag && metaTag.content) {
    console.log('CSRF token from meta tag:', metaTag.content.substring(0, 10) + '...');
    return metaTag.content;
  }
  
  // Fallback: try cookies (for other implementations)
  const match = document.cookie.match(/_csrf=([^;]+)/);
  if (match) {
    console.log('CSRF token from _csrf cookie');
    return decodeURIComponent(match[1]);
  }
  
  // Also try XSRF-TOKEN as fallback
  const xsrfMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  if (xsrfMatch) {
    console.log('CSRF token from XSRF-TOKEN cookie');
    return decodeURIComponent(xsrfMatch[1]);
  }

  console.error('No CSRF token found in meta tag or cookies!');
  return '';
}

// Helper function to get headers with CSRF token
function getHeadersWithCsrf(additionalHeaders = {}) {
  const csrfToken = getCsrfToken();
  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };
  
  if (csrfToken) {
    console.log(' Including CSRF token in headers:', csrfToken.substring(0, 10) + '...');
    // Add CSRF token in all common header formats that csurf checks
    headers['csrf-token'] = csrfToken;
    headers['xsrf-token'] = csrfToken;
    headers['x-csrf-token'] = csrfToken;
    headers['x-xsrf-token'] = csrfToken;
  } else {
    console.warn('No CSRF token available - request will likely fail!');
  }
  
  return headers;
}

export class PageController {
  constructor(app) {
    this.app = app;
  }

  // Base controller methods
  async render(templateName, data = {}) {
    try {
      const template = await this.app.loadTemplate(templateName);
      return this.interpolateTemplate(template, data);
    } catch (error) {
      console.error(`Error rendering ${templateName}:`, error);
      return this.app.get404Template();
    }
  }

  interpolateTemplate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  setupEventListeners() {
    // Override in child classes
  }

  cleanup() {
    // Override in child classes for cleanup
  }
}

// Register Page Controller
export class RegisterController extends PageController {
  async render(data = {}) {
    const content = await super.render('register', data);
    return content;
  }

  setupEventListeners() {
    const form = document.getElementById('register-form');
    if (form) {
      form.addEventListener('submit', this.handleSubmit.bind(this));
      
      // Add real-time password validation
      const passwordInput = document.getElementById('password');
      if (passwordInput) {
        passwordInput.addEventListener('input', this.validatePassword.bind(this));
      }
    }
  }

  validatePassword(event) {
    const password = event.target.value;
    
    // Password requirements
    const requirements = {
      'req-length': password.length >= 8,
      'req-lowercase': /[a-z]/.test(password),
      'req-uppercase': /[A-Z]/.test(password),
      'req-number': /\d/.test(password)
    };

    // Update requirement indicators
    Object.entries(requirements).forEach(([id, isValid]) => {
      const element = document.getElementById(id);
      if (element) {
        const icon = element.querySelector('i');
        if (isValid) {
          element.className = 'text-success';
          icon.className = 'fas fa-check me-1';
        } else {
          element.className = 'text-danger';
          icon.className = 'fas fa-times me-1';
        }
      }
    });

    // Update input validation state
    const allValid = Object.values(requirements).every(req => req);
    const passwordInput = event.target;
    
    if (password.length > 0) {
      if (allValid) {
        passwordInput.classList.remove('is-invalid');
        passwordInput.classList.add('is-valid');
      } else {
        passwordInput.classList.remove('is-valid');
        passwordInput.classList.add('is-invalid');
      }
    }

    return allValid;
  }

  async handleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Validation
    if (data.password !== data.confirmPassword) {
      this.app.showNotification('Passwords do not match!', 'error');
      return;
    }

    // Check password requirements
    const passwordRequirements = {
      length: data.password.length >= 8,
      lowercase: /[a-z]/.test(data.password),
      uppercase: /[A-Z]/.test(data.password),
      number: /\d/.test(data.password)
    };

    const allValid = Object.values(passwordRequirements).every(req => req);
    
    if (!allValid) {
      this.app.showNotification('Password does not meet security requirements. Please check the requirements below.', 'error');
      return;
    }

    try {
      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = 'Creating Account...';
        submitBtn.disabled = true;
      }
      
      console.log('Starting registration process...');
      console.log('Form data:', data);
      
      // Submit to MongoDB via API
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: getHeadersWithCsrf(),
        credentials: 'same-origin',
        body: JSON.stringify({
          fullName: data.fullName,
          email: data.email,
          username: data.username,
          idNumber: data.idNumber,
          accountNumber: data.accountNumber,
          bankCode: data.bankCode,
          branchCode: data.branchCode,
          password: data.password
        })
      });
      
      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);
      
      if (result.success) {
        this.app.showNotification('Account created successfully! Welcome ' + result.user.fullName, 'success');
        setTimeout(() => this.app.navigateTo('login'), 1500);
      } else {
        this.app.showNotification('Registration failed: ' + result.message, 'error');
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      this.app.showNotification('Network error. Please try again.', 'error');
    } finally {
      // Restore button state
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = 'Create Account';
        submitBtn.disabled = false;
      }
    }
  }
}

// Login Page Controller  
export class LoginController extends PageController {
  async render(data = {}) {
    const content = await super.render('login', data);
    return content;
  }

  setupEventListeners() {
    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', this.handleSubmit.bind(this));
    }
  }

  async handleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = 'Signing in...';
        submitBtn.disabled = true;
      }
      
      // Submit to MongoDB via API
      console.log('Login data being sent:', {
        username: data.username,
        accountNumber: data.accountNumber,
        accountNumberType: typeof data.accountNumber
      });
      
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: getHeadersWithCsrf(),
        credentials: 'same-origin',
        body: JSON.stringify({
          username: data.username,
          accountNumber: data.accountNumber,
          password: data.password
        })
      });
      
      const result = await response.json();
      console.log('Login response:', result);
      console.log('Response status:', response.status);
      
      if (result.success) {
        this.app.setUser({
          id: result.user._id || result.user.id, // Handle both _id and id formats
          fullName: result.user.fullName,
          email: result.user.email,
          role: result.user.role || 'user', // Use actual role from database, fallback to 'user'
          loginTime: new Date().toLocaleString()
        });
        
        this.app.showNotification('Welcome back, ' + result.user.fullName + '!', 'success');
        setTimeout(() => this.app.navigateTo('dashboard'), 1500);
      } else {
        // Handle both 'message' and 'error' properties in the response
        const errorMessage = result.message || result.error || 'Unknown error occurred';
        console.error('Login failed with message:', errorMessage);
        this.app.showNotification('Login failed: ' + errorMessage, 'error');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      this.app.showNotification('Network error. Please try again.', 'error');
    } finally {
      // Restore button state
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = 'Sign In';
        submitBtn.disabled = false;
      }
    }
  }
}

// Dashboard Page Controller
export class DashboardController extends PageController {
  async render() {
    const userName = this.app.user?.fullName || 'User';
    const loginTime = this.app.user?.loginTime || new Date().toLocaleString();
    
    const content = await super.render('dashboard', { 
      userName, 
      loginTime 
    });
    
    // Update dynamic content after render
    setTimeout(() => {
      this.updateDynamicContent();
    }, 100);
    
    return content;
  }

  updateDynamicContent() {
    const userNameEl = document.getElementById('user-name');
    const loginTimeEl = document.getElementById('login-time');
    
    if (userNameEl && this.app.user) {
      userNameEl.textContent = this.app.user.fullName;
    }
    
    if (loginTimeEl && this.app.user) {
      loginTimeEl.textContent = this.app.user.loginTime;
    }
  }

  setupEventListeners() {
    // Dashboard-specific event listeners
    const cards = document.querySelectorAll('[data-page]');
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const page = e.currentTarget.getAttribute('data-page');
        this.app.navigateTo(page);
      });
    });
  }
}

// Payment Page Controller
export class PaymentController extends PageController {
  async render(data = {}) {
    const content = await super.render('payment', data);
    return content;
  }

  setupEventListeners() {
    const form = document.getElementById('payment-form');
    const methodSelect = document.getElementById('payment-method');
    const cardDetails = document.getElementById('card-details');
    
    if (form) {
      form.addEventListener('submit', this.handleSubmit.bind(this));
    }
    
    if (methodSelect && cardDetails) {
      methodSelect.addEventListener('change', (e) => {
        const selectedMethod = e.target.value;
        
        // Hide all payment method sections first
        const allSections = ['card-details', 'paypal-details', 'bank-details', 'eft-details', 'swift-details'];
        allSections.forEach(sectionId => {
          const section = document.getElementById(sectionId);
          if (section) section.style.display = 'none';
        });
        
        // Show the appropriate section based on selected method
        switch (selectedMethod) {
          case 'card':
            cardDetails.style.display = 'block';
            break;
          case 'paypal': {
            const paypalDetails = document.getElementById('paypal-details');
            if (paypalDetails) paypalDetails.style.display = 'block';
            break;
          }
          case 'bank_transfer': {
            const bankDetails = document.getElementById('bank-details');
            if (bankDetails) bankDetails.style.display = 'block';
            break;
          }
          case 'eft': {
            const eftDetails = document.getElementById('eft-details');
            if (eftDetails) eftDetails.style.display = 'block';
            break;
          }
          case 'swift': {
            const swiftDetails = document.getElementById('swift-details');
            if (swiftDetails) swiftDetails.style.display = 'block';
            break;
          }
        }
      });
    }
  }

  async handleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Validate payment data
    if (!this.validatePaymentData(data)) {
      return;
    }
    
    try {
      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = 'Processing Payment...';
        submitBtn.disabled = true;
      }
      
      this.app.showNotification('Processing payment...', 'info');
      
      // Prepare payment data for API
      const paymentData = {
        amount: parseFloat(data.amount),
        currency: data.currency || 'ZAR', // Use selected currency, default to ZAR
        description: (data.description && data.description.trim()) || 'Payment transaction',
        paymentMethod: {
          type: data.method,
          ...this.preparePaymentMethodData(data)
        }
      };
      
      // Add user ID to payment data
      if (this.app.user && this.app.user.id) {
        paymentData.userId = this.app.user.id;
      }
      
      // Submit to MongoDB via API
      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: getHeadersWithCsrf(),
        credentials: 'same-origin',
        body: JSON.stringify(paymentData)
      });
      
      const result = await response.json();

      if (result.success) {
        // If this is a SWIFT payment, also create an international payment for employee review
        if (data.method === 'swift' && result.payment) {
          await this.createInternationalPayment(data, result.payment);
        }

        this.app.showNotification('Payment processed successfully!', 'success');
        // Store transaction ID for later reference
        if (result.payment && result.payment.transactionId) {
          localStorage.setItem('lastTransactionId', result.payment.transactionId);
        }
        setTimeout(() => this.app.navigateTo('validator'), 2000);
      } else {
        // Display detailed validation errors
        let errorMessage = result.message || 'Payment failed';
        if (result.errors && result.errors.length > 0) {
          // Log error count only, not details
          console.error('Validation failed with', result.errors.length, 'error(s)');
          const errorDetails = result.errors.map(err => 
            `${err.path || err.param}: ${err.msg}`
          ).join(', ');
          errorMessage += '. Details: ' + errorDetails;
        }
        this.app.showNotification('Payment failed: ' + errorMessage, 'error');
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      this.app.showNotification('Network error. Please try again.', 'error');
    } finally {
      // Restore button state
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = 'Process Payment';
        submitBtn.disabled = false;
      }
    }
  }

  validatePaymentData(data) {
    const errors = [];

    // Validate amount
    if (!data.amount || isNaN(data.amount) || parseFloat(data.amount) <= 0) {
      errors.push('Please enter a valid payment amount');
    }

    // Validate payment method
    if (!data.method) {
      errors.push('Please select a payment method');
    }

    // Validate card details if card is selected
    if (data.method === 'card') {
      if (!data.cardNumber || data.cardNumber.replace(/\s/g, '').length < 13) {
        errors.push('Please enter a valid card number');
      }
      if (!data.expiryMonth || !/^\d{2}$/.test(data.expiryMonth)) {
        errors.push('Please select expiry month (MM)');
      }
      if (!data.expiryYear || !/^\d{4}$/.test(data.expiryYear)) {
        errors.push('Please select expiry year (YYYY)');
      }
      // Validate that the expiry date is not in the past
      if (data.expiryMonth && data.expiryYear) {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // 0-indexed
        const expiryYear = parseInt(data.expiryYear);
        const expiryMonth = parseInt(data.expiryMonth);
        
        if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
          errors.push('Card has expired. Please enter a valid expiry date');
        }
      }
      if (!data.cvv || data.cvv.length < 3) {
        errors.push('Please enter a valid CVV');
      }
    }

    // Validate PayPal email if PayPal is selected
    if (data.method === 'paypal') {
      if (!data.paypalEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.paypalEmail)) {
        errors.push('Please enter a valid PayPal email');
      }
    }

    // Validate bank transfer details if bank transfer is selected
    if (data.method === 'bank_transfer') {
      if (!data.bankCode || !/^\d{6}$/.test(data.bankCode)) {
        errors.push('Please enter a valid 6-digit bank code');
      }
      if (!data.branchCode || !/^\d{6}$/.test(data.branchCode)) {
        errors.push('Please enter a valid 6-digit branch code');
      }
      if (!data.accountNumber || !/^\d{10,12}$/.test(data.accountNumber)) {
        errors.push('Please enter a valid account number (10-12 digits)');
      }
    }

    // Validate EFT details if EFT is selected
    if (data.method === 'eft') {
      if (!data.eftBankCode || !/^\d{6}$/.test(data.eftBankCode)) {
        errors.push('Please enter a valid 6-digit bank code for EFT');
      }
      if (!data.eftBranchCode || !/^\d{6}$/.test(data.eftBranchCode)) {
        errors.push('Please enter a valid 6-digit branch code for EFT');
      }
      if (!data.eftAccountNumber || !/^\d{10,12}$/.test(data.eftAccountNumber)) {
        errors.push('Please enter a valid account number for EFT (10-12 digits)');
      }
    }

    // Validate SWIFT details if SWIFT is selected
    if (data.method === 'swift') {
      if (!data.beneficiaryName || data.beneficiaryName.trim().length === 0) {
        errors.push('Please enter beneficiary name');
      }
      if (!data.swiftCode || !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(data.swiftCode)) {
        errors.push('Please enter a valid SWIFT/BIC code');
      }
      if (!data.bankName || data.bankName.trim().length === 0) {
        errors.push('Please enter bank name');
      }
      if (!data.bankCountry || data.bankCountry.trim().length === 0) {
        errors.push('Please enter bank country');
      }
      if (!data.beneficiaryAccount || data.beneficiaryAccount.trim().length === 0) {
        errors.push('Please enter beneficiary account/IBAN');
      }
    }

    // Show errors if any
    if (errors.length > 0) {
      this.app.showNotification('Errors found: ' + errors.join(', '), 'error');
      return false;
    }

    return true;
  }

  preparePaymentMethodData(data) {
    const methodData = {};

    switch (data.method) {
      case 'card': {
        // Extract last 4 digits
        const cardNumber = data.cardNumber.replace(/\s/g, '');
        methodData.cardDetails = {
          lastFour: cardNumber.slice(-4),
          expiryMonth: parseInt(data.expiryMonth),
          expiryYear: parseInt(data.expiryYear)
        };
        break;
      }
      case 'paypal':
        methodData.paypalEmail = data.paypalEmail;
        break;
      case 'bank_transfer':
        methodData.bankDetails = {
          accountType: data.accountType || 'cheque',
          bankCode: data.bankCode,
          branchCode: data.branchCode,
          accountNumber: data.accountNumber
        };
        break;
      case 'eft':
        methodData.bankDetails = {
          accountType: data.eftAccountType || 'cheque',
          bankCode: data.eftBankCode,
          branchCode: data.eftBranchCode,
          accountNumber: data.eftAccountNumber
        };
        break;
      case 'swift':
        methodData.swiftDetails = {
          beneficiaryName: data.beneficiaryName,
          // Normalize IBAN/account: remove spaces and convert to uppercase
          beneficiaryAccount: data.beneficiaryAccount?.replace(/\s/g, '').toUpperCase(),
          // Normalize SWIFT code: remove spaces and convert to uppercase
          swiftCode: data.swiftCode?.replace(/\s/g, '').toUpperCase(),
          bankName: data.bankName,
          bankCountry: data.bankCountry,
          purpose: data.purpose || 'other',
          reference: data.reference
        };
        break;
    }

    return methodData;
  }

  async createInternationalPayment(formData, payment) {
    try {
      console.log('Creating international payment for SWIFT transaction...');

      // Map purpose values from form to SWIFT codes
      const purposeMap = {
        'family_support': 'OTHR',
        'business_payment': 'TRAD',
        'education': 'EDUC',
        'medical': 'MEDI',
        'investment': 'INVS',
        'other': 'OTHR'
      };

      const internationalPaymentData = {
        customerId: this.app.user.id,
        employeeId: this.app.user.id, // Using customer ID as placeholder - should be actual employee
        amount: parseFloat(formData.amount),
        currency: formData.currency || 'ZAR',
        beneficiaryName: formData.beneficiaryName,
        beneficiaryAccount: formData.beneficiaryAccount,
        beneficiaryEmail: formData.beneficiaryEmail || '',
        beneficiaryPhone: formData.beneficiaryPhone || '',
        swiftCode: formData.swiftCode,
        bankName: formData.bankName,
        bankCountry: formData.bankCountry,
        bankCity: formData.bankCity || '',
        bankAddress: formData.bankAddress || '',
        purpose: purposeMap[formData.purpose] || 'OTHR',
        reference: formData.reference || payment.transactionId,
        sourceOfFunds: formData.description || 'Customer payment',
        notes: `Auto-created from customer payment ${payment.transactionId}`
      };

      const response = await fetch('/api/international-payments/create', {
        method: 'POST',
        headers: getHeadersWithCsrf(),
        credentials: 'same-origin',
        body: JSON.stringify(internationalPaymentData)
      });

      const result = await response.json();

      if (result.success) {
        console.log('International payment created successfully:', result.payment.transactionId);
      } else {
        console.error('Failed to create international payment:', result.message);
      }
    } catch (error) {
      console.error('Error creating international payment:', error);
      // Don't throw - this is a background operation
    }
  }
}

// Validator Page Controller
export class ValidatorController extends PageController {
  async render(data = {}) {
    const content = await super.render('validator', data);
    
    // Ensure user session is valid before loading data
    if (!this.app.user || !this.app.user.id) {
      console.log('No valid user session found, attempting to restore...');
      this.app.loadUserFromSession();
    }
    
    // Load transactions after render
    setTimeout(() => {
      this.loadTransactions();
      this.updateStats();
    }, 100);
    
    return content;
  }

  setupEventListeners() {
    // Validator-specific event listeners
    // Add refresh button functionality
    const refreshBtn = document.querySelector('button[onclick="location.reload()"]');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.refreshData();
      });
    }
  }

  async refreshData() {
    console.log('Refreshing transaction data...');
    await this.loadTransactions();
    await this.updateStats();
    this.app.showNotification('Data refreshed successfully', 'success');
  }

  // Load and display transactions from MongoDB
  async loadTransactions() {
    const container = document.getElementById('transactions-list');
    if (!container) return;

    try {
      // Show loading state
      container.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';

      // Check if user is authenticated and has valid user data
      if (!this.app.user || !this.app.user.id) {
        console.error('User not authenticated or missing user ID');
        container.innerHTML = '<p class="text-danger text-center"> Authentication required. Please log in again.</p>';
        return;
      }

      // Fetch transactions from API
      const userId = this.app.user.id;
      const response = await fetch(`/api/payments/history?limit=50&userId=${encodeURIComponent(userId)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to load transactions');
      }

      const transactions = result.payments;
      
      if (!transactions || transactions.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No transactions found.</p>';
        return;
      }

      container.innerHTML = transactions.map(txn => `
        <div class="card mb-3">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-md-2">
                <strong>Transaction ID:</strong><br>
                <small class="text-muted">${txn.transactionId}</small>
              </div>
              <div class="col-md-2">
                <strong>Amount:</strong><br>
                <span class="h5 text-success">${txn.currency} ${txn.amount.toFixed(2)}</span>
              </div>
              <div class="col-md-2">
                <strong>Method:</strong><br>
                <span class="badge bg-primary">${txn.paymentMethod.type}</span>
              </div>
              <div class="col-md-3">
                <strong>Date:</strong><br>
                <small>${new Date(txn.createdAt).toLocaleString()}</small>
              </div>
              <div class="col-md-2">
                <strong>Status:</strong><br>
                <span class="badge ${this.getStatusBadgeClass(txn.status)}">${txn.status}</span>
              </div>
              <div class="col-md-1 text-end">
                <button class="btn btn-sm btn-outline-info" onclick="window.SecureApp.viewTransaction('${txn.transactionId}')" title="View Details">
                </button>
              </div>
            </div>
            <div class="row mt-2">
              <div class="col-12">
                <small class="text-muted"><strong>Description:</strong> ${txn.description}</small>
                ${txn.paymentMethod.cardDetails && txn.paymentMethod.cardDetails.maskedNumber ? `
                  <br><small class="text-muted"><strong>Card:</strong> ${txn.paymentMethod.cardDetails.maskedNumber}</small>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `).join('');
      
    } catch (error) {
      console.error(' Error loading transactions:', error);
      container.innerHTML = '<p class="text-danger text-center">You have probably been rate limited. Please try again in 15 minutes(if you are a marker just restart the server).</p>';
    }
  }

  async updateStats() {
    try {
      // Check if user is authenticated and has valid user data
      if (!this.app.user || !this.app.user.id) {
        console.error('User not authenticated or missing user ID for stats');
        // Set default values when not authenticated
        const totalTxnEl = document.getElementById('total-transactions');
        const totalAmountEl = document.getElementById('total-amount');
        
        if (totalTxnEl) totalTxnEl.textContent = '0';
        if (totalAmountEl) totalAmountEl.textContent = '$0.00';
        return;
      }

      // Fetch payment statistics from API
      const userId = this.app.user.id;
      const response = await fetch(`/api/payments/stats?userId=${encodeURIComponent(userId)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to load statistics');
      }

      const stats = result.stats;
      
      const totalTxnEl = document.getElementById('total-transactions');
      const totalAmountEl = document.getElementById('total-amount');
      const successfulTxnEl = document.getElementById('successful-transactions');
      const failedTxnEl = document.getElementById('failed-transactions');
      
      if (totalTxnEl) totalTxnEl.textContent = stats.totalPayments || 0;
      if (totalAmountEl) totalAmountEl.textContent = `$${(stats.successfulAmount || 0).toFixed(2)}`;
      if (successfulTxnEl) successfulTxnEl.textContent = stats.successfulPayments || 0;
      if (failedTxnEl) failedTxnEl.textContent = stats.failedPayments || 0;
      
    } catch (error) {
      console.error(' Error loading payment stats:', error);
      // Fallback to default values
      const totalTxnEl = document.getElementById('total-transactions');
      const totalAmountEl = document.getElementById('total-amount');
      
      if (totalTxnEl) totalTxnEl.textContent = '0';
      if (totalAmountEl) totalAmountEl.textContent = '$0.00';
    }
  }

  getStatusBadgeClass(status) {
    const statusClasses = {
      'completed': 'bg-success',
      'pending': 'bg-warning',
      'processing': 'bg-info',
      'failed': 'bg-danger',
      'cancelled': 'bg-secondary',
      'refunded': 'bg-dark'
    };
    return statusClasses[status] || 'bg-secondary';
  }

  async viewTransaction(transactionId) {
    try {
      const response = await fetch(`/api/payments/${transactionId}`);
      const result = await response.json();
      
      if (result.success) {
        const payment = result.payment;
        const details = `
Transaction ID: ${payment.transactionId}
Amount: ${payment.currency} ${payment.amount}
Payment Method: ${payment.paymentMethod.type}
Status: ${payment.status}
Description: ${payment.description}
Created: ${new Date(payment.createdAt).toLocaleString()}
${payment.completedAt ? `Completed: ${new Date(payment.completedAt).toLocaleString()}` : ''}
        `;
        
        alert(details);
      } else {
        this.app.showNotification('Transaction not found', 'error');
      }
    } catch (error) {
      console.error('Error viewing transaction:', error);
      this.app.showNotification('Failed to load transaction details', 'error');
    }
  }
}

//----------------------------------------------End of File----------------------------------------------