import express from 'express';
import https from 'https';
import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Secret from './models/Secret.js';
import { body, validationResult } from 'express-validator';
import { encryptHybrid, decryptHybrid } from './cryptoUtils.js';

dotenv.config();

const app = express();
const port = 3000;

// HTTPS certs — read once at top
const key = fs.readFileSync('./key.pem');
const cert = fs.readFileSync('./cert.pem');

// Middleware to parse JSON
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static('public'));

// POST /store route with validation and hybrid encryption
app.post('/store',
  body('data').trim().isLength({ min: 1 }).escape(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { data } = req.body;
      const encrypted = encryptHybrid(data);

      const secret = new Secret({
        encryptedData: encrypted.encryptedData,
        encryptedKey: encrypted.encryptedKey,
        encryptedIV: encrypted.encryptedIV,
        authTag: encrypted.authTag
      });

      const saved = await secret.save();

      res.json({
        message: 'Secret stored securely',
        id: saved._id
      });
    } catch (err) {
      console.error('❌ Error in POST /store:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

// GET /secret/:id — fetch secret by ID and decrypt
app.get('/secret/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const secret = await Secret.findById(id);
    if (!secret) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    const decrypted = decryptHybrid({
      encryptedData: secret.encryptedData,
      encryptedKey: secret.encryptedKey,
      encryptedIV: secret.encryptedIV,
      authTag: secret.authTag
    });

    res.json({
      id: secret._id,
      data: decrypted,
      createdAt: secret.createdAt || null
    });
  } catch (err) {
    console.error('❌ Error in GET /secret/:id:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET / route
app.get('/', (req, res) => {
  res.send('🔐 HTTPS server is running securely on localhost!');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.sendStatus(200);
});

// Connect to MongoDB, then start HTTPS server
// Connect to MongoDB, then start HTTPS server
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB via Mongoose');
    
    https.createServer({ key, cert }, app).listen(port, '0.0.0.0', () => {
      console.log(`✅ HTTPS server running at https://0.0.0.0:${port}`);
    });
  })
  .catch((err) => {
    console.error('❌ Mongoose connection error:', err);
  });