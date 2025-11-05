/*
 * Check Payment Status Distribution
 * -------------------------------------------------------------
 * Quick utility to show current payment status counts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Payment from '../src/models/Payment.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/secure-payment-portal';

async function checkPaymentStatus() {
  try {
    await mongoose.connect(MONGODB_URI);

    const counts = await Payment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    console.log('\nCurrent payment status breakdown:');
    counts.forEach(item => {
      console.log(`  ${item._id}: ${item.count}`);
    });
    console.log('');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkPaymentStatus();
