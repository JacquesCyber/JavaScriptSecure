/*
 * HTTP Basic Authentication Middleware
 * -------------------------------------------------------------
 * Protects the entire application with username/password
 * This is essential for a payment processor demo. We only want authorized users to view our academic submission.
 * Also relatively effective against DDoS and bots.
 * Works like a YouTube private link - only people with credentials can access
 * 
 * Usage:
 *   import { basicAuth } from './middleware/basicAuth.js';
 *   app.use(basicAuth); // Apply to all routes
 * 
 * REFERENCES:
 *  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication
 *  - https://expressjs.com/en/4x/api.html#req.headers
 */

export const basicAuth = (req, res, next) => {
  // Skip authentication for health check endpoint (Render needs this)
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }

  // Get authorization header
  const authHeader = req.headers.authorization;

  // If no auth header, request authentication
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Academic Payment Security Demo - Restricted Access"');
    return res.status(401).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Required</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .auth-box {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
          }
          h1 { color: #333; margin-bottom: 1rem; }
          p { color: #666; }
          .icon { font-size: 3rem; margin-bottom: 1rem; }
        </style>
      </head>
      <body>
        <div class="auth-box">
          <h1>Authentication Required</h1>
          <p>This is a protected academic demonstration.</p>
          <p><strong>Contact System Administrator</strong></p>
        </div>
      </body>
      </html>
    `);
  }

  try {
    // Decode credentials
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    // Get credentials from environment variables
    const validUsername = process.env.DEMO_USERNAME || 'demo';
    const validPassword = process.env.DEMO_PASSWORD || 'academic2024';

    // Verify credentials
    if (username === validUsername && password === validPassword) {
      console.log(`Authenticated user: ${username} from IP: ${req.ip}`);
      return next();
    }

    // Invalid credentials
    console.warn(`Failed authentication attempt for user: ${username} from IP: ${req.ip}`);
    res.setHeader('WWW-Authenticate', 'Basic realm="Academic Payment Security Demo - Restricted Access"');
    return res.status(401).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invalid Credentials</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }
          .error-box {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
          }
          h1 { color: #f5576c; margin-bottom: 1rem; }
          p { color: #666; }
          .icon { font-size: 3rem; margin-bottom: 1rem; }
        </style>
      </head>
      <body>
        <div class="error-box">
          <h1>Invalid Credentials</h1>
          <p>The username or password you entered is incorrect.</p>
          <p><strong>Please contact System Administrator</strong></p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Authentication error:', error);
    res.setHeader('WWW-Authenticate', 'Basic realm="Academic Payment Security Demo - Restricted Access"');
    return res.status(401).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Error</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }
          .error-box {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
          }
          h1 { color: #f5576c; margin-bottom: 1rem; }
          p { color: #666; }
          .icon { font-size: 3rem; margin-bottom: 1rem; }
        </style>
      </head>
      <body>
        <div class="error-box">
          <h1>Authentication Error</h1>
          <p>An error occurred during authentication.</p>
          <p><strong>Please try again or contact System Administrator.</strong></p>
        </div>
      </body>
      </html>
    `);
  }
};

export default basicAuth;

//----------------------------- END OF FILE -----------------------------