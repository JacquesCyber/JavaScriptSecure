/*
 * List All Collections Script
 * -------------------------------------------------------------
 * Shows all collections and their document counts in the database
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function listCollections() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', process.env.MONGODB_URI?.replace(/\/\/.*:.*@/, '//***:***@')); // Hide credentials
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    // Get database name
    const dbName = mongoose.connection.db.databaseName;
    console.log('Database:', dbName);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\nFound ${collections.length} collections:\n`);
    
    if (collections.length === 0) {
      console.log('No collections found in this database');
      console.log('\nMake sure you:');
      console.log('   1. Added the document to the correct database');
      console.log('   2. Are connected to the right MongoDB cluster');
      console.log('   3. The collection has at least one document');
    } else {
      for (const collection of collections) {
        const count = await mongoose.connection.db.collection(collection.name).countDocuments();
        console.log(`   ${collection.name} (${count} documents)`);
        
        // If it's a staff-related collection, show sample
        if (collection.name.toLowerCase().includes('staff')) {
          const sample = await mongoose.connection.db.collection(collection.name).findOne();
          if (sample) {
            console.log('      Sample document:');
            console.log('     ', JSON.stringify(sample, null, 2).split('\n').join('\n      '));
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
}

listCollections();
