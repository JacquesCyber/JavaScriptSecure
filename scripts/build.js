/**
 * Build Configuration for Cloudflare Pages
 * -------------------------------------------------------------
 * This script prepares the frontend for static hosting
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  // Source directories
  publicDir: path.join(__dirname, '../public'),
  
  // Build output directory
  distDir: path.join(__dirname, '../dist'),
  
  // API endpoint (will be replaced during build)
  apiEndpoint: {
    development: 'http://localhost:3000',
    production: 'https://securebank-api.dupjac3.workers.dev' // Your Cloudflare Worker URL
  }
};

/**
 * Main build function
 */
async function build() {
  console.log('🚀 Building for Cloudflare Pages...\n');
  
  try {
    // Step 1: Clean dist directory
    await cleanDist();
    
    // Step 2: Copy public files
    await copyPublicFiles();
    
    // Step 3: Update API endpoints for production
    await updateApiEndpoints();
    
    // Step 4: Add disclaimer banner
    await addDisclaimerBanner();
    
    // Step 5: Generate _headers file for Cloudflare
    await generateHeadersFile();
    
    // Step 6: Generate _redirects file
    await generateRedirectsFile();
    
    console.log('\n✅ Build complete! Files are in ./dist');
    console.log('\n📋 Next steps:');
    console.log('1. Deploy backend: wrangler deploy');
    console.log('2. Deploy frontend: npm run deploy:pages');
    console.log('3. Set secrets: wrangler secret put MONGODB_URI');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

/**
 * Clean dist directory
 */
async function cleanDist() {
  console.log('🧹 Cleaning dist directory...');
  
  if (fs.existsSync(config.distDir)) {
    fs.rmSync(config.distDir, { recursive: true });
  }
  
  fs.mkdirSync(config.distDir, { recursive: true });
  console.log('✓ Cleaned');
}

/**
 * Copy public files to dist
 */
async function copyPublicFiles() {
  console.log('📦 Copying public files...');
  
  copyRecursive(config.publicDir, config.distDir);
  console.log('✓ Copied');
}

/**
 * Recursive copy helper
 */
function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Update API endpoints in JS files
 */
async function updateApiEndpoints() {
  console.log('🔧 Updating API endpoints...');
  
  const jsFiles = findJsFiles(path.join(config.distDir, 'js'));
  const apiUrl = config.apiEndpoint.production;
  
  for (const file of jsFiles) {
    let content = fs.readFileSync(file, 'utf-8');
    
    // Replace localhost URLs with production API
    content = content.replace(
      /http:\/\/localhost:3000/g,
      apiUrl
    );
    
    // Replace relative API paths
    content = content.replace(
      /fetch\(['"`]\/api\//g,
      `fetch('${apiUrl}/api/`
    );
    
    fs.writeFileSync(file, content);
  }
  
  console.log(`✓ Updated ${jsFiles.length} files`);
}

/**
 * Find all JS files recursively
 */
function findJsFiles(dir) {
  const files = [];
  
  if (!fs.existsSync(dir)) return files;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...findJsFiles(fullPath));
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Add disclaimer banner to index.html
 */
async function addDisclaimerBanner() {
  console.log('⚠️  Adding disclaimer banner...');
  
  const indexPath = path.join(config.distDir, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf-8');
  
  const disclaimer = `
<!-- LEGAL DISCLAIMER -->
<div class="alert alert-warning text-center mb-0" role="alert" style="border-radius: 0;">
  <strong>⚠️ EDUCATIONAL DEMO PROJECT</strong> - Do NOT enter real banking credentials or personal information. 
  This is a portfolio project for demonstration purposes only.
  <a href="#disclaimer-modal" data-bs-toggle="modal" class="alert-link">Learn more</a>
</div>
`;
  
  // Insert after opening body tag
  html = html.replace(/<body[^>]*>/, `$&\n${disclaimer}`);
  
  fs.writeFileSync(indexPath, html);
  console.log('✓ Disclaimer added');
}

/**
 * Generate Cloudflare _headers file
 */
async function generateHeadersFile() {
  console.log('📝 Generating _headers file...');
  
  const headers = `# Cloudflare Pages Headers
# https://developers.cloudflare.com/pages/platform/headers/

/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  X-XSS-Protection: 1; mode=block
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.securebank.pages.dev

/*.html
  Cache-Control: public, max-age=0, must-revalidate

/*.js
  Cache-Control: public, max-age=31536000, immutable

/*.css
  Cache-Control: public, max-age=31536000, immutable

/*.woff2
  Cache-Control: public, max-age=31536000, immutable
`;
  
  fs.writeFileSync(path.join(config.distDir, '_headers'), headers);
  console.log('✓ _headers created');
}

/**
 * Generate Cloudflare _redirects file
 */
async function generateRedirectsFile() {
  console.log('📝 Generating _redirects file...');
  
  const redirects = `# Cloudflare Pages Redirects
# https://developers.cloudflare.com/pages/platform/redirects/

# SPA fallback - send all non-file requests to index.html
/*    /index.html   200

# API proxy (if needed)
/api/*  https://api.securebank.pages.dev/:splat  200
`;
  
  fs.writeFileSync(path.join(config.distDir, '_redirects'), redirects);
  console.log('✓ _redirects created');
}

// Run build
build();
