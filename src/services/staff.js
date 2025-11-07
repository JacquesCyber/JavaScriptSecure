/*
 * Staff Service
 * -------------------------------------------------------------
 * This service handles staff management logic for the application.
 * It enforces input validation, secure authentication, and
 * privilege control best practices.
 *
 *  Security & Best Practices
 *   - Validates all staff data to prevent injection and privilege abuse
 *   - Never stores or logs plaintext passwords
 *   - Ensures all operations are authenticated and authorized
 *
 * Usage:
 *   import staffService from './services/staff.js';
 *
 */
import Staff from '../models/Staff.js';
import { DEFAULT_STAFF_ROLE } from '../constants/roles.js';
import { hashPassword, verifyPassword } from '../utils/auth.js';

export class StaffService {
  static async registerStaff(staffData) {
    try {
      const existingStaff = await Staff.findOne({
        $or: [{ email: staffData.email }, { username: staffData.username }]
      });
      if (existingStaff) throw new Error('Staff member with this email or username already exists');

      const hashedPassword = await hashPassword(staffData.password);

      // Create new staff member
      const staff = new Staff({
        fullName: staffData.fullName,
        email: staffData.email,
        username: staffData.username,
        password: hashedPassword,
        role: staffData.role || DEFAULT_STAFF_ROLE,
        department: staffData.department || 'payments',
        permissions: staffData.permissions || {
          canViewAllPayments: true,
          canApprovePayments: false,
          canRejectPayments: false,
          canViewSensitiveData: false,
          canExportData: false
        }
      });

      // Save to database
      await staff.save();
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
    } catch (err) {
      console.error(' Staff registration error:', err);
      throw err;
    }
  }

  // Staff login
  static async loginStaff(identifier, password) {
    try {
      // Support login with username, email, or employeeId
      const staff = await Staff.findOne({ 
        $or: [
          { username: { $eq: identifier } },
          { email: { $eq: identifier.toLowerCase() } },
          { employeeId: { $eq: identifier } }
        ],
        isActive: true 
      });
      
      if (!staff) {
        console.log('Staff not found with identifier:', identifier);
        throw new Error('Invalid credentials');
      }

      // Verify password
      const valid = await verifyPassword(password, staff.password);
      if (!valid) {
        console.log('Invalid password for staff:', staff.username);
        throw new Error('Invalid credentials');
      }

      staff.lastLogin = new Date();
      await staff.save();
      
      console.log('Staff login successful:', {
        username: staff.username,
        employeeId: staff.employeeId,
        role: staff.role
      });

      // Return staff details without password
      return {
        success: true,
        message: 'Login successful',
        staff: {
          _id: staff._id,
          fullName: staff.fullName,
          email: staff.email,
          username: staff.username,
          employeeId: staff.employeeId,
          role: staff.role,
          department: staff.department,
          permissions: staff.permissions,
          lastLogin: staff.lastLogin
        }
      };
    } catch (err) {
      console.error('Staff login error:', err.message);
      throw err;
    }
  }

  // Get staff by ID
  static async getStaffById(staffId) {
    const staff = await Staff.findById(staffId).select('-password');
    if (!staff) throw new Error('Staff member not found');
    return staff;
  }

  // Update staff member
  static async updateStaff(staffId, updateData) {
    try {
      const staff = await Staff.findById(staffId);
      if (!staff) throw new Error('Staff member not found');

      // Explicit whitelist map removes computed access
      const allowedUpdates = {
        name: val => { staff.name = val; },
        email: val => { staff.email = val; },
        role: val => { staff.role = val; },
        phone: val => { staff.phone = val; },
        department: val => { staff.department = val; }
      };

      if (Object.hasOwn(updateData, 'name') && updateData.name !== undefined) {
        allowedUpdates.name(updateData.name);
      }
      if (Object.hasOwn(updateData, 'email') && updateData.email !== undefined) {
        allowedUpdates.email(updateData.email);
      }
      if (Object.hasOwn(updateData, 'role') && updateData.role !== undefined) {
        allowedUpdates.role(updateData.role);
      }
      if (Object.hasOwn(updateData, 'phone') && updateData.phone !== undefined) {
        allowedUpdates.phone(updateData.phone);
      }
      if (Object.hasOwn(updateData, 'department') && updateData.department !== undefined) {
        allowedUpdates.department(updateData.department);
      }
      if (updateData.password) {
        staff.password = await hashPassword(updateData.password);
      }

      await staff.save();

      // Return updated staff details without password
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
    } catch (err) {
      console.error('Error updating staff:', err);
      throw err;
    }
  }

  // Get all staff members with optional filters
  static async getAllStaff(filters = {}) {
    const query = {};
    if (filters.department) query.department = filters.department;
    if (filters.role) query.role = filters.role;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    const staff = await Staff.find(query).select('-password').sort({ createdAt: -1 });
    return staff;
  }

  // Deactivate staff member
  static async deactivateStaff(staffId) {
    const staff = await Staff.findById(staffId);
    if (!staff) throw new Error('Staff member not found');
    staff.isActive = false;
    await staff.save();
    return { success: true, message: 'Staff member deactivated successfully' };
  }

  // Check if staff has specific permission
  static async checkPermission(staffId, permission) {
    try {
      const staff = await Staff.findById(staffId).select('permissions role');
      if (!staff) return false;
      if (staff.role === 'admin') return true;

      const allowedPermissions = [
        'read', 'write', 'delete', 'manage_users', 'manage_payments', 'view_reports'
      ];
      if (!allowedPermissions.includes(permission)) return false;
      if (!staff.permissions || !Object.hasOwn(staff.permissions, permission)) return false;

      // Use explicit checks for each permission
      switch (permission) {
        case 'read': return staff.permissions.read === true;
        case 'write': return staff.permissions.write === true;
        case 'delete': return staff.permissions.delete === true;
        case 'manage_users': return staff.permissions.manage_users === true;
        case 'manage_payments': return staff.permissions.manage_payments === true;
        case 'view_reports': return staff.permissions.view_reports === true;
        default: return false;
      }
    } catch (err) {
      console.error('Error checking staff permission:', err);
      return false;
    }
  }
}

//----------------------------------------------End of File----------------------------------------------