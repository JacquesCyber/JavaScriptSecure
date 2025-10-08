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
    console.warn('⚠️ RSA keys not available:', error.message);
  }
  
  return false;
}

// Generate RSA key pair and save to files
export function generateKeys() {
  const keysDir = path.join(__dirname, '../../keys');
  const publicKeyPath = path.join(keysDir, 'public.pem');
  const privateKeyPath = path.join(keysDir, 'private.pem');
  
  // Create keys directory if it doesn't exist
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }
  
  // Check if keys already exist
  if (fs.existsSync(publicKeyPath) && fs.existsSync(privateKeyPath)) {
    console.log('⚠️  Keys already exist. Skipping generation.');
    console.log('   Delete existing keys first if you want to regenerate them.');
    return false;
  }
  
  console.log('🔑 Generating RSA key pair...');
  
  // Generate 4096-bit RSA key pair
  const { publicKey: pubKey, privateKey: privKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  // Save keys to files
  fs.writeFileSync(publicKeyPath, pubKey);
  fs.writeFileSync(privateKeyPath, privKey);
  
  // Set restrictive permissions on private key (Unix-like systems)
  if (process.platform !== 'win32') {
    fs.chmodSync(privateKeyPath, 0o600);
  }
  
  console.log('✅ RSA keys generated successfully!');
  console.log(`   Public key:  ${publicKeyPath}`);
  console.log(`   Private key: ${privateKeyPath}`);
  
  // Load the newly generated keys into memory
  publicKey = pubKey;
  privateKey = privKey;
  
  return true;
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