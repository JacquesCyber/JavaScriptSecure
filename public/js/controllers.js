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
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Creating Account...';
      submitBtn.disabled = true;
      
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
        submitBtn.textContent = originalText;
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
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Signing in...';
      submitBtn.disabled = true;
      
      // Submit to MongoDB via API
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Store user data
        this.app.user = {
          id: result.user._id,
          fullName: result.user.fullName,
          email: result.user.email,
          loginTime: new Date().toLocaleString()
        };
        
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
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    }
  }
}

// Dashboard Page Controller
export class DashboardController extends PageController {
  async render(data = {}) {
    const userName = this.app.user?.name || 'User';
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
      userNameEl.textContent = this.app.user.name;
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
        cardDetails.style.display = e.target.value === 'card' ? 'block' : 'none';
      });
    }
  }

  async handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    this.app.showNotification('Processing payment...', 'info');
    
    // Simulate payment processing
    setTimeout(() => {
      this.app.showNotification('Payment processed successfully!', 'success');
      this.generateTransaction(data);
      setTimeout(() => this.app.navigateTo('validator'), 2000);
    }, 2000);
  }

  generateTransaction(paymentData) {
    const transaction = {
      id: 'TXN' + Date.now(),
      amount: paymentData.amount,
      method: paymentData.method,
      timestamp: new Date().toISOString(),
      status: 'completed',
      description: paymentData.description || 'Payment transaction'
    };
    
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    transactions.push(transaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));
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

  // Load and display transactions
  loadTransactions() {
    const container = document.getElementById('transactions-list');
    if (!container) return;

    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    
    if (transactions.length === 0) {
      container.innerHTML = '<p class="text-muted text-center">No transactions found.</p>';
      return;
    }

    container.innerHTML = transactions.map(txn => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-2">
              <strong>ID:</strong><br>
              <small class="text-muted">${txn.id}</small>
            </div>
            <div class="col-md-2">
              <strong>Amount:</strong><br>
              <span class="h5 text-success">$${txn.amount}</span>
            </div>
            <div class="col-md-2">
              <strong>Method:</strong><br>
              <span class="badge bg-primary">${txn.method}</span>
            </div>
            <div class="col-md-3">
              <strong>Date:</strong><br>
              <small>${new Date(txn.timestamp).toLocaleString()}</small>
            </div>
            <div class="col-md-2">
              <strong>Status:</strong><br>
              <span class="badge bg-success">${txn.status}</span>
            </div>
            <div class="col-md-1 text-end">
              <button class="btn btn-sm btn-outline-danger" onclick="this.deleteTransaction('${txn.id}')">
                🗑️
              </button>
            </div>
          </div>
          ${txn.description ? `
            <div class="row mt-2">
              <div class="col-12">
                <small class="text-muted"><strong>Description:</strong> ${txn.description}</small>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  updateStats() {
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    const totalAmount = transactions.reduce((sum, txn) => sum + parseFloat(txn.amount || 0), 0);
    
    const totalTxnEl = document.getElementById('total-transactions');
    const totalAmountEl = document.getElementById('total-amount');
    
    if (totalTxnEl) totalTxnEl.textContent = transactions.length;
    if (totalAmountEl) totalAmountEl.textContent = `$${totalAmount.toFixed(2)}`;
  }

  deleteTransaction(txnId) {
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    const filtered = transactions.filter(txn => txn.id !== txnId);
    localStorage.setItem('transactions', JSON.stringify(filtered));
    
    this.loadTransactions();
    this.updateStats();
    this.app.showNotification('Transaction deleted', 'info');
  }
}