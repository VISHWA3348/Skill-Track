import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getCollection, setDocument, deleteDocument, queryDocuments, getDocument } from './db';
import { authenticate, checkRole, getDataIsolationFilters } from './middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

export function setupAdmin(app: express.Express) {
  
  // Auth Middleware for Admin
  // Auth Middleware for Admin (Removed internalized versions, now using imports)

  // Seed generic roles safely
  const seedDatabase = async () => {
    try {
      // Seed super admin
      const superAdmins = queryDocuments('users', [{ field: 'role', operator: '==', value: 'super_admin' }]);
      if (superAdmins.length === 0) {
        const hashedPassword = await bcrypt.hash('SuperAdmin@123', 10);
        setDocument('users', 'user_super_admin_seed', {
          uid: 'user_super_admin_seed',
          email: 'superadmin@certtrack.com',
          passwordHash: hashedPassword,
          role: 'super_admin',
          name: 'Super Admin',
          displayName: 'Super Admin',
          status: 'active',
          isActive: true,
          createdAt: new Date().toISOString()
        });
        console.log("Super admin seeded: superadmin@certtrack.com | SuperAdmin@123");
      }
    } catch (e) {
      console.error("Error seeding:", e);
    }
  };

  seedDatabase();

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: "sqlite" });
  });

  app.get("/api/admin/backup", authenticate, checkRole(["super_admin"]), (req: any, res) => {
    try {
      const collections = ["colleges", "departments", "users", "certifications", "career_activities", "audit_logs", "notifications", "settings", "permissions"];
      const backupData: any = {};

      for (const colName of collections) {
        backupData[colName] = getCollection(colName);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=backup-${new Date().toISOString()}.json`);
      res.send(JSON.stringify(backupData, null, 2));

      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'Database Backup',
        details: 'Full system backup generated',
        userId: req.userData.uid,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Backup failed", error);
      res.status(500).json({ error: "Backup failed" });
    }
  });

  app.post("/api/admin/restore", authenticate, checkRole(["super_admin"]), (req: any, res) => {
    try {
      const { backupData } = req.body;
      if (!backupData || typeof backupData !== 'object') {
        return res.status(400).json({ error: "Invalid backup data" });
      }

      const collections = ["colleges", "departments", "users", "certifications", "career_activities", "audit_logs", "notifications", "settings", "permissions"];
      
      for (const colName of collections) {
        const data = backupData[colName];
        if (data && Array.isArray(data)) {
           for(const item of data) {
             const id = item.uid || item.id || item.docId;
             if (id) {
                setDocument(colName, id, item);
             }
           }
        }
      }

      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'Database Restore',
        details: 'Full system restore performed from backup',
        userId: req.userData.uid,
        timestamp: new Date().toISOString()
      });

      res.json({ message: "Database restored successfully" });
    } catch (error: any) {
      console.error("Restore failed", error);
      res.status(500).json({ error: "Restore failed: " + error.message });
    }
  });

  app.get("/api/admin/certifications", authenticate, checkRole(["super_admin", "admin", "hod", "staff"]), (req: any, res) => {
    try {
      const certs = queryDocuments('certifications', getDataIsolationFilters('certifications', req.userData));
      res.json({ success: true, data: certs.filter((c: any) => !c.is_deleted) });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch certifications" });
    }
  });

  app.delete("/api/admin/reset-demo", authenticate, checkRole(["super_admin"]), (req: any, res) => {
    try {
      const allUsers = getCollection('users');
      for (const u of allUsers) {
        if (u.role !== 'super_admin') {
          deleteDocument('users', u.uid);
        }
      }
      
      const tablesToClear = ["certifications", "career_activities", "notifications", "audit_logs"];
      for (const table of tablesToClear) {
        const items = getCollection(table);
        for(const item of items) {
          deleteDocument(table, item.id || item.uid);
        }
      }

      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'Reset Demo Data',
        details: 'Deleted all test users and their data',
        userId: req.userData.uid,
        timestamp: new Date().toISOString()
      });

      res.json({ message: "Demo data reset successfully" });
    } catch (error: any) {
      console.error("Reset failed", error);
      res.status(500).json({ error: "Reset failed: " + error.message });
    }
  });

  app.get("/api/admin/users", authenticate, checkRole(["super_admin", "admin", "hod", "staff"]), (req: any, res) => {
    try {
      const users = queryDocuments('users', getDataIsolationFilters('users', req.userData));
      res.json({ success: true, data: users });
    } catch (error) {
      console.error("Failed to fetch users", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/stats", authenticate, checkRole(["super_admin", "admin", "hod", "staff", "student"]), (req: any, res) => {
    try {
      const callerRole = req.userData.role;
      
      // Get filtered data using isolation logic
      let users = queryDocuments('users', getDataIsolationFilters('users', req.userData));
      let certs = queryDocuments('certifications', getDataIsolationFilters('certifications', req.userData));
      let careers = queryDocuments('career_activities', getDataIsolationFilters('career_activities', req.userData));

      const totalUsers = users.length;
      const students = users.filter((u: any) => u.role === 'student');
      const totalStudents = students.length;
      const totalAdmins = users.filter((u: any) => u.role === 'admin').length;
      const totalHODs = users.filter((u: any) => u.role === 'hod').length;
      const totalStaff = users.filter((u: any) => u.role === 'staff').length;

      const totalCertificates = certs.length;
      const pendingCertificates = certs.filter((c: any) => c.status === 'pending').length;
      const staffApprovedCertificates = certs.filter((c: any) => c.status === 'staff_approved').length;
      const approvedCertificates = certs.filter((c: any) => c.status === 'approved' || c.status === 'verified').length;
      const rejectedCertificates = certs.filter((c: any) => c.status === 'rejected').length;

      const totalCareerActivities = careers.length;
      const pendingCareerActivities = careers.filter((c: any) => c.status === 'pending').length;
      const approvedCareerActivities = careers.filter((c: any) => c.status === 'approved').length;

      const collegesCount = getCollection('colleges').length;
      
      // Calculate top performers based on ALL verified data (filtered by scope)
      const allStudentScores = students.map((s: any) => {
        const studentCerts = certs.filter((c: any) => (c.user_id === s.uid || c.userId === s.uid) && (c.status === 'verified' || c.status === 'approved')).length;
        const studentActivities = careers.filter((c: any) => (c.user_id === s.uid || c.userId === s.uid) && c.status === 'approved').length;
        return {
          uid: s.uid,
          name: s.name,
          rollNo: s.roll_no || s.rollNo,
          score: (studentCerts * 10) + (studentActivities * 5),
          certsCount: studentCerts,
          activitiesCount: studentActivities
        };
      }).sort((a: any, b: any) => b.score - a.score);

      const topPerformers = allStudentScores.slice(0, 10);
      
      let studentRank = null;
      let studentScore = null;
      if (req.userData.role === 'student') {
        const index = allStudentScores.findIndex(s => s.uid === req.userData.uid);
        if (index !== -1) {
          studentRank = index + 1;
          studentScore = allStudentScores[index].score;
        }
      }

      // Additional Chart Data
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyGrowth = months.map((m, i) => {
        const studentGrowth = users.filter((u: any) => u.role === 'student' && new Date(u.created_at).getMonth() === i).length;
        const certGrowth = certs.filter((c: any) => new Date(c.created_at || c.createdAt).getMonth() === i).length;
        return { name: m, students: studentGrowth, certs: certGrowth };
      });

      const depts = [...new Set(users.map((u: any) => u.department_id || u.departmentId).filter(Boolean))];
      const deptAchievements = depts.map(d => ({
        name: d,
        certs: certs.filter((c: any) => (c.department_id === d || c.departmentId === d) && (c.status === 'verified' || c.status === 'approved')).length,
        activities: careers.filter((c: any) => (c.department_id === d || c.departmentId === d) && c.status === 'approved').length
      }));

      const activityTypes = [...new Set(careers.map((a: any) => a.type).filter(Boolean))];
      const activityDistribution = activityTypes.map(t => ({
        name: t,
        value: careers.filter((a: any) => a.type === t).length
      }));

      // System Health Stats
      const fraudulentCertificates = certs.filter((c: any) => c.fraud_flag || c.fraudFlag).length;
      const gpsVerifiedCertificates = certs.filter((c: any) => c.gps_verified || c.gpsVerified).length;

      // Recent Audit Logs (Filtered by scope)
      const recentLogs = queryDocuments('audit_logs', getDataIsolationFilters('audit_logs', req.userData))
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      const pendingCertificatesList = certs.filter((c: any) => c.status === 'pending')
        .sort((a: any, b: any) => new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime())
        .slice(0, 5);
        
      const pendingActivitiesList = careers.filter((c: any) => c.status === 'pending')
        .sort((a: any, b: any) => new Date(b.created_at || b.createdAt).getTime() - new Date(a.created_at || a.createdAt).getTime())
        .slice(0, 5);

      const recentStudents = students.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      res.json({
        success: true,
        data: {
          totalUsers,
          totalStudents,
          totalAdmins,
          totalHODs,
          totalStaff,
          totalCertificates,
          pendingCertificates,
          staffApprovedCertificates,
          approvedCertificates,
          rejectedCertificates,
          totalColleges: collegesCount,
          totalCareerActivities,
          pendingCareerActivities,
          approvedCareerActivities,
          topPerformers,
          studentRank,
          studentScore,
          fraudulentCertificates,
          gpsVerifiedCertificates,
          recentLogs,
          pendingCertificatesList,
          pendingActivitiesList,
          recentStudents,
          monthlyGrowth,
          deptAchievements,
          activityDistribution,
          systemHealth: "Operational",
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Failed to fetch stats", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.delete("/api/admin/users/:uid", authenticate, checkRole(["super_admin", "admin", "hod", "staff"]), (req: any, res) => {
    try {
      const { uid } = req.params;
      const us = queryDocuments('users', [{ field: 'uid', operator: '==', value: uid }]);
      if (us.length === 0) return res.status(404).json({ error: "User not found" });

      const userData = us[0];
      if (userData.role === 'super_admin') return res.status(403).json({ error: "Cannot delete super admin" });

      // Role hierarchy enforcement
      const roleWeights: any = { super_admin: 100, admin: 80, hod: 60, staff: 40, student: 20 };
      const creatorWeight = roleWeights[req.userData.role] || 0;
      const targetWeight = roleWeights[userData.role] || 0;

      if (uid === req.userData.uid) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      if (creatorWeight <= targetWeight && req.userData.role !== 'super_admin') {
        return res.status(403).json({ error: "Insufficient permissions to delete this user level" });
      }

      if (req.userData.role !== 'super_admin' && userData.collegeId !== req.userData.collegeId) {
        return res.status(403).json({ error: "Forbidden: College mismatch" });
      }

      if (['hod', 'staff'].includes(req.userData.role) && userData.departmentId !== req.userData.departmentId) {
        return res.status(403).json({ error: "Forbidden: Department mismatch" });
      }

      deleteDocument('users', uid);
      
      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'User Deleted',
        details: `Deleted user ${userData.email} (${uid})`,
        userId: req.userData.uid,
        collegeId: req.userData.collegeId,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.delete("/api/certifications/:id", authenticate, checkRole(["super_admin"]), (req: any, res) => {
    try {
      const { id } = req.params;
      const cert = getDocument('certifications', id);
      if (!cert) return res.status(404).json({ error: "Certificate not found" });

      // soft delete
      setDocument('certifications', id, { ...cert, is_deleted: true });

      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'DELETE_CERTIFICATE',
        details: `Deleted certificate ${id}`,
        userId: req.userData.uid,
        certificate_id: id,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, message: "Certificate safely deleted" });
    } catch (error: any) {
      console.error("Certificate delete error:", error);
      res.status(500).json({ error: "Failed to delete certificate" });
    }
  });

  app.post("/api/admin/users/bulk", authenticate, checkRole(["super_admin", "admin", "hod", "staff"]), async (req: any, res) => {
    try {
      const { users: usersToImport } = req.body;
      if (!Array.isArray(usersToImport)) throw new Error("Invalid request: users must be an array");

      const roleWeights: any = { super_admin: 100, admin: 80, hod: 60, staff: 40, student: 20 };
      const creatorWeight = roleWeights[req.userData.role] || 0;

      const results = [];
      for (const u of usersToImport) {
        try {
          const targetWeight = roleWeights[u.role || 'student'] || 0;
          if (req.userData.role !== 'super_admin' && creatorWeight <= targetWeight) {
             throw new Error(`Insufficient permissions to create user with role: ${u.role}`);
          }

          const existing = queryDocuments('users', [{ field: 'email', operator: '==', value: u.email }]);
          if (existing.length > 0) throw new Error("Email already in use");

          const uid = 'user_' + Date.now() + Math.random().toString(36).substring(2, 9);
          const password = u.password || Math.random().toString(36).substring(2, 10);
          const passwordHash = await bcrypt.hash(password, 10);
          
          const profile = {
            uid,
            name: u.name,
            email: u.email,
            role: u.role || 'student',
            collegeId: req.userData.role === 'super_admin' ? (u.collegeId || req.userData.collegeId) : req.userData.collegeId,
            departmentId: req.userData.role === 'super_admin' ? (u.departmentId || null) : (['hod', 'staff'].includes(req.userData.role) ? req.userData.departmentId : (u.departmentId || null)),
            rollNo: u.rollNo || null,
            class: u.class || null,
            year: u.year || null,
            status: 'active',
            isActive: true,
            createdAt: new Date().toISOString(),
            passwordHash
          };

          setDocument('users', uid, profile);
          results.push({ email: u.email, status: 'success', uid });
        } catch (err: any) {
          results.push({ email: u.email, status: 'error', error: err.message });
        }
      }

      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'Bulk User Import',
        details: `Imported ${results.filter(r => r.status === 'success').length} users`,
        userId: req.userData.uid,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/users", authenticate, checkRole(["super_admin", "admin", "hod", "staff"]), async (req: any, res) => {
    try {
      let { 
        email, password, name, role, collegeId, departmentId, 
        rollNo, class: className, year, section, phone, phoneNumber 
      } = req.body;
      
      const roleWeights: any = { super_admin: 100, admin: 80, hod: 60, staff: 40, student: 20 };
      const creatorRole = req.userData.role;
      const targetWeight = roleWeights[role] || 0;

      // Permission Check
      let isAllowed = false;
      if (creatorRole === 'super_admin') isAllowed = true;
      else if (creatorRole === 'admin') isAllowed = ['admin', 'hod', 'staff', 'student'].includes(role);
      else if (creatorRole === 'hod') isAllowed = ['staff', 'student'].includes(role);
      else if (creatorRole === 'staff') isAllowed = ['staff', 'student'].includes(role);

      if (!isAllowed) {
        return res.status(403).json({ error: 'Insufficient permissions to create this user level' });
      }

      if (creatorRole !== 'super_admin') {
        // Force inherit data from creator
        collegeId = req.userData.collegeId;
        if (['hod', 'staff'].includes(creatorRole)) {
           departmentId = req.userData.departmentId;
        }
      }

      const existing = queryDocuments('users', [{ field: 'email', operator: '==', value: email }]);
      if (existing.length > 0) return res.status(400).json({ error: 'Email already in use' });

      const uid = 'user_' + Date.now();
      const passwordHash = await bcrypt.hash(password || 'Password@123', 10);
      const userProfile = {
        uid, 
        name, 
        email, 
        role, 
        collegeId, 
        departmentId: departmentId || null, 
        rollNo: rollNo || null,
        class: className || null,
        year: year || null,
        section: section || null,
        phoneNumber: phoneNumber || phone || null,
        status: 'active', 
        isActive: true, 
        createdAt: new Date().toISOString(), 
        passwordHash
      };

      setDocument('users', uid, userProfile);

      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'User Created',
        details: `Created user ${email} with role ${role}`,
        userId: req.userData.uid,
        collegeId: req.userData.collegeId,
        timestamp: new Date().toISOString()
      });

      res.json({ message: 'User created successfully', uid });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create user' });
    }
  });

  app.put("/api/admin/users/:uid", authenticate, checkRole(["super_admin", "admin", "hod", "staff"]), async (req: any, res) => {
    try {
      const { uid } = req.params;
      const { name, email, role, collegeId, department_id, departmentId, rollNo, roll_no, class: className, year, section, phone, phoneNumber, phone_number, city, password } = req.body;
      
      const us = queryDocuments('users', [{ field: 'uid', operator: '==', value: uid }]);
      if (us.length === 0) return res.status(404).json({ error: "User not found" });

      const userData = us[0];

      const roleWeights: any = { super_admin: 100, admin: 80, hod: 60, staff: 40, student: 20 };
      const creatorWeight = roleWeights[req.userData.role] || 0;
      const currentTargetWeight = roleWeights[userData.role] || 0;
      const newTargetWeight = roleWeights[role] || currentTargetWeight;

      const updates: any = {};
      if (req.userData.role !== 'super_admin') {
        if (creatorWeight <= currentTargetWeight) return res.status(403).json({ error: "Insufficient permissions to edit this user level" });
        if (role && creatorWeight <= newTargetWeight) return res.status(403).json({ error: "Insufficient permissions to assign this user level" });
        if (userData.collegeId !== req.userData.collegeId) return res.status(403).json({ error: "Forbidden: College mismatch" });
        if (['hod', 'staff'].includes(req.userData.role) && userData.departmentId !== req.userData.departmentId) {
          return res.status(403).json({ error: "Forbidden: Department mismatch" });
        }
        // Force keep existing values for non-superadmin
        updates.collegeId = userData.collegeId;
        if (['hod', 'staff'].includes(req.userData.role)) {
          updates.departmentId = userData.departmentId;
        }
      }
      if (name) updates.name = name;
      if (name) updates.displayName = name; // sync it
      if (email) updates.email = email;
      if (role) updates.role = role;
      if (collegeId !== undefined) updates.collegeId = collegeId;
      if (departmentId !== undefined || department_id !== undefined) updates.departmentId = departmentId || department_id || null;
      if (rollNo !== undefined || roll_no !== undefined) updates.rollNo = rollNo || roll_no;
      if (className !== undefined) updates.class = className;
      if (year !== undefined) updates.year = year;
      if (section !== undefined) updates.section = section;
      if (city !== undefined) updates.city = city;
      if (phoneNumber !== undefined || phone !== undefined || phone_number !== undefined) updates.phoneNumber = phoneNumber || phone || phone_number;
      if (password) updates.passwordHash = await bcrypt.hash(password, 10);
      
      // Update updated_at if possible
      updates.updatedAt = new Date().toISOString();

      setDocument('users', uid, { ...userData, ...updates });

      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'User Updated',
        details: `Updated user ${userData.email} (${uid})`,
        userId: req.userData.uid,
        collegeId: req.userData.collegeId,
        timestamp: new Date().toISOString()
      });

      res.json({ message: 'User updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update user' });
    }
  });

  app.put("/api/admin/users/:uid/status", authenticate, checkRole(["super_admin", "admin", "hod", "staff"]), (req: any, res) => {
    try {
      const { uid } = req.params;
      const { status, isActive } = req.body;

      const us = queryDocuments('users', [{ field: 'uid', operator: '==', value: uid }]);
      if (us.length === 0) return res.status(404).json({ error: "User not found" });

      const isAct = isActive !== undefined ? isActive : (status === 'active');
      const stat = status || (isActive ? 'active' : 'inactive');

      setDocument('users', uid, { ...us[0], status: stat, isActive: isAct });

      setDocument('auditLogs', 'log_' + Date.now(), {
        action: `User Status Updated`,
        details: `User ${uid} status changed to ${stat}`,
        userId: req.userData.uid,
        timestamp: new Date().toISOString()
      });

      res.json({ message: "User status updated successfully" });
    } catch (error: any) {
      console.error("Status update error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
