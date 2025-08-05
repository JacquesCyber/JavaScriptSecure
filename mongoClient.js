import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();
console.log('DEBUG - MONGODB_URI:', process.env.MONGODB_URI);

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export async function connect() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    const db = client.db(); // uses the DB name from URI
    return db;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}