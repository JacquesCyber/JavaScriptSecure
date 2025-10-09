import User from '../models/User.js';
import bcrypt from 'bcrypt';
import { encryptIdNumber } from '../utils/encryption.js';

export class UserService {
  
  // Register new user
  static async registerUser(userData) {
    try {
      const { fullName, email, username, idNumber, accountNumber, bankCode, branchCode, password } = userData;
      
      // Check if user already exists
      // Encrypt the ID number for comparison (since it's stored encrypted)
      const encryptedIdNumber = encryptIdNumber(idNumber);
      
      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
          { idNumber: encryptedIdNumber },
          { accountNumber: accountNumber }
        ]
      });
      
      if (existingUser) {
        if (existingUser.email === email.toLowerCase()) {
          throw new Error('User already exists with this email');
        }
        if (existingUser.username === username.toLowerCase()) {
          throw new Error('Username already taken');
        }
        if (existingUser.idNumber === encryptedIdNumber) {
          throw new Error('ID number already registered');
        }
        if (existingUser.accountNumber === accountNumber) {
          throw new Error('Account number already registered');
        }
      }
      
      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Create user
      const user = new User({
        fullName,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        idNumber,
        accountNumber,
        bankCode,
        branchCode,
        password: hashedPassword,
        role: 'customer'
      });
      
      const savedUser = await user.save();
      
      // Return user without password - Fixed: Simplified to avoid unused variable
      const userWithoutPassword = savedUser.toObject();
      delete userWithoutPassword.password;
      
      return {
        success: true,
        message: 'User registered successfully',
        user: userWithoutPassword
      };
      
    } catch (error) {
      console.error('❌ Error registering user:', error);
      
      if (error.code === 11000) {
        if (error.keyPattern.email) {
          throw new Error('Email already exists');
        }
        if (error.keyPattern.username) {
          throw new Error('Username already taken');
        }
        if (error.keyPattern.idNumber) {
          throw new Error('ID number already registered');
        }
        if (error.keyPattern.accountNumber) {
          throw new Error('Account number already registered');
        }
      }
      
      throw error;
    }
  }
  
  // Login user
  static async loginUser(username, accountNumber, password) {
    try {
      if(!(typeof accountNumber === 'string' || typeof accountNumber === 'number')) {
        throw new Error('Invalid account number');
      }
      // Find user by username and account number
      const user = await User.findOne({ 
        username: username.toLowerCase(),
        accountNumber: accountNumber,
        isActive: true 
      });
      
      if (!user) {
        throw new Error('Invalid username, account number, or password');
      }
      
      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid username, account number, or password');
      }
      
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      
      // Return user without password - Fixed: Simplified to avoid unused variable
      const userWithoutPassword = user.toObject();
      delete userWithoutPassword.password;
      
      return {
        success: true,
        message: 'Login successful',
        user: userWithoutPassword
      };
      
    } catch (error) {
      console.error('❌ Error logging in user:', error);
      throw error;
    }
  }
  
  // Get user by ID
  static async getUserById(userId) {
    try {
      const user = await User.findById(userId).select('-password');
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      console.error('❌ Error getting user:', error);
      throw error;
    }
  }
  
  // Get user stats
  static async getUserStats() {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const recentUsers = await User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      });
      
      return {
        total: totalUsers,
        active: activeUsers,
        recent: recentUsers
      };
    } catch (error) {
      console.error('❌ Error getting user stats:', error);
      throw error;
    }
  }
}