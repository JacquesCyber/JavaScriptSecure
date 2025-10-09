import Staff from '../models/Staff.js';
import bcrypt from 'bcrypt';

export class StaffService {
  static async registerStaff(staffData) {
    try {
      const existingStaff = await Staff.findOne({
        $or: [{ email: staffData.email }, { username: staffData.username }]
      });
      if (existingStaff) throw new Error('Staff member with this email or username already exists');

      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(staffData.password, saltRounds);

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
      console.error('❌ Staff registration error:', err);
      throw err;
    }
  }

  static async loginStaff(username, password) {
    try {
      const staff = await Staff.findOne({ username: { $eq: username }, isActive: true });
      if (!staff) throw new Error('Invalid credentials');

      const valid = await bcrypt.compare(password, staff.password);
      if (!valid) throw new Error('Invalid credentials');

      staff.lastLogin = new Date();
      await staff.save();

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
    } catch (err) {
      console.error('❌ Staff login error:', err);
      throw err;
    }
  }

  static async getStaffById(staffId) {
    const staff = await Staff.findById(staffId).select('-password');
    if (!staff) throw new Error('Staff member not found');
    return staff;
  }

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
    } catch (err) {
      console.error('❌ Error updating staff:', err);
      throw err;
    }
  }

  static async getAllStaff(filters = {}) {
    const query = {};
    if (filters.department) query.department = filters.department;
    if (filters.role) query.role = filters.role;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    const staff = await Staff.find(query).select('-password').sort({ createdAt: -1 });
    return staff;
  }

  static async deactivateStaff(staffId) {
    const staff = await Staff.findById(staffId);
    if (!staff) throw new Error('Staff member not found');
    staff.isActive = false;
    await staff.save();
    return { success: true, message: 'Staff member deactivated successfully' };
  }

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
      console.error('❌ Error checking staff permission:', err);
      return false;
    }
  }
}