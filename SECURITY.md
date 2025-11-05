# Security Policy

## Security Standards

This project maintains the following security standards:

###  **Blocking Vulnerabilities (CI/CD Fails)**
- **Critical**: CVSS 9.0-10.0 - Immediate security risk
- **High**: CVSS 7.0-8.9 - Significant security risk  
- **Medium**: CVSS 4.0-6.9 - Moderate security risk

###  **Non-Blocking Vulnerabilities (CI/CD Warns)**
- **Low**: CVSS 0.1-3.9 - Informational/best practice issues

###  **Security Tools Used**
- OWASP ZAP for security scanning
- ESLint security rules
- Helmet.js for security headers
- Express validator for input validation
- MongoDB parameterized queries

## Security Features

### Authentication & Authorization
- **Session-Based Authentication:** httpOnly cookies with secure flags
- **Password Hashing:** bcrypt with 12 salt rounds (configurable in `src/constants/security.js`)
- **Role-Based Access Control (RBAC):** Staff roles (staff, supervisor, admin)
- **Multi-Factor Ready:** Architecture supports MFA integration
- **CSRF Protection:** Token validation on all state-changing operations (login endpoints excluded)

### Encryption & Data Protection
- **Transport Layer:** HTTPS/TLS 1.3 with HSTS
- **At-Rest Encryption:** AES-256-GCM for PII (ID numbers)
- **Hybrid Encryption:** RSA+AES for sensitive payment data
- **Password Security:** bcrypt (12 rounds) via centralized utilities (`src/utils/auth.js`)

### Input Validation & Sanitization
- **5-Layer Defense:**
  1. Client-side validation (HTML5 + JavaScript)
  2. Express-validator middleware
  3. NoSQL injection prevention
  4. XSS prevention (HTML entity encoding)
  5. Content Security Policy (CSP Level 3)
- **Centralized Validation:** `src/middleware/validationHandler.js` for consistent error responses

### Rate Limiting (4-Tier System)
1. **General Limiter:** 100 req/15min per IP
2. **API Limiter:** 50 req/15min per IP
3. **Auth Limiter:** 5 req/15min per IP (login/register)
4. **Strict Limiter:** 10 req/15min per IP (sensitive operations)

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

## Code Quality & Security Audits

### November 2025 Audit Results ✅

#### High-Priority Fixes Implemented
1. **✅ Duplicate Security Constants**
   - **Issue:** `saltRounds` declared 4 times across codebase
   - **Risk:** Inconsistent cryptographic parameters
   - **Fix:** Centralized in `src/constants/security.js`
   - **Impact:** 100% elimination of duplicates

2. **✅ Scattered Cryptographic Operations**
   - **Issue:** 8 direct bcrypt calls across services
   - **Risk:** Inconsistent error handling, hard to maintain
   - **Fix:** Created `src/utils/auth.js` utilities
   - **Impact:** 100% consolidation, easier testing

3. **✅ Duplicate Validation Handlers**
   - **Issue:** 15 identical validation error blocks
   - **Risk:** Inconsistent error responses
   - **Fix:** Created `src/middleware/validationHandler.js`
   - **Impact:** ~60 lines removed, standardized responses

#### Security Improvements
| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Duplicate constants | 4 | 0 | ✅ Fixed |
| Scattered bcrypt calls | 8 | 0 | ✅ Fixed |
| Duplicate validation | 15 | 0 | ✅ Fixed |
| Security utilities | 0 | 2 | ✅ Added |
| Code reduction | - | -95 lines | ✅ Improved |

### Ongoing Security Practices
- ✅ Regular dependency audits (`npm audit`)
- ✅ ESLint security plugin (`npm run lint:security`)
- ✅ Manual code reviews for security-critical changes
- ✅ Input validation on all endpoints
- ✅ Principle of least privilege
- ✅ Defense in depth architecture

## International Payments Security

### SWIFT Payment Compliance
- **SWIFT/BIC Validation:** 8-11 character format with strict regex
- **IBAN Validation:** MOD-97 checksum with country-specific rules
- **Purpose Code Validation:** ISO 20022 compliant codes
- **AML Risk Scoring:** Automatic risk assessment
- **Sanctions Screening:** Ready for OFAC/EU integration
- **Fraud Detection:**
  - Velocity checks (transaction frequency limits)
  - Pattern analysis (unusual behavior detection)
  - Amount thresholds (large transaction alerts)
  - Geographic risk assessment

### Payment Workflow Security
1. **Draft:** Customer creates payment (encrypted storage)
2. **Pending Review:** Staff receives notification
3. **Approved:** Authorized staff approves (audit logged)
4. **Processing:** Payment submitted to SWIFT network
5. **Completed:** Confirmation received (immutable record)

Each status change is logged with:
- Timestamp
- Actor (employee ID)
- IP address
- Previous/new status
- Notes/comments

## Compliance

This application follows security best practices including:
- ✅ OWASP Top 10 protections
- ✅ CSP Level 3 implementation
- ✅ Secure coding standards
- ✅ Regular security testing
- ✅ Defense-in-depth architecture
- ✅ Principle of least privilege
- ✅ Input validation on all boundaries
- ✅ Secure session management
- ✅ Cryptographic best practices

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

---

**Last Updated:** 4 November 2025  
**Security Version:** 2.0  
**Next Audit Due:** February 2026
