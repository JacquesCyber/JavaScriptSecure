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
    const allowedModules = ['controllers.js', 'utils.js', 'services.js'];
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

// Serve templates with proper security
router.get('/templates/:template', (req, res) => {
  try {
    const templateName = req.params.template;
    
    // Security: Only allow alphanumeric template names with hyphens/underscores
    // Fixed: Simplified regex to avoid ReDoS
    if (!/^[a-zA-Z0-9_-]+\.html$/.test(templateName)) {
      return res.status(400).send('Invalid template name');
    }

    const baseDir = path.join(process.cwd(), 'public', 'templates');
    const filePath = path.join(baseDir, templateName);
    const safePath = path.normalize(filePath);

    // Prevent path traversal
    if (!safePath.startsWith(baseDir)) {
      return res.status(403).send('Path traversal detected');
    }

    // Check if file exists
    if (!fs.existsSync(safePath)) {
      return res.status(404).send('Template not found');
    }

    const content = fs.readFileSync(safePath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
    res.send(content);
  } catch (error) {
    console.error('Error serving template:', error);
    res.status(500).send('Error loading template');
  }
});

// Favicon handler
router.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content
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