import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db, getCollection, getDocument, setDocument, deleteDocument, queryDocuments } from './db';
import { hashPassword, comparePassword, generateToken, verifyToken, validatePassword } from './auth';
import { authenticate, checkRole, getDataIsolationFilters, rateLimiter } from './middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

// Keep uploads folder
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const CERTS_DIR = path.join(UPLOADS_DIR, 'certificates');
const PHOTOS_DIR = path.join(UPLOADS_DIR, 'photos');

for (const dir of [UPLOADS_DIR, CERTS_DIR, PHOTOS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.query.type === 'photo' ? 'photos' : 'certificates';
    cb(null, path.join(UPLOADS_DIR, type));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only JPG, PNG, and PDF are allowed.'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

export function setupApi(app: express.Express) {
  
  // ============================================
  // MOCK AUTHENTICATION API
  // ============================================
  
  app.post('/api/auth/verify-signup-code', async (req, res) => {
    const { code } = req.body;
    try {
      if (!code) return res.status(400).json({ error: 'Code is required' });

      const signupCode = db.prepare(`
        SELECT s.*, c.name as college_name, d.name as department_name
        FROM signup_codes s
        JOIN colleges c ON s.college_id = c.id
        JOIN departments d ON s.department_id = d.id
        WHERE s.code = ? AND s.is_active = 1
      `).get(code) as any;

      if (!signupCode) {
        return res.status(404).json({ error: 'Invalid or unauthorized signup code' });
      }

      // Check expiry
      if (signupCode.expiry_date && new Date(signupCode.expiry_date) < new Date()) {
        return res.status(400).json({ error: 'This signup code has expired' });
      }

      // Check usage limit
      if (signupCode.usage_limit !== -1 && signupCode.usage_count >= signupCode.usage_limit) {
        return res.status(400).json({ error: 'This signup code usage limit has been reached' });
      }

      res.json({ 
        success: true, 
        data: {
          collegeId: signupCode.college_id,
          collegeName: signupCode.college_name,
          departmentId: signupCode.department_id,
          departmentName: signupCode.department_name,
          batchYear: signupCode.batch_year,
          role: signupCode.role
        } 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    const { 
      email, password, name, role, collegeId, departmentId, 
      rollNo, class: className, year, section, city, phoneNumber, collegeName, skills, bio,
      signupCode // [NEW]
    } = req.body;
    try {
      // 0. Check if registration is enabled
      const regSetting = db.prepare("SELECT value FROM settings WHERE key = 'registration_enabled'").get() as any;
      const regEnabled = regSetting ? JSON.parse(regSetting.value) : true;
      if (!regEnabled) return res.status(403).json({ error: 'auth/registration-disabled', message: 'Public registration is currently disabled by administrator.' });

      if (!email || !password) return res.status(400).json({ error: 'auth/invalid-credential', message: 'Email and password are required' });

      // [NEW] SECURE SIGNUP CODE VERIFICATION
      if (!signupCode) {
        return res.status(403).json({ error: 'auth/code-required', message: 'Secure Signup Code is mandatory for registration.' });
      }

      const verifiedCode = db.prepare(`
        SELECT * FROM signup_codes WHERE code = ? AND is_active = 1
      `).get(signupCode) as any;

      if (!verifiedCode) {
        return res.status(403).json({ error: 'auth/invalid-code', message: 'Invalid or unauthorized signup code' });
      }

      if (verifiedCode.expiry_date && new Date(verifiedCode.expiry_date) < new Date()) {
        return res.status(403).json({ error: 'auth/expired-code', message: 'Signup code has expired' });
      }

      if (verifiedCode.usage_limit !== -1 && verifiedCode.usage_count >= verifiedCode.usage_limit) {
        return res.status(403).json({ error: 'auth/usage-limit', message: 'Signup code usage limit reached' });
      }

      // Enforce data from code
      const finalCollegeId = verifiedCode.college_id;
      const finalDeptId = verifiedCode.department_id;
      const finalRole = verifiedCode.role || 'student';
      const finalYear = verifiedCode.batch_year || year;

      const existing = db.prepare('SELECT email FROM users WHERE email = ?').get(email);
      if (existing) return res.status(400).json({ error: 'auth/email-already-in-use', message: 'Email already exists' });

      // Validate password strength
      const v = validatePassword(password);
      if (!v.valid) return res.status(400).json({ error: 'auth/weak-password', message: v.message });

      // Generate UID
      const uid = 'user_' + Date.now() + Math.random().toString(36).substring(2, 9);
      const hashedPassword = await hashPassword(password);
      
      const newUser = {
        uid,
        email,
        name: name || 'User',
        password_hash: hashedPassword,
        role: finalRole,
        college_id: finalCollegeId,
        department_id: finalDeptId,
        roll_no: rollNo || null,
        class: className || null,
        year: finalYear || null,
        section: section || null,
        city: city || null,
        phone_number: phoneNumber || null,
        college_name: collegeName || null,
        skills: skills || null,
        bio: bio || null,
        created_at: new Date().toISOString()
      };

      db.prepare(`
        INSERT INTO users (
          uid, name, email, password_hash, role, 
          college_id, department_id, roll_no, class, year, 
          section, city, phone_number, college_name, skills, bio, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newUser.uid, newUser.name, newUser.email, newUser.password_hash, newUser.role, 
        newUser.college_id, newUser.department_id, newUser.roll_no, newUser.class, newUser.year, 
        newUser.section, newUser.city, newUser.phone_number, newUser.college_name, newUser.skills, newUser.bio, newUser.created_at
      );

      // Increment code usage
      db.prepare('UPDATE signup_codes SET usage_count = usage_count + 1 WHERE code = ?').run(signupCode);

      // If student, add to students table for academic linkage
      if (newUser.role === 'student') {
        db.prepare(`
          INSERT INTO students (user_id, roll_no, department_id, college_id, class, year, section)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          newUser.uid, newUser.roll_no, newUser.department_id, newUser.college_id, 
          newUser.class, newUser.year, newUser.section
        );
      }

      const token = generateToken({ uid, email });
      res.json({ token, user: { uid, email, displayName: newUser.name, role: newUser.role } });
    } catch (e: any) {
      console.error("User creation error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/auth/login', rateLimiter, async (req, res) => {
    const { email, password } = req.body;
    try {
      if (!email || !password) return res.status(400).json({ error: 'auth/invalid-credential', message: 'Invalid credentials' });

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      if (!user) return res.status(400).json({ error: 'auth/invalid-credential', message: 'Invalid credentials' });

      // Check Maintenance Mode
      const mainSetting = db.prepare("SELECT value FROM settings WHERE key = 'maintenance_mode'").get() as any;
      const maintenanceMode = mainSetting ? JSON.parse(mainSetting.value) : false;
      if (maintenanceMode && user.role !== 'super_admin' && user.role !== 'admin') {
        return res.status(503).json({ error: 'auth/maintenance-mode', message: 'System is currently under maintenance. Only administrators can login.' });
      }

      // Fetch dynamic security settings
      const limitSetting = db.prepare("SELECT value FROM settings WHERE key = 'login_retry_limit'").get() as any;
      const limit = limitSetting ? JSON.parse(limitSetting.value) : 10;

      if (user.login_attempts >= limit) {
         return res.status(403).json({ 
           error: 'auth/account-locked', 
           message: `Account locked due to multiple failed attempts. Please contact admin.` 
         });
      }

      if (!user.password_hash) return res.status(400).json({ error: 'auth/invalid-credential', message: 'Invalid credentials' });
      
      const valid = await comparePassword(password, user.password_hash);
      
      if (!valid) {
        // Increment failed attempts
        const newAttempts = (user.login_attempts || 0) + 1;
        db.prepare('UPDATE users SET login_attempts = ? WHERE uid = ?').run(newAttempts, user.uid);
        return res.status(400).json({ error: 'auth/invalid-credential', message: 'Invalid credentials' });
      }

      // Successful login - Reset attempts
      db.prepare("UPDATE users SET login_attempts = 0, last_login = CURRENT_TIMESTAMP WHERE uid = ?").run(user.uid);

      const token = generateToken({ uid: user.uid, email: user.email });
      res.json({ token, user: { uid: user.uid, email: user.email, displayName: user.name, role: user.role } });
    } catch (e: any) {
      console.error("Login attempt error:", e.message); // Not logging password!
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.use('/uploads', express.static(UPLOADS_DIR));

  app.post('/api/upload', authenticate, upload.single('file'), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const type = req.query.type === 'photo' ? 'photos' : 'certificates';
    const fileUrl = `/uploads/${type}/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.filename });
  });

  app.get("/api/auth/verify", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: 'auth/unauthorized', message: 'No token provided' });
    const token = authHeader.split("Bearer ")[1];
    
    try {
      const decoded = verifyToken(token);
      if (!decoded) return res.status(401).json({ error: 'auth/invalid-token', message: 'Invalid token' });

      const user = db.prepare('SELECT uid, name, email, role, phone_number as phone, profile_photo, bio, college_id as collegeId, department_id as departmentId, roll_no as rollNo, class, year, preferences, social_links, skills FROM users WHERE uid = ?').get(decoded.uid) as any;
      if (!user) return res.status(401).json({ error: 'auth/user-not-found', message: 'User not found' });

      res.json({ user: { 
        uid: user.uid, 
        email: user.email, 
        displayName: user.name, 
        role: user.role,
        phone: user.phone,
        profilePhoto: user.profile_photo,
        collegeId: user.collegeId,
        departmentId: user.departmentId,
        rollNo: user.rollNo,
        class: user.class,
        year: user.year,
        skills: user.skills ? user.skills : '',
        bio: user.bio || '',
        preferences: user.preferences ? JSON.parse(user.preferences) : {},
        socialLinks: user.social_links ? JSON.parse(user.social_links) : {}
      } });
    } catch (e: any) {
      res.status(401).json({ error: 'auth/verification-failed', message: 'Verification failed' });
    }
  });

  app.put('/api/users/profile', authenticate, async (req: any, res) => {
    try {
      const uid = req.user.uid;
      const { 
        name, phone, profilePhoto, rollNo, className, year, section, 
        departmentId, collegeId, collegeName, city, preferences, socialLinks, skills, bio 
      } = req.body;
      
      const userData = db.prepare('SELECT role FROM users WHERE uid = ?').get(uid) as any;
      if (!userData) return res.status(404).json({ error: 'User not found' });

      // Update common fields
      const commonFields: any = { name, phone_number: phone, profile_photo: profilePhoto, city, university: collegeName, skills, bio };
      if (preferences !== undefined) commonFields.preferences = JSON.stringify(preferences);
      if (socialLinks !== undefined) commonFields.social_links = JSON.stringify(socialLinks);
      if (collegeId !== undefined) commonFields.college_id = collegeId;
      if (departmentId !== undefined) commonFields.department_id = departmentId;
      if (rollNo !== undefined) commonFields.roll_no = rollNo;
      if (className !== undefined) commonFields.class = className;
      if (year !== undefined) commonFields.year = year;
      if (section !== undefined) commonFields.section = section;
      if (collegeName !== undefined) commonFields.college_name = collegeName;

      // Update users table
      Object.keys(commonFields).forEach(key => {
        if (commonFields[key] !== undefined) {
          db.prepare(`UPDATE users SET ${key} = ? WHERE uid = ?`).run(commonFields[key], uid);
        }
      });
      
      // Update student-specific fields in students table
      if (userData.role === 'student') {
        db.prepare(`
          UPDATE students 
          SET roll_no = COALESCE(?, roll_no), 
              class = COALESCE(?, class), 
              year = COALESCE(?, year),
              section = COALESCE(?, section),
              department_id = COALESCE(?, department_id),
              college_id = COALESCE(?, college_id)
          WHERE user_id = ?
        `).run(rollNo || null, className || null, year || null, section || null, departmentId || null, collegeId || null, uid);
      }

      const updatedUser = db.prepare(`
        SELECT uid, name, email, role, phone_number as phone, profile_photo, bio, 
               college_id as collegeId, department_id as departmentId, roll_no as rollNo, 
               class, year, section, city, college_name as collegeName, preferences, social_links as socialLinks, skills 
        FROM users WHERE uid = ?
      `).get(uid) as any;
      
      res.json({ success: true, user: {
        ...updatedUser,
        bio: updatedUser.bio || '',
        skills: updatedUser.skills || '',
        preferences: updatedUser.preferences ? JSON.parse(updatedUser.preferences) : {},
        socialLinks: updatedUser.socialLinks ? JSON.parse(updatedUser.socialLinks) : {}
      }});
    } catch (e: any) {
      console.error('Profile update error:', e);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/users/change-password', authenticate, async (req: any, res) => {
    try {
      const uid = req.user.uid;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required' });
      }

      const user = db.prepare('SELECT password_hash FROM users WHERE uid = ?').get(uid) as any;
      if (!user || !user.password_hash) {
        return res.status(404).json({ error: 'User not found or invalid' });
      }

      const valid = await comparePassword(currentPassword, user.password_hash);
      if (!valid) {
        return res.status(400).json({ error: 'Incorrect current password' });
      }

      const v = validatePassword(newPassword);
      if (!v.valid) {
        return res.status(400).json({ error: v.message });
      }

      const hashedPassword = await hashPassword(newPassword);
      db.prepare('UPDATE users SET password_hash = ? WHERE uid = ?').run(hashedPassword, uid);

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (e: any) {
      console.error('Password change error:', e);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // College Admin update endpoint
  app.put('/api/college/profile', authenticate, checkRole(['super_admin', 'admin']), async (req: any, res) => {
    try {
      const { name, location, lat, lng } = req.body;
      const collegeId = req.userData.college_id;
      
      if (!collegeId) return res.status(400).json({ error: 'No college associated with this account' });

      if (name) db.prepare('UPDATE colleges SET name = ? WHERE id = ?').run(name, collegeId);
      if (location) db.prepare('UPDATE colleges SET location = ? WHERE id = ?').run(location, collegeId);
      if (lat !== undefined) db.prepare('UPDATE colleges SET lat = ? WHERE id = ?').run(lat, collegeId);
      if (lng !== undefined) db.prepare('UPDATE colleges SET lng = ? WHERE id = ?').run(lng, collegeId);

      const updated = db.prepare('SELECT * FROM colleges WHERE id = ?').get(collegeId);
      res.json({ success: true, data: updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  // ============================================
  // OPPORTUNITIES MODULE
  // ============================================

  app.get('/api/opportunities', authenticate, (req: any, res) => {
    try {
      const opps = db.prepare("SELECT * FROM opportunities ORDER BY created_at DESC").all();
      res.json({ success: true, data: opps });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to fetch opportunities' });
    }
  });

  app.post('/api/opportunities', authenticate, checkRole(['super_admin', 'admin']), (req: any, res) => {
    try {
      const id = Date.now().toString();
      const { title, company_name, type, required_skills, location, description, external_link, deadline } = req.body;
      
      const insertStmt = db.prepare(`
        INSERT INTO opportunities (id, title, company_name, type, required_skills, location, description, external_link, deadline)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertStmt.run(id, title, company_name, type, required_skills, location, description, external_link, deadline);
      
      // Matching Engine logic
      if (required_skills) {
        const skillsReq = required_skills.split(',').map((s: string) => s.trim().toLowerCase());
        const students = db.prepare("SELECT uid, skills, name FROM users WHERE role = 'student' AND skills IS NOT NULL AND skills != ''").all() as any[];
        
        let matchCount = 0;
        const noteStmt = db.prepare("INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)");
        
        students.forEach(student => {
          const sSkills = student.skills.split(',').map((s: string) => s.trim().toLowerCase());
          // check for intersection
          const hasMatch = skillsReq.some((reqSkill: string) => sSkills.includes(reqSkill));
          if (hasMatch) {
            noteStmt.run(
              Date.now().toString() + Math.random().toString().slice(2, 6), 
              student.uid, 
              "Recommended Opportunity Match!",
              `A new ${type} at ${company_name} matches your skills: ${title}. Check it out!`,
              "info"
            );
            matchCount++;
          }
        });
        console.log(`[Matching Engine] Opportunity ${id} matched with ${matchCount} students.`);
      }

      res.json({ success: true, message: 'Opportunity created successfully', id });
    } catch (e: any) {
      console.error('Error creating opportunity:', e);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/opportunities/:id', authenticate, checkRole(['super_admin', 'admin']), (req: any, res) => {
    try {
      db.prepare("DELETE FROM opportunities WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to delete' });
    }
  });

  // Legacy health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: "sqlite", timestamp: new Date().toISOString() });
  });

  app.post('/api/seed-users', async (req, res) => {
    try {
      // 1. Ensure College & Dept (already done in existing logic)
      let college = getDocument('colleges', 'COL001');
      if (!college) setDocument('colleges', 'COL001', { id: 'COL001', name: 'Test Engineering College', location: 'Test City', createdAt: new Date().toISOString() });
      
      let department = getDocument('departments', 'CSE');
      if (!department) setDocument('departments', 'CSE', { id: 'CSE', collegeId: 'COL001', name: 'Computer Science & Engineering' });

      const seedUsers = [
        { email: 'superadmin@example.com', password: 'password123', role: 'super_admin', name: 'Super Admin' },
        { email: 'superadmin@certtrack.com', password: 'SuperAdminPassword123!', role: 'super_admin', name: 'Super Admin' },
        { email: 'admin@test.com', password: 'Admin@123', role: 'admin', name: 'College Admin', collegeId: 'COL001' },
        { email: 'hod@test.com', password: 'Hod@123', role: 'hod', name: 'HOD User', collegeId: 'COL001', departmentId: 'CSE' },
        { email: 'staff@test.com', password: 'Staff@123', role: 'staff', name: 'Staff User', collegeId: 'COL001', departmentId: 'CSE' },
        { email: 'student@test.com', password: 'Student@123', role: 'student', name: 'Student User', collegeId: 'COL001', departmentId: 'CSE', rollNo: 'STU001', class: 'CS-A', year: '3rd' }
      ];

      let inserted = 0;
      let skipped = 0;
      
      for (const u of seedUsers) {
        const existing = db.prepare('SELECT uid FROM users WHERE email = ?').get(u.email);
        if (existing) {
          skipped++;
          continue;
        }

        // We skip strict password validation for seed users since test passwords (like Hod@123) might not meet the strict length requirements
        const uid = 'user_' + Date.now() + Math.random().toString(36).substring(2, 9);
        const hashedPassword = await hashPassword(u.password);
        
        db.prepare(`
          INSERT INTO users (uid, name, email, password_hash, role, college_id, department_id, roll_no, class, year, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uid, u.name, u.email, hashedPassword, u.role, u.collegeId || null, u.departmentId || null, u.rollNo || null, u.class || null, u.year || null, new Date().toISOString());

        // Students Table entry
        if (u.role === 'student' && u.rollNo) {
          db.prepare(`
            INSERT INTO students (user_id, roll_no, class, year, department_id, college_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(uid, u.rollNo, u.class, u.year, u.departmentId, u.collegeId);
        }

        inserted++;
      }

      res.json({ message: "Seed users created successfully", inserted, skipped });
    } catch (e: any) {
      console.error("Seeding error:", e.message);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Public endpoints for signup
  app.get('/api/public/colleges', (req, res) => {
    try {
      const docs = queryDocuments('colleges');
      res.json({ success: true, data: docs });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/public/departments', (req, res) => {
    try {
      const docs = queryDocuments('departments');
      res.json({ success: true, data: docs });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================
  // ADMIN USER MANAGEMENT
  // ============================================

  app.get('/api/admin/users', authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff']), (req: any, res) => {
    try {
      const isolationConditions = getDataIsolationFilters('users', req.userData);
      const docs = queryDocuments('users', isolationConditions);
      res.json({ success: true, data: docs });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/users', authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff']), async (req: any, res) => {
    try {
      const data = { ...req.body };
      if (!data.email || !data.password) return res.status(400).json({ error: 'Missing required fields' });

      // Check permissions (e.g. HOD can only create Staff/Student)
      const creatorRole = req.userData.role;
      if (creatorRole === 'hod' && !['staff', 'student'].includes(data.role)) 
        return res.status(403).json({ error: 'HOD can only create Staff or Students' });
      if (creatorRole === 'staff' && data.role !== 'student')
        return res.status(403).json({ error: 'Staff can only create Students' });

      const existing = db.prepare('SELECT email FROM users WHERE email = ?').get(data.email);
      if (existing) return res.status(400).json({ error: 'Email already exists' });

      if (data.password) {
        data.password_hash = await hashPassword(data.password);
        delete data.password;
      } else {
        return res.status(400).json({ error: 'Password is required' });
      }

      const uid = data.uid || ('user_' + Date.now() + Math.random().toString(36).substring(2, 9));
      const saved = setDocument('users', uid, data);

      if (data.role === 'student') {
        setDocument('students', uid, data);
      }

      res.json({ success: true, data: saved, uid });
    } catch (e: any) {
      console.error("Admin user creation error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/users/:id', authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const data = { ...req.body };
      
      const user = getDocument('users', id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Password update if provided
      if (data.password && data.password.trim() !== "") {
        data.password_hash = await hashPassword(data.password);
      }
      delete data.password;

      const updated = setDocument('users', id, data);
      if (user.role === 'student' || data.role === 'student') {
        setDocument('students', id, data);
      }

      res.json({ success: true, data: updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/admin/users/:id/status', authenticate, checkRole(['super_admin', 'admin', 'hod']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const user = getDocument('users', id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      db.prepare('UPDATE users SET status = ? WHERE uid = ?').run(status, id);
      res.json({ success: true, status });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/admin/users/:id', authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff']), async (req: any, res) => {
    try {
      const { id } = req.params;
      // Prevent deleting self
      if (id === req.userData.uid) return res.status(400).json({ error: "Cannot delete your own account" });
      
      const user = getDocument('users', id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Deletion restrictions
      if (req.userData.role !== 'super_admin' && user.role === 'super_admin') 
        return res.status(403).json({ error: "Only Super Admins can delete other Super Admins" });

      deleteDocument('users', id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================
  // MOCK FIRESTORE API
  // ============================================

  // Auth Middleware for Firestore (Removed internalized versions, now using imports)

  app.get('/api/firestore/:collection', authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff', 'student']), (req: any, res) => {
    try {
      const collection = req.params.collection;
      const isolationConditions = getDataIsolationFilters(collection, req.userData);
      const docs = queryDocuments(collection, isolationConditions);
      res.json({ success: true, data: docs });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/firestore/:collection/query', authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff', 'student']), (req: any, res) => {
    try {
      const collection = req.params.collection;
      const { conditions, orderBys, limit } = req.body;
      
      const isolationConditions = getDataIsolationFilters(collection, req.userData);
      const combinedConditions = [...(conditions || []), ...isolationConditions];
      
      const docs = queryDocuments(collection, combinedConditions, orderBys || [], limit);
      res.json({ success: true, data: docs });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/firestore/:collection/:id', authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff', 'student']), (req: any, res) => {
    try {
      const collection = req.params.collection;
      const doc = getDocument(collection, req.params.id);
      
      if (!doc) return res.status(404).json({ error: 'Not found' });
      
      // Secondary check for isolation (if fetching by ID)
      const role = req.userData.role;
      const ownerId = doc.user_id || doc.userId;
      if (role !== 'super_admin') {
        if (collection === 'certifications' && role === 'student' && ownerId !== req.userData.uid) {
           return res.status(403).json({ error: "Forbidden: Not your document" });
        }
      }
      
      res.json({ success: true, data: doc });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/firestore/:collection/:id', authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff', 'student']), async (req: any, res) => {
    // Only admins or super admins can modify core data via this generic endpoint
    // Students can only upload via specific /api/upload
    const collection = req.params.collection;
    const role = req.userData?.role;

    if (['users', 'students', 'colleges', 'departments', 'auditLogs', 'settings', 'permissions'].includes(collection) && role !== 'super_admin' && role !== 'admin') {
      const id = req.params.id;
      // Allow users to update their own profile record in 'users' or 'students' collection
      if ((collection === 'users' || collection === 'students') && id === req.userData.uid) {
        // Continue to update
      } else {
        return res.status(403).json({ error: "Forbidden: Access restricted" });
      }
    }

    try {
      const data = { ...req.body.data };
      
      // Hash password if provided for users/students
      if (['users', 'students'].includes(collection) && data.password && data.password.trim() !== '') {
        data.password_hash = await hashPassword(data.password);
        delete data.password;
      }

      // Use positional args for setDocument/update
      const updated = setDocument(collection, req.params.id, data);
      res.json({ success: true, data: updated, id: req.params.id });
    } catch (e: any) {
      console.error(`Error setting document ${collection}/${req.params.id}:`, e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/firestore/:collection', authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff', 'student']), async (req: any, res) => {
    const collection = req.params.collection;
    const role = req.userData?.role;

    // Students can create certifications/activities, but not colleges/users/etc.
    if (['users', 'colleges', 'departments', 'settings', 'permissions'].includes(collection) && role !== 'super_admin' && role !== 'admin') {
      return res.status(403).json({ error: "Forbidden" });
    }

    try {
      const data = { ...req.body.data };
      
      // Hash password if provided for users/students
      if (['users', 'students'].includes(collection) && data.password && data.password.trim() !== '') {
        data.password_hash = await hashPassword(data.password);
        delete data.password;
      }

      const id = (collection === 'certifications' ? 'cert_' : 'doc_') + Date.now() + Math.random().toString(36).substring(2, 9);
      const saved = setDocument(collection, id, data);
      res.json({ success: true, data: saved, id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/firestore/:collection/:id', authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff', 'student']), (req: any, res) => {
    const role = req.userData?.role;

    // Only allow super admin to delete permanently via this endpoint
    if (role !== 'super_admin') {
      return res.status(403).json({ error: "Forbidden: Permanent deletion requires Super Admin privileges" });
    }

    try {
      deleteDocument(req.params.collection, req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================
  // MOCK STORAGE API AND UPLOAD ENDPOINT
  // ============================================
  
  app.post('/api/storage/upload', authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff', 'student']), upload.single('file'), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    const type = req.query.type === 'photo' ? 'photos' : 'certificates';
    const fileUrl = `/uploads/${type}/${req.file.filename}`;
    res.json({ url: fileUrl, path: req.file.path });
  });

  app.post('/api/certifications', authenticate, upload.fields([
    { name: 'certificate', maxCount: 1 },
    { name: 'photo', maxCount: 1 }
  ]), checkRole(['super_admin', 'admin', 'hod', 'staff', 'student']), (req: any, res) => {
    try {
      const files = (req.files || {}) as { [fieldname: string]: Express.Multer.File[] };
      const certificateFile = files['certificate']?.[0];
      const photoFile = files['photo']?.[0];

      const { studentName, rollNo, class: className, year, phoneNumber, city, collegeName, collegeId, departmentId, eventName, eventCollegeName, type, date, gpsLat, gpsLng } = req.body;

      const certUrl = certificateFile ? `/uploads/certificates/${certificateFile.filename}` : req.body.fileUrl;
      const photoUrl = photoFile ? `/uploads/photos/${photoFile.filename}` : req.body.photoUrl;

      const id = 'cert_' + Date.now() + Math.random().toString(36).substring(2, 9);
      
      const dataToSave = {
        userId: req.userData.uid,
        studentName,
        rollNo,
        class: className,
        year,
        phoneNumber,
        city,
        collegeName,
        collegeId,
        departmentId,
        eventName,
        eventCollegeName,
        type,
        date,
        fileUrl: certUrl,
        photoUrl: photoUrl,
        gps: {
          lat: (gpsLat && !isNaN(parseFloat(gpsLat))) ? parseFloat(gpsLat) : 0,
          lng: (gpsLng && !isNaN(parseFloat(gpsLng))) ? parseFloat(gpsLng) : 0
        },
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const saved = setDocument('certifications', id, dataToSave);
      
      // Audit log
      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'UPLOAD_CERTIFICATE',
        details: `Certificate uploaded for event: ${eventName}`,
        userId: req.userData.uid,
        collegeId: req.userData.collegeId,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, data: saved, id });
    } catch (e: any) {
      console.error("Upload error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/certifications/:id/status', authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff']), (req: any, res) => {
    try {
      const { id } = req.params;
      const { status: newStatus, remark } = req.body;
      const uid = req.userData.uid;
      const role = req.userData.role;

      // 1. Get Certificate Data
      if (!id) return res.status(400).json({ error: 'Missing ID' });
      const cert = getDocument('certifications', id);
      if (!cert) return res.status(404).json({ error: 'Certificate not found' });
      const currentStatus = (cert.status || 'pending').toString();

      // 2. Status Transition Logic
      let allowed = false;
      let errorMessage = "Unauthorized status transition";

      if (role === 'staff') {
        if (currentStatus === 'pending') {
          if (newStatus === 'staff_approved' || newStatus === 'rejected') {
            allowed = true;
          } else {
            errorMessage = "Staff can only approve/reject pending items";
          }
        } else {
          errorMessage = "Only staff can review pending items";
        }
      } else if (role === 'hod') {
        if (currentStatus === 'staff_approved') {
          if (newStatus === 'approved' || newStatus === 'rejected') {
            allowed = true;
          } else {
            errorMessage = "HOD can only approve/reject staff-reviewed items";
          }
        } else {
          errorMessage = "Only HOD can approve staff-reviewed items";
        }
      } else if (role === 'super_admin' || role === 'admin') {
        allowed = true;
      }

      if (!allowed) {
        return res.status(403).json({ error: errorMessage });
      }

      // 3. Update Document
      const updatedRemarks = Array.isArray(cert.remarks) ? cert.remarks : [];
      const statusText = (newStatus || "pending").toString();
      updatedRemarks.push({
        userId: uid,
        role: role,
        comment: remark || `Status updated to ${statusText.replace('_', ' ')}`,
        timestamp: new Date().toISOString(),
        status: statusText
      });

      const updatedCert = {
        ...cert,
        status: (newStatus || currentStatus).toString(),
        remarks: updatedRemarks,
        updatedAt: new Date().toISOString()
      };

      setDocument('certifications', id, updatedCert);

      // 4. Audit Log
      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'STATUS_UPDATE',
        details: `Certificate ${id} status changed from ${currentStatus} to ${newStatus}`,
        userId: uid,
        collegeId: req.userData.collegeId,
        timestamp: new Date().toISOString()
      });

      // 5. Notification for the student
      const studentId = cert.user_id || cert.userId;
      if (studentId) {
        const eventNameText = (cert.event_name || cert.eventName || "Event").toString();
        const displayStatus = (newStatus || "updated").toString().replace('_', ' ');
        setDocument('notifications', 'notif_' + Date.now(), {
          user_id: studentId,
          title: 'Certificate Update',
          message: `Your certificate for ${eventNameText} has been ${displayStatus}.`,
          type: newStatus === 'rejected' ? 'error' : 'success',
          read: 0,
          timestamp: new Date().toISOString()
        });
      }

      res.json({ success: true, status: newStatus });
    } catch (error: any) {
      console.error("Status update error:", error);
      res.status(500).json({ error: error.message });
    }
  });


  // ============================================
  // ACADEMIC & CAREER MANAGEMENT SYSTEM [NEW]
  // ============================================

  // Helper: Calculate Placement Readiness Score
  const calculateReadinessScore = (studentId: string) => {
    try {
      const profile = db.prepare('SELECT cgpa, arrears FROM student_academic_profile WHERE student_id = ?').get(studentId) as any;
      const skillsCount = db.prepare('SELECT count(*) as count FROM student_skills WHERE student_id = ?').get(studentId) as any;
      const certsCount = db.prepare('SELECT count(*) as count FROM certifications WHERE user_id = ? AND status = "approved"').get(studentId) as any;
      const activitiesCount = db.prepare('SELECT count(*) as count FROM career_activities WHERE user_id = ? AND status = "approved"').get(studentId) as any;

      let score = 0;
      if (profile) {
        score += (profile.cgpa || 0) * 5; // Max 50 if CGPA is 10
        score -= (profile.arrears || 0) * 5; // Penalty for arrears
      }
      score += (skillsCount?.count || 0) * 2; // Max 20
      score += (certsCount?.count || 0) * 3; // Max 15
      score += (activitiesCount?.count || 0) * 3; // Max 15

      return Math.min(Math.max(score, 0), 100);
    } catch (e) {
      return 0;
    }
  };

  app.get('/api/student/academic-profile', authenticate, (req: any, res) => {
    try {
      const studentId = req.user.uid;
      const profile = db.prepare('SELECT * FROM student_academic_profile WHERE student_id = ?').get(studentId) as any;
      
      if (!profile) {
        // Return default/empty profile if none exists
        return res.json({ 
          success: true, 
          data: { student_id: studentId, cgpa: 0, arrears: 0, placement_readiness_score: 0 } 
        });
      }
      
      res.json({ success: true, data: profile });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/student/academic-profile', authenticate, async (req: any, res) => {
    try {
      const studentId = req.user.uid;
      const data = req.body;
      const user = db.prepare('SELECT * FROM users WHERE uid = ?').get(studentId) as any;

      if (!user) return res.status(404).json({ error: 'Student not found' });

      const id = data.id || 'prof_' + Date.now();
      const cgpa = parseFloat(data.cgpa || 0);
      const arrears = parseInt(data.arrears || 0);
      const readinessScore = calculateReadinessScore(studentId);

      db.prepare(`
        INSERT INTO student_academic_profile (
          id, student_id, student_name, roll_no, register_no, 
          department, department_id, class, section, year, 
          semester, college_id, college_name, cgpa, percentage, 
          total_subjects, arrears, attendance_percentage, 
          placement_readiness_score, internship_count, workshop_count, 
          seminar_count, certification_count, github_url, 
          linkedin_url, portfolio_url, resume_url, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          cgpa=excluded.cgpa, percentage=excluded.percentage, 
          arrears=excluded.arrears, attendance_percentage=excluded.attendance_percentage,
          placement_readiness_score=?, updated_at=CURRENT_TIMESTAMP
      `).run(
        id, studentId, user.name, user.roll_no, data.register_no,
        user.department_id, user.department_id, user.class, user.section, user.year,
        data.semester, user.college_id, user.college_name, cgpa, (cgpa * 9.5),
        data.total_subjects || 0, arrears, parseFloat(data.attendance_percentage || 0),
        readinessScore, data.internship_count || 0, data.workshop_count || 0,
        data.seminar_count || 0, data.certification_count || 0, data.github_url,
        data.linkedin_url, data.portfolio_url, data.resume_url, readinessScore
      );

      res.json({ success: true, message: 'Academic profile updated' });
    } catch (error: any) {
      console.error("Profile save error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/student/skills', authenticate, (req: any, res) => {
    try {
      const skills = db.prepare('SELECT * FROM student_skills WHERE student_id = ?').all(req.user.uid);
      res.json({ success: true, data: skills });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/student/skills/add', authenticate, (req: any, res) => {
    try {
      const { skill_name, skill_level, category } = req.body;
      const id = 'skill_' + Date.now();
      db.prepare(`
        INSERT INTO student_skills (id, student_id, skill_name, skill_level, category)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, req.user.uid, skill_name, skill_level, category);
      
      // Update readiness score
      const newScore = calculateReadinessScore(req.user.uid);
      db.prepare('UPDATE student_academic_profile SET placement_readiness_score = ? WHERE student_id = ?').run(newScore, req.user.uid);

      res.json({ success: true, message: 'Skill added' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // STAFF VISIBILITY API
  app.get('/api/staff/students', authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff']), (req: any, res) => {
    try {
      const { role, college_id, department_id, class: staffClass, section } = req.userData;
      let sql = `
        SELECT u.uid, u.name, u.roll_no, u.department_id, u.class, u.section,
               ap.cgpa, ap.attendance_percentage, ap.arrears, ap.placement_readiness_score,
               (SELECT count(*) FROM certifications c WHERE c.user_id = u.uid AND c.status = 'approved') as cert_count
        FROM users u
        LEFT JOIN student_academic_profile ap ON u.uid = ap.student_id
        WHERE u.role = 'student'
      `;
      const params: any[] = [];

      if (role === 'staff') {
        sql += ` AND u.college_id = ? AND u.department_id = ? AND u.class = ?`;
        params.push(college_id, department_id, staffClass);
        if (section) {
          sql += ` AND u.section = ?`;
          params.push(section);
        }
      } else if (role === 'hod') {
        sql += ` AND u.college_id = ? AND u.department_id = ?`;
        params.push(college_id, department_id);
      } else if (role === 'admin') {
        sql += ` AND u.college_id = ?`;
        params.push(college_id);
      }

      const students = db.prepare(sql).all(...params);
      res.json({ success: true, data: students });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/staff/student/:id', authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff']), (req: any, res) => {
    try {
      const studentId = req.params.id;
      const user = db.prepare('SELECT uid, name, email, role, roll_no, class, year, section, department_id, college_id FROM users WHERE uid = ?').get(studentId) as any;
      if (!user) return res.status(404).json({ error: 'Student not found' });

      const academic = db.prepare('SELECT * FROM student_academic_profile WHERE student_id = ?').get(studentId);
      const skills = db.prepare('SELECT * FROM student_skills WHERE student_id = ?').all(studentId);
      const certs = db.prepare('SELECT * FROM certifications WHERE user_id = ?').all(studentId);
      const activities = db.prepare('SELECT * FROM career_activities WHERE user_id = ?').all(studentId);

      res.json({ 
        success: true, 
        data: { 
          profile: user,
          academic,
          skills,
          certifications: certs,
          activities
        } 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/hod/department-analytics', authenticate, checkRole(['super_admin', 'admin', 'hod']), (req: any, res) => {
    try {
      const { college_id, department_id } = req.userData;
      const stats = db.prepare(`
        SELECT 
          count(*) as total_students,
          avg(ap.cgpa) as avg_cgpa,
          sum(ap.arrears) as total_arrears,
          count(CASE WHEN ap.placement_readiness_score > 75 THEN 1 END) as placement_ready
        FROM users u
        LEFT JOIN student_academic_profile ap ON u.uid = ap.student_id
        WHERE u.role = 'student' AND u.college_id = ? AND u.department_id = ?
      `).get(college_id, department_id) as any;

      const classPerformance = db.prepare(`
        SELECT u.class, avg(ap.cgpa) as avg_cgpa, count(*) as count
        FROM users u
        LEFT JOIN student_academic_profile ap ON u.uid = ap.student_id
        WHERE u.role = 'student' AND u.college_id = ? AND u.department_id = ?
        GROUP BY u.class
      `).all(college_id, department_id);

      res.json({ success: true, data: { stats, classPerformance } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/college-analytics', authenticate, checkRole(['super_admin', 'admin']), (req: any, res) => {
    try {
      const { college_id } = req.userData;
      const deptStats = db.prepare(`
        SELECT u.department_id, count(*) as student_count, avg(ap.cgpa) as avg_cgpa
        FROM users u
        LEFT JOIN student_academic_profile ap ON u.uid = ap.student_id
        WHERE u.role = 'student' AND u.college_id = ?
        GROUP BY u.department_id
      `).all(college_id);

      res.json({ success: true, data: deptStats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/superadmin/platform-analytics', authenticate, checkRole(['super_admin']), (req: any, res) => {
    try {
      const stats = db.prepare(`
        SELECT 
          (SELECT count(*) FROM users WHERE role='student') as total_students,
          (SELECT count(*) FROM certifications) as total_certs,
          (SELECT count(*) FROM colleges) as total_colleges,
          (SELECT avg(cgpa) FROM student_academic_profile) as global_avg_cgpa
      `).get() as any;

      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/staff/dashboard-stats', authenticate, checkRole(['staff', 'hod', 'admin']), (req: any, res) => {
    try {
      const { college_id, department_id } = req.userData;
      const stats = db.prepare(`
        SELECT 
          (SELECT count(*) FROM users WHERE role='student' AND college_id = ? AND department_id = ?) as totalStudents,
          (SELECT count(*) FROM certifications WHERE college_id = ? AND department_id = ? AND status = 'pending') as pendingCerts,
          (SELECT count(*) FROM certifications WHERE college_id = ? AND department_id = ? AND status = 'approved') as approvedCerts,
          (SELECT count(*) FROM student_academic_profile WHERE college_id = ? AND department_id = ? AND arrears > 0) as studentsWithArrears,
          (SELECT avg(cgpa) FROM student_academic_profile WHERE college_id = ? AND department_id = ?) as avgCGPA,
          (SELECT avg(attendance_percentage) FROM student_academic_profile WHERE college_id = ? AND department_id = ?) as avgAttendance
      `).get(college_id, department_id, college_id, department_id, college_id, department_id, college_id, department_id, college_id, department_id, college_id, department_id) as any;

      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/staff/students', authenticate, checkRole(['staff', 'hod', 'admin']), (req: any, res) => {
    try {
      const { college_id, department_id } = req.userData;
      const students = db.prepare(`
        SELECT 
          u.uid, u.name, u.roll_no, u.class, u.year, u.section,
          sap.cgpa, sap.attendance_percentage, sap.arrears, sap.placement_readiness_score,
          (SELECT count(*) FROM certifications WHERE user_id = u.uid) as certCount,
          (SELECT count(*) FROM career_activities WHERE user_id = u.uid) as activityCount,
          u.last_login, u.status
        FROM users u
        LEFT JOIN student_academic_profile sap ON u.uid = sap.student_id
        WHERE u.role = 'student' AND u.college_id = ? AND u.department_id = ?
        ORDER BY u.name ASC
      `).all(college_id, department_id);

      res.json({ success: true, data: students });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/staff/student/:id', authenticate, checkRole(['staff', 'hod', 'admin']), (req: any, res) => {
    try {
      const { id } = req.params;
      const profile = db.prepare(`SELECT * FROM users WHERE uid = ?`).get(id) as any;
      if (!profile) return res.status(404).json({ error: 'Student not found' });

      const academic = db.prepare(`SELECT * FROM student_academic_profile WHERE student_id = ?`).get(id);
      const skills = db.prepare(`SELECT * FROM student_skills WHERE student_id = ?`).all(id);
      const certs = db.prepare(`SELECT * FROM certifications WHERE user_id = ? ORDER BY date DESC`).all(id);
      const activities = db.prepare(`SELECT * FROM career_activities WHERE user_id = ? ORDER BY created_at DESC`).all(id);
      const remarks = db.prepare(`
        SELECT r.*, u.name as staff_name 
        FROM staff_student_remarks r
        JOIN users u ON r.staff_id = u.uid
        WHERE r.student_id = ?
        ORDER BY r.created_at DESC
      `).all(id);

      res.json({ 
        success: true, 
        data: { profile, academic, skills, certs, activities, remarks } 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/staff/analytics', authenticate, checkRole(['staff', 'hod', 'admin']), (req: any, res) => {
    try {
      const { college_id, department_id } = req.userData;
      
      const cgpaDist = db.prepare(`
        SELECT 
          CASE 
            WHEN cgpa >= 9 THEN '9-10'
            WHEN cgpa >= 8 THEN '8-9'
            WHEN cgpa >= 7 THEN '7-8'
            WHEN cgpa >= 6 THEN '6-7'
            ELSE '< 6'
          END as range,
          count(*) as count
        FROM student_academic_profile
        WHERE college_id = ? AND department_id = ?
        GROUP BY range
      `).all(college_id, department_id);

      const certTrends = db.prepare(`
        SELECT strftime('%Y-%m', created_at) as month, count(*) as count
        FROM certifications
        WHERE college_id = ? AND department_id = ?
        GROUP BY month
        ORDER BY month DESC
        LIMIT 6
      `).all(college_id, department_id);

      res.json({ success: true, data: { cgpaDist, certTrends } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/staff/remarks/add', authenticate, checkRole(['staff', 'hod', 'admin']), (req: any, res) => {
    try {
      const { student_id, remark_type, remark } = req.body;
      const staff_id = req.userData.uid;
      const id = 'rem_' + Date.now();

      db.prepare(`
        INSERT INTO staff_student_remarks (id, student_id, staff_id, remark_type, remark)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, student_id, staff_id, remark_type, remark);

      res.json({ success: true, message: 'Remark added' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/staff/notifications/send', authenticate, checkRole(['staff', 'hod', 'admin']), (req: any, res) => {
    try {
      const { student_id, title, message, type } = req.body;
      const id = 'not_' + Date.now();

      db.prepare(`
        INSERT INTO student_notifications (id, student_id, title, message, type)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, student_id, title, message, type || 'info');

      res.json({ success: true, message: 'Notification sent' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/staff/attendance', authenticate, checkRole(['staff', 'hod', 'admin']), (req: any, res) => {
    try {
      const { college_id, department_id } = req.userData;
      const attendance = db.prepare(`
        SELECT sa.*, u.name as student_name
        FROM student_attendance sa
        JOIN users u ON sa.student_id = u.uid
        WHERE u.college_id = ? AND u.department_id = ?
        ORDER BY sa.created_at DESC
      `).all(college_id, department_id);

      res.json({ success: true, data: attendance });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/career-activities/:id/status', authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff']), (req: any, res) => {
    try {
      const { id } = req.params;
      const { status: newStatus, remark } = req.body;
      const uid = req.userData.uid;
      const role = req.userData.role;

      if (!id) return res.status(400).json({ error: 'Missing ID' });
      const activity = getDocument('careerActivities', id);
      if (!activity) return res.status(404).json({ error: 'Activity not found' });
      const currentStatus = (activity.status || 'pending').toString();

      let allowed = false;
      let errorMessage = "Unauthorized status transition";

      // 4-Step: pending -> staff_reviewed -> hod_approved -> approved
      if (role === 'staff') {
        if (currentStatus === 'pending' && newStatus === 'staff_reviewed') allowed = true;
        else if (currentStatus === 'staff_reviewed' && newStatus === 'hod_approved') allowed = true;
        else if (newStatus === 'rejected') allowed = true;
        else errorMessage = "Staff invalid transition";
      } else if (role === 'hod') {
        if (currentStatus === 'staff_reviewed' && (newStatus === 'hod_approved' || newStatus === 'approved' || newStatus === 'rejected')) allowed = true;
        else if (currentStatus === 'hod_approved' && (newStatus === 'approved' || newStatus === 'rejected')) allowed = true;
        else errorMessage = "HOD invalid transition";
      } else if (role === 'super_admin' || role === 'admin') {
        allowed = true;
      }

      if (!allowed) return res.status(403).json({ error: errorMessage });

      const updatedActivity = {
        ...activity,
        status: (newStatus || currentStatus).toString(),
        updatedAt: new Date().toISOString()
      };

      setDocument('careerActivities', id, updatedActivity);

      // Audit Log
      setDocument('auditLogs', 'log_' + Date.now(), {
        action: 'ACTIVITY_STATUS_UPDATE',
        details: `Activity ${id} status changed to ${newStatus}`,
        userId: uid,
        collegeId: req.userData.college_id,
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, status: newStatus });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/student/notifications', authenticate, (req: any, res) => {
    try {
      const studentId = req.userData.uid;
      const notifications = db.prepare(`
        SELECT * FROM student_notifications 
        WHERE student_id = ? 
        ORDER BY created_at DESC
      `).all(studentId);
      res.json({ success: true, data: notifications });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.use((err: any, req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });

  // Serve uploaded files statically
  app.use('/uploads', express.static(UPLOADS_DIR));
}
