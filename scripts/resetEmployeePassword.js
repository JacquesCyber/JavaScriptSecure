/*
 * Reset Employee Password Script
 * -------------------------------------------------------------
 * Resets the employee password to a known value
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Staff from '../src/models/Staff.js';
import { hashPassword, verifyPassword } from '../src/utils/auth.js';

dotenv.config();

async function resetPassword() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');
    
    // Find the employee
    const employee = await Staff.findOne({ username: 'employee001' });
    
    if (!employee) {
      console.log('❌ Employee not found');
      process.exit(1);
    }
    
    console.log('✓ Found employee:', employee.username);
    console.log('  Email:', employee.email);
    console.log('  Employee ID:', employee.employeeId);
    
    // Hash the new password
    const newPassword = 'SecureBank2024!';
    const hashedPassword = await hashPassword(newPassword);
    
    console.log('\n🔐 Hashing new password...');
    console.log('  Plain text:', newPassword);
    console.log('  New hash:', hashedPassword);
    
    // Update the password
    employee.password = hashedPassword;
    await employee.save();
    
    console.log('\n✓ Password updated successfully!');
    
    // Verify the password works
    console.log('\n🔍 Verifying password...');
    const isValid = await verifyPassword(newPassword, employee.password);
    
    if (isValid) {
      console.log('✅ Password verification PASSED');
      console.log('\n📝 You can now login with:');
      console.log('  Employee ID: EMP001234');
      console.log('  Email: jane.smith@securebank.com');
      console.log('  Username: employee001');
      console.log('  Password: SecureBank2024!');
    } else {
      console.log('❌ Password verification FAILED');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  }
}

resetPassword();
