# JavaScript Secure Application

A secure Node.js application demonstrating enterprise-grade security practices including CSP implementation, hybrid encryption, and comprehensive security headers.

## 🛡️ Security Features

- **Content Security Policy (CSP)** with nonce-based script execution
- **Hybrid encryption** for sensitive data storage (RSA + AES)
- **HTTPS enforcement** with HSTS
- **Input validation** and sanitization
- **Rate limiting** protection
- **Comprehensive security headers**
- **Secret expiration** (24-hour TTL)
- **MongoDB parameterized queries**

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and encryption keys

# Start in development mode
npm run dev

# Start in production mode
npm start
```

## 🔒 Security Standards

This project maintains strict security standards:

### ❌ **Blocking Vulnerabilities (CI/CD Fails)**
- **Critical**: CVSS 9.0-10.0
- **High**: CVSS 7.0-8.9  
- **Medium**: CVSS 4.0-6.9

### ⚠️ **Non-Blocking Vulnerabilities (CI/CD Warns)**
- **Low**: CVSS 0.1-3.9

The CI/CD pipeline will **fail** on Medium+ vulnerabilities but **allow** Low vulnerabilities with warnings. This follows security industry best practices.

## 🧪 Security Testing

```bash
# Run security linting
npm run lint:security

# Run dependency audit (fails on high+)
npm audit --audit-level=high

# Manual OWASP ZAP scan
npm run security:scan
```

## 📋 API Endpoints

- `GET /` - Main application page
- `POST /store` - Store encrypted secret
- `GET /secret/:id` - Retrieve and decrypt secret
- `GET /health` - Health check
- `GET /robots.txt` - Robots configuration

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Security**: Helmet.js, CSP, HSTS
- **Encryption**: Node.js crypto (RSA + AES-256-GCM)
- **Validation**: Express-validator

## 📖 Security Documentation

See [SECURITY.md](SECURITY.md) for detailed security policies and vulnerability reporting procedures.

## 🏗️ CI/CD Security Pipeline

The project includes automated security scanning:
- ESLint security rules
- OWASP ZAP baseline scan (fails on Medium+)
- OWASP ZAP full scan (reports all, warns on Low)
- npm audit (fails on High+)

## 🤝 Contributing

Please ensure all security tests pass before submitting a PR. Low priority vulnerabilities are acceptable but should be documented.

## 📄 License

MIT License - See LICENSE file for details.
