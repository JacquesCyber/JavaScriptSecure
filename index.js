import { connect } from './mongoClient.js';
import { encrypt, decrypt } from './CryptoUtils.js';

async function run() {
  const db = await connect();
  const collection = db.collection('secrets');

  const secret = 'my secret';
  const encrypted = encrypt(secret);
  console.log('Encrypted:', encrypted.toString('base64'));

  const doc = {
    encryptedData: encrypted.toString('base64'),
    createdAt: new Date(),
  };

  const result = await collection.insertOne(doc);
  console.log('✅ Inserted document with ID:', result.insertedId);

  const stored = await collection.findOne({ _id: result.insertedId });
  const decrypted = decrypt(Buffer.from(stored.encryptedData, 'base64'));
  console.log('Decrypted from DB:', decrypted);

  process.exit(0);
}

run();