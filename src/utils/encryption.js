import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

/**
 * Encryption utility for sensitive data using AES-256
 * Provides secure encryption/decryption for PII like ID numbers
 */

// Load environment variables
dotenv.config();

// Get encryption key and IV from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ENCRYPTION_IV = process.env.ENCRYPTION_IV;

// Validate that encryption keys are set
if (!ENCRYPTION_KEY || !ENCRYPTION_IV) {
  throw new Error('❌ Encryption keys must be set in environment variables: ENCRYPTION_KEY and ENCRYPTION_IV');
}

// Validate key lengths
if (ENCRYPTION_KEY.length !== 32) {
  throw new Error('❌ ENCRYPTION_KEY must be exactly 32 characters for AES-256');
}

if (ENCRYPTION_IV.length !== 16) {
  throw new Error('❌ ENCRYPTION_IV must be exactly 16 characters');
}

// Convert to CryptoJS format
const SECRET_KEY = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
const IV = CryptoJS.enc.Utf8.parse(ENCRYPTION_IV);

/**
 * Encrypts a string using AES-256-CBC
 * @param {string} text - The text to encrypt
 * @returns {string} - Base64 encoded encrypted string
 */
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
    console.error('❌ Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts a string using AES-256-CBC
 * @param {string} encryptedText - The Base64 encoded encrypted string
 * @returns {string} - The decrypted text
 */
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
    console.error('❌ Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypts an ID number specifically
 * @param {string} idNumber - The ID number to encrypt
 * @returns {string} - Encrypted ID number
 */
export function encryptIdNumber(idNumber) {
  if (!idNumber || typeof idNumber !== 'string') {
    throw new Error('Invalid ID number provided');
  }
  
  // Validate South African ID number format before encryption
  if (!/^\d{13}$/.test(idNumber)) {
    throw new Error('Invalid South African ID number format');
  }
  
  return encrypt(idNumber);
}

/**
 * Decrypts an ID number specifically
 * @param {string} encryptedIdNumber - The encrypted ID number
 * @returns {string} - Decrypted ID number
 */
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

/**
 * Creates a hash for uniqueness checks (one-way)
 * @param {string} text - The text to hash
 * @returns {string} - SHA-256 hash
 */
export function createHash(text) {
  return CryptoJS.SHA256(text).toString();
}
