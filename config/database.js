import mongoose from 'mongoose';

export async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.log('⚠️ No MongoDB URI provided, starting server without database');
    return false;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB via Mongoose');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // In test environment, continue without MongoDB
    if (process.env.NODE_ENV === 'test') {
      console.log('⚠️ Starting server without MongoDB for testing');
      return false;
    } else {
      throw error;
    }
  }
}

// Handle MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📴 MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('📴 MongoDB connection closed.');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
  }
});