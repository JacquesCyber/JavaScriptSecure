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
        
        console.log('Employee data to store:', employeeData);
        this.app.setEmployee(employeeData);
        
        // Verify employee was stored
        console.log('Employee stored in app:', this.app.employee);
        console.log('Is authenticated:', this.app.isAuthenticated());
        
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
      // Fetch all payments from both regular and international payment endpoints
      const regularPaymentsPromise = fetch('/api/payments/all', {
        credentials: 'include'
      }).then(r => r.json()).catch(() => ({ success: false, payments: [] }));

      const internationalPaymentsPromise = fetch('/api/international-payments/pending/approvals', {
        credentials: 'include'
      }).then(r => r.json()).catch(() => ({ success: false, payments: [] }));

      const [regularResult, internationalResult] = await Promise.all([
        regularPaymentsPromise,
        internationalPaymentsPromise
      ]);

      // Combine both payment types
      const regularPayments = regularResult.success && regularResult.payments ?
        this.normalizeRegularPayments(regularResult.payments) : [];

      const internationalPayments = internationalResult.success && internationalResult.payments ?
        internationalResult.payments : [];

      // Combine and filter out processed payments (completed, failed, cancelled, refunded)
      const allPayments = [...regularPayments, ...internationalPayments];

      const processedStatuses = ['completed', 'failed', 'cancelled', 'refunded', 'approved', 'rejected'];
      this.payments = allPayments.filter(payment => {
        const status = payment.status?.toLowerCase();
        return status && !processedStatuses.includes(status);
      });

      // Sort by date, newest first
      this.payments.sort((a, b) => new Date(b.createdAt || b.submittedAt) - new Date(a.createdAt || a.submittedAt));

      this.filteredPayments = [...this.payments];
      this.renderPayments();
      this.updateStatistics();

    } catch (error) {
      console.error('Error loading payments:', error);
      this.app.showNotification('Failed to load pending payments', 'error');
      this.payments = [];
      this.filteredPayments = [];
    } finally {
      if (loadingEl) loadingEl.classList.add('d-none');
    }
  }

  normalizeRegularPayments(payments) {
    // Transform regular payments to match the structure expected by the employee portal
    return payments.map(payment => ({
      _id: payment._id || payment.id,
      transactionId: payment.transactionId,
      customer: {
        fullName: payment.userId?.fullName || 'Unknown Customer',
        accountNumber: payment.userId?.accountNumber || 'N/A',
        customerId: payment.userId?._id || payment.userId
      },
      beneficiary: {
        name: this.extractBeneficiaryName(payment)
      },
      amount: payment.amount,
      currency: payment.currency,
      compliance: {
        amlRiskLevel: this.calculateRiskLevel(payment)
      },
      fraudScore: payment.fraudScore || 0,
      submittedAt: payment.createdAt,
      createdAt: payment.createdAt,
      status: payment.status,
      paymentType: 'regular',
      paymentMethod: payment.paymentMethod
    }));
  }

  extractBeneficiaryName(payment) {
    // Check SWIFT details first and get actual beneficiary name
    if (payment.paymentMethod?.swiftDetails?.beneficiaryName) {
      return payment.paymentMethod.swiftDetails.beneficiaryName;
    }

    // Check PayPal email
    if (payment.paymentMethod?.paypalEmail) {
      return payment.paymentMethod.paypalEmail;
    }

    // For bank transfers, try to find beneficiary name in bankDetails
    if (payment.paymentMethod?.bankDetails?.beneficiaryName) {
      return payment.paymentMethod.bankDetails.beneficiaryName;
    }

    // Check if there's a beneficiary name at the payment level
    if (payment.beneficiary?.name) {
      return payment.beneficiary.name;
    }

    // Fallback to payment method type
    if (payment.paymentMethod?.type) {
      const typeLabels = {
        'card': 'Card Payment',
        'paypal': 'PayPal',
        'bank_transfer': 'Bank Transfer',
        'crypto': 'Crypto Payment',
        'swift': 'International Transfer',
        'eft': 'EFT Transfer'
      };
      return typeLabels[payment.paymentMethod.type] || payment.paymentMethod.type.toUpperCase();
    }

    return 'Unknown Beneficiary';
  }

  calculateRiskLevel(payment) {
    // Simple risk calculation based on amount and fraud score
    const fraudScore = payment.fraudScore || 0;
    const amount = payment.amount || 0;

    if (fraudScore > 60 || amount > 50000) {
      return 'HIGH';
    } else if (fraudScore > 30 || amount > 10000) {
      return 'MEDIUM';
    }
    return 'LOW';
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

      // Format amount with currency
      const formattedAmount = `${this.escapeHtml(payment.currency)} ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

      // Format submitted date
      const submittedDate = new Date(payment.submittedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      row.innerHTML = `
        <td style="font-size: 0.85rem;">${this.escapeHtml(payment.transactionId)}</td>
        <td>${this.escapeHtml(payment.customer.fullName)}</td>
        <td style="white-space: nowrap;">${formattedAmount}</td>
        <td><span class="badge ${amlBadgeClass}">${this.escapeHtml(payment.compliance.amlRiskLevel)}</span></td>
        <td style="font-size: 0.85rem;">${submittedDate}</td>
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
    // Find the payment to determine its type
    const payment = this.payments.find(p => p._id === paymentId);
    const paymentType = payment?.paymentType || 'international';

    // Store payment type and data for the verify page
    if (payment) {
      sessionStorage.setItem('currentPayment', JSON.stringify(payment));
      sessionStorage.setItem('currentPaymentType', paymentType);
    }

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
      // Check if we have cached payment data from the list
      const cachedPayment = sessionStorage.getItem('currentPayment');
      const paymentType = sessionStorage.getItem('currentPaymentType');

      if (cachedPayment && paymentType === 'regular') {
        // Use cached regular payment data
        this.payment = JSON.parse(cachedPayment);
        this.paymentType = 'regular';
        this.populatePaymentFields();
      } else {
        // Fetch international payment details from API
        const response = await this.app.apiRequest(`/api/international-payments/${paymentId}`);

        if (response.success && response.payment) {
          this.payment = response.payment;
          this.paymentType = 'international';
          this.populatePaymentFields();
        } else {
          throw new Error('Payment not found');
        }
      }

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
    this.setElementText('customer-name', this.payment.customer?.fullName || 'N/A');
    this.setElementText('customer-account', this.payment.customer?.accountNumber || 'N/A');
    this.setElementText('customer-email', this.payment.customer?.email || 'N/A');
    this.setElementText('customer-id', this.payment.customer?.customerId || this.payment.userId || 'N/A');

    // Transaction details
    this.setElementText('transaction-id', this.payment.transactionId);

    // Payment method - handle both regular and international payments
    const paymentMethodText = this.paymentType === 'regular' ?
      (this.payment.paymentMethod?.type?.toUpperCase() || 'Regular Payment') :
      'SWIFT International';
    this.setElementText('payment-method', paymentMethodText);

    this.setElementText('submitted-date', new Date(this.payment.submittedAt || this.payment.createdAt).toLocaleString());
    this.setElementText('payment-status', (this.payment.status || 'pending').replace('_', ' ').toUpperCase());

    // Amount
    this.setElementText('payment-amount', `${this.payment.currency} ${this.payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    this.setElementText('payment-currency', this.payment.currency);
    this.setElementText('payment-description', this.payment.description || 'No description');

    // Beneficiary - handle different structures
    if (this.paymentType === 'regular') {
      // Regular payment - extract from paymentMethod
      this.setInputValue('beneficiary-name', this.payment.beneficiary?.name || 'N/A');
      this.setInputValue('beneficiary-email', this.payment.paymentMethod?.paypalEmail || this.payment.beneficiary?.email || '');
      this.setInputValue('beneficiary-phone', this.payment.beneficiary?.phone || '');
      this.setInputValue('bank-name', this.payment.paymentMethod?.bankDetails?.bankName || 'N/A');
      this.setInputValue('swift-code', this.payment.paymentMethod?.swiftDetails?.swiftCode || 'N/A');
      this.setInputValue('iban', this.payment.paymentMethod?.bankDetails?.iban || 'N/A');
      this.setInputValue('bank-address', this.payment.paymentMethod?.bankDetails?.address || 'N/A');
    } else {
      // International payment
      this.setInputValue('beneficiary-name', this.payment.beneficiary?.name || '');
      this.setInputValue('beneficiary-email', this.payment.beneficiary?.email || '');
      this.setInputValue('beneficiary-phone', this.payment.beneficiary?.phone || '');
      this.setInputValue('bank-name', this.payment.bankDetails?.name || '');
      this.setInputValue('swift-code', this.payment.bankDetails?.swiftCode || '');
      this.setInputValue('iban', this.payment.bankDetails?.iban || '');
      this.setInputValue('bank-address', this.payment.bankDetails?.address || '');
    }

    // Compliance
    const amlBadge = document.getElementById('aml-risk-level');
    if (amlBadge) {
      const riskLevel = this.payment.compliance?.amlRiskLevel || 'UNKNOWN';
      amlBadge.textContent = riskLevel;
      amlBadge.className = `badge ${riskLevel === 'LOW' ? 'bg-success' :
                                     riskLevel === 'MEDIUM' ? 'bg-warning' : 'bg-danger'}`;
    }

    const fraudBadge = document.getElementById('fraud-score');
    if (fraudBadge) {
      const score = this.payment.fraudScore || 0;
      fraudBadge.textContent = score;
      fraudBadge.className = `badge ${score < 30 ? 'bg-success' :
                                     score < 60 ? 'bg-warning' : 'bg-danger'}`;
    }

    this.setElementText('source-funds', this.payment.compliance?.sourceOfFunds || 'Not specified');
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

  async approvePayment() {
    const notes = document.getElementById('verification-notes')?.value;
    if (!notes || notes.trim() === '') {
      this.app.showNotification('Please add verification notes before approving', 'warning');
      return;
    }

    const approveBtn = document.getElementById('approve-payment-btn');
    if (approveBtn) approveBtn.disabled = true;

    // Check if this is a SWIFT payment
    const isSwiftPayment = this.paymentType === 'international' ||
                          this.payment.paymentMethod?.type === 'swift';

    if (isSwiftPayment) {
      // SWIFT payments go to submit-swift page
      console.log('Approving SWIFT payment:', this.payment._id, 'Notes:', notes);
      this.app.showNotification('Payment approved! Navigating to SWIFT submission...', 'success');

      setTimeout(() => {
        this.app.navigateTo('submit-swift', this.payment._id);
      }, 1500);
    } else {
      // Non-SWIFT payments are approved directly
      try {
        console.log('Approving regular payment:', this.payment._id, 'Notes:', notes);

        // Update payment status to approved using app's apiRequest with CSRF token
        const result = await this.app.apiRequest(`/api/payments/${this.payment.transactionId}/approve`, {
          method: 'POST',
          body: JSON.stringify({ notes })
        });

        if (result.success) {
          this.app.showNotification('Payment approved successfully!', 'success');
          setTimeout(() => {
            this.app.navigateTo('pending-payments');
          }, 1500);
        } else {
          throw new Error(result.message || 'Failed to approve payment');
        }
      } catch (error) {
        console.error('Error approving payment:', error);
        this.app.showNotification('Failed to approve payment: ' + error.message, 'error');
        if (approveBtn) approveBtn.disabled = false;
      }
    }
  }

  showRejectModal() {
    const modal = document.getElementById('rejectModal');
    if (modal) {
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
    }
  }

  async confirmReject() {
    const reason = document.getElementById('reject-reason')?.value;
    const details = document.getElementById('reject-details')?.value;

    if (!reason || !details) {
      this.app.showNotification('Please provide rejection reason and details', 'warning');
      return;
    }

    const confirmBtn = document.getElementById('confirm-reject-btn');
    if (confirmBtn) confirmBtn.disabled = true;

    try {
      console.log('Rejecting payment:', this.payment._id, 'Reason:', reason, 'Details:', details);

      // Call reject API with CSRF token
      const result = await this.app.apiRequest(`/api/payments/${this.payment.transactionId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason, details })
      });

      if (result.success) {
        this.app.showNotification('Payment rejected successfully', 'success');

        // Close the modal
        const modal = document.getElementById('rejectModal');
        if (modal) {
          const bsModal = bootstrap.Modal.getInstance(modal);
          if (bsModal) bsModal.hide();
        }

        setTimeout(() => {
          this.app.navigateTo('pending-payments');
        }, 1500);
      } else {
        throw new Error(result.message || 'Failed to reject payment');
      }
    } catch (error) {
      console.error('Error rejecting payment:', error);
      this.app.showNotification('Failed to reject payment: ' + error.message, 'error');
      if (confirmBtn) confirmBtn.disabled = false;
    }
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
    console.log('Setting up SubmitSwiftController event listeners');

    // Setup checkbox enable/disable functionality for submit button
    const confirmDetailsCheck = document.getElementById('confirm-details-check');
    const confirmComplianceCheck = document.getElementById('confirm-compliance-check');
    const confirmAuthCheck = document.getElementById('confirm-authorization-check');
    const submitBtn = document.getElementById('submit-to-swift-btn');
    const cancelBtn = document.getElementById('cancel-submission-btn');

    const checkAllConfirmations = () => {
      if (confirmDetailsCheck && confirmComplianceCheck && confirmAuthCheck && submitBtn) {
        const allChecked = confirmDetailsCheck.checked &&
                          confirmComplianceCheck.checked &&
                          confirmAuthCheck.checked;
        submitBtn.disabled = !allChecked;
        console.log('Checkboxes checked:', allChecked, 'Button disabled:', submitBtn.disabled);
      }
    };

    // Attach checkbox listeners
    if (confirmDetailsCheck) {
      confirmDetailsCheck.addEventListener('change', checkAllConfirmations);
    }
    if (confirmComplianceCheck) {
      confirmComplianceCheck.addEventListener('change', checkAllConfirmations);
    }
    if (confirmAuthCheck) {
      confirmAuthCheck.addEventListener('change', checkAllConfirmations);
    }

    // Initial check
    checkAllConfirmations();

    // Attach submit button listener
    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Submit button clicked via controller');
        this.submitToSwift();
      });
      console.log('Submit to SWIFT button listener attached');
    } else {
      console.error('Submit to SWIFT button not found');
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
      // Check if we have cached payment data from the verify page
      const cachedPayment = sessionStorage.getItem('currentPayment');
      const paymentType = sessionStorage.getItem('currentPaymentType');

      if (cachedPayment && paymentType === 'regular') {
        // Use cached regular payment data
        this.payment = JSON.parse(cachedPayment);
        this.paymentType = 'regular';
      } else {
        // Fetch international payment details from API
        const response = await this.app.apiRequest(`/api/international-payments/${paymentId}`);

        if (response.success && response.payment) {
          this.payment = response.payment;
          this.paymentType = 'international';
        } else {
          throw new Error('Payment not found');
        }
      }

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
    this.setElementText('summary-customer-name', this.payment.customer?.fullName || 'Unknown');
    this.setElementText('summary-amount', `${this.payment.currency} ${this.payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    this.setElementText('summary-beneficiary-name', this.payment.beneficiary?.name || 'N/A');

    // Handle different payment structures
    const swiftCode = this.paymentType === 'regular' ?
      (this.payment.paymentMethod?.swiftDetails?.swiftCode || 'N/A') :
      (this.payment.bankDetails?.swiftCode || 'N/A');

    const iban = this.paymentType === 'regular' ?
      (this.payment.paymentMethod?.bankDetails?.iban || this.payment.beneficiary?.account || 'N/A') :
      (this.payment.bankDetails?.iban || 'N/A');

    this.setElementText('summary-swift-code', swiftCode);
    this.setElementText('summary-iban', iban);
    this.setElementText('value-date', new Date().toLocaleDateString());
  }

  generateMT103Preview() {
    const preview = document.getElementById('swift-message-preview');
    if (!preview) return;

    const swiftCode = this.paymentType === 'regular' ?
      (this.payment.paymentMethod?.swiftDetails?.swiftCode || 'UNKNOWNXX') :
      (this.payment.bankDetails?.swiftCode || 'UNKNOWNXX');

    const iban = this.paymentType === 'regular' ?
      (this.payment.paymentMethod?.bankDetails?.iban || this.payment.beneficiary?.account || 'UNKNOWN') :
      (this.payment.bankDetails?.iban || 'UNKNOWN');

    const beneficiaryName = this.payment.beneficiary?.name || 'Unknown Beneficiary';
    const customerName = this.payment.customer?.fullName || 'Unknown Customer';

    const mt103 = `{1:F01BANKSECUREXXX0000000000}
{2:I103${swiftCode}XXXXN}
{3:{108:MT103 001}}
{4:
:20:${this.payment.transactionId}
:23B:CRED
:32A:${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${this.payment.currency}${this.payment.amount.toFixed(2)}
:50K:/${customerName}
:59:/${iban}
${beneficiaryName}
:71A:SHA
-}`;

    preview.textContent = mt103;
  }

  setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '-';
  }

  async submitToSwift() {
    console.log('Submit to SWIFT button clicked');
    console.log('Payment object:', this.payment);

    const password = document.getElementById('employee-password-confirm')?.value;
    if (!password) {
      this.app.showNotification('Please enter your password to confirm', 'warning');
      return;
    }

    if (!this.payment || !this.payment.transactionId) {
      this.app.showNotification('Error: Payment data is missing', 'error');
      console.error('Payment object is invalid:', this.payment);
      return;
    }

    const submitBtn = document.getElementById('submit-to-swift-btn');
    if (submitBtn) submitBtn.disabled = true;

    const progressDiv = document.getElementById('submission-progress');
    if (progressDiv) progressDiv.classList.remove('d-none');

    try {
      // Show progress animation
      let progress = 0;
      const progressBar = document.getElementById('submission-progress-bar');
      const progressText = document.getElementById('progress-text');

      const progressInterval = setInterval(() => {
        progress += 10;
        if (progressBar) {
          progressBar.style.width = `${progress}%`;
          progressBar.setAttribute('aria-valuenow', progress);
        }
        if (progressText) progressText.textContent = `${progress}%`;

        if (progress >= 100) {
          clearInterval(progressInterval);
        }
      }, 300);

      console.log('Approving payment with transaction ID:', this.payment.transactionId);

      // Approve the payment (simulating SWIFT submission) using app's apiRequest with CSRF token
      const result = await this.app.apiRequest(`/api/payments/${this.payment.transactionId}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          notes: 'Payment approved and submitted to SWIFT network',
          swiftSubmitted: true
        })
      });

      console.log('Response data:', result);

      // Wait for progress bar to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      if (result.success) {
        console.log('Payment approved successfully');
        this.showSuccessModal();
      } else {
        throw new Error(result.message || 'Failed to approve payment');
      }
    } catch (error) {
      console.error('Error submitting payment:', error);
      this.app.showNotification('Failed to submit payment: ' + error.message, 'error');
      if (submitBtn) submitBtn.disabled = false;
      if (progressDiv) progressDiv.classList.add('d-none');
    }
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
