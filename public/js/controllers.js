/* eslint-env browser, es6 */
/* global document, localStorage, alert */
// Page Controllers - Best Practice Separation
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
      this.app.showNotification('❌ Password does not meet security requirements. Please check the requirements below.', 'error');
      return;
    }

    try {
      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.textContent = 'Creating Account...';
        submitBtn.disabled = true;
      }
      
      console.log('🚀 Starting registration process...');
      console.log('📤 Form data:', data);
      
      // Submit to MongoDB via API
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      
      console.log('📥 Response status:', response.status);
      const result = await response.json();
      console.log('📥 Response data:', result);
      
      if (result.success) {
        this.app.showNotification('✅ Account created successfully! Welcome ' + result.user.fullName, 'success');
        setTimeout(() => this.app.navigateTo('login'), 1500);
      } else {
        this.app.showNotification('❌ Registration failed: ' + result.message, 'error');
      }
      
    } catch (error) {
      console.error('❌ Registration error:', error);
      this.app.showNotification('❌ Network error. Please try again.', 'error');
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
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: data.username,
          accountNumber: data.accountNumber,
          password: data.password
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.app.setUser({
          id: result.user._id,
          fullName: result.user.fullName,
          email: result.user.email,
          role: result.user.role || 'user', // Use actual role from database, fallback to 'user'
          loginTime: new Date().toLocaleString()
        });
        this.app.showNotification('✅ Welcome back, ' + result.user.fullName + '!', 'success');
        setTimeout(() => this.app.navigateTo('dashboard'), 1500);
      } else {
        this.app.showNotification('❌ Login failed: ' + result.message, 'error');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      this.app.showNotification('❌ Network error. Please try again.', 'error');
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
          case 'paypal':
            const paypalDetails = document.getElementById('paypal-details');
            if (paypalDetails) paypalDetails.style.display = 'block';
            break;
          case 'bank_transfer':
            const bankDetails = document.getElementById('bank-details');
            if (bankDetails) bankDetails.style.display = 'block';
            break;
          case 'eft':
            const eftDetails = document.getElementById('eft-details');
            if (eftDetails) eftDetails.style.display = 'block';
            break;
          case 'swift':
            const swiftDetails = document.getElementById('swift-details');
            if (swiftDetails) swiftDetails.style.display = 'block';
            break;
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
      
      console.log('💳 Starting payment process...');
      console.log('📤 Payment data:', data);
      
      // Prepare payment data for API
      const paymentData = {
        amount: parseFloat(data.amount),
        currency: 'USD',
        description: data.description || 'Payment transaction',
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });
      
      console.log('📥 Payment response status:', response.status);
      const result = await response.json();
      console.log('📥 Payment response data:', result);
      
      if (result.success) {
        this.app.showNotification('✅ Payment processed successfully!', 'success');
        // Store transaction ID for later reference
        if (result.payment && result.payment.transactionId) {
          localStorage.setItem('lastTransactionId', result.payment.transactionId);
        }
        setTimeout(() => this.app.navigateTo('validator'), 2000);
      } else {
        this.app.showNotification('❌ Payment failed: ' + result.message, 'error');
      }
      
    } catch (error) {
      console.error('❌ Payment error:', error);
      this.app.showNotification('❌ Network error. Please try again.', 'error');
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
      if (!data.expiryDate || !/^\d{2}\/\d{2}$/.test(data.expiryDate)) {
        errors.push('Please enter a valid expiry date (MM/YY)');
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
      this.app.showNotification('❌ ' + errors.join(', '), 'error');
      return false;
    }

    return true;
  }

  preparePaymentMethodData(data) {
    const methodData = {};

    switch (data.method) {
      case 'card': {
        // Extract last 4 digits and card brand
        const cardNumber = data.cardNumber.replace(/\s/g, '');
        methodData.cardDetails = {
          lastFour: cardNumber.slice(-4),
          brand: this.detectCardBrand(cardNumber),
          expiryMonth: parseInt(data.expiryDate.split('/')[0]),
          expiryYear: parseInt('20' + data.expiryDate.split('/')[1])
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
          beneficiaryAccount: data.beneficiaryAccount,
          swiftCode: data.swiftCode,
          bankName: data.bankName,
          bankCountry: data.bankCountry,
          purpose: data.purpose || 'other',
          reference: data.reference
        };
        break;
    }

    return methodData;
  }

  detectCardBrand(cardNumber) {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    if (/^4/.test(cleanNumber)) return 'visa';
    if (/^5[1-5]/.test(cleanNumber)) return 'mastercard';
    if (/^3[47]/.test(cleanNumber)) return 'amex';
    if (/^6(?:011|5)/.test(cleanNumber)) return 'discover';
    
    return 'unknown';
  }
}

// Validator Page Controller
export class ValidatorController extends PageController {
  async render(data = {}) {
    const content = await super.render('validator', data);
    
    // Load transactions after render
    setTimeout(() => {
      this.loadTransactions();
      this.updateStats();
    }, 100);
    
    return content;
  }

  setupEventListeners() {
    // Validator-specific event listeners
  }

  // Load and display transactions from MongoDB
  async loadTransactions() {
    const container = document.getElementById('transactions-list');
    if (!container) return;

    try {
      // Show loading state
      container.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';

      // Fetch transactions from API
      const userId = this.app.user ? this.app.user.id : '';
      const response = await fetch(`/api/payments/history?limit=50&userId=${encodeURIComponent(userId)}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to load transactions');
      }

      const transactions = result.payments;
      
      if (transactions.length === 0) {
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
                  👁️
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
      console.error('❌ Error loading transactions:', error);
      container.innerHTML = '<p class="text-danger text-center">Failed to load transactions. Please try again.</p>';
    }
  }

  async updateStats() {
    try {
      // Fetch payment statistics from API
      const userId = this.app.user ? this.app.user.id : '';
      const response = await fetch(`/api/payments/stats?userId=${encodeURIComponent(userId)}`);
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
      console.error('❌ Error loading payment stats:', error);
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
        this.app.showNotification('❌ Transaction not found', 'error');
      }
    } catch (error) {
      console.error('❌ Error viewing transaction:', error);
      this.app.showNotification('❌ Failed to load transaction details', 'error');
    }
  }
}