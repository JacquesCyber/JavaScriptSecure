# 🔐 Encryption Setup Guide

## Environment Variables Required

Add these to your `.env` file:

```env
# Encryption Configuration
# Generate a secure 256-bit key: openssl rand -base64 32
ENCRYPTION_KEY=your-256-bit-secret-key-change-in-production-make-it-longer

# Security Configuration  
SESSION_SECRET=your-session-secret-key-change-in-production
```

## Generate Secure Encryption Key

Run this command to generate a secure 256-bit encryption key:

```bash
openssl rand -base64 32
```

Copy the output and set it as your `ENCRYPTION_KEY` in the `.env` file.

## Security Features

- **AES-256-CBC Encryption**: Industry-standard encryption for ID numbers
- **Random IV**: Each encryption uses a unique initialization vector
- **Automatic Encryption/Decryption**: Transparent in the User model
- **Format Validation**: Validates South African ID numbers before encryption
- **Error Handling**: Proper error handling for encryption/decryption failures

## Usage

The ID numbers are automatically encrypted when saved and decrypted when retrieved:

```javascript
// When saving a user, ID number is automatically encrypted
const user = new User({ idNumber: '1234567890123' });
await user.save(); // ID number stored encrypted

// When retrieving a user, ID number is automatically decrypted
const user = await User.findById(userId);
console.log(user.idNumber); // Returns original ID number
```

## Security Benefits

- ✅ **Reversible**: Can retrieve original ID numbers when needed
- ✅ **Secure**: AES-256 encryption with random IVs
- ✅ **Validated**: Format validation before encryption
- ✅ **Unique**: Maintains uniqueness constraints
- ✅ **Compliant**: Meets data protection requirements
