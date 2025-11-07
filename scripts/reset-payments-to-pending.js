/*
 * Reset Payments to Pending Status
 * -------------------------------------------------------------
 * This script resets all completed/failed payments back to pending status
 * so they can be reviewed in the employee portal.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Payment from '../src/models/Payment.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/secure-payment-portal';

async function resetPaymentsToPending() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all payments that are completed or failed
    const result = await Payment.updateMany(
      {
        status: { $in: ['completed', 'failed'] }
      },
      {
        $set: {
          status: 'pending',
          approvalNotes: null,
          approvedAt: null,
          rejectionReason: null,
          rejectionDetails: null,
          rejectedAt: null
        }
      }
    );

    console.log(`\nUpdated ${result.modifiedCount} payments to pending status`);
    console.log(`  - Total matched: ${result.matchedCount}`);
    console.log(`  - Modified: ${result.modifiedCount}`);

    // Show summary of current payment statuses
    const statusCounts = await Payment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    console.log('\nCurrent payment status counts:');
    statusCounts.forEach(item => {
      console.log(`  - ${item._id}: ${item.count}`);
    });

  } catch (error) {
    console.error('Error resetting payments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
resetPaymentsToPending();

//----------------------------- END OF FILE -----------------------------