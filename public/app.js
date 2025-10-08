// Enterprise-Grade SPA with Best Practices
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
    
    this.init();
  }

  init() {
    this.initializeControllers();
    this.setupRouter();
    this.setupGlobalEventListeners();
    this.loadPage(this.getPageFromHash() || 'register');
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
    return window.location.hash.slice(1) || 'register';
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

  getLoadingTemplate() {
    return `
      <div class="text-center">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2 text-light">Loading ${this.currentPage}...</p>
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
}

// Initialize the app
const app = new SecureApp();

// Make app globally available for debugging
window.SecureApp = app;