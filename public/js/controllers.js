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
    }
  }

  async handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    // Validation
    if (data.password !== data.confirmPassword) {
      this.app.showNotification('Passwords do not match!', 'error');
      return;
    }

    // Simulate API call
    this.app.showNotification('Account created successfully!', 'success');
    setTimeout(() => this.app.navigateTo('login'), 1500);
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
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    // Simulate authentication
    this.app.user = { 
      email: data.email, 
      name: data.email.split('@')[0],
      loginTime: new Date().toLocaleString()
    };
    
    this.app.showNotification('Login successful!', 'success');
    setTimeout(() => this.app.navigateTo('dashboard'), 1500);
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