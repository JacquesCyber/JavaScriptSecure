/*
 * Cryptography Utilities
 * -------------------------------------------------------------
 * This module provides cryptographic functions for the application.
 * It is designed for secure hashing, random value generation, and
 * cryptographic operations using vetted algorithms.
 *
 *  Security & Best Practices
 *   - Uses strong, industry-standard algorithms (e.g., SHA-256, AES)
 *   - Never hardcodes secrets or keys in source code
 *   - Handles errors to avoid leaking sensitive information
 *
 * Usage:
 *   import { hashPassword, generateToken } from './utils/crypto.js';
 *
 * REFERENCES:
 *  - https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
 * 
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lazy load RSA keys - only when needed and if they exist
let publicKey = null;
let privateKey = null;

function loadKeys() {
  if (publicKey && privateKey) return true;
  
  const publicKeyPath = path.join(__dirname, '../../keys/public.pem');
  const privateKeyPath = path.join(__dirname, '../../keys/private.pem');
  
  try {
    if (fs.existsSync(publicKeyPath) && fs.existsSync(privateKeyPath)) {
      publicKey = fs.readFileSync(publicKeyPath, 'utf8');
      privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      return true;
    }
  } catch (error) {
    console.warn('RSA keys not available:', error.message);
  }
  
  return false;
}

// AES + RSA Hybrid Encryption
export function encryptHybrid(data) {
  if (!loadKeys()) {
    throw new Error('Encryption keys not available - cannot encrypt data');
  }
  
  const aesKey = crypto.randomBytes(32); // 256-bit key
  const iv = crypto.randomBytes(16);     // 128-bit IV
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);

  const encryptedData = Buffer.concat([
    cipher.update(data, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  const encryptedKey = crypto.publicEncrypt(publicKey, aesKey);
  const encryptedIV = crypto.publicEncrypt(publicKey, iv);

  return {
    encryptedData: encryptedData.toString('base64'),
    encryptedKey: encryptedKey.toString('base64'),
    encryptedIV: encryptedIV.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

export function decryptHybrid({ encryptedData, encryptedKey, encryptedIV, authTag }) {
  if (!loadKeys()) {
    throw new Error('Encryption keys not available - cannot decrypt data');
  }
  
  const aesKey = crypto.privateDecrypt(privateKey, Buffer.from(encryptedKey, 'base64'));
  const iv = crypto.privateDecrypt(privateKey, Buffer.from(encryptedIV, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);

  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData, 'base64')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

//----------------------------------------------End of File----------------------------------------------