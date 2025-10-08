import User from '../models/User.js';
import bcrypt from 'bcrypt';

export class UserService {
  
  // Register new user
  static async registerUser(userData) {
    try {
      const { fullName, email, password } = userData;
      
      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new Error('User already exists with this email');
      }
      
      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Create user
      const user = new User({
        fullName,
        email: email.toLowerCase(),
        password: hashedPassword
      });
      
      const savedUser = await user.save();
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = savedUser.toObject();
      
      return {
        success: true,
        message: 'User registered successfully',
        user: userWithoutPassword
      };
      
    } catch (error) {
      console.error('❌ Error registering user:', error);
      
      if (error.code === 11000) {
        throw new Error('Email already exists');
      }
      
      throw error;
    }
  }
  
  // Login user
  static async loginUser(email, password) {
    try {
      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new Error('Invalid email or password');
      }
      
      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }
      
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user.toObject();
      
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