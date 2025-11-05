/*
 * Static Files Route
 * -------------------------------------------------------------
 * This route serves static files to the client.
 * It enforces path validation and safe file serving to prevent
 * path traversal, information leakage, and unauthorized access.
 *
 *  Security & Best Practices
 *   - Validates file paths to prevent path traversal attacks
 *   - Restricts access to only whitelisted/static directories
 *   - Never exposes sensitive files or server internals
 *
 * Usage:
 *   app.use('/static', staticRouter);
 *
 * REFERENCES:
 *  - https://owasp.org/www-community/attacks/Path_Traversal 
 */
import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Serve main app.js (now the enterprise version)
router.get('/app.js', (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'public', 'app.js');
    const content = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.send(content);
  } catch (error) {
    console.error('Error serving app.js:', error);
    res.status(404).send('// App.js not found');
  }
});

// Serve JS modules with security validation
router.get('/js/:module', (req, res) => {
  try {
    const moduleName = req.params.module;
    
    // Security: Only allow specific modules
    const allowedModules = [
      'controllers.js',
      'utils.js',
      'services.js',
      'config.js',
      'international-payments-portal.js',
      'employee-app.js',
      'employee-controllers.js',
      'bootstrap.bundle.min.js',
      'disclaimer.js'
    ];
    if (!allowedModules.includes(moduleName)) {
      return res.status(403).send('// Module not allowed');
    }

    const baseDir = path.join(process.cwd(), 'public', 'js');
    const filePath = path.join(baseDir, moduleName);
    const safePath = path.normalize(filePath);

    // Prevent path traversal
    if (!safePath.startsWith(baseDir)) {
      return res.status(403).send('// Path traversal detected');
    }

    if (!fs.existsSync(safePath)) {
      return res.status(404).send('// Module not found');
    }

    const content = fs.readFileSync(safePath, 'utf8');
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
    res.send(content);
  } catch (error) {
    console.error('Error serving JS module:', error);
    res.status(500).send('// Error loading module');
  }
});

// Serve customer templates with proper security
router.get('/customer-templates/:template', (req, res) => {
  try {
    const templateName = req.params.template;
    
    // Security: Only allow alphanumeric template names with hyphens/underscores
    if (!/^[a-zA-Z0-9_-]+\.html$/.test(templateName)) {
      return res.status(400).send('Invalid template name');
    }
    
    // Secure root directory for customer templates
    const templatesRoot = path.resolve(process.cwd(), 'public', 'customer-templates');
    let filePath = path.resolve(templatesRoot, templateName);

    // Resolve symlinks and canonicalize path
    try {
      filePath = fs.realpathSync(filePath);
    } catch (e) {
      return res.status(404).send('Template not found');
    }

    if (!filePath.startsWith(templatesRoot + path.sep)) {
      return res.status(403).send('Forbidden');
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Template not found');
    }

    const content = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
    res.send(content);
  } catch (error) {
    console.error('Error serving customer template:', error);
    res.status(500).send('Error loading template');
  }
});

// Serve employee templates with proper security
router.get('/employee-templates/:template', (req, res) => {
  try {
    const templateName = req.params.template;
    
    // Security: Only allow alphanumeric template names with hyphens/underscores
    if (!/^[a-zA-Z0-9_-]+\.html$/.test(templateName)) {
      return res.status(400).send('Invalid template name');
    }
    
    // Secure root directory for employee templates
    const templatesRoot = path.resolve(process.cwd(), 'public', 'employee-templates');
    let filePath = path.resolve(templatesRoot, templateName);

    // Resolve symlinks and canonicalize path
    try {
      filePath = fs.realpathSync(filePath);
    } catch (e) {
      return res.status(404).send('Template not found');
    }

    if (!filePath.startsWith(templatesRoot + path.sep)) {
      return res.status(403).send('Forbidden');
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Template not found');
    }

    const content = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
    res.send(content);
  } catch (error) {
    console.error('Error serving employee template:', error);
    res.status(500).send('Error loading template');
  }
});

// Legacy route for backward compatibility - redirect to customer-templates
router.get('/templates/:template', (req, res) => {
  res.redirect(301, `/customer-templates/${req.params.template}`);
});

// Favicon handler
router.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content
});

// Disclaimer page - Serve to all users
router.get('/disclaimer', (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'public', 'disclaimer.html');
    const content = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(content);
  } catch (error) {
    console.error('Error serving disclaimer:', error);
    res.status(404).send('Disclaimer page not found');
  }
});

// Employee Portal - Protected Route
router.get('/employee-portal', (req, res) => {
  try {
    // Authenticated employee - serve portal (will show login page if not logged in)
    const filePath = path.join(process.cwd(), 'public', 'employee-portal.html');
    const content = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(content);
  } catch (error) {
    console.error('Error serving employee portal:', error);
    res.status(404).send('Employee portal not found');
  }
});

// Robots.txt for search engines
router.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Disallow: /secret/
Disallow: /store
Allow: /

# Security notice: This application handles sensitive data
# Please do not index secret URLs or API endpoints
Crawl-delay: 10`);
});

// Sitemap.xml for SEO
router.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${req.protocol}://${req.get('host')}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${req.protocol}://${req.get('host')}/health</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>`);
});

export default router;

//----------------------------------------------End of File----------------------------------------------