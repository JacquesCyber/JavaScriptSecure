# Security Policy

## Security Standards

This project maintains the following security standards:

### Blocking Vulnerabilities (CI/CD Fails)
- **Critical**: CVSS 9.0-10.0 - Immediate security risk
- **High**: CVSS 7.0-8.9 - Significant security risk
- **Medium**: CVSS 4.0-6.9 - Moderate security risk

### Non-Blocking Vulnerabilities (CI/CD Warns)
- **Low**: CVSS 0.1-3.9 - Informational/best practice issues

### Security Tools Used
- OWASP ZAP for security scanning
- ESLint security rules
- Helmet.js for security headers
- Express validator for input validation
- MongoDB parameterized queries
- Rate limiting with express-rate-limit
- CSRF protection with csurf

## Security Features

### Authentication & Authorization
- **Session-Based Authentication:** httpOnly cookies with secure flags
- **Password Hashing:** bcrypt with 12 salt rounds (configurable in `src/constants/security.js`)
- **Role-Based Access Control (RBAC):** Staff roles (staff, supervisor, admin)
- **Multi-Factor Ready:** Architecture supports MFA integration
- **CSRF Protection:** Token validation on all state-changing operations (login endpoints excluded)
- **Session Management:** 15-minute timeout with secure cookie attributes
- **Password Policy:** Minimum 8 characters with complexity requirements

### Encryption & Data Protection
- **Transport Layer:** HTTPS/TLS 1.3 with HSTS
- **At-Rest Encryption:** AES-256-GCM for sensitive data
  - ID numbers (PII)
  - Bank account numbers
  - IBAN/SWIFT beneficiary accounts
  - Email addresses (optional fields)
  - Phone numbers (optional fields)
- **Hybrid Encryption:** RSA+AES for sensitive payment data
- **Password Security:** bcrypt (12 rounds) via centralized utilities (`src/utils/auth.js`)
- **Encryption Keys:** Stored in environment variables, never committed to repository

### Input Validation & Sanitization
- **5-Layer Defense:**
  1. Client-side validation (HTML5 + JavaScript)
  2. Express-validator middleware (route-level)
  3. NoSQL injection prevention (MongoDB query sanitization)
  4. XSS prevention (HTML entity encoding)
  5. Content Security Policy (CSP Level 3)
- **Centralized Validation:**
  - `src/middleware/validationHandler.js` for consistent error responses
  - `src/validators/patterns.js` for reusable regex patterns
  - `src/validators/internationalPayment.js` for SWIFT/IBAN validation
- **Data Normalization:** Automatic cleanup of spaces, case conversion for codes
- **Type Validation:** Strict type checking with ObjectId validation

### Rate Limiting (4-Tier System)
1. **General Limiter:** 100 req/15min per IP (public pages)
2. **API Limiter:** 50 req/15min per IP (API endpoints)
3. **Auth Limiter:** 5 req/15min per IP (login/register endpoints)
4. **Strict Limiter:** 10 req/15min per IP (sensitive operations)

**Implementation:** `src/middleware/rateLimiting.js`

### Content Security Policy (CSP)
```http
Content-Security-Policy:
  default-src 'none';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  connect-src 'self';
  font-src 'self';
  form-action 'self';
  frame-ancestors 'none';
  base-uri 'self';
  upgrade-insecure-requests;
```

### Security Headers (Helmet.js)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

## Security Architecture

### Centralized Security Constants
All cryptographic parameters and security thresholds are centralized in `src/constants/security.js`:
```javascript
BCRYPT_SALT_ROUNDS: 12
PASSWORD_MIN_LENGTH: 8
SESSION_TIMEOUT_MS: 900000 (15 minutes)
MAX_LOGIN_ATTEMPTS: 5
CSRF_TOKEN_LENGTH: 32
```

**Benefits:**
- Single source of truth
- Easy to update security parameters
- Consistent across all modules
- Auditable configuration

### Authentication Utilities
Password operations centralized in `src/utils/auth.js`:
- `hashPassword(password)` - Secure password hashing
- `verifyPassword(password, hash)` - Password verification
- `validatePasswordStrength(password)` - Complexity checks

**Benefits:**
- Consistent hashing across services
- Easy to unit test
- Future algorithm migration (e.g., argon2)
- Proper error handling

### Encryption Utilities
Sensitive data encryption in `src/utils/encryption.js`:
- `encrypt(plaintext)` - AES-256-GCM encryption
- `decrypt(ciphertext)` - AES-256-GCM decryption
- Automatic IV generation and authentication tags
- Environment-based key management

## Code Quality & Security Audits

### November 2025 Audit Results

#### High-Priority Fixes Implemented
1. **Duplicate Security Constants**
   - **Issue:** `saltRounds` declared 4 times across codebase
   - **Risk:** Inconsistent cryptographic parameters
   - **Fix:** Centralized in `src/constants/security.js`
   - **Impact:** 100% elimination of duplicates

2. **Scattered Cryptographic Operations**
   - **Issue:** 8 direct bcrypt calls across services
   - **Risk:** Inconsistent error handling, hard to maintain
   - **Fix:** Created `src/utils/auth.js` utilities
   - **Impact:** 100% consolidation, easier testing

3. **Duplicate Validation Handlers**
   - **Issue:** 15 identical validation error blocks
   - **Risk:** Inconsistent error responses
   - **Fix:** Created `src/middleware/validationHandler.js`
   - **Impact:** ~60 lines removed, standardized responses

4. **Double Encryption Prevention**
   - **Issue:** Beneficiary accounts encrypted twice causing validation failures
   - **Risk:** Data corruption, failed transactions
   - **Fix:** Removed premature encryption in service layer validation
   - **Impact:** SWIFT payments now process correctly

5. **Payment Auto-Approval Issue**
   - **Issue:** Payments automatically marked as completed bypassing approval workflow
   - **Risk:** Unauthorized transactions, lack of audit trail
   - **Fix:** Removed automatic processing simulation, payments stay in pending status
   - **Impact:** All payments now require manual approval by authorized staff

6. **Input Normalization**
   - **Issue:** SWIFT codes and IBANs with spaces/lowercase failed validation
   - **Risk:** Valid payments rejected due to format variations
   - **Fix:** Added normalization (trim, uppercase, remove spaces) before validation
   - **Impact:** User-friendly input handling while maintaining security

#### Security Improvements
| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Duplicate constants | 4 | 0 | Fixed |
| Scattered bcrypt calls | 8 | 0 | Fixed |
| Duplicate validation | 15 | 0 | Fixed |
| Security utilities | 0 | 2 | Added |
| Code reduction | - | -95 lines | Improved |
| Double encryption bugs | 1 | 0 | Fixed |
| Payment workflow gaps | 1 | 0 | Fixed |
| Input normalization | None | Full | Added |

### Ongoing Security Practices
- Regular dependency audits (`npm audit`)
- ESLint security plugin (`npm run lint:security`)
- Manual code reviews for security-critical changes
- Input validation on all endpoints
- Principle of least privilege
- Defense in depth architecture
- Detailed logging for security events

## International Payments Security

### SWIFT Payment Compliance
- **SWIFT/BIC Validation:** 8-11 character format with strict regex
- **IBAN Validation:** MOD-97 checksum with country-specific length validation
- **Purpose Code Validation:** ISO 20022 compliant codes (SALA, PENS, SUPP, etc.)
- **AML Risk Scoring:** Automatic risk assessment based on:
  - Transaction amount thresholds
  - Destination country risk
  - Customer transaction history
  - Velocity checks
- **Sanctions Screening:** Architecture ready for OFAC/EU integration
- **Fraud Detection:**
  - Velocity checks (transaction frequency limits)
  - Pattern analysis (unusual behavior detection)
  - Amount thresholds (>$50,000 flagged)
  - Geographic risk assessment (high-risk countries)
  - First-time beneficiary checks

### Payment Workflow Security
1. **Draft:** Customer creates payment (validation only)
2. **Pending:** Awaits employee review (encrypted storage)
3. **Pending Review:** Staff receives notification (role-based access)
4. **Approved:** Authorized staff approves (audit logged with employee ID)
5. **Processing:** Payment submitted to SWIFT network
6. **Completed/Failed:** Final status with confirmation

Each status change is logged with:
- Timestamp
- Actor (employee ID with role verification)
- IP address
- User agent
- Previous/new status
- Notes/comments
- Fraud score

### Data Masking & Privacy
- **Account Numbers:** Masked to show last 4 digits only (`****1234`)
- **Email Addresses:** Partially masked (`us**@example.com`)
- **Phone Numbers:** Last 4 digits visible only
- **Full Data Access:** Limited to authorized roles (admin, manager)
- **Audit Trail:** All data access logged

## Payment Method Security

### Supported Payment Methods
1. **Credit/Debit Cards**
   - PCI-DSS compliant (only last 4 digits stored)
   - Expiry date validation
   - Brand validation (Visa, Mastercard, Amex, Discover)
   - Card expiration checking

2. **EFT (Electronic Funds Transfer)**
   - South African banking format
   - 6-digit bank code validation
   - 6-digit branch code validation
   - 10-12 digit account number encryption
   - Account type validation

3. **SWIFT International Payments**
   - Full IBAN validation with MOD-97 checksum
   - SWIFT/BIC code validation
   - Country-specific IBAN length validation (40+ countries)
   - Beneficiary details encryption
   - Intermediary bank support

4. **PayPal**
   - Email validation
   - Encrypted email storage

### Payment Processing Security
- All payments start in `pending` status
- Manual approval required by authorized staff
- Fraud score calculation before submission
- IP address and user agent logging
- Transaction ID generation with crypto-random bytes
- Immutable audit trail

## Database Security

### MongoDB Security
- **NoSQL Injection Prevention:**
  - `$eq` operators for literal matching
  - Type validation (ObjectId checks)
  - Input sanitization
  - Query parameterization
- **Access Control:**
  - Principle of least privilege
  - User-scoped queries
  - Role-based data access
- **Data Encryption:**
  - Sensitive fields encrypted before storage
  - Encryption keys in environment variables
- **Connection Security:**
  - MongoDB URI with authentication
  - TLS/SSL for database connections

### Schema Validation
- Mongoose schema validation
- Required field enforcement
- Type validation
- Length constraints
- Regex pattern matching
- Custom validators for business logic

## Compliance

This application follows security best practices including:
- OWASP Top 10 protections
- CSP Level 3 implementation
- Secure coding standards
- Regular security testing
- Defense-in-depth architecture
- Principle of least privilege
- Input validation on all boundaries
- Secure session management
- Cryptographic best practices
- PCI-DSS compliance (for card data)
- GDPR-ready (data encryption, masking, audit trails)

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please follow responsible disclosure:

1. **DO NOT** open a public GitHub issue
2. Email security details to the project maintainer
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)
4. Allow 90 days for patching before public disclosure

We take all security reports seriously and will respond within 48 hours.

## Recent Security Updates

### January 2025
- Fixed double encryption in SWIFT beneficiary accounts
- Implemented proper payment approval workflow
- Added input normalization for international payment codes
- Enhanced validation error logging for debugging
- Improved payment status sorting (pending first)
- Updated .gitignore to prevent credential leaks

### November 2025
- Centralized security constants
- Created authentication utilities
- Standardized validation error handling
- Implemented comprehensive rate limiting
- Added CSRF protection

---

**Last Updated:** 7 January 2025
**Security Version:** 2.1
**Next Audit Due:** April 2025
