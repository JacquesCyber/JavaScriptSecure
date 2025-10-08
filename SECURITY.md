# Security Policy

## Security Standards

This project maintains the following security standards:

### ❌ **Blocking Vulnerabilities (CI/CD Fails)**
- **Critical**: CVSS 9.0-10.0 - Immediate security risk
- **High**: CVSS 7.0-8.9 - Significant security risk  
- **Medium**: CVSS 4.0-6.9 - Moderate security risk

### ⚠️ **Non-Blocking Vulnerabilities (CI/CD Warns)**
- **Low**: CVSS 0.1-3.9 - Informational/best practice issues

### ✅ **Security Tools Used**
- OWASP ZAP for security scanning
- ESLint security rules
- Helmet.js for security headers
- Express validator for input validation
- MongoDB parameterized queries

## Security Features

- **Content Security Policy (CSP)** with nonce-based script execution
- **HTTPS encryption** with HSTS
- **Input validation** and sanitization
- **Hybrid encryption** for sensitive data storage
- **Rate limiting** protection
- **Comprehensive security headers**
- **Secret expiration** (24-hour TTL)

## Compliance

This application follows security best practices including:
- OWASP Top 10 protections
- CSP Level 3 implementation
- Secure coding standards
- Regular security testing
