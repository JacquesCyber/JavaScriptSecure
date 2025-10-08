import Staff from '../models/Staff.js';
import bcrypt from 'bcrypt';

export class StaffService {
  /**
   * Register a new staff member
   * @param {Object} staffData - Staff information
   * @returns {Promise<Object>} Registration result
   */
  static async registerStaff(staffData) {
    try {
      console.log('👥 Registering new staff member...');

      // Check if staff already exists
      const existingStaff = await Staff.findOne({
        $or: [
          { email: staffData.email },
          { username: staffData.username }
        ]
      });

      if (existingStaff) {
        throw new Error('Staff member with this email or username already exists');
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(staffData.password, saltRounds);

      // Create staff member
      const staff = new Staff({
        fullName: staffData.fullName,
        email: staffData.email,
        username: staffData.username,
        password: hashedPassword,
        role: staffData.role || 'staff',
        department: staffData.department || 'payments',
        permissions: staffData.permissions || {
          canViewAllPayments: true,
          canApprovePayments: false,
          canRejectPayments: false,
          canViewSensitiveData: false,
          canExportData: false
        }
      });

      await staff.save();

      console.log('✅ Staff member created successfully:', staff.email);

      return {
        success: true,
        message: 'Staff member registered successfully',
        staff: {
          _id: staff._id,
          fullName: staff.fullName,
          email: staff.email,
          username: staff.username,
          role: staff.role,
          department: staff.department,
          isActive: staff.isActive
        }
      };
    } catch (error) {
      console.error('❌ Staff registration error:', error);
      throw error;
    }
  }

  /**
   * Login staff member
   * @param {string} username - Staff username
   * @param {string} password - Staff password
   * @returns {Promise<Object>} Login result
   */
  static async loginStaff(username, password) {
    try {
      console.log('🔐 Staff login attempt for:', username);

      // Find staff member
      const staff = await Staff.findOne({ username, isActive: true });
      if (!staff) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, staff.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      staff.lastLogin = new Date();
      await staff.save();

      console.log('✅ Staff login successful:', staff.email);

      return {
        success: true,
        message: 'Login successful',
        staff: {
          _id: staff._id,
          fullName: staff.fullName,
          email: staff.email,
          username: staff.username,
          role: staff.role,
          department: staff.department,
          permissions: staff.permissions,
          lastLogin: staff.lastLogin
        }
      };
    } catch (error) {
      console.error('❌ Staff login error:', error);
      throw error;
    }
  }

  /**
   * Get staff member by ID
   * @param {string} staffId - Staff ID
   * @returns {Promise<Object>} Staff information
   */
  static async getStaffById(staffId) {
    try {
      const staff = await Staff.findById(staffId).select('-password');
      if (!staff) {
        throw new Error('Staff member not found');
      }

      return staff;
    } catch (error) {
      console.error('❌ Error getting staff by ID:', error);
      throw error;
    }
  }

  /**
   * Update staff member
   * @param {string} staffId - Staff ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Update result
   */
  static async updateStaff(staffId, updateData) {
    try {
      const staff = await Staff.findById(staffId);
      if (!staff) {
        throw new Error('Staff member not found');
      }

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (key !== 'password' && updateData[key] !== undefined) {
          staff[key] = updateData[key];
        }
      });

      // Handle password update separately
      if (updateData.password) {
        const saltRounds = 12;
        staff.password = await bcrypt.hash(updateData.password, saltRounds);
      }

      await staff.save();

      return {
        success: true,
        message: 'Staff member updated successfully',
        staff: {
          _id: staff._id,
          fullName: staff.fullName,
          email: staff.email,
          username: staff.username,
          role: staff.role,
          department: staff.department,
          permissions: staff.permissions,
          isActive: staff.isActive
        }
      };
    } catch (error) {
      console.error('❌ Error updating staff:', error);
      throw error;
    }
  }

  /**
   * Get all staff members
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Staff members list
   */
  static async getAllStaff(filters = {}) {
    try {
      const query = {};
      
      if (filters.department) {
        query.department = filters.department;
      }
      
      if (filters.role) {
        query.role = filters.role;
      }
      
      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      const staff = await Staff.find(query)
        .select('-password')
        .sort({ createdAt: -1 });

      return staff;
    } catch (error) {
      console.error('❌ Error getting all staff:', error);
      throw error;
    }
  }

  /**
   * Deactivate staff member
   * @param {string} staffId - Staff ID
   * @returns {Promise<Object>} Deactivation result
   */
  static async deactivateStaff(staffId) {
    try {
      const staff = await Staff.findById(staffId);
      if (!staff) {
        throw new Error('Staff member not found');
      }

      staff.isActive = false;
      await staff.save();

      return {
        success: true,
        message: 'Staff member deactivated successfully'
      };
    } catch (error) {
      console.error('❌ Error deactivating staff:', error);
      throw error;
    }
  }

  /**
   * Check staff permissions
   * @param {string} staffId - Staff ID
   * @param {string} permission - Permission to check
   * @returns {Promise<boolean>} Permission result
   */
  static async checkPermission(staffId, permission) {
    try {
      const staff = await Staff.findById(staffId).select('permissions role');
      if (!staff) {
        return false;
      }

      // Admin has all permissions
      if (staff.role === 'admin') {
        return true;
      }

      // Check specific permission
      return staff.permissions && staff.permissions[permission] === true;
    } catch (error) {
      console.error('❌ Error checking staff permission:', error);
      return false;
    }
  }
}

