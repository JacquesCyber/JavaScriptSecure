import express from 'express';

const router = express.Router();

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

// Sitemap.xml for search engines
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