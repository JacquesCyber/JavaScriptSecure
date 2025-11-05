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
    
    // Get test credentials from environment
    const testUsername = process.env.TEST_EMPLOYEE_USERNAME || 'employee001';
    const testPassword = process.env.TEST_EMPLOYEE_PASSWORD || 'SecureBank2024!';
    
    // Find the employee
    const employee = await Staff.findOne({ username: testUsername });
    
    if (!employee) {
      console.log('❌ Employee not found');
      process.exit(1);
    }
    
    console.log('✓ Found employee:', employee.username);
    console.log('  Email:', employee.email);
    console.log('  Employee ID:', employee.employeeId);
    
    // Hash the new password
    const hashedPassword = await hashPassword(testPassword);
    
    console.log('\n🔐 Hashing new password...');
    console.log('  Plain text:', testPassword);
    console.log('  New hash:', hashedPassword);
    
    // Update the password
    employee.password = hashedPassword;
    await employee.save();
    
    console.log('\n✓ Password updated successfully!');
    
    // Verify the password works
    console.log('\n🔍 Verifying password...');
    const isValid = await verifyPassword(testPassword, employee.password);
    
    if (isValid) {
      console.log('✅ Password verification PASSED');
      console.log('\n📝 You can now login with:');
      console.log('  Employee ID:', employee.employeeId);
      console.log('  Email:', employee.email);
      console.log('  Username:', employee.username);
      console.log('  Password:', testPassword);
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
