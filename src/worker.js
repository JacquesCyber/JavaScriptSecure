/**
 * Cloudflare Worker Entry Point
 * -------------------------------------------------------------
 * This file adapts the Express app to run on Cloudflare Workers
 * 
 * Cloudflare Workers Limitations:
 * - No access to Node.js fs, crypto.randomBytes (use Web Crypto API)
 * - No native bcrypt (use bcryptjs)
 * - Limited CPU time (50ms default)
 * - Stateless (use KV for sessions)
 */

import app from './app.js';

/**
 * Cloudflare Workers fetch handler
 */
export default {
  async fetch(request, env, ctx) {
    try {
      // Convert Cloudflare Request to Express-compatible request
      const expressRequest = await convertToExpressRequest(request, env);
      
      // Handle the request with Express app
      const response = await handleExpressRequest(app, expressRequest);
      
      return response;
    } catch (error) {
      console.error('Worker error:', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' 
          ? 'An error occurred' 
          : error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }
};

/**
 * Convert Cloudflare Request to Express-compatible format
 */
async function convertToExpressRequest(request, env) {
  const url = new URL(request.url);
  
  return {
    method: request.method,
    url: url.pathname + url.search,
    headers: Object.fromEntries(request.headers),
    body: await getRequestBody(request),
    env: env, // Cloudflare environment bindings
    cf: request.cf // Cloudflare request metadata
  };
}

/**
 * Get request body based on content type
 */
async function getRequestBody(request) {
  const contentType = request.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    return await request.json();
  }
  
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    return Object.fromEntries(new URLSearchParams(text));
  }
  
  if (contentType.includes('multipart/form-data')) {
    return await request.formData();
  }
  
  return await request.text();
}

/**
 * Handle Express request and convert response
 */
async function handleExpressRequest(app, request) {
  return new Promise((resolve) => {
    // Create mock response object
    const chunks = [];
    const response = {
      statusCode: 200,
      headers: {},
      
      status(code) {
        this.statusCode = code;
        return this;
      },
      
      set(key, value) {
        this.headers[key] = value;
        return this;
      },
      
      json(data) {
        chunks.push(JSON.stringify(data));
        resolve(this.buildResponse());
      },
      
      send(data) {
        chunks.push(data);
        resolve(this.buildResponse());
      },
      
      end(data) {
        if (data) chunks.push(data);
        resolve(this.buildResponse());
      },
      
      buildResponse() {
        return new Response(chunks.join(''), {
          status: this.statusCode,
          headers: this.headers
        });
      }
    };
    
    // Call Express app
    app(request, response);
  });
}
