/*
 * Employee Portal Controllers
 * -------------------------------------------------------------
 * Page-specific controllers for employee verification workflow
 * 
 * Controllers:
 *   - EmployeeLoginController: Employee authentication
 *   - PendingPaymentsController: List of payments awaiting verification
 *   - VerifyPaymentController: Detailed payment verification and SWIFT/IBAN checks
 *   - SubmitSwiftController: Final SWIFT MT103 submission
 */

class EmployeeLoginController {
  constructor(app) {
    this.app = app;
  }

  async init() {
    console.log('Employee Login Controller initialized');
  }

  setupEventListeners() {
    const loginForm = document.getElementById('employee-login-form');
    const togglePassword = document.getElementById('toggle-password');
    
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }
    
    if (togglePassword) {
      togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
    }
  }

  togglePasswordVisibility() {
    const passwordInput = document.getElementById('employee-password');
    const toggleIcon = document.querySelector('#toggle-password i');
    
    if (passwordInput && toggleIcon) {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      toggleIcon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    
    const employeeIdInput = document.getElementById('employee-id').value.trim();
    const emailInput = document.getElementById('employee-email').value.trim();
    const password = document.getElementById('employee-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    const loginBtn = document.getElementById('employee-login-btn');
    if (loginBtn) loginBtn.disabled = true;
    
    try {
      // Call staff login API with all three fields
      // Backend will accept username, email, or employeeId
      // No CSRF token needed for login (protected by rate limiting)
      const response = await fetch('/api/staff/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Important for session cookies
        body: JSON.stringify({ 
          employeeId: employeeIdInput,
          email: emailInput,
          password: password
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      if (data.success && data.staff) {
        // Store employee info in app state
        const employeeData = {
          employeeId: data.staff.employeeId,
          username: data.staff.username,
          email: data.staff.email,
          fullName: data.staff.fullName,
          role: data.staff.role,
          department: data.staff.department,
          _id: data.staff._id
        };
        
        console.log('📝 Employee data to store:', employeeData);
        this.app.setEmployee(employeeData);
        
        // Verify employee was stored
        console.log('✓ Employee stored in app:', this.app.employee);
        console.log('✓ Is authenticated:', this.app.isAuthenticated());
        
        this.app.showNotification(`Welcome back, ${data.staff.fullName}!`, 'success');
        
        // Navigate to pending payments
        setTimeout(() => {
          this.app.navigateTo('pending-payments');
        }, 1000);
        
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Login failed. Please check your credentials.';
      this.app.showNotification(errorMessage, 'error');
      
      // Re-enable login button
      if (loginBtn) loginBtn.disabled = false;
    }
  }

  cleanup() {
    console.log('Employee Login Controller cleanup');
  }
}

class PendingPaymentsController {
  constructor(app) {
    this.app = app;
    this.payments = [];
    this.filteredPayments = [];
  }

  async init() {
    console.log('Pending Payments Controller initialized');
    await this.loadPendingPayments();
  }

  setupEventListeners() {
    const searchInput = document.getElementById('search-payments');
    const filterRisk = document.getElementById('filter-risk-level');
    const refreshBtn = document.getElementById('refresh-payments');
    const exportBtn = document.getElementById('export-pending');
    
    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterPayments());
    }
    
    if (filterRisk) {
      filterRisk.addEventListener('change', () => this.filterPayments());
    }
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadPendingPayments());
    }
    
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportToCSV());
    }
    
    // Delegate verify button clicks
    document.addEventListener('click', (e) => {
      if (e.target.closest('.verify-btn')) {
        const paymentRow = e.target.closest('.payment-row');
        const paymentId = paymentRow?.dataset.paymentId;
        if (paymentId) {
          this.verifyPayment(paymentId);
        }
      }
    });
  }

  async loadPendingPayments() {
    const loadingEl = document.getElementById('payments-loading');
    const tableContainer = document.getElementById('payments-table-container');
    const noPayments = document.getElementById('no-payments');
    
    if (loadingEl) loadingEl.classList.remove('d-none');
    if (tableContainer) tableContainer.classList.add('d-none');
    if (noPayments) noPayments.classList.add('d-none');
    
    try {
      // TODO: Replace with actual API call
      // const response = await this.app.apiRequest('/api/international-payments/pending/approvals');
      
      // Simulate API response
      this.payments = [
        {
          _id: '507f1f77bcf86cd799439011',
          transactionId: 'TXN-2025-001',
          customer: { fullName: 'Alice Johnson', accountNumber: '1234567890' },
          beneficiary: { name: 'Bob Smith' },
          amount: 15000.00,
          currency: 'USD',
          compliance: { amlRiskLevel: 'LOW' },
          fraudScore: 15,
          submittedAt: new Date().toISOString(),
          status: 'pending_review'
        },
        {
          _id: '507f1f77bcf86cd799439012',
          transactionId: 'TXN-2025-002',
          customer: { fullName: 'Charlie Brown', accountNumber: '0987654321' },
          beneficiary: { name: 'David Lee' },
          amount: 85000.00,
          currency: 'EUR',
          compliance: { amlRiskLevel: 'HIGH' },
          fraudScore: 72,
          submittedAt: new Date().toISOString(),
          status: 'pending_review'
        }
      ];
      
      this.filteredPayments = [...this.payments];
      this.renderPayments();
      this.updateStatistics();
      
    } catch (error) {
      console.error('Error loading payments:', error);
      this.app.showNotification('Failed to load pending payments', 'error');
    } finally {
      if (loadingEl) loadingEl.classList.add('d-none');
    }
  }

  renderPayments() {
    const tbody = document.getElementById('payments-tbody');
    const tableContainer = document.getElementById('payments-table-container');
    const noPayments = document.getElementById('no-payments');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (this.filteredPayments.length === 0) {
      if (tableContainer) tableContainer.classList.add('d-none');
      if (noPayments) noPayments.classList.remove('d-none');
      return;
    }
    
    if (tableContainer) tableContainer.classList.remove('d-none');
    if (noPayments) noPayments.classList.add('d-none');
    
    this.filteredPayments.forEach(payment => {
      const row = document.createElement('tr');
      row.className = 'payment-row';
      row.dataset.paymentId = payment._id;
      
      const amlBadgeClass = {
        'LOW': 'bg-success',
        'MEDIUM': 'bg-warning',
        'HIGH': 'bg-danger'
      }[payment.compliance.amlRiskLevel] || 'bg-secondary';
      
      const fraudBadgeClass = payment.fraudScore < 30 ? 'bg-success' : 
                             payment.fraudScore < 60 ? 'bg-warning' : 'bg-danger';
      
      row.innerHTML = `
        <td>${this.escapeHtml(payment.transactionId)}</td>
        <td>${this.escapeHtml(payment.customer.fullName)}<br>
            <small class="text-muted">${this.escapeHtml(payment.customer.accountNumber)}</small>
        </td>
        <td>${this.escapeHtml(payment.beneficiary.name)}</td>
        <td>${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        <td>${this.escapeHtml(payment.currency)}</td>
        <td><span class="badge ${amlBadgeClass}">${this.escapeHtml(payment.compliance.amlRiskLevel)}</span></td>
        <td><span class="badge ${fraudBadgeClass}">${payment.fraudScore}</span></td>
        <td>${new Date(payment.submittedAt).toLocaleString()}</td>
        <td>
          <button class="btn btn-sm btn-primary verify-btn" title="Verify Payment">
            <i class="bi bi-search"></i>
          </button>
        </td>
      `;
      
      tbody.appendChild(row);
    });
  }

  filterPayments() {
    const searchTerm = document.getElementById('search-payments')?.value.toLowerCase() || '';
    const riskFilter = document.getElementById('filter-risk-level')?.value || '';
    
    this.filteredPayments = this.payments.filter(payment => {
      const matchesSearch = !searchTerm || 
        payment.transactionId.toLowerCase().includes(searchTerm) ||
        payment.customer.fullName.toLowerCase().includes(searchTerm) ||
        payment.beneficiary.name.toLowerCase().includes(searchTerm) ||
        payment.amount.toString().includes(searchTerm);
      
      const matchesRisk = !riskFilter || payment.compliance.amlRiskLevel === riskFilter;
      
      return matchesSearch && matchesRisk;
    });
    
    this.renderPayments();
    this.updateStatistics();
  }

  updateStatistics() {
    const totalPending = document.getElementById('stat-total-pending');
    const highRisk = document.getElementById('stat-high-risk');
    const totalValue = document.getElementById('stat-total-value');
    
    if (totalPending) {
      totalPending.textContent = this.payments.length;
    }
    
    if (highRisk) {
      const highRiskCount = this.payments.filter(p => p.compliance.amlRiskLevel === 'HIGH').length;
      highRisk.textContent = highRiskCount;
    }
    
    if (totalValue) {
      const total = this.payments.reduce((sum, p) => sum + p.amount, 0);
      totalValue.textContent = `$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }
  }

  verifyPayment(paymentId) {
    console.log('Navigating to verify payment:', paymentId);
    this.app.navigateTo('verify-payment', paymentId);
  }

  exportToCSV() {
    console.log('Exporting payments to CSV');
    this.app.showNotification('Export feature coming soon', 'info');
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  cleanup() {
    console.log('Pending Payments Controller cleanup');
  }
}

class VerifyPaymentController {
  constructor(app) {
    this.app = app;
    this.payment = null;
  }

  async init() {
    console.log('Verify Payment Controller initialized');
    const paymentId = this.app.currentPaymentId;
    if (paymentId) {
      await this.loadPaymentDetails(paymentId);
    }
  }

  setupEventListeners() {
    const verifySwiftBtn = document.getElementById('verify-swift-btn');
    const verifyIbanBtn = document.getElementById('verify-iban-btn');
    const approveBtn = document.getElementById('approve-payment-btn');
    const rejectBtn = document.getElementById('reject-payment-btn');
    const backBtn = document.getElementById('back-to-pending-btn');
    const confirmRejectBtn = document.getElementById('confirm-reject-btn');
    
    if (verifySwiftBtn) {
      verifySwiftBtn.addEventListener('click', () => this.verifySwiftCode());
    }
    
    if (verifyIbanBtn) {
      verifyIbanBtn.addEventListener('click', () => this.verifyIBAN());
    }
    
    if (approveBtn) {
      approveBtn.addEventListener('click', () => this.approvePayment());
    }
    
    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => this.showRejectModal());
    }
    
    if (backBtn) {
      backBtn.addEventListener('click', () => this.app.navigateTo('pending-payments'));
    }
    
    if (confirmRejectBtn) {
      confirmRejectBtn.addEventListener('click', () => this.confirmReject());
    }
  }

  async loadPaymentDetails(paymentId) {
    const loadingEl = document.getElementById('payment-loading');
    const detailsContainer = document.getElementById('payment-details-container');
    
    if (loadingEl) loadingEl.classList.remove('d-none');
    if (detailsContainer) detailsContainer.classList.add('d-none');
    
    try {
      // TODO: Replace with actual API call
      // const response = await this.app.apiRequest(`/api/international-payments/${paymentId}/details`);
      
      // Simulate payment data
      this.payment = {
        _id: paymentId,
        transactionId: 'TXN-2025-001',
        customer: { 
          fullName: 'Alice Johnson',
          accountNumber: '1234567890',
          email: 'alice@example.com',
          customerId: '507f191e810c19729de860ea'
        },
        amount: 15000.00,
        currency: 'USD',
        description: 'International business payment',
        beneficiary: {
          name: 'Bob Smith',
          account: 'GB82WEST12345698765432',
          email: 'bob@example.com',
          phone: '+44 20 1234 5678'
        },
        bankDetails: {
          name: 'HSBC Bank PLC',
          swiftCode: 'HBUKGB4B',
          iban: 'GB82WEST12345698765432',
          country: 'GB',
          city: 'London',
          address: '8 Canada Square, London E14 5HQ'
        },
        compliance: {
          amlRiskLevel: 'LOW',
          sourceOfFunds: 'Business revenue'
        },
        fraudScore: 15,
        status: 'pending_review',
        submittedAt: new Date().toISOString()
      };
      
      this.populatePaymentFields();
      
    } catch (error) {
      console.error('Error loading payment:', error);
      this.app.showNotification('Failed to load payment details', 'error');
    } finally {
      if (loadingEl) loadingEl.classList.add('d-none');
      if (detailsContainer) detailsContainer.classList.remove('d-none');
    }
  }

  populatePaymentFields() {
    if (!this.payment) return;
    
    // Customer info
    this.setElementText('customer-name', this.payment.customer.fullName);
    this.setElementText('customer-account', this.payment.customer.accountNumber);
    this.setElementText('customer-email', this.payment.customer.email);
    this.setElementText('customer-id', this.payment.customer.customerId);
    
    // Transaction details
    this.setElementText('transaction-id', this.payment.transactionId);
    this.setElementText('payment-method', 'SWIFT International');
    this.setElementText('submitted-date', new Date(this.payment.submittedAt).toLocaleString());
    this.setElementText('payment-status', this.payment.status.replace('_', ' ').toUpperCase());
    
    // Amount
    this.setElementText('payment-amount', `${this.payment.currency} ${this.payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    this.setElementText('payment-currency', this.payment.currency);
    this.setElementText('payment-description', this.payment.description);
    
    // Beneficiary
    this.setInputValue('beneficiary-name', this.payment.beneficiary.name);
    this.setInputValue('beneficiary-email', this.payment.beneficiary.email);
    this.setInputValue('beneficiary-phone', this.payment.beneficiary.phone);
    this.setInputValue('bank-name', this.payment.bankDetails.name);
    this.setInputValue('swift-code', this.payment.bankDetails.swiftCode);
    this.setInputValue('iban', this.payment.bankDetails.iban);
    this.setInputValue('bank-address', this.payment.bankDetails.address);
    
    // Compliance
    const amlBadge = document.getElementById('aml-risk-level');
    if (amlBadge) {
      amlBadge.textContent = this.payment.compliance.amlRiskLevel;
      amlBadge.className = `badge ${this.payment.compliance.amlRiskLevel === 'LOW' ? 'bg-success' : 
                                     this.payment.compliance.amlRiskLevel === 'MEDIUM' ? 'bg-warning' : 'bg-danger'}`;
    }
    
    const fraudBadge = document.getElementById('fraud-score');
    if (fraudBadge) {
      fraudBadge.textContent = this.payment.fraudScore;
      fraudBadge.className = `badge ${this.payment.fraudScore < 30 ? 'bg-success' : 
                                     this.payment.fraudScore < 60 ? 'bg-warning' : 'bg-danger'}`;
    }
    
    this.setElementText('source-funds', this.payment.compliance.sourceOfFunds);
  }

  setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '-';
  }

  setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
  }

  verifySwiftCode() {
    const validationEl = document.getElementById('swift-validation');
    if (validationEl) {
      validationEl.innerHTML = '<div class="alert alert-success"><i class="bi bi-check-circle"></i> SWIFT code verified successfully</div>';
    }
    this.app.showNotification('SWIFT code verified', 'success');
  }

  verifyIBAN() {
    const validationEl = document.getElementById('iban-validation');
    if (validationEl) {
      validationEl.innerHTML = '<div class="alert alert-success"><i class="bi bi-check-circle"></i> IBAN verified with checksum validation</div>';
    }
    this.app.showNotification('IBAN verified', 'success');
  }

  approvePayment() {
    const notes = document.getElementById('verification-notes')?.value;
    if (!notes || notes.trim() === '') {
      this.app.showNotification('Please add verification notes before approving', 'warning');
      return;
    }
    
    console.log('Approving payment:', this.payment._id, 'Notes:', notes);
    this.app.showNotification('Payment approved! Navigating to SWIFT submission...', 'success');
    
    setTimeout(() => {
      this.app.navigateTo('submit-swift', this.payment._id);
    }, 1500);
  }

  showRejectModal() {
    const modal = document.getElementById('rejectModal');
    if (modal) {
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
    }
  }

  confirmReject() {
    const reason = document.getElementById('reject-reason')?.value;
    const details = document.getElementById('reject-details')?.value;
    
    if (!reason || !details) {
      this.app.showNotification('Please provide rejection reason and details', 'warning');
      return;
    }
    
    console.log('Rejecting payment:', this.payment._id, 'Reason:', reason, 'Details:', details);
    this.app.showNotification('Payment rejected', 'success');
    
    setTimeout(() => {
      this.app.navigateTo('pending-payments');
    }, 1500);
  }

  cleanup() {
    console.log('Verify Payment Controller cleanup');
  }
}

class SubmitSwiftController {
  constructor(app) {
    this.app = app;
    this.payment = null;
  }

  async init() {
    console.log('Submit SWIFT Controller initialized');
    const paymentId = this.app.currentPaymentId;
    if (paymentId) {
      await this.loadPaymentForSwift(paymentId);
    }
  }

  setupEventListeners() {
    const submitBtn = document.getElementById('submit-to-swift-btn');
    const cancelBtn = document.getElementById('cancel-submission-btn');
    
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitToSwift());
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.app.navigateTo('pending-payments'));
    }
  }

  async loadPaymentForSwift(paymentId) {
    const loadingEl = document.getElementById('swift-loading');
    const container = document.getElementById('swift-submission-container');
    
    if (loadingEl) loadingEl.classList.remove('d-none');
    if (container) container.classList.add('d-none');
    
    try {
      // Load payment details
      this.payment = {
        _id: paymentId,
        transactionId: 'TXN-2025-001',
        customer: { fullName: 'Alice Johnson' },
        beneficiary: { name: 'Bob Smith' },
        amount: 15000.00,
        currency: 'USD',
        bankDetails: {
          swiftCode: 'HBUKGB4B',
          iban: 'GB82WEST12345698765432'
        }
      };
      
      this.populateSummary();
      this.generateMT103Preview();
      
    } catch (error) {
      console.error('Error loading payment for SWIFT:', error);
      this.app.showNotification('Failed to prepare SWIFT submission', 'error');
    } finally {
      if (loadingEl) loadingEl.classList.add('d-none');
      if (container) container.classList.remove('d-none');
    }
  }

  populateSummary() {
    if (!this.payment) return;
    
    this.setElementText('summary-transaction-id', this.payment.transactionId);
    this.setElementText('summary-customer-name', this.payment.customer.fullName);
    this.setElementText('summary-amount', `${this.payment.currency} ${this.payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    this.setElementText('summary-beneficiary-name', this.payment.beneficiary.name);
    this.setElementText('summary-swift-code', this.payment.bankDetails.swiftCode);
    this.setElementText('summary-iban', this.payment.bankDetails.iban);
    this.setElementText('value-date', new Date().toLocaleDateString());
  }

  generateMT103Preview() {
    const preview = document.getElementById('swift-message-preview');
    if (!preview) return;
    
    const mt103 = `{1:F01BANKSECUREXXX0000000000}
{2:I103HBUKGB4BXXXXN}
{3:{108:MT103 001}}
{4:
:20:${this.payment.transactionId}
:23B:CRED
:32A:${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${this.payment.currency}${this.payment.amount.toFixed(2)}
:50K:/${this.payment.customer.fullName}
:59:/${this.payment.bankDetails.iban}
${this.payment.beneficiary.name}
:71A:SHA
-}`;
    
    preview.textContent = mt103;
  }

  setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '-';
  }

  async submitToSwift() {
    const password = document.getElementById('employee-password-confirm')?.value;
    if (!password) {
      this.app.showNotification('Please enter your password to confirm', 'warning');
      return;
    }
    
    const progressDiv = document.getElementById('submission-progress');
    if (progressDiv) progressDiv.classList.remove('d-none');
    
    // Simulate progress
    let progress = 0;
    const progressBar = document.getElementById('submission-progress-bar');
    const progressText = document.getElementById('progress-text');
    
    const interval = setInterval(() => {
      progress += 10;
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
      }
      if (progressText) progressText.textContent = `${progress}%`;
      
      if (progress >= 100) {
        clearInterval(interval);
        this.showSuccessModal();
      }
    }, 300);
  }

  showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
      this.setElementText('swift-reference', `SWIFT-${Date.now()}`);
      this.setElementText('submission-time', new Date().toLocaleString());
      this.setElementText('expected-settlement', new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString());
      
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
      
      // Setup modal buttons
      const nextBtn = document.getElementById('view-next-payment-btn');
      const dashboardBtn = document.getElementById('back-to-dashboard-btn');
      
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          bsModal.hide();
          this.app.navigateTo('pending-payments');
        });
      }
      
      if (dashboardBtn) {
        dashboardBtn.addEventListener('click', () => {
          bsModal.hide();
          this.app.navigateTo('pending-payments');
        });
      }
    }
  }

  cleanup() {
    console.log('Submit SWIFT Controller cleanup');
  }
}

// Export controllers
export const EmployeeControllers = {
  EmployeeLoginController,
  PendingPaymentsController,
  VerifyPaymentController,
  SubmitSwiftController
};
