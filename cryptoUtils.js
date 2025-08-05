import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Construct absolute paths
const publicKey = fs.readFileSync(path.join(__dirname, 'public.pem'), 'utf8');
const privateKey = fs.readFileSync(path.join(__dirname, 'private.pem'), 'utf8');

// AES + RSA Hybrid Encryption
export function encryptHybrid(data) {
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