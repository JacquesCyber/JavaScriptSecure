/*
 * International Payments Portal - Vanilla JavaScript
 * -------------------------------------------------------------
 * Secure client-side logic for the Employee International Payments Portal
 *
 * Security Features:
 *   - Input validation and sanitization
 *   - CSRF token handling
 *   - XSS prevention through text content manipulation
 *   - No eval() or Function() constructors
 *   - Secure API communication
 *
 * Last reviewed: 2025-11-04
 */

'use strict';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = window.location.origin;
const API_ENDPOINTS = {
  CREATE_PAYMENT: '/api/international-payments/create',
  SUBMIT_PAYMENT: '/api/international-payments/:id/submit',
  APPROVE_PAYMENT: '/api/international-payments/:id/approve',
  REJECT_PAYMENT: '/api/international-payments/:id/reject',
  GET_PAYMENT: '/api/international-payments/:id',
  GET_EMPLOYEE_PAYMENTS: '/api/international-payments/employee/:employeeId',
  GET_PENDING_APPROVALS: '/api/international-payments/pending/approvals'
};

// ============================================================================
// State Management
// ============================================================================

const AppState = {
  currentTab: 'create',
  employeeId: null,
  csrfToken: null,
  payments: [],
  pendingApprovals: []
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sanitize input by removing potentially dangerous characters
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // Remove HTML tags
  let sanitized = input;
  
  // Remove script event handlers
  let previous;

  do { previous = sanitized;
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  } while (sanitized !== previous);

  
  return sanitized.trim();
}

/**
 * Validate SWIFT code format
 */
function validateSwiftCode(swift) {
  const pattern = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
  return pattern.test(swift.toUpperCase());
}

/**
 * Validate country code format
 */
function validateCountryCode(code) {
  const pattern = /^[A-Z]{2}$/;
  return pattern.test(code.toUpperCase());
}

/**
 * Validate email format
 */
function validateEmail(email) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

/**
 * Show error message for a field
 */
function showFieldError(fieldId, message) {
  const errorElement = document.getElementById(`error-${fieldId}`);
  const inputElement = document.getElementById(fieldId);
  
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add('show');
  }
  
  if (inputElement) {
    inputElement.classList.add('error');
  }
}

/**
 * Clear error message for a field
 */
function clearFieldError(fieldId) {
  const errorElement = document.getElementById(`error-${fieldId}`);
  const inputElement = document.getElementById(fieldId);
  
  if (errorElement) {
    errorElement.classList.remove('show');
  }
  
  if (inputElement) {
    inputElement.classList.remove('error');
  }
}

/**
 * Clear all error messages
 */
function clearAllErrors() {
  const errorElements = document.querySelectorAll('.error-message');
  errorElements.forEach(el => el.classList.remove('show'));
  
  const inputElements = document.querySelectorAll('.form-control.error');
  inputElements.forEach(el => el.classList.remove('error'));
}

/**
 * Show alert message
 */
function showAlert(type, message) {
  const alertId = `alert${type.charAt(0).toUpperCase() + type.slice(1)}`;
  const alertElement = document.getElementById(alertId);
  
  if (alertElement) {
    alertElement.textContent = message;
    alertElement.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      alertElement.classList.remove('show');
    }, 5000);
  }
}

/**
 * Hide all alerts
 */
function hideAllAlerts() {
  document.querySelectorAll('.alert').forEach(alert => {
    alert.classList.remove('show');
  });
}

/**
 * Get CSRF token from cookie or meta tag
 */
async function getCsrfToken() {
  try {
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include'
    });
    
    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
    return null;
  }
}

/**
 * Make secure API request
 */
async function apiRequest(url, options = {}) {
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': AppState.csrfToken || ''
    }
  };
  
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {})
    }
  };
  
  try {
    const response = await fetch(url, mergedOptions);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// ============================================================================
// Tab Management
// ============================================================================

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  const tabMap = {
    'create': 'createTab',
    'myPayments': 'myPaymentsTab',
    'approvals': 'approvalsTab'
  };
  
  const tabElement = document.getElementById(tabMap[tabName]);
  if (tabElement) {
    tabElement.classList.add('active');
  }
  
  AppState.currentTab = tabName;
  
  // Load data for the tab
  if (tabName === 'myPayments') {
    loadMyPayments();
  } else if (tabName === 'approvals') {
    loadPendingApprovals();
  }
  
  hideAllAlerts();
}

// ============================================================================
// Form Validation
// ============================================================================

function validatePaymentForm() {
  clearAllErrors();
  let isValid = true;
  
  // Customer ID
  const customerId = document.getElementById('customerId').value.trim();
  if (!customerId) {
    showFieldError('customerId', 'Customer ID is required');
    isValid = false;
  } else if (!/^[0-9a-fA-F]{24}$/.test(customerId)) {
    showFieldError('customerId', 'Invalid MongoDB ObjectId format');
    isValid = false;
  }
  
  // Amount
  const amount = parseFloat(document.getElementById('amount').value);
  if (isNaN(amount) || amount <= 0) {
    showFieldError('amount', 'Amount must be greater than 0');
    isValid = false;
  } else if (amount > 10000000) {
    showFieldError('amount', 'Amount cannot exceed $10,000,000');
    isValid = false;
  }
  
  // Currency
  const currency = document.getElementById('currency').value;
  if (!currency) {
    showFieldError('currency', 'Currency is required');
    isValid = false;
  }
  
  // Beneficiary Name
  const beneficiaryName = document.getElementById('beneficiaryName').value.trim();
  if (!beneficiaryName) {
    showFieldError('beneficiaryName', 'Beneficiary name is required');
    isValid = false;
  } else if (beneficiaryName.length < 2 || beneficiaryName.length > 100) {
    showFieldError('beneficiaryName', 'Beneficiary name must be between 2 and 100 characters');
    isValid = false;
  } else if (!/^[a-zA-Z\s\-.]+$/.test(beneficiaryName)) {
    showFieldError('beneficiaryName', 'Beneficiary name contains invalid characters');
    isValid = false;
  }
  
  // Beneficiary Account
  const beneficiaryAccount = document.getElementById('beneficiaryAccount').value.trim();
  if (!beneficiaryAccount) {
    showFieldError('beneficiaryAccount', 'Beneficiary account is required');
    isValid = false;
  } else if (beneficiaryAccount.length < 8 || beneficiaryAccount.length > 34) {
    showFieldError('beneficiaryAccount', 'Account must be between 8 and 34 characters');
    isValid = false;
  }
  
  // SWIFT Code
  const swiftCode = document.getElementById('swiftCode').value.trim().toUpperCase();
  if (!swiftCode) {
    showFieldError('swiftCode', 'SWIFT code is required');
    isValid = false;
  } else if (!validateSwiftCode(swiftCode)) {
    showFieldError('swiftCode', 'Invalid SWIFT code format (must be 8 or 11 characters)');
    isValid = false;
  }
  
  // Bank Name
  const bankName = document.getElementById('bankName').value.trim();
  if (!bankName) {
    showFieldError('bankName', 'Bank name is required');
    isValid = false;
  }
  
  // Bank Country
  const bankCountry = document.getElementById('bankCountry').value.trim().toUpperCase();
  if (!bankCountry) {
    showFieldError('bankCountry', 'Bank country code is required');
    isValid = false;
  } else if (!validateCountryCode(bankCountry)) {
    showFieldError('bankCountry', 'Invalid country code (must be 2 letters)');
    isValid = false;
  }
  
  // Purpose
  const purpose = document.getElementById('purpose').value;
  if (!purpose) {
    showFieldError('purpose', 'Payment purpose is required');
    isValid = false;
  }
  
  // Optional: Beneficiary Email
  const beneficiaryEmail = document.getElementById('beneficiaryEmail').value.trim();
  if (beneficiaryEmail && !validateEmail(beneficiaryEmail)) {
    showFieldError('beneficiaryEmail', 'Invalid email format');
    isValid = false;
  }
  
  // Optional: Intermediary SWIFT
  const intermediarySwift = document.getElementById('intermediaryBankSwift').value.trim();
  if (intermediarySwift && !validateSwiftCode(intermediarySwift)) {
    showFieldError('intermediaryBankSwift', 'Invalid intermediary SWIFT code format');
    isValid = false;
  }
  
  return isValid;
}

// ============================================================================
// Payment Operations
// ============================================================================

async function submitPayment() {
  hideAllAlerts();
  
  // Validate form
  if (!validatePaymentForm()) {
    showAlert('error', 'Please fix the validation errors before submitting');
    return;
  }
  
  // Disable submit button
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating...';
  
  try {
    // Collect form data
    const formData = {
      employeeId: AppState.employeeId,
      customerId: sanitizeInput(document.getElementById('customerId').value.trim()),
      amount: parseFloat(document.getElementById('amount').value),
      currency: document.getElementById('currency').value,
      beneficiaryName: sanitizeInput(document.getElementById('beneficiaryName').value.trim()),
      beneficiaryAccount: sanitizeInput(document.getElementById('beneficiaryAccount').value.trim()),
      beneficiaryEmail: sanitizeInput(document.getElementById('beneficiaryEmail').value.trim()) || undefined,
      beneficiaryPhone: sanitizeInput(document.getElementById('beneficiaryPhone').value.trim()) || undefined,
      swiftCode: document.getElementById('swiftCode').value.trim().toUpperCase(),
      bankName: sanitizeInput(document.getElementById('bankName').value.trim()),
      bankCountry: document.getElementById('bankCountry').value.trim().toUpperCase(),
      bankCity: sanitizeInput(document.getElementById('bankCity').value.trim()) || undefined,
      bankAddress: sanitizeInput(document.getElementById('bankAddress').value.trim()) || undefined,
      purpose: document.getElementById('purpose').value,
      reference: sanitizeInput(document.getElementById('reference').value.trim()) || undefined,
      sourceOfFunds: sanitizeInput(document.getElementById('sourceOfFunds').value.trim()) || undefined,
      intermediaryBankName: sanitizeInput(document.getElementById('intermediaryBankName').value.trim()) || undefined,
      intermediaryBankSwift: document.getElementById('intermediaryBankSwift').value.trim().toUpperCase() || undefined,
      notes: sanitizeInput(document.getElementById('notes').value.trim()) || undefined
    };
    
    // Send API request
    const result = await apiRequest(API_ENDPOINTS.CREATE_PAYMENT, {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    
    if (result.success) {
      showAlert('success', `Payment created successfully! Transaction ID: ${result.payment.transactionId}`);
      resetForm();
    } else {
      showAlert('error', result.message || 'Failed to create payment');
    }
  } catch (error) {
    showAlert('error', error.message || 'Failed to create payment');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Payment';
  }
}

function resetForm() {
  document.getElementById('paymentForm').reset();
  clearAllErrors();
}

// ============================================================================
// Payment List Display
// ============================================================================

async function loadMyPayments() {
  const loadingElement = document.getElementById('paymentsLoading');
  const listElement = document.getElementById('paymentsList');
  
  loadingElement.style.display = 'block';
  listElement.innerHTML = '';
  
  try {
    const url = API_ENDPOINTS.GET_EMPLOYEE_PAYMENTS.replace(':employeeId', AppState.employeeId);
    const result = await apiRequest(url);
    
    if (result.success && result.payments.length > 0) {
      listElement.innerHTML = result.payments.map(payment => renderPaymentItem(payment)).join('');
    } else {
      listElement.innerHTML = '<p style="text-align: center; color: #666;">No payments found</p>';
    }
  } catch (error) {
    listElement.innerHTML = `<p style="text-align: center; color: var(--danger-color);">Failed to load payments: ${escapeHtml(error.message)}</p>`;
  } finally {
    loadingElement.style.display = 'none';
  }
}

async function loadPendingApprovals() {
  const loadingElement = document.getElementById('approvalsLoading');
  const listElement = document.getElementById('approvalsList');
  
  loadingElement.style.display = 'block';
  listElement.innerHTML = '';
  
  try {
    const result = await apiRequest(API_ENDPOINTS.GET_PENDING_APPROVALS);
    
    if (result.success && result.payments.length > 0) {
      listElement.innerHTML = result.payments.map(payment => renderApprovalItem(payment)).join('');
    } else {
      listElement.innerHTML = '<p style="text-align: center; color: #666;">No pending approvals</p>';
    }
  } catch (error) {
    listElement.innerHTML = `<p style="text-align: center; color: var(--danger-color);">Failed to load approvals: ${escapeHtml(error.message)}</p>`;
  } finally {
    loadingElement.style.display = 'none';
  }
}

function renderPaymentItem(payment) {
  return `
    <div class="payment-item">
      <div class="payment-header">
        <span class="payment-id">${escapeHtml(payment.transactionId)}</span>
        <span class="payment-status status-${payment.status}">${escapeHtml(payment.status.replace('_', ' ').toUpperCase())}</span>
      </div>
      <div class="payment-details">
        <p><strong>Amount:</strong> ${escapeHtml(payment.formattedAmount || `${payment.currency} ${payment.amount}`)}</p>
        <p><strong>Beneficiary:</strong> ${escapeHtml(payment.beneficiary.name)}</p>
        <p><strong>Bank:</strong> ${escapeHtml(payment.beneficiaryBank.name)} (${escapeHtml(payment.beneficiaryBank.swiftCode)})</p>
        <p><strong>Country:</strong> ${escapeHtml(payment.beneficiary.address.country)}</p>
        <p><strong>Created:</strong> ${new Date(payment.createdAt).toLocaleString()}</p>
      </div>
    </div>
  `;
}

function renderApprovalItem(payment) {
  return `
    <div class="payment-item">
      <div class="payment-header">
        <span class="payment-id">${escapeHtml(payment.transactionId)}</span>
        <span class="payment-status status-${payment.status}">${escapeHtml(payment.status.replace('_', ' ').toUpperCase())}</span>
      </div>
      <div class="payment-details">
        <p><strong>Amount:</strong> ${escapeHtml(payment.formattedAmount || `${payment.currency} ${payment.amount}`)}</p>
        <p><strong>Beneficiary:</strong> ${escapeHtml(payment.beneficiary.name)}</p>
        <p><strong>Bank:</strong> ${escapeHtml(payment.beneficiaryBank.name)}</p>
        <p><strong>Employee:</strong> ${escapeHtml(payment.employeeId.fullName || 'N/A')}</p>
        <p><strong>Created:</strong> ${new Date(payment.createdAt).toLocaleString()}</p>
      </div>
      <div style="margin-top: 1rem; display: flex; gap: 1rem;">
        <button class="btn btn-success" onclick="approvePayment('${escapeHtml(payment.transactionId)}')">Approve</button>
        <button class="btn btn-danger" onclick="rejectPayment('${escapeHtml(payment.transactionId)}')">Reject</button>
      </div>
    </div>
  `;
}

async function approvePayment(transactionId) {
  const notes = prompt('Enter approval notes (optional):');
  
  try {
    const url = API_ENDPOINTS.APPROVE_PAYMENT.replace(':id', transactionId);
    const result = await apiRequest(url, {
      method: 'POST',
      body: JSON.stringify({ employeeId: AppState.employeeId, notes })
    });
    
    if (result.success) {
      showAlert('success', 'Payment approved successfully');
      loadPendingApprovals();
    } else {
      showAlert('error', result.message || 'Failed to approve payment');
    }
  } catch (error) {
    showAlert('error', error.message || 'Failed to approve payment');
  }
}

async function rejectPayment(transactionId) {
  const reason = prompt('Enter rejection reason (required):');
  
  if (!reason || reason.trim().length < 10) {
    showAlert('error', 'Rejection reason must be at least 10 characters');
    return;
  }
  
  try {
    const url = API_ENDPOINTS.REJECT_PAYMENT.replace(':id', transactionId);
    const result = await apiRequest(url, {
      method: 'POST',
      body: JSON.stringify({ employeeId: AppState.employeeId, reason })
    });
    
    if (result.success) {
      showAlert('success', 'Payment rejected');
      loadPendingApprovals();
    } else {
      showAlert('error', result.message || 'Failed to reject payment');
    }
  } catch (error) {
    showAlert('error', error.message || 'Failed to reject payment');
  }
}

// ============================================================================
// Initialization
// ============================================================================

async function initializeApp() {
  console.log('Initializing International Payments Portal...');

  // Get CSRF token
  AppState.csrfToken = await getCsrfToken();

  // Get employee ID and name from authenticated session
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include'
    });

    if (response.ok) {
      const sessionData = await response.json();
      if (sessionData.success && sessionData.user) {
        AppState.employeeId = sessionData.user.id || sessionData.user._id;

        // Set employee ID in form
        const employeeIdInput = document.getElementById('employeeId');
        if (employeeIdInput) {
          employeeIdInput.value = AppState.employeeId;
        }

        // Set employee name in navbar from authenticated user
        const employeeName = sessionData.user.fullName || sessionData.user.username || 'Employee';
        document.getElementById('employeeName').textContent = employeeName;
      } else {
        // Redirect to login if not authenticated
        console.error('User not authenticated');
        window.location.href = '/employee-portal.html#login';
        return;
      }
    } else {
      console.error('Failed to get session data');
      window.location.href = '/employee-portal.html#login';
      return;
    }
  } catch (error) {
    console.error('Error fetching session:', error);
    window.location.href = '/employee-portal.html#login';
    return;
  }

  console.log('App initialized successfully');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

//----------------------------------------------End of File----------------------------------------------
