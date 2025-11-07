/*
 * Encryption Utilities
 * -------------------------------------------------------------
 * This module provides encryption and decryption functions for the application.
 * It is designed for secure data protection, key management, and
 * cryptographic operations using vetted algorithms.
 *
 * Security & Best Practices
 *   - Uses strong, industry-standard algorithms (e.g., AES, RSA)
 *   - Never hardcodes secrets or keys in source code
 *   - Handles errors to avoid leaking sensitive information
 *
 * Usage:
 *   import { encrypt, decrypt } from './utils/encryption.js';
 * REFERENCES:
 *  - https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
 */
import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get encryption key and IV from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ENCRYPTION_IV = process.env.ENCRYPTION_IV;

// Validate that encryption keys are set
if (!ENCRYPTION_KEY || !ENCRYPTION_IV) {
  throw new Error('Encryption keys must be set in environment variables: ENCRYPTION_KEY and ENCRYPTION_IV');
}

// Validate key lengths
if (ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be exactly 32 characters for AES-256');
}

if (ENCRYPTION_IV.length !== 16) {
  throw new Error('ENCRYPTION_IV must be exactly 16 characters');
}

// Convert to CryptoJS format
const SECRET_KEY = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
const IV = CryptoJS.enc.Utf8.parse(ENCRYPTION_IV);


export function encrypt(text) {
  try {
    if (!text) return text;
    
    // Encrypt using AES-256-CBC with fixed IV from environment
    const encrypted = CryptoJS.AES.encrypt(text, SECRET_KEY, {
      iv: IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Return as Base64 string
    return encrypted.toString();
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

// Decrypt function
export function decrypt(encryptedText) {
  try {
    if (!encryptedText) return encryptedText;
    
    // Decrypt using AES-256-CBC with fixed IV from environment
    const decrypted = CryptoJS.AES.decrypt(encryptedText, SECRET_KEY, {
      iv: IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

// ID Number specific encryption/decryption
export function encryptIdNumber(idNumber) {
  if (!idNumber || typeof idNumber !== 'string') {
    throw new Error('Invalid ID number provided');
  }
  
  // Clean the input
  const cleanedIdNumber = idNumber.trim().replace(/\s/g, '');
  
  // Check if the value is already encrypted (base64 encoded and not 13 digits)
  if (cleanedIdNumber.length > 13 && /^[A-Za-z0-9+/=]+$/.test(cleanedIdNumber)) {
    // Already encrypted, return as is
    return cleanedIdNumber;
  }
  
  // Validate South African ID number format before encryption
  if (!/^\d{13}$/.test(cleanedIdNumber)) {
    throw new Error(`Invalid South African ID number format. Expected 13 digits, got: "${cleanedIdNumber}" (length: ${cleanedIdNumber.length})`);
  }
  
  return encrypt(cleanedIdNumber);
}

// Decrypt ID Number
export function decryptIdNumber(encryptedIdNumber) {
  if (!encryptedIdNumber) {
    return encryptedIdNumber;
  }
  
  const decrypted = decrypt(encryptedIdNumber);
  
  // Validate the decrypted ID number format
  if (!/^\d{13}$/.test(decrypted)) {
    throw new Error('Decrypted ID number has invalid format');
  }
  
  return decrypted;
}

// Create SHA-256 hash of text
export function createHash(text) {
  return CryptoJS.SHA256(text).toString();
}

//----------------------------------------------End of File----------------------------------------------