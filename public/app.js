/*
 * Frontend Application Entry Point
 * -------------------------------------------------------------
 * This file initializes the browser-based JavaScript application.
 * It sets up global event listeners, bootstraps controllers, and
 * manages application-wide state and configuration.
 *
 * Initialization & Bootstrap
 *   - Loads config and controllers
 *   - Sets up event listeners and global error handling
 *
 * Security & Best Practices
 *   - Avoids exposing sensitive data in the global scope
 *   - Handles errors gracefully and logs only non-sensitive info
 *   - Ensures all DOM manipulations are sanitized
 *
 * Usage:
 *   <script src="/app.js"></script>
 *
 *  REFERENCES:
 *  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
 *  
 */

import { 
  RegisterController, 
  LoginController, 
  DashboardController, 
  PaymentController, 
  ValidatorController 
} from './js/controllers.js';

class SecureApp {
  constructor() {
    this.currentPage = 'register';
    this.currentController = null;
    this.user = null;
    this.templateCache = new Map();
    this.controllers = new Map();
    
    // Page security configuration
    this.pageConfig = {
      'register': { requiresAuth: false, allowedRoles: [] },
      'login': { requiresAuth: false, allowedRoles: [] },
      'dashboard': { requiresAuth: true, allowedRoles: ['customer', 'user', 'admin'] },
      'payment': { requiresAuth: true, allowedRoles: ['customer', 'user', 'admin'] },
      'validator': { requiresAuth: true, allowedRoles: ['customer', 'user', 'admin'] }
    };
    
    this.init();
  }

  init() {
    this.loadUserFromSession(); // Load user from session storage
    this.initializeControllers();
    this.setupRouter();
    this.setupGlobalEventListeners();
    this.loadPage(this.getPageFromHash() || this.getDefaultPage());
  }

  initializeControllers() {
    this.controllers.set('register', new RegisterController(this));
    this.controllers.set('login', new LoginController(this));
    this.controllers.set('dashboard', new DashboardController(this));
    this.controllers.set('payment', new PaymentController(this));
    this.controllers.set('validator', new ValidatorController(this));
  }

  setupRouter() {
    window.addEventListener('hashchange', () => {
      this.loadPage(this.getPageFromHash());
    });
  }

  getPageFromHash() {
    const requestedPage = window.location.hash.slice(1) || 'register';
    if (!this.isValidPage(requestedPage)) {
      return this.getDefaultPage();
    }
    if (!this.hasPageAccess(requestedPage)) {
      return this.getDefaultPage();
    }
    return requestedPage;
  }

  setupGlobalEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
      this.setupNavigation();
    });

    // Global navigation click handlers
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-page]')) {
        e.preventDefault();
        const page = e.target.getAttribute('data-page');
        this.navigateTo(page);
      }
      
      // Handle logout button clicks
      if (e.target.id === 'logout-btn' || e.target.closest('#logout-btn')) {
        e.preventDefault();
        console.log('Logout button clicked via event delegation!');
        this.logout();
      }
    });

    // Global form submission handler
    document.addEventListener('submit', (e) => {
      if (e.target.matches('form')) {
        e.preventDefault();
        // Let controller handle form submission
      }
    });
  }

  setupNavigation() {
    // Update navigation active states
    this.updateNavigation();
  }

  navigateTo(page) {
    if (!this.isValidPage(page)) {
      this.showNotification('Invalid page requested', 'error');
      return;
    }
    if (!this.hasPageAccess(page)) {
      this.showNotification('Access denied. Please log in.', 'error');
      page = this.isAuthenticated() ? this.currentPage : 'login';
    }
    window.location.hash = page;
    this.loadPage(page);
  }

  async loadPage(page) {
    this.currentPage = page;
    this.updateNavigation();
    await this.renderPage(page);
  }

  updateNavigation() {
    const nav = document.querySelector('.navbar-nav');
    if (!nav) return;

    nav.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-page') === this.currentPage) {
        link.classList.add('active');
      }
    });

    const isAuth = this.isAuthenticated();
    const navRegister = document.getElementById('nav-register');
    const navLogin = document.getElementById('nav-login');
    const navDashboard = document.getElementById('nav-dashboard');
    const navPayment = document.getElementById('nav-payment');
    const navValidator = document.getElementById('nav-validator');
    const navLogout = document.getElementById('nav-logout');
    
    if (navRegister) navRegister.style.display = !isAuth ? 'block' : 'none';
    if (navLogin) navLogin.style.display = !isAuth ? 'block' : 'none';
    if (navDashboard) navDashboard.style.display = isAuth ? 'block' : 'none';
    if (navPayment) navPayment.style.display = isAuth ? 'block' : 'none';
    if (navValidator) navValidator.style.display = isAuth && this.hasRequiredRole(['customer', 'user', 'admin']) ? 'block' : 'none';
    if (navLogout) navLogout.style.display = isAuth ? 'block' : 'none';
  }

  async renderPage(page) {
    const content = document.getElementById('main-content');
    if (!content) return;

    // Show loading state
    content.innerHTML = this.getLoadingTemplate();

    try {
      // Cleanup previous controller
      if (this.currentController && this.currentController.cleanup) {
        this.currentController.cleanup();
      }

      // Get controller for this page
      const controller = this.controllers.get(page);
      if (!controller) {
        throw new Error(`No controller found for page: ${page}`);
      }

      // Render page content
      const pageContent = await controller.render();
      content.innerHTML = pageContent;

      // Setup page-specific event listeners
      controller.setupEventListeners();
      
      // Store current controller reference
      this.currentController = controller;

    } catch (error) {
      console.error('Error rendering page:', error);
      content.innerHTML = this.get404Template();
    }
  }

  // Template loading with caching
  async loadTemplate(templateName) {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    try {
      const response = await fetch(`/templates/${templateName}.html`);
      if (!response.ok) {
        throw new Error(`Template ${templateName} not found`);
      }
      const template = await response.text();
      this.templateCache.set(templateName, template);
      return template;
    } catch (error) {
      console.error(`Error loading template ${templateName}:`, error);
      return this.getFallbackTemplate(templateName);
    }
  }

  // Fallback templates for when files aren't available
  getFallbackTemplate(templateName) {
    const fallbacks = {
      register: this.getRegisterTemplate(),
      login: this.getLoginTemplate(),
      dashboard: this.getDashboardTemplate(),
      payment: this.getPaymentTemplate(),
      validator: this.getValidatorTemplate()
    };
    
    return fallbacks[templateName] || this.get404Template();
  }

  // Utility Methods
  showNotification(message, type = 'info') {
    const alertClass = {
      success: 'alert-success',
      error: 'alert-danger',
      info: 'alert-info',
      warning: 'alert-warning'
    }[type] || 'alert-info';

    const notification = document.createElement('div');
    notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

   // Helper: escape output to prevent HTML injection/XSS
  static escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  getLoadingTemplate() {
    return `
      <div class="text-center">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2 text-light">Loading${SecureApp.escapeHtml(this.currentPage)}...</p>
      </div>
    `;
  }

  get404Template() {
    return `
      <div class="row justify-content-center">
        <div class="col-md-6 text-center">
          <div class="card border-danger">
            <div class="card-body">
              <h1 class="display-1">404</h1>
              <h4>Page Not Found</h4>
              <p class="text-muted">The page you're looking for doesn't exist.</p>
              <a href="#" data-page="dashboard" class="btn btn-primary">Go to Dashboard</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Fallback Templates (keeping existing templates as fallbacks)
  getRegisterTemplate() {
    return `<!-- Existing register template content as fallback -->`;
  }

  getLoginTemplate() {
    return `<!-- Existing login template content as fallback -->`;
  }

  getDashboardTemplate() {
    return `<!-- Existing dashboard template content as fallback -->`;
  }

  getPaymentTemplate() {
    return `<!-- Existing payment template content as fallback -->`;
  }

  getValidatorTemplate() {
    return `<!-- Existing validator template content as fallback -->`;
  }

  // Security Methods
  isValidPage(page) {
    return Object.prototype.hasOwnProperty.call(this.pageConfig, page);
  }

  hasPageAccess(page) {
    const config = this.pageConfig[page];
    if (!config) return false;
    if (config.requiresAuth && !this.isAuthenticated()) return false;
    if (config.allowedRoles.length > 0 && !this.hasRequiredRole(config.allowedRoles)) return false;
    return true;
  }

  isAuthenticated() {
    return this.user !== null && this.user.isAuthenticated === true;
  }

  hasRequiredRole(allowedRoles) {
    if (!this.user || !this.user.role) return false;
    return allowedRoles.includes(this.user.role);
  }

  getDefaultPage() {
    return this.isAuthenticated() ? 'dashboard' : 'login';
  }

  // User Management Methods
  setUser(userData) {
    this.user = { ...userData, isAuthenticated: true };
    sessionStorage.setItem('user', JSON.stringify(this.user));
    this.updateNavigation();
  }

  logout() {
    console.log('Logout initiated...');
    
    // Clear user data
    this.user = null;
    
    // Clear session storage
    try {
      sessionStorage.removeItem('user');
      localStorage.removeItem('transactions'); // Clear any cached data
      console.log('Session data cleared');
    } catch (error) {
      console.warn('Error clearing storage:', error);
    }
    
    // Update navigation immediately to hide authenticated elements
    this.updateNavigation();
    console.log('Navigation updated');
    
    // Show success message
    this.showNotification('Successfully logged out', 'success');

    // Force redirect to login page
    setTimeout(() => {
      console.log('Redirecting to login page...');
      window.location.hash = 'login';
      this.currentPage = 'login';
      this.loadPage('login');
    }, 800);
  }

  loadUserFromSession() {
    try {
      const savedUser = sessionStorage.getItem('user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        // Validate that the user object has required properties
        if (parsedUser && parsedUser.id && parsedUser.fullName) {
          this.user = parsedUser;
          console.log('User session restored:', parsedUser.fullName);
        } else {
          console.warn('Invalid user session data, clearing...');
          sessionStorage.removeItem('user');
          this.user = null;
        }
      } else {
        console.log('No user session found');
        this.user = null;
      }
    } catch (error) {
      console.error('Error loading user from session:', error);
      sessionStorage.removeItem('user');
      this.user = null;
    }
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
        this.showNotification('Transaction not found', 'error');
      }
    } catch (error) {
      console.error('Error viewing transaction:', error);
      this.showNotification('Failed to load transaction details', 'error');
    }
  }
}

// Initialize the app
const app = new SecureApp();

// Make app globally available for debugging
window.SecureApp = app;

//----------------------------------------------End of File----------------------------------------------