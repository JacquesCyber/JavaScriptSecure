# JavaScript Secure Business Portal

A secure, enterprise-grade Node.js business application featuring multi-page architecture, HTTPS support, and comprehensive security practices. Built with modern ES6 modules and component-based design patterns.

## �️ Architecture Overview

**Enterprise Single-Page Application (SPA)** with server-side security:
- **5 Business Pages**: Register, Login, Customer Dashboard, Payment Processor, Transaction Validator
- **Component-Based Controllers**: Modular ES6 architecture with base PageController class
- **Template System**: External HTML templates with caching and secure serving
- **Configuration Management**: Environment-specific settings with validation
- **Security-First Design**: CSP, HTTPS, rate limiting, input validation

## 🛡️ Security Features

- **Content Security Policy (CSP)** with nonce-based script execution
- **HTTPS with trusted certificates** (auto-generated for development)
- **Hybrid encryption** for sensitive data storage (RSA + AES)
- **Input validation** and sanitization with shake animations for errors
- **Rate limiting** protection
- **Comprehensive security headers** (Helmet.js)
- **Secret expiration** (24-hour TTL)
- **MongoDB parameterized queries**
- **ES6 module security** with whitelist validation

## � Key Infrastructure

This application uses **dual-layer encryption** for maximum security:

### SSL/TLS Keys (Transport Security)
- `keys/cert.pem` - SSL certificate for HTTPS connections
- `keys/key.pem` - SSL private key for browser-to-server encryption

### RSA Keys (Application Security)  
- `keys/private.pem` - RSA private key for hybrid data encryption
- `keys/public.pem` - RSA public key for hybrid data encryption

**Generation:** Both key sets are automatically created with `npm run cert:generate`

## �🚀 Quick Start

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
npx eslint . --config eslint.config.security.js

# Run dependency audit (fails on high+)
npm audit --audit-level=high

# Manual OWASP ZAP scan
npm run security:scan
```

## 📋 API Endpoints

### Frontend Pages
- `GET /` - Main business portal (loads SPA)
- **Register** - User registration page
- **Login** - User authentication page  
- **Dashboard** - Customer dashboard
- **Payment** - Payment processor
- **Validator** - Transaction validator

### API Routes
- `POST /store` - Store encrypted secret
- `GET /secret/:id` - Retrieve and decrypt secret
- `GET /health` - Health check
- `GET /status` - System status with database stats
- `GET /robots.txt` - Robots configuration

### Static Assets
- `GET /templates/:page` - HTML templates (secure serving)
- `GET /js/controllers.js` - Page controllers (ES6 modules)
- `GET /js/config.js` - Application configuration
- `GET /css/*` - Stylesheets (Bootstrap + custom)

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Security**: Helmet.js, CSP, HSTS, Rate Limiting
- **Encryption**: Node.js crypto (RSA + AES-256-GCM)
- **Validation**: Express-validator

### Frontend
- **ES6 Modules** with component architecture
- **Bootstrap 5** for responsive design
- **Template System** with caching
- **Configuration Management** with environment detection
- **Client-side Validation** with visual feedback

### Development Tools
- **ESLint** with security rules
- **Nodemon** for auto-restart
- **SSL Certificate Generation** script
- **Environment-specific** configurations

## 📖 Security Documentation

See [SECURITY.md](SECURITY.md) for detailed security policies and vulnerability reporting procedures.

## 🏗️ CI/CD Security Pipeline

The project includes automated security scanning:
- ESLint security rules
- OWASP ZAP baseline scan (fails on Medium+)
- OWASP ZAP full scan (reports all, warns on Low)
- npm audit (fails on High+)

## 🤝 Contributing

We welcome contributions! Please follow these guidelines to maintain code quality and security standards.

### Development Workflow

1. **Fork the repository** and create a feature branch
2. **Set up development environment**:
   ```bash
   npm install
   cp .env.example .env
   # Configure your environment variables
   ```

3. **Follow the development standards**:
   - Use ES6+ syntax and modules
   - Follow the existing component architecture
   - Maintain security best practices
   - Write descriptive commit messages

### Code Style & Standards

#### Backend Development
- **Express Routes**: Place in `src/routes/` with descriptive names
- **Services**: Business logic in `src/services/`
- **Middleware**: Security and utility middleware in `src/middleware/`
- **Database**: Mongoose models in `src/models/` (if applicable)

#### Frontend Development
- **Controllers**: Page-specific controllers extending `PageController`
- **Templates**: HTML templates in `public/templates/`
- **Styles**: Component-specific CSS in `public/css/`
- **Configuration**: Environment settings in `public/js/config.js`

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

#### ✅ **Required Security Checks**
```bash
# Run before every commit
npm run lint                    # ESLint general rules
npm run lint:security          # Security-specific rules
npm audit --audit-level=high   # Dependency vulnerabilities
```

#### ⚠️ **Security Standards**
- **No secrets in code** - Use environment variables
- **Input validation** - Validate all user inputs
- **SQL/NoSQL injection prevention** - Use parameterized queries
- **XSS prevention** - Proper escaping and CSP
- **CSRF protection** - Implement for state-changing operations

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

1. **Create descriptive PR title** following conventional commits
2. **Include security impact assessment** in PR description
3. **Test both HTTP and HTTPS modes** before submitting
4. **Document any breaking changes** or new environment variables
5. **Run full security test suite**:
   ```bash
   npm run lint
   npm run lint:security
   npm audit --audit-level=moderate
   ```

### Issue Reporting

- **Security vulnerabilities**: Follow [SECURITY.md](SECURITY.md)
- **Bugs**: Include reproduction steps and environment details
- **Features**: Discuss security implications and architectural fit
- **Documentation**: Help improve setup and contributor experience

### Environment Variables

When adding new environment variables:
1. **Add to `.env.example`** with descriptive comments
2. **Update README** with variable documentation
3. **Add validation** in configuration files
4. **Consider security implications** (secrets vs. config)

### Release Process

For maintainers:
1. **Security audit** of all changes
2. **Version bump** following semantic versioning
3. **Update CHANGELOG** with security-focused notes
4. **Test production deployment** process
5. **Update security documentation** if needed

## 📄 License

MIT License - See LICENSE file for details.
