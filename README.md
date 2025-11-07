# Secure Banking Portal

A secure, enterprise-grade Node.js business application featuring multi-page architecture, HTTPS support, and comprehensive security practices. Built with modern ES6 modules and component-based design patterns following OWASP Top 10 security guidelines.

## Deployed Application Access

This application has been deployed to the web under the following URL:
- https://javascriptsecure.onrender.com

In order to access the deployed application the following credentials will have to be entered once the URL has been opened:
- Username: **instructor**
- Password: **AcademicPortfolioPeice!**

## Security Highlights

This application implements industry-leading security practices:

- **5-Layer Defense-in-Depth Input Protection** - Regex validation, sanitization, XSS prevention
- **Triple Encryption Strategy** - TLS/SSL transport + AES-256 PII + RSA+AES hybrid encryption
- **4-Tier Rate Limiting** - General, API, Authentication, and Strict limiters
- **Multi-Method Authentication** - JWT + Session-based with RBAC
- **Strict CSP Level 3** - Nonce-based script execution, deny-by-default policies
- **CSRF Protection** - Token validation on all state-changing operations
- **OWASP Top 10 Compliance** - Addresses all 2021 vulnerabilities
- **Automated Security Scanning** - ESLint security plugin, npm audit, CI/CD integration

**Technology Stack**: Node.js 18+ | Express 5.x | MongoDB 8.x | Mongoose | JWT | bcrypt | Helmet | CSRF Protection

---

## Architecture Overview

**Enterprise Single-Page Application (SPA)** with server-side security:
- **5 Business Pages**: Register, Login, Customer Dashboard, Payment Processor, Transaction Validator
- **Component-Based Controllers**: Modular ES6 architecture with base PageController class
- **Template System**: External HTML templates with caching and secure serving
- **Configuration Management**: Environment-specific settings with validation
- **Security-First Design**: Defense-in-depth approach with multiple security layers

---

## Why Vanilla JavaScript Over React?

This project intentionally uses vanilla JavaScript for security-focused reasons:

### Security Benefits

**1. Reduced Attack Surface**
- Current stack: ~50-100 production dependencies
- MERN stack: 300-500+ dependencies (React, ReactDOM, webpack/Vite, Babel, etc.)
- Impact: Each dependency is a potential vulnerability

**2. Direct Security Control**
- Full control over every security header, CSP policy, and DOM manipulation
- No reliance on framework sanitization or third-party component security
- Every line of security code is visible, auditable, and directly controlled

**3. Simpler Auth Model**
- Current: httpOnly cookies + server-side sessions + CSRF tokens
- React SPA requires: Token storage (localStorage = XSS risk), CORS config, refresh token rotation

**4. Stricter Content Security Policy**
```http
Content-Security-Policy: 
  default-src 'none';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'unsafe-inline';
  connect-src 'self';
  frame-ancestors 'none';
```

**5. Supply Chain Security**
- Vanilla JS: ~50-100 packages
- React stack: ~350-530 packages
- Vulnerability exposure: 5-6x higher with React

### Performance Benefits

- **Bundle Size**: 50-80KB vs 500KB-2MB (React)
- **No Framework Overhead**: Direct DOM manipulation
- **Better Core Web Vitals**: Lower FCP, better TTI

### Trade-off Analysis

| Aspect | Vanilla JS | React |
|--------|-----------|-------|
| Dependencies | ~50-100 | ~350-500 |
| CVE Exposure | Low | 5-6x Higher |
| CSP Compliance | Strict | Moderate |
| Auth Complexity | Simple | Complex |
| Bundle Size | ~50-80KB | ~500KB-2MB |

**Professional Justification**: "Complexity is the enemy of security." - Bruce Schneier

---

## Quick Start

### Prerequisites
- Node.js v18+
- MongoDB Atlas account or local MongoDB instance

### Installation

```bash
# Clone and install
git clone <repository-url>
cd JavaScriptSecure
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and encryption keys
```

### Development

```bash
# HTTP Development (recommended)
npm run dev
# Access: http://localhost:3000

# HTTPS Development (production-like testing)
npm run cert:generate  # Generate certificates
npm run start:https
# Access: https://localhost:3000
```

### Employee Portal Access

**URL**: `http://localhost:3000/employee-portal`

**Employee Credentials**:
- Username: `employee001`
- Password: `SecureBank2024!`
- Role: Staff (Jane Smith)

---

## Core Security Features

### 1. Defense-in-Depth Input Protection (5 Layers)

**Layer 1: Regex Whitelist Validation**
- Blocks malformed input before processing
- Pre-defined safe patterns for all input types
- Prevents ReDoS attacks with bounded quantifiers

**Layer 2: Enhanced Input Sanitization**
- XSS and NoSQL injection protection
- Recursive sanitization with depth limiting
- HTML entity encoding
- MongoDB injection prevention

**Layer 3: Legacy Sanitization**
- Backup safety net
- Removes script tags and dangerous protocols
- Blocks eval() and expression() calls

**Layer 4: Security Headers**
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block

**Layer 5: Rate Limiting**
- Detects and warns about abuse
- Logs large payloads (>10KB)

### 2. Content Security Policy

**Strict CSP Level 3** with environment awareness:

```javascript
default-src: 'none'              // Deny all by default
script-src: 'self' + nonce       // Nonce-based script execution
style-src: 'self'                // Self-hosted styles
connect-src: 'self'              // Same-origin API calls
frame-ancestors: 'none'          // No iframe embedding
```

**Nonce-Based Execution**: Server generates cryptographic nonce per request

### 3. Rate Limiting (4-Tier System)

**Tier 1: General** - 100 requests/15 min (all endpoints)  
**Tier 2: API** - 100 requests/15 min (API endpoints)  
**Tier 3: Authentication** - 5 attempts/15 min (login/register)  
**Tier 4: Strict** - 3 attempts/hour (sensitive operations)

### 4. Encryption & Cryptography

**A. Transport Layer Security**
- TLS/SSL for all data in transit
- Auto-generated certificates

**B. Application Layer Encryption**

**AES-256-CBC for PII**
- 256-bit key encryption for ID numbers
- Automatic encryption/decryption via Mongoose

**Hybrid Encryption (RSA + AES-256-GCM)**
- RSA-OAEP + AES-256-GCM
- Forward secrecy through session keys
- Authenticated encryption

**Password Hashing (bcrypt)**
- Salt rounds: 12
- Resistant to rainbow tables
- Min 8 chars with complexity requirements

### 5. Authentication & Authorization

**Multi-Method Authentication**:
- **JWT**: 15-min access, 7-day refresh
- **Session-Based**: Server-side with httpOnly cookies
- **Hybrid Strategy**: JWT first, session fallback

**Security Features**:
- httpOnly cookies (XSS protection)
- sameSite: 'strict' (CSRF protection)
- Session regeneration on login
- 15-minute timeout

**Role-Based Access Control**: customer, staff, admin

### 6. CSRF Protection

- Per-session CSRF tokens
- Required for POST/PUT/DELETE
- Multiple header support
- Custom error handling

### 7. Database Security

- **Parameterized Queries**: Mongoose ORM prevents injection
- **Field Encryption**: ID numbers encrypted at rest
- **Connection Security**: Environment variables, graceful shutdown
- **Schema Validation**: Mongoose constraints

---

## OWASP Top 10 Protection

| Vulnerability | Protection |
|--------------|------------|
| A01: Broken Access Control | RBAC, JWT + Session auth |
| A02: Cryptographic Failures | TLS/SSL, AES-256, bcrypt |
| A03: Injection | Parameterized queries, 5-layer sanitization |
| A04: Insecure Design | Defense-in-depth architecture |
| A05: Security Misconfiguration | Helmet.js, strict CSP |
| A06: Vulnerable Components | npm audit, ESLint security plugin |
| A07: Authentication Failures | MFA-ready, rate limiting, session timeout |
| A08: Data Integrity Failures | Input validation, CSRF protection |
| A09: Logging Failures | Comprehensive security event logging |
| A10: SSRF | Whitelist for origins, no external URL processing |

---

## API Endpoints

### User Management
- `POST /api/users/register` - User registration
- `POST /api/users/login` - Authentication
- `POST /api/users/logout` - Logout
- `POST /api/users/refresh` - Refresh token
- `GET /api/users/session` - Session status

### Payment Processing
- `POST /api/payments/process` - Process payment
- `GET /api/payments/history` - Payment history
- `GET /api/payments/stats` - Statistics

### Staff Management
- `POST /api/staff/login` - Staff authentication
- `GET /api/staff/payments` - View all payments
- `POST /api/staff/payments/:id/verify` - Verify payment

### International Payments
- `POST /api/international-payments/create` - Create payment
- `POST /api/international-payments/:id/submit` - Submit for review
- `POST /api/international-payments/:id/approve` - Approve payment
- `GET /api/international-payments/pending/approvals` - Pending payments

---

## Security Testing

### Automated Testing

```bash
# Linting
npm run lint
npm run lint:security

# Dependency audit
npm audit --audit-level=high

# Health check
npm run health
```

### Recommended Tools
- OWASP ZAP - Web vulnerability scanner
- Burp Suite - Security testing
- npm audit - Dependency scanning
- Snyk - Vulnerability scanning

---

## Environment Configuration

```bash
# Database
MONGODB_URI=mongodb+srv://...

# Encryption Keys
ENCRYPTION_KEY=<32-character-key>     # AES-256
ENCRYPTION_IV=<16-character-iv>       # AES IV

# Session & JWT
SESSION_SECRET=<random-secret>
JWT_SECRET=<random-secret>

# Test Credentials (Dev Only)
TEST_EMPLOYEE_USERNAME=employee001
TEST_EMPLOYEE_PASSWORD=SecureBank2024!

# Server
NODE_ENV=production|development
PORT=3000
```

---

## Production Deployment Considerations

### Current Implementation (Academic/Demo)
- Public URL access
- Session-based authentication
- 15-minute timeout
- Rate limiting
- CSRF protection

### Production Banking Requirements

**1. Infrastructure Separation**
- Separate domains for customer/employee/admin portals
- Different SSL certificates
- Isolated sessions

**2. Network Security**
- VPN-only access for employee portal
- IP whitelisting
- Geo-location restrictions

**3. Multi-Factor Authentication**
- TOTP (Google Authenticator)
- SMS/Email OTP
- Hardware tokens (YubiKey)
- Biometric verification

**4. Single Sign-On**
- Azure AD, Okta integration
- SAML 2.0 / OAuth 2.0
- Centralized user management

**5. Zero Trust Architecture**
- Continuous validation
- Device fingerprinting
- Behavioral analytics
- Risk scoring

**6. Enhanced Audit**
- Immutable audit logs
- SIEM integration
- Compliance reporting (PCI DSS, SOC 2)

---

## Contributing

### Security Requirements

**Pre-Commit Checklist**:
```bash
npm run lint:security          # Security linting
npm audit --audit-level=high   # Vulnerability scan
```

**Mandatory Standards**:
- Never commit secrets or API keys
- Validate all user inputs server-side
- Use parameterized queries only
- Implement rate limiting on new endpoints
- Hash passwords with bcrypt (12+ rounds)
- Apply CSRF protection to state-changing operations
- Log security events appropriately

### Pull Request Guidelines

1. Descriptive title following conventional commits
2. Include security impact assessment
3. Test both HTTP and HTTPS modes
4. Document breaking changes
5. Run full security test suite

---

## Documentation

- **[SECURITY.md](SECURITY.md)** - Security policies and vulnerability reporting
- **[ENCRYPTION_SETUP.md](ENCRYPTION_SETUP.md)** - Encryption configuration guide
- Inline code documentation throughout codebase

---

## License

MIT License - See [LICENSE](LICENSE) for details
