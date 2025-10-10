# JavaScript Secure Business Portal

A secure, enterprise-grade Node.js business application featuring multi-page architecture, HTTPS support, and comprehensive security practices. Built with modern ES6 modules and component-based design patterns following **OWASP Top 10** security guidelines.

##  Security Highlights

This application implements **industry-leading security practices**:

-  **5-Layer Defense-in-Depth Input Protection** - Regex validation, sanitization, XSS prevention
-  **Triple Encryption Strategy** - TLS/SSL transport + AES-256 PII + RSA+AES hybrid encryption
-  **4-Tier Rate Limiting** - General, API, Authentication, and Strict limiters
-  **Multi-Method Authentication** - JWT + Session-based with RBAC
-  **Strict CSP Level 3** - Nonce-based script execution, deny-by-default policies
-  **CSRF Protection** - Token validation on all state-changing operations
-  **OWASP Top 10 Compliance** - Addresses all 2021 vulnerabilities
-  **Automated Security Scanning** - ESLint security plugin, npm audit, CI/CD integration

**Security Score**: Comprehensive protection against injection, XSS, CSRF, broken authentication, and more.

##  Architecture Overview

**Enterprise Single-Page Application (SPA)** with server-side security:
- **5 Business Pages**: Register, Login, Customer Dashboard, Payment Processor, Transaction Validator
- **Component-Based Controllers**: Modular ES6 architecture with base PageController class
- **Template System**: External HTML templates with caching and secure serving
- **Configuration Management**: Environment-specific settings with validation
- **Security-First Design**: Defense-in-depth approach with multiple security layers

**Technology Stack**: Node.js 18+ • Express 5.x • MongoDB 8.x • Mongoose • JWT • bcrypt • Helmet • CSRF Protection

---

##  Table of Contents

### Core Documentation
- [Security Highlights](#️-security-highlights)
- [Architecture Overview](#️-architecture-overview)
- [Comprehensive Security Features](#️-comprehensive-security-features)
  - [Defense-in-Depth Input Protection](#1-defense-in-depth-input-protection-5-layers)
  - [Content Security Policy](#2-content-security-policy-csp)
  - [Rate Limiting](#3-rate-limiting-4-tier-system)
  - [Encryption & Cryptography](#4-encryption--cryptography)
  - [Authentication & Authorization](#5-authentication--authorization)
  - [CSRF Protection](#6-csrf-protection)
  - [CORS Configuration](#7-cors-cross-origin-resource-sharing)
  - [Database Security](#8-database-security-mongodb)
  - [Secure HTTP Headers](#9-secure-http-headers-helmetjs)
  - [Payment Security](#10-payment-security)
  - [Security Linting](#11-security-linting--code-analysis)
  - [Logging & Monitoring](#12-logging--monitoring)

### Setup & Usage
- [Key Infrastructure](#-key-infrastructure)
- [Quick Start](#-quick-start)
- [Security Standards & Compliance](#-security-standards--compliance)
- [Security Testing](#-security-testing)

### API & Technical
- [API Endpoints](#-api-endpoints)
- [Technology Stack](#️-technology-stack)
- [Security Documentation](#-security-documentation)
- [CI/CD Security Pipeline](#️-cicd-security-pipeline)

### Contributing
- [Contributing Guidelines](#-contributing)
- [Security Contacts](#-security-contacts)

---

##  Comprehensive Security Features

### 1. **Defense-in-Depth Input Protection (5 Layers)**

Our application implements **5 sequential layers** of input validation and sanitization:

#### Layer 1: Regex Whitelist Validation
- **Purpose**: Blocks malformed input before processing
- **Implementation**: `regexValidator` middleware in `src/middleware/validation.js`
- **Features**:
  - Pre-defined safe regex patterns for all input types (email, phone, username, etc.)
  - Bounded quantifiers prevent ReDoS attacks
  - Field-specific validation rules per endpoint
  - Blocks dangerous patterns (`<script>`, `javascript:`, etc.)
  - Comprehensive logging of validation attempts with IP tracking

#### Layer 2: Enhanced Input Sanitization
- **Purpose**: XSS and NoSQL injection protection
- **Implementation**: `sanitizeInput` middleware in `src/middleware/sanitization.js`
- **Features**:
  - Recursive object sanitization with depth limiting (max 10 levels)
  - HTML entity encoding (converts `<`, `>`, `&`, `"`, `'`, `/`)
  - Whitelist-based key validation (only allowed field names pass through)
  - MongoDB injection prevention (blocks `$` operators and `.` in keys)
  - Array size limiting (max 1000 items) to prevent DoS
  - Automatic injection attempt detection and logging

#### Layer 3: Legacy Sanitization (Backup)
- **Purpose**: Additional safety net for input cleaning
- **Implementation**: Secondary `sanitizeInput` in `src/middleware/validation.js`
- **Features**:
  - Removes script tags, javascript: protocols, event handlers
  - Strips dangerous protocols (data:, vbscript:)
  - Blocks eval() and expression() calls
  - Whitelist enforcement for object keys

#### Layer 4: Additional Security Headers
- **Purpose**: Browser-level security enforcement
- **Implementation**: `cspSanitize` middleware
- **Headers Set**:
  - `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
  - `X-Frame-Options: DENY` - Clickjacking protection
  - `X-XSS-Protection: 1; mode=block` - XSS filter activation

#### Layer 5: Sanitization Rate Limiting
- **Purpose**: Detect and warn about abuse
- **Implementation**: `sanitizationLimiter` middleware
- **Features**: Logs warnings for payloads > 10KB

### 2. **Content Security Policy (CSP)**

**Strict CSP Level 3 Implementation** with environment awareness:

#### CSP Directives
```javascript
default-src: 'none'              // Deny all by default
script-src: 'self' + nonce       // Only self-hosted scripts with server-generated nonce
style-src: 'self' + trusted CDNs // Styles from self and Google Fonts
img-src: 'self' data:            // Images from self or data URIs
connect-src: 'self'              // API calls to same origin only
frame-ancestors: 'none'          // Cannot be embedded in frames
object-src: 'none'               // No plugins (Flash, etc.)
```

#### Nonce-Based Script Execution
- **How it works**: Server generates cryptographically random nonce for each request
- **Implementation**: `crypto.randomBytes(16).toString('base64')` per request
- **Protection**: Only scripts with matching nonce can execute (prevents XSS)
- **Location**: `src/middleware/security.js`

#### Environment-Specific CSP
- **Production**: Enforces HTTPS upgrade and blocks mixed content
- **Development**: Allows HTTP to prevent Safari SSL issues with self-signed certs

### 3. **Rate Limiting (4-Tier System)**

#### Tier 1: General Rate Limiter
- **Limit**: 100 requests per 15 minutes per IP
- **Scope**: All endpoints (except /health)
- **Purpose**: Prevent general abuse and DoS attacks

#### Tier 2: API Rate Limiter
- **Limit**: 100 API requests per 15 minutes per IP
- **Scope**: All `/api/*` endpoints
- **Purpose**: Protect backend resources

#### Tier 3: Authentication Rate Limiter
- **Limit**: 5 attempts per 15 minutes per IP
- **Scope**: Login/register endpoints
- **Special**: Only counts failed attempts (skipSuccessfulRequests: true)
- **Purpose**: Prevent brute-force credential attacks
- **Response**: Returns retry-after timestamp

#### Tier 4: Strict Rate Limiter
- **Limit**: 3 attempts per hour per IP
- **Scope**: Sensitive operations (password reset, account recovery)
- **Purpose**: Maximum protection for critical operations

**All rate limiters include**:
- Standard rate limit headers (RateLimit-*)
- IP-based tracking with console warnings
- Custom error messages with retry timing

### 4. **Encryption & Cryptography**

#### Dual-Layer Encryption Architecture

**A. Transport Layer Security (TLS/SSL)**
- **Certificate**: `keys/cert.pem` - SSL certificate for HTTPS
- **Private Key**: `keys/key.pem` - SSL private key
- **Purpose**: Encrypts all data in transit between browser and server
- **Generation**: Auto-generated via `npm run cert:generate`

**B. Application Layer Encryption**

##### 1. AES-256-CBC for PII (ID Numbers)
- **Algorithm**: AES-256-CBC with PKCS7 padding
- **Key Size**: 256-bit (32 characters)
- **IV**: 128-bit (16 characters) from environment
- **Implementation**: `src/utils/encryption.js`
- **Use Case**: Encrypts South African ID numbers at rest
- **Features**:
  - Automatic encryption on save via Mongoose setters
  - Automatic decryption on retrieval via Mongoose getters
  - Format validation before encryption (13 digits)
  - Detects already-encrypted values (prevents double encryption)

##### 2. Hybrid Encryption (RSA + AES-256-GCM)
- **Algorithm**: RSA-OAEP + AES-256-GCM
- **Implementation**: `src/utils/crypto.js`
- **How it works**:
  1. Generate random AES-256 key and IV
  2. Encrypt data with AES-256-GCM
  3. Encrypt AES key and IV with RSA public key
  4. Store encrypted data + encrypted key + encrypted IV + auth tag
- **Decryption**: Uses RSA private key to decrypt AES key, then decrypts data
- **Use Case**: Secret storage with 24-hour TTL
- **Security Benefits**:
  - Authenticated encryption (GCM provides integrity)
  - Forward secrecy through session keys
  - No key reuse (new AES key per operation)

##### 3. Password Hashing (bcrypt)
- **Algorithm**: bcrypt with salt rounds = 12
- **Implementation**: `src/services/user.js`
- **Security Features**:
  - Adaptive hashing (computationally expensive)
  - Built-in salt (unique per password)
  - Resistant to rainbow tables and brute force
  - Password requirements: min 8 chars, uppercase, lowercase, number

### 5. **Authentication & Authorization**

#### Multi-Method Authentication System

##### A. JWT (JSON Web Tokens)
- **Access Token**: 15-minute lifetime
- **Refresh Token**: 7-day lifetime
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Payload**:
  - userId, email, role, sessionId
  - Issuer: 'JavaScriptSecure'
  - Audience: 'secure-portal-users'
- **Storage**: HTTP-only cookies (XSS protection)
- **Extraction**: Supports Authorization header (Bearer) or cookies

##### B. Session-Based Authentication
- **Storage**: Server-side session with express-session
- **Session ID**: Cryptographically random (32 bytes hex)
- **Cookie Settings**:
  - `httpOnly: true` - No JavaScript access (XSS protection)
  - `secure: true` - HTTPS only in production
  - `sameSite: 'strict'` - CSRF protection
  - `maxAge: 15 minutes` - Auto-expiry
- **Features**:
  - Session regeneration on login (prevents session fixation)
  - Activity tracking (last activity timestamp)
  - Timeout after 15 minutes of inactivity
  - Secure session destruction on logout

##### C. Hybrid Authentication
- **Strategy**: Try JWT first, fallback to session
- **Implementation**: `authenticate` middleware in `src/middleware/auth.js`
- **Benefits**: Flexibility for both stateless and stateful flows

#### Role-Based Access Control (RBAC)
- **Roles**: customer, staff, admin
- **Implementation**: `authorize` middleware
- **Features**:
  - Configurable allowed roles per route
  - Detailed permission denial responses
  - Automatic role extraction from JWT/session

### 6. **CSRF Protection**

- **Library**: csurf (industry standard)
- **Token Generation**: Per-session CSRF tokens
- **Validation**: Required for state-changing operations (POST/PUT/DELETE)
- **Implementation**: `src/app.js` line 80
- **Headers Accepted**:
  - `csrf-token`
  - `x-csrf-token`
  - `xsrf-token`
  - `x-xsrf-token`
- **Error Handling**: Custom 403 response with detailed logging

### 7. **CORS (Cross-Origin Resource Sharing)**

**Strict Origin Whitelisting**:
```javascript
Allowed Origins: ['http://localhost:3000']
Credentials: true (cookies allowed)
Methods: GET, POST, PUT, DELETE, OPTIONS
Headers: Content-Type, Authorization, CSRF tokens
```

**Security Features**:
- Dynamic origin checking (no wildcards)
- Requests without origin allowed (mobile apps, curl)
- Disallowed origins fail silently (no 500 errors)
- Cookie sharing enabled for authenticated requests

### 8. **Database Security (MongoDB)**

#### Parameterized Queries
- **ORM**: Mongoose (prevents NoSQL injection)
- **No String Concatenation**: All queries use object notation
- **Example**: `User.findOne({ username: username.toLowerCase() })`

#### Field Encryption at Rest
- **Encrypted Fields**: idNumber (South African ID)
- **Method**: Transparent via Mongoose getters/setters
- **Uniqueness**: Maintained on encrypted values

#### Connection Security
- **URI Storage**: Environment variable (not in code)
- **Error Handling**: Graceful degradation if DB unavailable
- **Connection Events**: Monitoring for errors/disconnects
- **Graceful Shutdown**: Closes connections on SIGINT

#### Data Validation
- **Schema Validation**: Mongoose schema constraints
- **Unique Constraints**: email, username, idNumber, accountNumber
- **Format Validation**: Regex patterns for account numbers, bank codes, etc.

### 9. **Secure HTTP Headers (Helmet.js)**

**Headers Applied**:
```
Strict-Transport-Security: max-age=31536000 (1 year, production only)
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Cache-Control: no-store, no-cache, must-revalidate, private
Pragma: no-cache
Expires: 0
```

**HSTS (HTTP Strict Transport Security)**:
- **Production**: Enforced with 1-year max-age + includeSubDomains
- **Development**: Disabled (prevents SSL issues with self-signed certs)

### 10. **Payment Security**

#### Comprehensive Payment Validation
- **Amount Validation**: Range $0.01 - $1,000,000
- **Currency Whitelist**: 12 supported currencies (ZAR, USD, EUR, etc.)
- **Payment Methods**: Card, PayPal, Bank Transfer, SWIFT, EFT

#### Method-Specific Validation

**Credit Card**:
- Last 4 digits format (4 digits only)
- Expiry validation (month 1-12, year 2020-2099)
- Real-time expiration checking
- Brand validation (Visa, Mastercard, Amex, Discover)

**Bank Transfer/EFT**:
- Bank code format (6 digits)
- Branch code format (6 digits)
- Account number (10-12 digits)

**SWIFT Payments**:
- SWIFT code validation (8-11 alphanumeric)
- IBAN-style beneficiary account (8-34 chars)
- Beneficiary name and bank details required

#### Security Features
- No storage of full card numbers or CVV
- IP address and User-Agent tracking per transaction
- Rate limiting on payment endpoints (authLimiter)
- Comprehensive validation error messages

### 11. **Security Linting & Code Analysis**

**ESLint Security Plugin** (`eslint-plugin-security`):
```javascript
Enforced Rules:
 detect-buffer-noassert (error)
 detect-child-process (error)
 detect-disable-mustache-escape (error)
 detect-eval-with-expression (error)
 detect-new-buffer (error)
 detect-no-csrf-before-method-override (error)
 detect-non-literal-regexp (error)
 detect-object-injection (error)
 detect-possible-timing-attacks (error)
 detect-pseudoRandomBytes (error)
 detect-unsafe-regex (error)
```

**CI/CD Security Pipeline**:
- Pre-commit security linting
- Dependency vulnerability scanning (npm audit)
- Fails on Medium+ vulnerabilities (CVSS 4.0+)
- Warns on Low vulnerabilities (CVSS 0.1-3.9)

### 12. **Logging & Monitoring**

**Security Event Logging**:
- Request logging with timestamp, method, URL, IP
- Validation failure logging with error details
- Rate limit exceeded warnings with IP
- CSRF token failures with header analysis
- Authentication failures
- Injection attempt detection and blocking alerts

**Log Format**:
```
 Success: Green checkmark with timestamp
 Warning: Yellow warning with details  
 Error: Red X with error context
 Security: Alert emoji for security events
```

##  Key Infrastructure

This application uses **dual-layer encryption** for maximum security:

### SSL/TLS Keys (Transport Security)
- `keys/cert.pem` - SSL certificate for HTTPS connections
- `keys/key.pem` - SSL private key for browser-to-server encryption

### RSA Keys (Application Security)  
- `keys/private.pem` - RSA private key for hybrid data encryption (RSA-OAEP)
- `keys/public.pem` - RSA public key for hybrid data encryption (RSA-OAEP)

### Environment Variables
- `ENCRYPTION_KEY` - 256-bit AES key for ID number encryption (32 characters)
- `ENCRYPTION_IV` - 128-bit IV for AES encryption (16 characters)
- `SESSION_SECRET` - Secret for session cookie signing
- `JWT_SECRET` - Secret for JWT token signing (auto-generated if not set)
- `MONGODB_URI` - MongoDB connection string

**Generation:** SSL/TLS and RSA keys are automatically created with `npm run cert:generate`  
**AES Keys:** Generate with `openssl rand -base64 32` (see `ENCRYPTION_SETUP.md`)

##  Quick Start
##  Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account or local MongoDB instance
- macOS/Linux (for certificate generation)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd JavaScriptSecure

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and encryption keys
```

### Development Setup

#### HTTP Development (Recommended for daily work)
```bash
npm run dev          # HTTP with auto-restart (nodemon)
# Access: http://localhost:3000
```

#### HTTPS Development (For production-like testing)
```bash
# Generate all required keys and certificates
npm run cert:generate

# Start HTTPS server
npm run start:https  # HTTPS with trusted certificate
# Access: https://localhost:3000
```

**Note:** The certificate generator creates both SSL certificates (for HTTPS) and RSA keys (for data encryption).

### Production Deployment
```bash
npm run start        # HTTP production
npm run prod         # HTTPS production (requires certificates)
```

##  Security Standards & Compliance

This project maintains strict security standards aligned with industry best practices:

###  **Blocking Vulnerabilities (CI/CD Fails)**
- **Critical**: CVSS 9.0-10.0 - Immediate security risk requiring immediate action
- **High**: CVSS 7.0-8.9 - Significant security risk requiring prompt remediation
- **Medium**: CVSS 4.0-6.9 - Moderate security risk requiring planned remediation

###  **Non-Blocking Vulnerabilities (CI/CD Warns)**
- **Low**: CVSS 0.1-3.9 - Informational or best practice issues

The CI/CD pipeline will **fail** on Medium+ vulnerabilities but **allow** Low vulnerabilities with warnings. This follows security industry best practices and aligns with NIST guidelines.

### OWASP Top 10 Protection

Our security implementation addresses all OWASP Top 10 2021 vulnerabilities:

1. **A01: Broken Access Control** 
   - Role-based access control (RBAC)
   - JWT + Session authentication
   - Authorization middleware on protected routes

2. **A02: Cryptographic Failures** 
   - TLS/SSL for data in transit
   - AES-256-CBC/GCM for data at rest
   - bcrypt for password hashing
   - Proper key management (environment variables)

3. **A03: Injection** 
   - Mongoose parameterized queries (NoSQL injection protection)
   - 5-layer input sanitization
   - Regex whitelist validation
   - MongoDB operator blocking (`$`, `.`)

4. **A04: Insecure Design** 
   - Defense-in-depth architecture
   - Security-first design patterns
   - Fail-secure defaults
   - Rate limiting on all endpoints

5. **A05: Security Misconfiguration** 
   - Helmet.js security headers
   - Environment-specific configurations
   - CSP Level 3 implementation
   - Disabled unnecessary features

6. **A06: Vulnerable and Outdated Components** 
   - Regular dependency updates
   - npm audit in CI/CD pipeline
   - ESLint security plugin
   - Version pinning in package.json

7. **A07: Identification and Authentication Failures** 
   - Multi-factor authentication ready
   - Session timeout (15 minutes)
   - Brute-force protection (rate limiting)
   - Secure password requirements
   - Session regeneration on login

8. **A08: Software and Data Integrity Failures** 
   - Input validation before processing
   - Authenticated encryption (AES-GCM)
   - CSRF protection
   - Subresource Integrity (SRI) ready

9. **A09: Security Logging and Monitoring Failures** 
   - Comprehensive security event logging
   - IP tracking on all requests
   - Failed authentication logging
   - Injection attempt detection logs

10. **A10: Server-Side Request Forgery (SSRF)** 
    - No external URL processing from user input
    - Whitelist for allowed origins (CORS)
    - URL validation where applicable

##  Security Testing

### Automated Security Testing

```bash
# Run general code linting
npm run lint

# Run security-specific linting (ESLint security plugin)
npm run lint:security

# Run dependency audit (fails on high+ vulnerabilities)
npm audit --audit-level=high

# Check for all vulnerabilities including low
npm audit

# Test server health
npm run health
```

### Manual Security Testing

**Recommended Tools**:
- **OWASP ZAP** - Web application security scanner
- **Burp Suite** - Web vulnerability scanner
- **npm audit** - Dependency vulnerability scanner
- **Snyk** - Security vulnerability scanning
- **SonarQube** - Code quality and security analysis

**Security Test Coverage**:
-  SQL/NoSQL injection attempts
-  XSS payload injection
-  CSRF token validation
-  Rate limiting enforcement
-  Authentication bypass attempts
-  Authorization escalation tests
-  Session management security
-  Input validation boundaries

##  API Endpoints

### Frontend Pages (SPA)
All pages served with CSP headers and nonce-based script execution:

- `GET /` - Main business portal (SPA entry point)
  - **Security**: CSP headers, HTTPS redirect in production
  
### User Management API
- `POST /api/users/register` - User registration
  - **Security**: Rate limited (5/15min), input validation, password hashing
  - **Validation**: Email, username, ID number, account number, bank details
  
- `POST /api/users/login` - User authentication
  - **Security**: Rate limited (5/15min), brute-force protection
  - **Returns**: JWT tokens in HTTP-only cookies
  
- `POST /api/users/logout` - User logout
  - **Security**: Authenticated route, session destruction
  
- `POST /api/users/refresh` - Refresh access token
  - **Security**: Validates refresh token, issues new access token
  
- `GET /api/users/session` - Check session status
  - **Security**: Authenticated route, returns user info
  
- `GET /api/users/stats` - User statistics
  - **Security**: Public endpoint (consider protecting in production)

### Payment Processing API
- `POST /api/payments/process` - Process payment
  - **Security**: Rate limited, comprehensive payment validation
  - **Tracking**: IP address and User-Agent logging
  - **Validation**: Amount, currency, payment method details
  
- `GET /api/payments/history` - Payment history
  - **Security**: Authenticated route, user-specific data
  
- `GET /api/payments/stats` - Payment statistics
  - **Security**: Authenticated route

### Staff Management API
- `POST /api/staff/login` - Staff authentication
  - **Security**: Rate limited, role-based access
  
- `GET /api/staff/payments` - View all payments
  - **Security**: Staff/admin only (RBAC)
  
- `POST /api/staff/payments/:id/verify` - Verify payment
  - **Security**: Staff/admin only (RBAC)

### Secret Storage API (Demo Feature)
- `POST /store` - Store encrypted secret
  - **Security**: Hybrid encryption (RSA + AES-256-GCM)
  - **Expiry**: Automatic 24-hour TTL
  
- `GET /secret/:id` - Retrieve and decrypt secret
  - **Security**: ID validation, auto-delete after retrieval

### Health & Monitoring
- `GET /health` - Health check endpoint
  - **Security**: Public, excluded from rate limiting
  - **Returns**: Server status and uptime
  
- `GET /status` - System status
  - **Security**: Public (consider protecting in production)
  - **Returns**: Database connection status, user stats

### Static Assets
All static assets served with security headers:

- `GET /templates/:page` - HTML templates
  - **Security**: Path validation, no directory traversal
  
- `GET /js/controllers.js` - Page controllers (ES6 modules)
  - **Security**: Served with correct MIME type
  
- `GET /js/config.js` - Application configuration
  - **Security**: Environment-specific config, no secrets
  
- `GET /css/*` - Stylesheets
  - **Security**: CSP-compliant, served from self

### Security Headers Applied to All Routes
```
Content-Security-Policy: (strict CSP with nonces)
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000 (production only)
```

##  Technology Stack

### Backend Security Stack

**Core Framework**:
- **Node.js** v18+ with Express.js 5.x
- **ES6 Modules** (type: module) for modern JavaScript

**Database & ORM**:
- **MongoDB** 8.x with Mongoose ODM
- Parameterized queries (NoSQL injection protection)
- Schema validation and constraints
- Automatic connection management

**Security Middleware**:
- **helmet** (v8.1.0) - Security headers
- **express-rate-limit** (v8.1.0) - Rate limiting
- **csurf** (v1.11.0) - CSRF protection
- **cors** (v2.8.5) - CORS management
- **express-mongo-sanitize** (v2.2.0) - MongoDB injection prevention
- **express-validator** (v7.2.1) - Input validation
- **cookie-parser** (v1.4.7) - Secure cookie handling
- **express-session** (v1.18.2) - Session management

**Cryptography & Authentication**:
- **bcrypt** (v6.0.0) - Password hashing (12 rounds)
- **crypto-js** (v4.2.0) - AES-256-CBC encryption
- **jsonwebtoken** (v9.0.2) - JWT tokens (HS256)
- **Node.js crypto** (built-in) - RSA + AES-256-GCM hybrid encryption
- **lusca** (v1.7.0) - Additional security middleware

**HTTP & Network**:
- **dotenv** (v17.2.1) - Environment configuration
- **node-fetch** (v3.3.2) - HTTP requests

### Frontend Security Stack

**Architecture**:
- **ES6 Modules** with component-based controllers
- **SPA (Single Page Application)** with template system
- **Bootstrap 5** for responsive design

**Security Features**:
- CSP-compliant scripts (nonce-based execution)
- Client-side input validation
- CSRF token management
- XSS prevention (output encoding)
- Secure configuration management

### Development & Testing Tools

**Code Quality**:
- **ESLint** (v9.32.0) with security plugin
  - eslint-plugin-security (v3.0.1)
  - 13 security rules enforced
- **Nodemon** (v3.1.10) - Auto-restart in development

**Security Testing**:
- npm audit (dependency scanning)
- ESLint security rules
- Manual penetration testing support

**Build & Deployment**:
- **cross-env** (v10.1.0) - Cross-platform environment variables
- SSL/TLS certificate generation scripts
- Environment-specific configurations (dev/prod)

### Security Dependencies Summary

```json
"security": {
  "authentication": ["bcrypt", "jsonwebtoken", "express-session"],
  "encryption": ["crypto-js", "Node.js crypto (built-in)"],
  "headers": ["helmet", "cors"],
  "validation": ["express-validator", "express-mongo-sanitize"],
  "protection": ["csurf", "express-rate-limit", "lusca"],
  "linting": ["eslint", "eslint-plugin-security"]
}
```

### Environment Configuration

**Required Environment Variables**:
```bash
# Database
MONGODB_URI=mongodb+srv://...

# Encryption Keys
ENCRYPTION_KEY=<32-character-key>     # AES-256 key
ENCRYPTION_IV=<16-character-iv>       # AES IV

# Session & JWT
SESSION_SECRET=<random-secret>        # Session signing
JWT_SECRET=<random-secret>            # JWT signing (optional, auto-generated)

# Server
NODE_ENV=production|development|test
PORT=3000
```

##  Security Documentation

### Primary Security Resources
- **[SECURITY.md](SECURITY.md)** - Security policies and vulnerability reporting procedures
- **[ENCRYPTION_SETUP.md](ENCRYPTION_SETUP.md)** - Detailed encryption configuration guide
- **Inline Code Documentation** - Security comments throughout codebase

### Security Architecture Principles

**1. Defense in Depth**
- Multiple layers of security controls
- No single point of failure
- Each layer provides independent protection

**2. Fail-Safe Defaults**
- Deny by default, allow by exception
- Secure configurations out of the box
- Explicit security opt-outs required

**3. Least Privilege**
- Minimal permissions by default
- Role-based access control (RBAC)
- Time-limited tokens and sessions

**4. Separation of Concerns**
- Security logic separated from business logic
- Middleware-based security architecture
- Clear security boundaries

**5. Open Design**
- Security through implementation, not obscurity
- Well-documented security measures
- Transparent security practices

### Security Best Practices Implemented

**Input Security**:
```
User Input → Layer 1: Regex Validation → Layer 2: Sanitization → 
Layer 3: Legacy Sanitization → Layer 4: Headers → Layer 5: Rate Limiting → 
Business Logic
```

**Data Flow Security**:
```
Client → TLS/SSL → Rate Limiter → CSRF Check → Authentication → 
Authorization → Input Validation → Business Logic → Encryption → Database
```

**Authentication Flow**:
```
Login Request → Rate Limit Check → Input Validation → 
Database Lookup → Password Verification (bcrypt) → 
Session Creation → JWT Generation → HTTP-only Cookie → Response
```

##  CI/CD Security Pipeline

The project includes automated security scanning:

### Continuous Security Checks
- **ESLint Security Rules** - Static code analysis
- **npm audit** - Dependency vulnerability scanning
  - Fails on High+ vulnerabilities (CVSS 7.0+)
  - Warns on Low vulnerabilities (CVSS 0.1-3.9)
- **Package Lock Analysis** - Ensures deterministic builds

### Recommended CI/CD Integration
```yaml
security-scan:
  steps:
    - npm run lint:security          # Security linting
    - npm audit --audit-level=high   # Dependency check
    - npm run test                   # Application tests
    # Optional: OWASP ZAP, Snyk, or SonarQube integration
```

### Security Scanning Tools Support
- **OWASP ZAP** - Dynamic security testing
  - Baseline scan (fails on Medium+)
  - Full scan (comprehensive analysis)
- **Snyk** - Dependency and container scanning
- **SonarQube** - Code quality and security analysis (sonar-project.properties included)
- **npm audit** - Built-in vulnerability scanning


### Development Workflow

1. **Fork the repository** and create a feature branch
2. **Set up development environment**:
   ```bash
   npm install
   cp .env.example .env
   # Configure your environment variables (see ENCRYPTION_SETUP.md)
   npm run cert:generate  # Generate SSL/TLS and RSA keys
   ```

3. **Follow the development standards**:
   - Use ES6+ syntax and modules
   - Follow the existing component architecture
   - **ALWAYS maintain security best practices**
   - Write descriptive, security-aware commit messages
   - Document any security implications

### Code Style & Standards

#### Backend Development
- **Express Routes**: Place in `src/routes/` with descriptive names
  - Always use validation middleware
  - Apply rate limiting to sensitive endpoints
  - Document security measures in comments
  
- **Services**: Business logic in `src/services/`
  - Separate security logic from business logic
  - Use parameterized queries (no string concatenation)
  - Never log sensitive data
  
- **Middleware**: Security and utility middleware in `src/middleware/`
  - Follow defense-in-depth principle
  - Make middleware reusable and testable
  - Log security events appropriately
  
- **Models**: Mongoose models in `src/models/`
  - Use getters/setters for sensitive fields
  - Implement proper validation
  - Never expose sensitive fields by default

#### Frontend Development
- **Controllers**: Page-specific controllers extending `PageController`
  - Validate input on client-side (UX) and server-side (security)
  - Never trust client-side validation alone
  - Handle CSRF tokens properly
  
- **Templates**: HTML templates in `public/templates/`
  - Never include inline scripts (CSP violation)
  - Use nonce-based execution for necessary scripts
  - Escape all user-generated content
  
- **Styles**: Component-specific CSS in `public/css/`
  - Follow CSP guidelines (no inline styles if possible)
  - Use external stylesheets
  
- **Configuration**: Environment settings in `public/js/config.js`
  - Never include secrets or API keys
  - Use environment detection for settings

#### File Structure
```
src/
├── app.js              # Express app configuration
├── server.js           # Server startup and HTTPS setup
├── routes/             # API and static routes
├── middleware/         # Security and utility middleware
├── services/           # Business logic
└── utils/              # Utility functions

public/
├── index.html          # Main SPA entry point
├── templates/          # Page templates
├── js/
│   ├── app.js          # Main SPA application
│   ├── controllers.js  # Page controllers
│   └── config.js       # Client configuration
└── css/                # Stylesheets
```

### Security Requirements

####  **Required Security Checks Before Every Commit**
```bash
# 1. Run linting checks
npm run lint                    # General ESLint rules
npm run lint:security          # Security-specific ESLint rules (13 rules)

# 2. Dependency vulnerability scan
npm audit --audit-level=high   # Fails on High+ vulnerabilities

# 3. Optional but recommended
npm audit                      # Check all vulnerabilities including Low
npm run test                   # Run application tests (if available)
```

####  **Mandatory Security Standards**

**1. Secrets Management**
-  **NEVER** commit secrets, API keys, or passwords to code
-  Use environment variables (`.env` file, not committed)
-  Document required env vars in `.env.example`
-  Use different secrets for dev/staging/production

**2. Input Validation & Sanitization**
-  Validate **all** user inputs on server-side
-  Use express-validator for validation rules
-  Apply sanitization middleware before business logic
-  Never trust client-side validation alone
-  Use whitelist approach (allow known good, deny rest)

**3. Injection Prevention**
-  Use Mongoose parameterized queries (no string concatenation)
-  Block MongoDB operators (`$`, `.`) in user input
-  Validate and sanitize before database operations
-  Use regex patterns with bounded quantifiers (prevent ReDoS)

**4. XSS Prevention**
-  HTML entity encoding for all user-generated content
-  Use CSP headers with nonce-based execution
-  Never use `innerHTML` or `eval()` with user input
-  Sanitize output when rendering to HTML

**5. Authentication & Authorization**
-  Hash passwords with bcrypt (12+ rounds)
-  Implement rate limiting on auth endpoints
-  Use JWT with reasonable expiry times (15 min access, 7 day refresh)
-  Store tokens in HTTP-only cookies
-  Implement RBAC for protected resources
-  Regenerate session IDs on login

**6. CSRF Protection**
-  Use CSRF tokens for state-changing operations
-  alidate CSRF tokens on POST/PUT/DELETE/PATCH
-  Use SameSite cookies (`strict` or `lax`)

**7. Error Handling**
-  Never expose stack traces to clients in production
-  Log errors securely (no sensitive data in logs)
-  Return generic error messages to users
-  Log detailed errors server-side only

**8. Data Protection**
-  Encrypt PII at rest (use AES-256)
-  Use HTTPS/TLS for data in transit
-  Never log sensitive data (passwords, tokens, PII)
-  Implement secure session management

**9. Rate Limiting**
-  Apply rate limiting to all endpoints
-  Use stricter limits for auth endpoints (5/15min)
-  Use strict limits for sensitive operations (3/hour)
-  Log rate limit violations

**10 Secure Dependencies**
-  Keep dependencies up to date
-  Run `npm audit` regularly
-  Review security advisories
-  Use pinned versions in production

### Testing & Quality Assurance

#### Pre-Commit Checklist
- [ ] All security linting passes (`npm run lint:security`)
- [ ] No high/critical vulnerabilities (`npm audit`)
- [ ] Code follows existing patterns
- [ ] Environment variables documented
- [ ] HTTPS testing completed (if applicable)

#### Manual Testing
```bash
# Test HTTP development server
npm run dev
# Visit: http://localhost:3000

# Test HTTPS with certificates
./generate-cert.sh
npm run start:https
# Visit: https://localhost:3000
```

### SSL Certificate Development

For HTTPS testing, the project includes an automated certificate generator:

```bash
# Generate development certificate
npm run cert:generate

# Trust certificate in macOS (optional)
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain keys/cert.pem
```

### Pull Request Guidelines

1. **Create descriptive PR title** following conventional commits:
   - `feat(security): Add MFA support`
   - `fix(auth): Prevent session fixation vulnerability`
   - `docs(readme): Update security documentation`

2. **Include security impact assessment** in PR description:
   ```markdown
   ## Security Impact
   - [ ] No security impact
   - [ ] Fixes security vulnerability (describe)
   - [ ] Adds new security feature (describe)
   - [ ] Changes authentication/authorization (describe)
   ```

3. **Test both HTTP and HTTPS modes** before submitting:
   ```bash
   npm run dev        # Test HTTP mode
   npm run dev:https  # Test HTTPS mode
   ```

4. **Document any breaking changes** or new environment variables

5. **Run full security test suite**:
   ```bash
   npm run lint
   npm run lint:security
   npm audit --audit-level=moderate
   # Optional: Manual security testing with OWASP ZAP or Burp Suite
   ```

6. **Code review requirements**:
   - All security-critical changes require 2+ approvals
   - Security team review for authentication/encryption changes
   - Performance impact assessment for middleware changes

### Issue Reporting

- **Security vulnerabilities**: Follow [SECURITY.md](SECURITY.md) for responsible disclosure
  - Use private security advisories (GitHub)
  - Provide CVE if applicable
  - Include proof of concept (if safe)
  
- **Bugs**: Include reproduction steps and environment details
  - Node.js version
  - MongoDB version
  - Environment (dev/staging/prod)
  - Steps to reproduce
  - Expected vs actual behavior
  
- **Features**: Discuss security implications and architectural fit
  - Security impact assessment
  - Performance considerations
  - Backward compatibility
  
- **Documentation**: Help improve setup and contributor experience
  - Clarity improvements
  - Security documentation updates
  - Setup instructions

### Environment Variables

When adding new environment variables:
1. **Add to `.env.example`** with descriptive comments:
   ```bash
   # Description of what this variable does
   # Example: FEATURE_FLAG=true
   NEW_VARIABLE=default_value
   ```

2. **Update README** with variable documentation in Environment Configuration section

3. **Add validation** in configuration files:
   ```javascript
   if (!process.env.NEW_VARIABLE) {
     throw new Error('NEW_VARIABLE is required');
   }
   ```

4. **Consider security implications**:
   - Is this a secret? Use secure storage
   - Should this be encrypted? Use encryption
   - Does this affect authentication? Add to security docs




