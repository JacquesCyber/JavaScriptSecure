/*
 * Update Employee Script
 * -------------------------------------------------------------
 * Adds employeeId field to existing staff member in database
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Staff from '../src/models/Staff.js';

dotenv.config();

async function updateEmployee() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');
    
    // First, list all staff members
    const allStaff = await Staff.find({});
    console.log('\n📋 All staff members in database:');
    console.log(JSON.stringify(allStaff, null, 2));
    console.log(`\nTotal staff count: ${allStaff.length}`);
    
    if (allStaff.length === 0) {
      console.log('\n❌ No staff members found in database');
      console.log('💡 Please manually add the employee to your MongoDB staff collection with these fields:');
      console.log({
        fullName: 'Jane Smith',
        username: 'employee001',
        email: 'jane.smith@securebank.com',
        employeeId: 'EMP001234',
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYKw8k8W8Iq',
        role: 'staff',
        department: 'International Payments',
        isActive: true
      });
      process.exit(1);
    }
    
    // Find the existing employee by username
    const employee = await Staff.findOne({ username: 'employee001' });
    
    if (!employee) {
      console.log('\n❌ Employee with username "employee001" not found');
      console.log('💡 Available staff usernames:', allStaff.map(s => s.username));
      process.exit(1);
    }
    
    console.log('\n✓ Found employee:', {
      username: employee.username,
      fullName: employee.fullName,
      email: employee.email
    });
    
    // Update the employee with employeeId if not present
    if (!employee.employeeId) {
      employee.employeeId = 'EMP001234';
      await employee.save();
      console.log('✓ Updated employee with employeeId: EMP001234');
    } else {
      console.log('✓ Employee already has employeeId:', employee.employeeId);
    }
    
    // Display final employee data
    console.log('\n✓ Employee updated successfully:');
    console.log({
      _id: employee._id,
      fullName: employee.fullName,
      username: employee.username,
      email: employee.email,
      employeeId: employee.employeeId,
      role: employee.role,
      department: employee.department,
      isActive: employee.isActive
    });
    
    console.log('\n📝 You can now login with any of:');
    console.log(`   - Username: ${employee.username}`);
    console.log(`   - Email: ${employee.email}`);
    console.log(`   - Employee ID: ${employee.employeeId}`);
    console.log(`   - Password: SecureBank2024!`);
    
  } catch (error) {
    console.error('❌ Error updating employee:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  }
}

updateEmployee();
