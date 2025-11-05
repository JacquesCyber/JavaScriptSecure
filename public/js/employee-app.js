/*
 * Employee Portal Application
 * -------------------------------------------------------------
 * Template-based SPA for employee payment verification workflow
 * 
 * Architecture:
 *   - Loads templates from /employee-templates/
 *   - Uses hash-based routing (#employee-login, #pending-payments, etc.)
 *   - Manages employee authentication state
 *   - Handles navigation between verification steps
 *
 * Security:
 *   - Session-based authentication
 *   - XSS prevention with escapeHtml()
 *   - CSRF token validation
 *   - Role-based access control
 */

import { EmployeeControllers } from './employee-controllers.js';

// --- Crypto utility for browser (AES-GCM) ---
// WARNING: Replace STATIC_KEY with a per-user/session-derived key for production use.
const STATIC_KEY = "please-change-me-in-production!"; // ideally a session token or user secret

// Returns a CryptoKey from a given string
async function getKeyMaterial(password) {
  let enc = new TextEncoder();
  return window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
}

async function getKey(password) {
  let keyMaterial = await getKeyMaterial(password);
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array([21, 31, 41, 14, 15, 91, 71, 28]),
      iterations: 88899,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypts data using AES-GCM (returns base64 string)
async function encryptData(data, password = STATIC_KEY) {
  const key = await getKey(password);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(data)
  );
  // concatenate iv and encrypted data, return base64
  const buff = new Uint8Array(iv.length + encrypted.byteLength);
  buff.set(iv, 0);
  buff.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...buff));
}

// Decrypts data using AES-GCM, given base64 string
async function decryptData(ciphertext, password = STATIC_KEY) {
  const buff = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv = buff.slice(0, 12);
  const data = buff.slice(12);
  const key = await getKey(password);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );
  return new TextDecoder().decode(decrypted);
}

class EmployeePortalApp {
  constructor() {
    this.currentPage = 'employee-login';
    this.currentController = null;
    this.employee = null;
    this.templateCache = new Map();
    this.controllers = new Map();
    this.currentPaymentId = null; // Track payment being verified
    this.csrfToken = null; // Store CSRF token

    // Page security configuration
    this.pageConfig = {
      'employee-login': { requiresAuth: false, allowedRoles: [] },
      'pending-payments': { requiresAuth: true, allowedRoles: ['staff', 'supervisor', 'admin'] },
      'verify-payment': { requiresAuth: true, allowedRoles: ['staff', 'supervisor', 'admin'] },
      'submit-swift': { requiresAuth: true, allowedRoles: ['staff', 'supervisor', 'admin'] }
    };

    this.init();
  }

  async init() {
    await this.fetchCsrfToken();
    this.loadEmployeeFromSession();
    this.initializeControllers();
    this.setupRouter();
    this.setupGlobalEventListeners();
    this.loadPage(this.getPageFromHash() || this.getDefaultPage());
  }

  async fetchCsrfToken() {
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include'
      });
      const data = await response.json();
      this.csrfToken = data.csrfToken;
      console.log('CSRF token fetched successfully');
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
  }

  initializeControllers() {
    this.controllers.set('employee-login', new EmployeeControllers.EmployeeLoginController(this));
    this.controllers.set('pending-payments', new EmployeeControllers.PendingPaymentsController(this));
    this.controllers.set('verify-payment', new EmployeeControllers.VerifyPaymentController(this));
    this.controllers.set('submit-swift', new EmployeeControllers.SubmitSwiftController(this));
  }

  setupRouter() {
    window.addEventListener('hashchange', () => {
      this.loadPage(this.getPageFromHash());
    });
  }

  getPageFromHash() {
    const requestedPage = window.location.hash.slice(1) || 'employee-login';
    if (!this.isValidPage(requestedPage)) {
      return this.getDefaultPage();
    }
    if (!this.hasPageAccess(requestedPage)) {
      this.showNotification('Access denied. Please log in.', 'error');
      return this.getDefaultPage();
    }
    return requestedPage;
  }

  setupGlobalEventListeners() {
    // Global navigation click handlers
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-page]')) {
        e.preventDefault();
        const page = e.target.getAttribute('data-page');
        this.navigateTo(page);
      }
      
      // Handle logout button
      if (e.target.id === 'employee-logout-btn' || e.target.closest('#employee-logout-btn')) {
        e.preventDefault();
        this.logout();
      }
    });
  }

  navigateTo(page, paymentId = null) {
    if (!this.isValidPage(page)) {
      this.showNotification('Invalid page requested', 'error');
      return;
    }
    if (!this.hasPageAccess(page)) {
      this.showNotification('Access denied. Please log in.', 'error');
      page = this.isAuthenticated() ? this.currentPage : 'employee-login';
    }
    
    // Store payment ID if navigating to verify or submit pages
    if (paymentId) {
      this.currentPaymentId = paymentId;
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

    // Update active state
    nav.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-page') === this.currentPage) {
        link.classList.add('active');
      }
    });

    // Show/hide navigation items based on auth state
    const isAuth = this.isAuthenticated();
    
    const navLogin = document.getElementById('nav-employee-login');
    const navPendingPayments = document.getElementById('nav-pending-payments');
    const navVerifyPayment = document.getElementById('nav-verify-payment');
    const navSubmitSwift = document.getElementById('nav-submit-swift');
    const navLogout = document.getElementById('nav-employee-logout');
    const employeeInfoBadge = document.getElementById('employee-info-badge');
    
    if (navLogin) navLogin.style.display = !isAuth ? 'block' : 'none';
    if (navPendingPayments) navPendingPayments.classList.toggle('d-none', !isAuth);
    if (navVerifyPayment) navVerifyPayment.classList.toggle('d-none', !isAuth);
    if (navSubmitSwift) navSubmitSwift.classList.toggle('d-none', !isAuth);
    if (navLogout) navLogout.classList.toggle('d-none', !isAuth);
    if (employeeInfoBadge) {
      employeeInfoBadge.classList.toggle('d-none', !isAuth);
      if (isAuth && this.employee) {
        const displayName = document.getElementById('employee-name-display');
        if (displayName) {
          displayName.textContent = this.employee.fullName || this.employee.employeeId || 'Employee';
        }
      }
    }
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

      // Load template
      const template = await this.loadTemplate(page);
      content.innerHTML = template;

      // Initialize controller with template loaded
      if (controller.init) {
        await controller.init();
      }

      // Setup page-specific event listeners
      if (controller.setupEventListeners) {
        controller.setupEventListeners();
      }
      
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
      const response = await fetch(`/employee-templates/${templateName}.html`);
      if (!response.ok) {
        throw new Error(`Template ${templateName} not found`);
      }
      const template = await response.text();
      this.templateCache.set(templateName, template);
      return template;
    } catch (error) {
      console.error("Error loading template %s:", templateName, error);
      throw error;
    }
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
      ${EmployeePortalApp.escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
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
      <div class="text-center py-5">
        <div class="spinner-border text-success" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3 text-light">Loading ${EmployeePortalApp.escapeHtml(this.currentPage)}...</p>
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
              <a href="#pending-payments" data-page="pending-payments" class="btn btn-primary">
                Go to Pending Payments
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Security Methods
  isValidPage(page) {
    return Object.prototype.hasOwnProperty.call(this.pageConfig, page);
  }

  hasPageAccess(page) {
    const config = this.pageConfig[page];
    console.log('🔒 Checking page access:', {
      page,
      config,
      employee: this.employee,
      isAuthenticated: this.isAuthenticated(),
      hasRole: config?.allowedRoles.length > 0 ? this.hasRequiredRole(config.allowedRoles) : true
    });
    
    if (!config) return false;
    if (config.requiresAuth && !this.isAuthenticated()) return false;
    if (config.allowedRoles.length > 0 && !this.hasRequiredRole(config.allowedRoles)) return false;
    return true;
  }

  isAuthenticated() {
    return this.employee !== null && this.employee.isAuthenticated === true;
  }

  hasRequiredRole(allowedRoles) {
    if (!this.employee || !this.employee.role) return false;
    return allowedRoles.includes(this.employee.role);
  }

  getDefaultPage() {
    return this.isAuthenticated() ? 'pending-payments' : 'employee-login';
  }

  // Employee Management Methods
  async setEmployee(employeeData) {
    this.employee = { ...employeeData, isAuthenticated: true };
    const encryptedEmployee = await encryptData(JSON.stringify(this.employee));
    sessionStorage.setItem('employee', encryptedEmployee);
    this.updateNavigation();
  }

  async logout() {
    console.log('Employee logout initiated...');
    
    try {
      // Call logout API to destroy session
      const response = await fetch('/api/staff/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Logout failed');
      }
      
      console.log('✓ Server session destroyed');
    } catch (error) {
      console.error('❌ Error calling logout API:', error);
      // Continue with client-side logout even if API fails
    }
    
    // Clear employee data
    this.employee = null;
    this.currentPaymentId = null;
    
    // Clear session storage
    try {
      sessionStorage.removeItem('employee');
      console.log('✓ Client session data cleared');
    } catch (error) {
      console.warn('Error clearing storage:', error);
    }
    
    // Update navigation immediately
    this.updateNavigation();
    
    // Show success message
    this.showNotification('Successfully logged out', 'success');

    // Redirect to login page
    setTimeout(() => {
      window.location.hash = 'employee-login';
      this.currentPage = 'employee-login';
      this.loadPage('employee-login');
    }, 800);
  }

  loadEmployeeFromSession() {
    try {
      const savedEmployee = sessionStorage.getItem('employee');
      if (savedEmployee) {
        const parsedEmployee = JSON.parse(savedEmployee);
        // Validate employee object has required properties
        if (parsedEmployee && parsedEmployee.employeeId) {
          this.employee = parsedEmployee;
          console.log('Employee session restored:', parsedEmployee.employeeId);
        } else {
          console.warn('Invalid employee session data, clearing...');
          sessionStorage.removeItem('employee');
          this.employee = null;
        }
      } else {
        console.log('No employee session found');
        this.employee = null;
      }
    } catch (error) {
      console.error('Error loading employee from session:', error);
      sessionStorage.removeItem('employee');
      this.employee = null;
    }
  }

  // API Helper Methods
  async apiRequest(url, options = {}) {
    try {
      // Merge headers with CSRF token
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };

      // Add CSRF token to headers if available
      if (this.csrfToken) {
        headers['csrf-token'] = this.csrfToken;
        headers['xsrf-token'] = this.csrfToken;
        headers['x-csrf-token'] = this.csrfToken;
        headers['x-xsrf-token'] = this.csrfToken;
      }

      const defaultOptions = {
        headers,
        credentials: 'include', // Include cookies for CSRF
      };

      const response = await fetch(url, { ...defaultOptions, ...options });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }
}

// Initialize the employee portal app
const employeeApp = new EmployeePortalApp();

// Make app globally available for debugging
window.EmployeePortalApp = employeeApp;

export default employeeApp;
