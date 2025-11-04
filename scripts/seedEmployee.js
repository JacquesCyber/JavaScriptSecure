/**
 * Seed Employee Script
 * -------------------------------------------------------------
 * Creates a pre-registered employee for testing the portal
 * 
 * Usage: node scripts/seedEmployee.js
 * 
 * Assignment Note: "Employees are pre-registered when employed.
 * No registration necessary; however, they do need to log on."
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Staff from '../src/models/Staff.js';
import { hashPassword } from '../src/utils/auth.js';

dotenv.config();

async function seedEmployee() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/securebank';
    await mongoose.connect(mongoUri);
    
    console.log('✓ Connected to MongoDB');
    
    // Check if employee already exists
    const existing = await Staff.findOne({ username: 'employee001' });
    if (existing) {
      console.log('\n⚠️  Employee already exists!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Employee ID:', existing._id);
      console.log('Employee Code:', existing.employeeId);
      console.log('Name:', existing.fullName);
      console.log('Username:', existing.username);
      console.log('Email:', existing.email);
      console.log('Role:', existing.role);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      await mongoose.connection.close();
      return;
    }
    
    // Hash password with high cost factor for security
    const hashedPassword = await hashPassword('SecureBank2024!');
    
    // Create employee
    const employee = new Staff({
      fullName: 'Jane Smith',
      username: 'employee001',
      email: 'jane.smith@securebank.com',
      password: hashedPassword,
      employeeId: 'EMP001234',
      role: 'staff', // Matches USER_ROLES.STAFF in constants
      department: 'International Payments',
      isActive: true
    });
    
    await employee.save();
    
    console.log('\n✅ Employee created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Database ID:', employee._id);
    console.log('Employee Code:', employee.employeeId);
    console.log('Name:', employee.fullName);
    console.log('Username:', employee.username);
    console.log('Email:', employee.email);
    console.log('Password:', 'SecureBank2024!');
    console.log('Role:', employee.role);
    console.log('Department:', employee.department);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔐 Login Credentials for Testing:');
    console.log('   Username: employee001');
    console.log('   Password: SecureBank2024!');
    console.log('\n📍 Access Portal: http://localhost:3000/employee-portal\n');
    
  } catch (error) {
    console.error('❌ Error seeding employee:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('✓ Database connection closed');
  }
}

// Run the seed function
seedEmployee();
