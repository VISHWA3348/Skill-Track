import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { db, getCollection, getDocument, setDocument, deleteDocument, queryDocuments } from './db';
import { hashPassword, comparePassword, generateToken, verifyToken, validatePassword } from './auth';
import { authenticate, checkRole, getDataIsolationFilters, rateLimiter } from './middleware';
import { uploadMediaFile, uploadMediaFileDetailed } from './cloudinary_helper';
import { cacheService } from './redis_cache';
import { queueService } from './queue';
import { sendEmail, initEmailLogsTable } from './services/email.service';
import { calculateResumeScore } from './resume_features';

// Initialize email-related tables on startup
initEmailLogsTable();

const JWT_SECRET = process.env.JWT_SECRET;

const storage = multer.memoryStorage();
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMime.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only JPG, PNG, and PDF are allowed.'));
    }
    
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error('Invalid file extension. Only .pdf, .png, .jpg, and .jpeg are allowed.'));
    }
    
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

export function setupApi(app: express.Express) {
  
  // ============================================
  // MOCK AUTHENTICATION API
  // ============================================
  
  app.post('/api/auth/verify-signup-code', rateLimiter, async (req, res) => {
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

  app.post('/api/auth/register', rateLimiter, async (req, res) => {
    const { 
      email, password, name, role, collegeId, departmentId, 
      rollNo, class: className, year, section, city, phoneNumber, collegeName, skills, bio,
      signupCode, inviteCode, academicYear // inviteCode = new CAMP-DEPT-XXXXXX system; signupCode = legacy fallback
    } = req.body;
    try {
      // 0. Check if registration is enabled
      const regSetting = db.prepare("SELECT value FROM settings WHERE key = 'registration_enabled'").get() as any;
      const regEnabled = regSetting ? JSON.parse(regSetting.value) : true;
      if (!regEnabled) return res.status(403).json({ error: 'auth/registration-disabled', message: 'Public registration is currently disabled by administrator.' });

      if (!email || !password) return res.status(400).json({ error: 'auth/invalid-credential', message: 'Email and password are required' });

      // Accept either inviteCode or signupCode; inviteCode takes priority
      const providedCode: string | undefined = (inviteCode || signupCode || '').trim() || undefined;

      if (!providedCode) {
        return res.status(403).json({ error: 'auth/code-required', message: 'A Department Invite Code or Signup Code is mandatory for registration.' });
      }

      // -------------------------------------------------------
      // BRANCH A: New Department Invite Code (CAMP-DEPT-XXXXXX)
      // -------------------------------------------------------
      let finalCollegeId: string;
      let finalDeptId: string;
      let finalRole: string = 'student';
      let finalYear: string | null = year || null;
      let finalCollegeName: string | null = collegeName || null;
      let usedInviteCodeId: string | null = null;      // for DepartmentInviteCodes row
      let usedLegacyCode: string | null = null;        // for signup_codes row

      const uppercaseCode = providedCode.toUpperCase();

      // Try new department_invite_codes table first
      const inviteRow = db.prepare(`
        SELECT d.*, c.name as college_name, dep.name as department_name
        FROM department_invite_codes d
        LEFT JOIN colleges c ON d.college_id = c.id
        LEFT JOIN departments dep ON d.department_id = dep.id
        WHERE d.code = ?
      `).get(uppercaseCode) as any;

      if (inviteRow) {
        if (!inviteRow.is_active || inviteRow.is_active === 0) {
          return res.status(403).json({ error: 'auth/code-inactive', message: 'This Department Invite Code has been deactivated' });
        }
        if (inviteRow.expires_at && new Date(inviteRow.expires_at) < new Date()) {
          return res.status(403).json({ error: 'auth/expired-code', message: 'This Department Invite Code has expired' });
        }
        if (inviteRow.max_registrations !== -1 && inviteRow.current_registrations >= inviteRow.max_registrations) {
          return res.status(403).json({ error: 'auth/usage-limit', message: 'This Department Invite Code has reached its maximum registration limit' });
        }

        finalCollegeId = inviteRow.college_id;
        finalDeptId = inviteRow.department_id;
        finalRole = 'student';
        finalCollegeName = inviteRow.college_name || collegeName || null;
        usedInviteCodeId = inviteRow.id;
      } else {
        // -------------------------------------------------------
        // BRANCH B: Legacy signup_codes (full backward compat)
        // -------------------------------------------------------
        const verifiedCode = db.prepare(`
          SELECT * FROM signup_codes WHERE code = ? AND is_active = 1
        `).get(providedCode) as any;

        if (!verifiedCode) {
          return res.status(403).json({ error: 'auth/invalid-code', message: 'Invalid or unauthorized signup code' });
        }
        if (verifiedCode.expiry_date && new Date(verifiedCode.expiry_date) < new Date()) {
          return res.status(403).json({ error: 'auth/expired-code', message: 'Signup code has expired' });
        }
        if (verifiedCode.usage_limit !== -1 && verifiedCode.usage_count >= verifiedCode.usage_limit) {
          return res.status(403).json({ error: 'auth/usage-limit', message: 'Signup code usage limit reached' });
        }

        finalCollegeId = verifiedCode.college_id;
        finalDeptId = verifiedCode.department_id;
        finalRole = verifiedCode.role || 'student';
        finalYear = verifiedCode.batch_year || year || null;
        usedLegacyCode = providedCode;
      }

      const existing = db.prepare('SELECT email FROM users WHERE email = ?').get(email);
      if (existing) return res.status(400).json({ error: 'auth/email-already-in-use', message: 'Email already exists' });

      // Validate password strength
      const v = validatePassword(password);
      if (!v.valid) return res.status(400).json({ error: 'auth/weak-password', message: v.message });

      // Academic Year selection validation
      let mappedLegacyYear = finalYear;
      let finalAcademicYear = academicYear || null;

      if (finalRole === 'student') {
        if (!finalAcademicYear) {
          return res.status(400).json({ error: 'auth/academic-year-required', message: 'Academic Year selection is required for student registration.' });
        }
        
        const isPG = className ? /^(M\.|M[A-Z]|PG|Master)/i.test(className) : false;
        const validUGYears = ['I Year', 'II Year', 'III Year', 'IV Year'];
        const validPGYears = ['I Year PG', 'II Year PG'];
        
        if (isPG) {
          if (!validPGYears.includes(finalAcademicYear)) {
            return res.status(400).json({ 
              error: 'auth/invalid-academic-year', 
              message: `For PG courses, Academic Year must be one of: ${validPGYears.join(', ')}` 
            });
          }
        } else {
          if (!validUGYears.includes(finalAcademicYear)) {
            return res.status(400).json({ 
              error: 'auth/invalid-academic-year', 
              message: `For UG courses, Academic Year must be one of: ${validUGYears.join(', ')}` 
            });
          }
        }
        
        // Map clean academic year string to legacy character representation
        if (finalAcademicYear.startsWith('I Year')) mappedLegacyYear = 'I';
        else if (finalAcademicYear.startsWith('II Year')) mappedLegacyYear = 'II';
        else if (finalAcademicYear.startsWith('III Year')) mappedLegacyYear = 'III';
        else if (finalAcademicYear.startsWith('IV Year')) mappedLegacyYear = 'IV';
      }

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
        year: mappedLegacyYear || finalYear,
        section: section || null,
        city: city || null,
        phone_number: phoneNumber || null,
        college_name: finalCollegeName || null,
        skills: skills || null,
        bio: bio || null,
        created_at: new Date().toISOString(),
        academic_year: finalAcademicYear,
        assigned_academic_year: null
      };

      db.prepare(`
        INSERT INTO users (
          uid, name, email, password_hash, role, 
          college_id, department_id, roll_no, class, year, 
          section, city, phone_number, college_name, skills, bio, created_at, academic_year, assigned_academic_year
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newUser.uid, newUser.name, newUser.email, newUser.password_hash, newUser.role, 
        newUser.college_id, newUser.department_id, newUser.roll_no, newUser.class, newUser.year, 
        newUser.section, newUser.city, newUser.phone_number, newUser.college_name, newUser.skills, newUser.bio, newUser.created_at,
        newUser.academic_year, newUser.assigned_academic_year
      );

      // Increment usage counter on the appropriate code table
      if (usedInviteCodeId) {
        db.prepare(
          'UPDATE department_invite_codes SET current_registrations = current_registrations + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).run(usedInviteCodeId);

        // Write security audit trail for new invite code usage
        try {
          const logId = 'alog_' + Date.now() + Math.random().toString(36).substring(2, 7);
          db.prepare(`
            INSERT INTO audit_logs (id, user_id, action, details, college_id, timestamp)
            VALUES (?, ?, 'INVITE_CODE_USED', ?, ?, CURRENT_TIMESTAMP)
          `).run(logId, uid, `Student ${email} registered using invite code ${uppercaseCode} (dept: ${finalDeptId})`, finalCollegeId);
        } catch (_) {}
      } else if (usedLegacyCode) {
        db.prepare('UPDATE signup_codes SET usage_count = usage_count + 1 WHERE code = ?').run(usedLegacyCode);
      }

      // If student, add to students table for academic linkage
      if (newUser.role === 'student') {
        db.prepare(`
          INSERT INTO students (user_id, roll_no, department_id, college_id, class, year, section, academic_year)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          newUser.uid, newUser.roll_no, newUser.department_id, newUser.college_id, 
          newUser.class, newUser.year, newUser.section, newUser.academic_year
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

  // ─── OTP / Password Reset Tables (idempotent) ───────────────────────────────
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id          VARCHAR(64)  PRIMARY KEY,
        user_id     VARCHAR(255) NOT NULL,
        code        VARCHAR(10)  NOT NULL,
        purpose     VARCHAR(50)  NOT NULL DEFAULT 'login',
        expires_at  TIMESTAMP    NOT NULL,
        used        BOOLEAN      DEFAULT FALSE,
        created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      );
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id          VARCHAR(64)  PRIMARY KEY,
        user_id     VARCHAR(255) NOT NULL,
        token_hash  VARCHAR(128) NOT NULL,
        expires_at  TIMESTAMP    NOT NULL,
        used        BOOLEAN      DEFAULT FALSE,
        created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (_) { /* Tables may already exist in production */ }

  // POST /api/auth/verify-otp — Validate a 6-digit OTP and return a JWT
  app.post('/api/auth/verify-otp', rateLimiter, async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'auth/missing-fields', message: 'Email and OTP are required' });

    try {
      const user = db.prepare('SELECT uid, email, name, role FROM users WHERE email = ?').get(email) as any;
      if (!user) return res.status(400).json({ error: 'auth/invalid-credential', message: 'Invalid credentials' });

      const record = db.prepare(`
        SELECT id, code FROM otp_codes
        WHERE user_id = ? AND purpose = 'login' AND used = FALSE AND expires_at > NOW()
        ORDER BY created_at DESC LIMIT 1
      `).get(user.uid) as any;

      if (!record) return res.status(400).json({ error: 'auth/otp-expired', message: 'OTP has expired. Please request a new one.' });

      // Timing-safe comparison to prevent timing attacks
      const providedHash = crypto.createHash('sha256').update(otp).digest('hex');
      const storedHash   = crypto.createHash('sha256').update(record.code).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(storedHash))) {
        return res.status(400).json({ error: 'auth/invalid-otp', message: 'Invalid OTP code' });
      }

      // Mark OTP as used
      db.prepare('UPDATE otp_codes SET used = TRUE WHERE id = ?').run(record.id);
      db.prepare("UPDATE users SET login_attempts = 0, last_login = CURRENT_TIMESTAMP WHERE uid = ?").run(user.uid);

      const token = generateToken({ uid: user.uid, email: user.email });
      return res.json({ token, user: { uid: user.uid, email: user.email, displayName: user.name, role: user.role } });
    } catch (e: any) {
      console.error("OTP verification error:", e.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/auth/forgot-password — Send a password reset link email
  app.post('/api/auth/forgot-password', rateLimiter, async (req, res) => {
    const { email } = req.body;
    // Always respond with 200 to prevent user enumeration (CWE-204)
    const genericResponse = { message: 'If that email is registered, a password reset link has been sent.' };

    if (!email || typeof email !== 'string') return res.status(200).json(genericResponse);

    try {
      const user = db.prepare('SELECT uid, email, name FROM users WHERE email = ?').get(email) as any;
      if (!user) return res.status(200).json(genericResponse);

      // Generate a cryptographically secure reset token
      const rawToken  = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const tokenId   = 'pwr_' + crypto.randomBytes(8).toString('hex');

      // Invalidate any previous unused tokens for this user
      db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ? AND used = FALSE").run(user.uid);

      db.prepare(`
        INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_at)
        VALUES (?, ?, ?, NOW() + INTERVAL '1 hour', FALSE, NOW())
      `).run(tokenId, user.uid, tokenHash);

      const frontendUrl = process.env.FRONTEND_URL || 'https://skilltrack.zinoingroup.in';
      const resetLink = `${frontendUrl}/reset-password?token=${rawToken}&id=${tokenId}`;

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#4f46e5">Skill Track – Password Reset</h2>
          <p>Hello ${user.name || 'User'},</p>
          <p>We received a request to reset your Skill Track password. Click the button below to set a new password.</p>
          <p style="margin:24px 0">
            <a href="${resetLink}" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">
              Reset Password
            </a>
          </p>
          <p style="color:#64748b;font-size:13px">This link expires in 1 hour. If you did not request this, please ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin-top:24px"/>
          <p style="color:#94a3b8;font-size:12px">Powered by ZinoinTech &middot; Skill Track Platform</p>
        </div>`;

      sendEmail(user.email, 'Skill Track – Reset Your Password', html).catch(err =>
        console.error('[Auth] Password reset email failed to send:', err.message)
      );

      return res.status(200).json(genericResponse);
    } catch (e: any) {
      console.error("Forgot password error:", e.message);
      return res.status(200).json(genericResponse);
    }
  });

  // POST /api/auth/reset-password — Validate reset token and set new password
  app.post('/api/auth/reset-password', rateLimiter, async (req, res) => {
    const { tokenId, token, newPassword } = req.body;
    if (!tokenId || !token || !newPassword)
      return res.status(400).json({ error: 'auth/missing-fields', message: 'All fields are required' });

    const validation = validatePassword(newPassword);
    if (!validation.valid) return res.status(400).json({ error: 'auth/weak-password', message: validation.message });

    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const record = db.prepare(`
        SELECT id, user_id FROM password_reset_tokens
        WHERE id = ? AND token_hash = ? AND used = FALSE AND expires_at > NOW()
      `).get(tokenId, tokenHash) as any;

      if (!record) return res.status(400).json({ error: 'auth/invalid-token', message: 'This reset link is invalid or has expired.' });

      const newHash = await hashPassword(newPassword);
      db.prepare('UPDATE users SET password_hash = ?, login_attempts = 0 WHERE uid = ?').run(newHash, record.user_id);
      db.prepare('UPDATE password_reset_tokens SET used = TRUE WHERE id = ?').run(record.id);

      return res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
    } catch (e: any) {
      console.error("Reset password error:", e.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.use('/uploads', express.static(UPLOADS_DIR));


  app.post('/api/upload', authenticate, upload.single('file'), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const type = req.query.type === 'photo' ? 'photos' : 'certificates';
    try {
      const finalUrl = await uploadMediaFile(req.file, type);
      res.json({ url: finalUrl, filename: req.file.originalname });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Upload failed' });
    }
  });

  app.get("/api/auth/verify", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: 'auth/unauthorized', message: 'No token provided' });
    const token = authHeader.split("Bearer ")[1];
    
    try {
      const decoded = verifyToken(token);
      if (!decoded) return res.status(401).json({ error: 'auth/invalid-token', message: 'Invalid token' });

      const user = db.prepare('SELECT uid, name, email, role, phone_number as phone, profile_photo, bio, college_id as collegeId, department_id as departmentId, roll_no as rollNo, class, year, section, city, address, college_name as collegeName, preferences, social_links, skills FROM users WHERE uid = ?').get(decoded.uid) as any;
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
        section: user.section,
        city: user.city,
        address: user.address,
        collegeName: user.collegeName,
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
        departmentId, collegeId, collegeName, city, address, preferences, socialLinks, skills, bio,
        academicYear
      } = req.body;
      
      const userData = db.prepare('SELECT role FROM users WHERE uid = ?').get(uid) as any;
      if (!userData) return res.status(404).json({ error: 'User not found' });

      const isStudent = userData.role === 'student';

      let mappedLegacyYear = year;
      let finalAcademicYear = academicYear;

      if (isStudent && finalAcademicYear !== undefined) {
        if (!finalAcademicYear) {
          return res.status(400).json({ error: 'auth/academic-year-required', message: 'Academic Year selection is required for student profile updates.' });
        }
        
        const isPG = className ? /^(M\.|M[A-Z]|PG|Master)/i.test(className) : false;
        const validUGYears = ['I Year', 'II Year', 'III Year', 'IV Year'];
        const validPGYears = ['I Year PG', 'II Year PG'];
        
        if (isPG) {
          if (!validPGYears.includes(finalAcademicYear)) {
            return res.status(400).json({ 
              error: 'auth/invalid-academic-year', 
              message: `For PG courses, Academic Year must be one of: ${validPGYears.join(', ')}` 
            });
          }
        } else {
          if (!validUGYears.includes(finalAcademicYear)) {
            return res.status(400).json({ 
              error: 'auth/invalid-academic-year', 
              message: `For UG courses, Academic Year must be one of: ${validUGYears.join(', ')}` 
            });
          }
        }
        
        // Map clean academic year string to legacy character representation
        if (finalAcademicYear.startsWith('I Year')) mappedLegacyYear = 'I';
        else if (finalAcademicYear.startsWith('II Year')) mappedLegacyYear = 'II';
        else if (finalAcademicYear.startsWith('III Year')) mappedLegacyYear = 'III';
        else if (finalAcademicYear.startsWith('IV Year')) mappedLegacyYear = 'IV';
      }

      // Update common fields
      const commonFields: any = { name, phone_number: phone, profile_photo: profilePhoto, city, address, skills, bio };
      if (preferences !== undefined) commonFields.preferences = JSON.stringify(preferences);
      if (socialLinks !== undefined) commonFields.social_links = JSON.stringify(socialLinks);
      
      if (!isStudent) {
        if (collegeId !== undefined) commonFields.college_id = collegeId;
        if (departmentId !== undefined) commonFields.department_id = departmentId;
        if (rollNo !== undefined) commonFields.roll_no = rollNo;
        if (collegeName !== undefined) {
          commonFields.college_name = collegeName;
        }
      } else {
        // Students can update their department_id
        if (departmentId !== undefined) commonFields.department_id = departmentId;
      }

      if (className !== undefined) commonFields.class = className;
      if (mappedLegacyYear !== undefined) commonFields.year = mappedLegacyYear;
      if (section !== undefined) commonFields.section = section;
      if (finalAcademicYear !== undefined) commonFields.academic_year = finalAcademicYear;

      // Update users table
      Object.keys(commonFields).forEach(key => {
        if (commonFields[key] !== undefined) {
          db.prepare(`UPDATE users SET ${key} = ? WHERE uid = ?`).run(commonFields[key], uid);
        }
      });
      
      // Update student-specific fields in students table
      if (isStudent) {
        db.prepare(`
          UPDATE students 
          SET class = COALESCE(?, class), 
              year = COALESCE(?, year),
              section = COALESCE(?, section),
              department_id = COALESCE(?, department_id),
              academic_year = COALESCE(?, academic_year)
          WHERE user_id = ?
        `).run(className || null, mappedLegacyYear || null, section || null, departmentId || null, finalAcademicYear || null, uid);

        // Also update student_academic_profile table if it exists
        const academicExists = db.prepare('SELECT id FROM student_academic_profile WHERE student_id = ?').get(uid) as any;
        if (academicExists) {
          db.prepare(`
            UPDATE student_academic_profile
            SET class = COALESCE(?, class),
                year = COALESCE(?, year),
                section = COALESCE(?, section),
                department_id = COALESCE(?, department_id),
                academic_year = COALESCE(?, academic_year),
                updated_at = CURRENT_TIMESTAMP
            WHERE student_id = ?
          `).run(className || null, mappedLegacyYear || null, section || null, departmentId || null, finalAcademicYear || null, uid);
        }

        // Recalculate and persist resume score
        calculateResumeScore(uid);
      }

      const updatedUser = db.prepare(`
        SELECT uid, name, email, role, phone_number as phone, profile_photo, bio, 
               college_id as collegeId, department_id as departmentId, roll_no as rollNo, 
               class, year, section, city, address, college_name as collegeName, preferences, social_links as socialLinks, skills 
        FROM users WHERE uid = ?
      `).get(uid) as any;
      
      res.json({ success: true, user: {
        ...updatedUser,
        address: updatedUser.address,
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

  // Enterprise health and readiness checks
  app.get("/api/health", (req, res) => {
    let databaseStatus = 'disconnected';
    try {
      const result = db.prepare('SELECT 1 as health').get() as any;
      // SQLite/PG translations can return 1 in different fields depending on parser
      if (result && (result.health === 1 || result['?column?'] === 1 || Object.values(result).includes(1))) {
        databaseStatus = 'connected';
      }
    } catch (dbError) {
      databaseStatus = 'error';
    }

    let storageStatus = 'unwritable';
    try {
      const testFile = path.join(os.tmpdir(), '.health_check');
      fs.writeFileSync(testFile, 'healthcheck_ok', 'utf8');
      fs.unlinkSync(testFile);
      storageStatus = 'writable';
    } catch (err) {
      storageStatus = 'error';
    }

    const envConfigured = !!(process.env.DATABASE_URL && process.env.JWT_SECRET);
    const environmentStatus = envConfigured ? 'configured' : 'incomplete';

    const systemHealthy = databaseStatus === 'connected' && storageStatus === 'writable' && environmentStatus === 'configured';

    res.status(systemHealthy ? 200 : 503).json({
      status: systemHealthy ? "ok" : "degraded",
      database: databaseStatus,
      uptime: process.uptime(),
      version: "1.0.0",
      readiness: {
        database: databaseStatus,
        storage: storageStatus,
        environment: environmentStatus
      }
    });
  });

  app.post('/api/seed-users', async (req, res) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: "Forbidden: Seeding is disabled in production environment." });
      }

      // 1. Ensure College & Dept (already done in existing logic)
      let college = getDocument('colleges', 'COL001');
      if (!college) setDocument('colleges', 'COL001', { id: 'COL001', name: 'Test Engineering College', location: 'Test City', createdAt: new Date().toISOString() });
      
      // Clean up previous CSE & BIOTECH departments & invite codes to ensure trigger/endpoints generate fresh active codes
      try {
        db.prepare("DELETE FROM departments WHERE id = 'CSE' OR department_id = 'BIOTECH' OR id = 'BIOTECH'").run();
        db.prepare("DELETE FROM department_invite_codes WHERE department_id = 'CSE' OR department_id = 'BIOTECH' OR department_id = 'dept_biotech'").run();
        
        // Clean up previous integration test students and users to prevent duplicate roll_no
        const testStudents = db.prepare("SELECT user_id FROM students WHERE roll_no = 'BIO999' OR roll_no = 'STU001'").all() as any[];
        for (const ts of testStudents) {
          db.prepare('DELETE FROM users WHERE uid = ?').run(ts.user_id);
          db.prepare('DELETE FROM students WHERE user_id = ?').run(ts.user_id);
          db.prepare('DELETE FROM student_academic_profile WHERE student_id = ?').run(ts.user_id);
          db.prepare('DELETE FROM ai_career_insights WHERE student_id = ?').run(ts.user_id);
        }
        db.prepare("DELETE FROM users WHERE email LIKE 'student_biotech_%'").run();
      } catch (err) {}
      
      setDocument('departments', 'CSE', { id: 'CSE', collegeId: 'COL001', name: 'Computer Science & Engineering' });

      const superadminExamplePass = 'password123';
      const superadminCerttrackPass = 'SuperAdminPassword123!';
      const zinoinPass = process.env.SEED_ZINOIN_PASSWORD || 'Vishwa@8105';
      const adminPass = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
      const hodPass = process.env.SEED_HOD_PASSWORD || 'Hod@123';
      const staffPass = process.env.SEED_STAFF_PASSWORD || 'Staff@123';
      const studentPass = process.env.SEED_STUDENT_PASSWORD || 'Student@123';

      const seedUsers = [
        { email: 'superadmin@example.com', password: superadminExamplePass, role: 'super_admin', name: 'Super Admin' },
        { email: 'superadmin@certtrack.com', password: superadminCerttrackPass, role: 'super_admin', name: 'Super Admin' },
        { email: 'zinointech@gmail.com', password: zinoinPass, role: 'super_admin', name: 'Skill Track Super Admin' },
        { email: 'admin@test.com', password: adminPass, role: 'admin', name: 'College Admin', collegeId: 'COL001' },
        { email: 'hod@test.com', password: hodPass, role: 'hod', name: 'HOD User', collegeId: 'COL001', departmentId: 'CSE' },
        { email: 'staff@test.com', password: staffPass, role: 'staff', name: 'Staff User', collegeId: 'COL001', departmentId: 'CSE' },
        { email: 'student@test.com', password: studentPass, role: 'student', name: 'Student User', collegeId: 'COL001', departmentId: 'CSE', rollNo: 'STU001', class: 'CS-A', year: '3rd' }
      ];

      let inserted = 0;
      let skipped = 0;
      
      for (const u of seedUsers) {
        if (u.rollNo) {
          const existingRoll = db.prepare('SELECT user_id FROM students WHERE roll_no = ?').get(u.rollNo) as any;
          if (existingRoll) {
            db.prepare('DELETE FROM users WHERE uid = ?').run(existingRoll.user_id);
            db.prepare('DELETE FROM students WHERE user_id = ?').run(existingRoll.user_id);
            db.prepare('DELETE FROM student_academic_profile WHERE student_id = ?').run(existingRoll.user_id);
            db.prepare('DELETE FROM ai_career_insights WHERE student_id = ?').run(existingRoll.user_id);
          }
        }
        const existing = db.prepare('SELECT uid FROM users WHERE email = ?').get(u.email) as any;
        if (existing) {
          db.prepare('DELETE FROM users WHERE uid = ?').run(existing.uid);
          db.prepare('DELETE FROM students WHERE user_id = ?').run(existing.uid);
          db.prepare('DELETE FROM student_academic_profile WHERE student_id = ?').run(existing.uid);
          db.prepare('DELETE FROM ai_career_insights WHERE student_id = ?').run(existing.uid);
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

          // Seed default academic profile
          db.prepare(`
            INSERT INTO student_academic_profile (id, student_id, student_name, roll_no, department_id, class, year, college_id, cgpa, arrears, attendance_percentage, placement_readiness_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run('ap_' + uid, uid, u.name, u.rollNo, u.departmentId, u.class, u.year, u.collegeId, 8.5, 0, 90.0, 75.0);

          // Seed default AI career insights
          db.prepare(`
            INSERT INTO ai_career_insights (id, student_id, placement_readiness_score, recommended_skills, missing_skills, suggested_certifications, suggested_internships, career_path_suggestions, course_recommendations, smart_alerts, analysis_summary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            'ci_' + uid, uid, 75.0,
            JSON.stringify(['React', 'Node.js', 'SQL']),
            JSON.stringify(['TypeScript', 'AWS']),
            JSON.stringify(['AWS Developer Associate']),
            JSON.stringify(['Software Engineering Intern']),
            JSON.stringify(['Full Stack Developer']),
            JSON.stringify(['Complete TypeScript Masterclass']),
            JSON.stringify(['Add internships to boost profile']),
            'Seeded default career path profile.'
          );
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
  
  app.post('/api/storage/upload', authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff', 'student']), upload.single('file'), async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    const type = req.query.type === 'photo' ? 'photos' : 'certificates';
    try {
      const uploadResult = await uploadMediaFileDetailed(req.file, type);
      res.json({ 
        url: uploadResult.url, 
        path: '',
        publicId: uploadResult.public_id,
        fileType: uploadResult.file_type,
        fileName: uploadResult.file_name,
        uploadedAt: uploadResult.uploaded_at.toISOString()
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Upload failed' });
    }
  });

  app.get('/api/certifications', authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff', 'student']), async (req: any, res) => {
    try {
      const role = req.userData.role;
      const uid = req.userData.uid;
      const collegeId = req.userData.college_id;
      const departmentId = req.userData.department_id;

      let sql = `
        SELECT c.*, 
               u.name as student_name, 
               u.email as student_email, 
               u.profile_photo as student_profile_photo, 
               u.roll_no as student_roll_no, 
               u.class as student_class, 
               u.year as student_year, 
               u.section as student_section,
               u.address as student_address
        FROM certifications c
        LEFT JOIN users u ON c.user_id = u.uid
        WHERE c.is_deleted != 1
      `;
      const params: any[] = [];

      if (role === 'student') {
        sql += ` AND c.user_id = ?`;
        params.push(uid);
      } else if (role === 'staff' || role === 'hod') {
        sql += ` AND c.college_id = ? AND c.department_id = ?`;
        params.push(collegeId, departmentId);
      } else if (role === 'admin') {
        sql += ` AND c.college_id = ?`;
        params.push(collegeId);
      }

      sql += ` ORDER BY c.created_at DESC`;

      const rows = db.prepare(sql).all(...params) as any[];
      
      const normalized = rows.map(row => {
        let remarks = [];
        if (typeof row.remarks === 'string') {
          try { remarks = JSON.parse(row.remarks); } catch(e) { remarks = []; }
        } else if (Array.isArray(row.remarks)) {
          remarks = row.remarks;
        }
        
        return {
          ...row,
          remarks,
          gpsVerified: row.gps_verified === 1 || !!row.gps_verified,
          fraudFlag: row.fraud_flag === 1 || !!row.fraud_flag,
          gps: {
            lat: row.gps_lat || 0,
            lng: row.gps_lng || 0
          },
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          uploadTimestamp: row.upload_timestamp,
          gpsPhotoUrl: row.gps_photo_url,
          gpsPhotoLat: row.gps_photo_lat,
          gpsPhotoLng: row.gps_photo_lng,
          gpsPhotoTimestamp: row.gps_photo_timestamp,
          postalCode: row.postal_code,
          deviceTimestamp: row.device_timestamp,
          browserTimestamp: row.browser_timestamp,
          googleMapsUrl: row.google_maps_url,
          certificateUrl: row.certificate_url || row.file_url,
          certificatePublicId: row.certificate_public_id,
          certificateFileType: row.certificate_file_type,
          certificateFileName: row.certificate_file_name,
          certificateUploadedAt: row.certificate_uploaded_at,
          proofPhotoUrl: row.proof_photo_url || row.photo_url,
          proofPhotoPublicId: row.proof_photo_public_id,
          proofPhotoFileType: row.proof_photo_file_type,
          proofPhotoFileName: row.proof_photo_file_name,
          proofPhotoUploadedAt: row.proof_photo_uploaded_at,
          exifLatitude: row.exif_lat,
          exifLongitude: row.exif_lng,
          exifTimestamp: row.exif_timestamp,
          exifCamera: row.exif_camera,
          exifDevice: row.exif_device,
          exifVerificationResult: row.exif_verification_result,
          verificationStatus: row.exif_verification_result || 'Missing EXIF'
        };
      });
      res.json(normalized);
    } catch (e: any) {
      console.error("Error fetching certifications:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/certifications/:id', authenticate, checkRole(['super_admin', 'admin', 'hod', 'staff', 'student']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const role = req.userData.role;
      const uid = req.userData.uid;
      const collegeId = req.userData.college_id;
      const departmentId = req.userData.department_id;

      let sql = `
        SELECT c.*, 
               u.name as student_name, 
               u.email as student_email, 
               u.profile_photo as student_profile_photo, 
               u.roll_no as student_roll_no, 
               u.class as student_class, 
               u.year as student_year, 
               u.section as student_section,
               u.address as student_address
        FROM certifications c
        LEFT JOIN users u ON c.user_id = u.uid
        WHERE c.id = ? AND c.is_deleted != 1
      `;
      const params: any[] = [id];

      if (role === 'student') {
        sql += ` AND c.user_id = ?`;
        params.push(uid);
      } else if (role === 'staff' || role === 'hod') {
        sql += ` AND c.college_id = ? AND c.department_id = ?`;
        params.push(collegeId, departmentId);
      } else if (role === 'admin') {
        sql += ` AND c.college_id = ?`;
        params.push(collegeId);
      }

      const row = db.prepare(sql).get(...params) as any;
      if (!row) {
        return res.status(404).json({ error: 'Certificate not found or access denied' });
      }

      let remarks = [];
      if (typeof row.remarks === 'string') {
        try { remarks = JSON.parse(row.remarks); } catch(e) { remarks = []; }
      } else if (Array.isArray(row.remarks)) {
        remarks = row.remarks;
      }

      const normalized = {
        ...row,
        remarks,
        gpsVerified: row.gps_verified === 1 || !!row.gps_verified,
        fraudFlag: row.fraud_flag === 1 || !!row.fraud_flag,
        gps: {
          lat: row.gps_lat || 0,
          lng: row.gps_lng || 0
        },
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        uploadTimestamp: row.upload_timestamp,
        gpsPhotoUrl: row.gps_photo_url,
        gpsPhotoLat: row.gps_photo_lat,
        gpsPhotoLng: row.gps_photo_lng,
        gpsPhotoTimestamp: row.gps_photo_timestamp,
        postalCode: row.postal_code,
        deviceTimestamp: row.device_timestamp,
        browserTimestamp: row.browser_timestamp,
        googleMapsUrl: row.google_maps_url,
        certificateUrl: row.certificate_url || row.file_url,
        certificatePublicId: row.certificate_public_id,
        certificateFileType: row.certificate_file_type,
        certificateFileName: row.certificate_file_name,
        certificateUploadedAt: row.certificate_uploaded_at,
        proofPhotoUrl: row.proof_photo_url || row.photo_url,
        proofPhotoPublicId: row.proof_photo_public_id,
        proofPhotoFileType: row.proof_photo_file_type,
        proofPhotoFileName: row.proof_photo_file_name,
        proofPhotoUploadedAt: row.proof_photo_uploaded_at,
        exifLatitude: row.exif_lat,
        exifLongitude: row.exif_lng,
        exifTimestamp: row.exif_timestamp,
        exifCamera: row.exif_camera,
        exifDevice: row.exif_device,
        exifVerificationResult: row.exif_verification_result,
        verificationStatus: row.exif_verification_result || 'Missing EXIF'
      };

      res.json(normalized);
    } catch (e: any) {
      console.error("Error fetching certificate detail:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/certifications', authenticate, upload.fields([
    { name: 'certificate', maxCount: 1 },
    { name: 'photo', maxCount: 1 }
  ]), checkRole(['super_admin', 'admin', 'hod', 'staff', 'student']), async (req: any, res) => {
    try {
      const files = (req.files || {}) as { [fieldname: string]: Express.Multer.File[] };
      const certificateFile = files['certificate']?.[0];
      const photoFile = files['photo']?.[0];

      const {
        studentName, rollNo, class: className, year, section, phoneNumber, city, collegeName, collegeId, departmentId,
        eventName, eventCollegeName, type, date,
        gpsLat, gpsLng, altitude, accuracy, street, area, locality, district, state, country, postalCode, timezone,
        deviceTimestamp, browserTimestamp, googleMapsUrl,
        exifLat, exifLng, exifTimestamp, exifCamera, exifDevice, exifVerificationResult,
        browserMetadata, verificationMetadata
      } = req.body;

      let certificateUrl = req.body.fileUrl;
      let certMeta: any = {};
      if (certificateFile) {
        const uploadResult = await uploadMediaFileDetailed(certificateFile, 'certificates');
        certificateUrl = uploadResult.url;
        certMeta = {
          certificate_url: uploadResult.url,
          certificate_public_id: uploadResult.public_id,
          certificate_file_type: uploadResult.file_type,
          certificate_file_name: uploadResult.file_name,
          certificate_uploaded_at: uploadResult.uploaded_at.toISOString()
        };
      } else if (req.body.certificateUrl || req.body.fileUrl) {
        const cUrl = req.body.certificateUrl || req.body.fileUrl;
        certMeta = {
          certificate_url: cUrl,
          certificate_public_id: req.body.certificatePublicId || 'legacy',
          certificate_file_type: req.body.certificateFileType || 'pdf',
          certificate_file_name: req.body.certificateFileName || 'certificate',
          certificate_uploaded_at: req.body.certificateUploadedAt || new Date().toISOString()
        };
      }

      let proofPhotoUrl = req.body.photoUrl;
      let photoMeta: any = {};
      if (photoFile) {
        const uploadResult = await uploadMediaFileDetailed(photoFile, 'photos');
        proofPhotoUrl = uploadResult.url;
        photoMeta = {
          proof_photo_url: uploadResult.url,
          proof_photo_public_id: uploadResult.public_id,
          proof_photo_file_type: uploadResult.file_type,
          proof_photo_file_name: uploadResult.file_name,
          proof_photo_uploaded_at: uploadResult.uploaded_at.toISOString()
        };
      } else if (req.body.proofPhotoUrl || req.body.photoUrl) {
        const pUrl = req.body.proofPhotoUrl || req.body.photoUrl;
        photoMeta = {
          proof_photo_url: pUrl,
          proof_photo_public_id: req.body.proofPhotoPublicId || 'legacy',
          proof_photo_file_type: req.body.proofPhotoFileType || 'jpg',
          proof_photo_file_name: req.body.proofPhotoFileName || 'proof',
          proof_photo_uploaded_at: req.body.proofPhotoUploadedAt || new Date().toISOString()
        };
      }

      const id = 'cert_' + Date.now() + Math.random().toString(36).substring(2, 9);
      
      const dataToSave = {
        userId: req.userData.uid,
        studentName,
        rollNo,
        class: className,
        year,
        section: section || null,
        phoneNumber,
        city,
        collegeName,
        collegeId,
        departmentId,
        eventName,
        eventCollegeName,
        type,
        date,
        fileUrl: certificateUrl,
        photoUrl: proofPhotoUrl,
        academicYear: req.body.academicYear || req.body.academic_year || req.userData.academic_year || req.userData.academicYear || null,
        gps: {
          lat: (gpsLat && !isNaN(parseFloat(gpsLat))) ? parseFloat(gpsLat) : 0,
          lng: (gpsLng && !isNaN(parseFloat(gpsLng))) ? parseFloat(gpsLng) : 0
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        
        altitude: altitude ? parseFloat(altitude) : null,
        accuracy: accuracy ? parseFloat(accuracy) : null,
        street: street || null,
        area: area || null,
        locality: locality || null,
        district: district || null,
        state: state || null,
        country: country || null,
        postalCode: postalCode || null,
        timezone: timezone || null,
        deviceTimestamp: deviceTimestamp || null,
        browserTimestamp: browserTimestamp || null,
        googleMapsUrl: googleMapsUrl || null,
        
        ...certMeta,
        ...photoMeta,
        
        exifLatitude: exifLat ? parseFloat(exifLat) : null,
        exifLongitude: exifLng ? parseFloat(exifLng) : null,
        exifTimestamp: exifTimestamp || null,
        exifCamera: exifCamera || null,
        exifDevice: exifDevice || null,
        exifVerificationResult: exifVerificationResult || null,
        
        browserMetadata: browserMetadata || null,
        verificationMetadata: verificationMetadata || null
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

      if (role === 'staff' || role === 'hod' || role === 'admin' || role === 'super_admin') {
        if (['approved', 'rejected', 'verified', 'pending', 'staff_approved'].includes(newStatus)) {
          allowed = true;
        } else {
          errorMessage = `Invalid target status: ${newStatus}`;
        }
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
      const ipAddr = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      setDocument('auditLogs', 'log_' + Date.now() + Math.random().toString(36).substring(2, 6), {
        action: 'STATUS_UPDATE',
        details: `Certificate ${id} status changed from ${currentStatus} to ${newStatus}`,
        userId: cert.user_id || cert.userId,
        collegeId: req.userData.collegeId,
        timestamp: new Date().toISOString(),
        reviewerId: uid,
        reviewerRole: role,
        actionType: newStatus,
        remarks: remark || `Status updated to ${newStatus}`,
        ipAddress: ipAddr,
        gpsVerificationResult: cert.exif_verification_result || (cert.gps_verified === 1 ? 'verified' : 'unverified'),
        certificateId: id
      });

      // 5. Notification for the student
      const studentId = cert.user_id || cert.userId;
      if (studentId) {
        calculateResumeScore(studentId);

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
      return calculateResumeScore(studentId).score;
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
        SELECT u.uid, u.name, u.roll_no, u.department_id, u.class, u.section, u.academic_year,
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
        const assignedYear = req.userData.assigned_academic_year || req.userData.assignedAcademicYear;
        if (assignedYear && assignedYear !== 'All Years') {
          sql += ` AND u.academic_year = ?`;
          params.push(assignedYear);
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

  app.get('/api/staff/dashboard-stats', authenticate, checkRole(['staff', 'hod', 'admin']), async (req: any, res) => {
    try {
      const { role, college_id, department_id, uid } = req.userData;
      const assignedYear = req.userData.assigned_academic_year || req.userData.assignedAcademicYear;
      
      const cacheKey = `staff:dashboard-stats:${college_id || 'any'}:${department_id || 'any'}:${uid}:${assignedYear || 'any'}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: cached, _cached: true });
      }

      let query: string;
      let params: any[] = [];
      
      if (role === 'staff' && assignedYear && assignedYear !== 'All Years') {
        query = `
          SELECT 
            (SELECT count(*) FROM users WHERE role='student' AND college_id = ? AND department_id = ? AND academic_year = ?) as totalStudents,
            (SELECT count(*) FROM certifications WHERE college_id = ? AND department_id = ? AND status = 'pending' AND academic_year = ?) as pendingCerts,
            (SELECT count(*) FROM certifications WHERE college_id = ? AND department_id = ? AND status = 'approved' AND academic_year = ?) as approvedCerts,
            (SELECT count(*) FROM student_academic_profile WHERE college_id = ? AND department_id = ? AND arrears > 0 AND academic_year = ?) as studentsWithArrears,
            (SELECT avg(cgpa) FROM student_academic_profile WHERE college_id = ? AND department_id = ? AND academic_year = ?) as avgCGPA,
            (SELECT avg(attendance_percentage) FROM student_academic_profile WHERE college_id = ? AND department_id = ? AND academic_year = ?) as avgAttendance
        `;
        params = [
          college_id, department_id, assignedYear,
          college_id, department_id, assignedYear,
          college_id, department_id, assignedYear,
          college_id, department_id, assignedYear,
          college_id, department_id, assignedYear,
          college_id, department_id, assignedYear
        ];
      } else {
        query = `
          SELECT 
            (SELECT count(*) FROM users WHERE role='student' AND college_id = ? AND department_id = ?) as totalStudents,
            (SELECT count(*) FROM certifications WHERE college_id = ? AND department_id = ? AND status = 'pending') as pendingCerts,
            (SELECT count(*) FROM certifications WHERE college_id = ? AND department_id = ? AND status = 'approved') as approvedCerts,
            (SELECT count(*) FROM student_academic_profile WHERE college_id = ? AND department_id = ? AND arrears > 0) as studentsWithArrears,
            (SELECT avg(cgpa) FROM student_academic_profile WHERE college_id = ? AND department_id = ?) as avgCGPA,
            (SELECT avg(attendance_percentage) FROM student_academic_profile WHERE college_id = ? AND department_id = ?) as avgAttendance
        `;
        params = [
          college_id, department_id,
          college_id, department_id,
          college_id, department_id,
          college_id, department_id,
          college_id, department_id,
          college_id, department_id
        ];
      }

      const stats = db.prepare(query).get(...params) as any;

      await cacheService.set(cacheKey, stats, 30);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/staff/students', authenticate, checkRole(['staff', 'hod', 'admin']), (req: any, res) => {
    try {
      const { role, college_id, department_id } = req.userData;
      const assignedYear = req.userData.assigned_academic_year || req.userData.assignedAcademicYear;
      
      let sql = `
        SELECT 
          u.uid, u.name, u.roll_no, u.class, u.year, u.section, u.academic_year,
          sap.cgpa, sap.attendance_percentage, sap.arrears, sap.placement_readiness_score,
          (SELECT count(*) FROM certifications WHERE user_id = u.uid) as certCount,
          (SELECT count(*) FROM career_activities WHERE user_id = u.uid) as activityCount,
          u.last_login, u.status
        FROM users u
        LEFT JOIN student_academic_profile sap ON u.uid = sap.student_id
        WHERE u.role = 'student' AND u.college_id = ? AND u.department_id = ?
      `;
      const params: any[] = [college_id, department_id];
      
      if (role === 'staff' && assignedYear && assignedYear !== 'All Years') {
        sql += ` AND u.academic_year = ?`;
        params.push(assignedYear);
      }
      
      sql += ` ORDER BY u.name ASC`;

      const students = db.prepare(sql).all(...params);

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

  app.get('/api/staff/analytics', authenticate, checkRole(['staff', 'hod', 'admin']), async (req: any, res) => {
    try {
      const { role, college_id, department_id, uid } = req.userData;
      const assignedYear = req.userData.assigned_academic_year || req.userData.assignedAcademicYear;
      
      const cacheKey = `staff:analytics:${college_id || 'any'}:${department_id || 'any'}:${uid}:${assignedYear || 'any'}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: cached, _cached: true });
      }
      
      let cgpaSql = `
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
      `;
      let certSql = `
        SELECT strftime('%Y-%m', created_at) as month, count(*) as count
        FROM certifications
        WHERE college_id = ? AND department_id = ?
      `;
      
      const cgpaParams = [college_id, department_id];
      const certParams = [college_id, department_id];
      
      if (role === 'staff' && assignedYear && assignedYear !== 'All Years') {
        cgpaSql += ` AND academic_year = ?`;
        cgpaParams.push(assignedYear);
        
        certSql += ` AND academic_year = ?`;
        certParams.push(assignedYear);
      }
      
      cgpaSql += ` GROUP BY range`;
      certSql += ` GROUP BY month ORDER BY month DESC LIMIT 6`;
      
      const cgpaDist = db.prepare(cgpaSql).all(...cgpaParams);
      const certTrends = db.prepare(certSql).all(...certParams);

      const responseData = { cgpaDist, certTrends };
      await cacheService.set(cacheKey, responseData, 60);
      res.json({ success: true, data: responseData });
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
      const { role, college_id, department_id } = req.userData;
      const assignedYear = req.userData.assigned_academic_year || req.userData.assignedAcademicYear;
      
      let sql = `
        SELECT sa.*, u.name as student_name
        FROM student_attendance sa
        JOIN users u ON sa.student_id = u.uid
        WHERE u.college_id = ? AND u.department_id = ?
      `;
      const params: any[] = [college_id, department_id];
      
      if (role === 'staff' && assignedYear && assignedYear !== 'All Years') {
        sql += ` AND u.academic_year = ?`;
        params.push(assignedYear);
      }
      
      sql += ` ORDER BY sa.created_at DESC`;
      
      const attendance = db.prepare(sql).all(...params);

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

  // ============================================
  // CONSOLIDATED SYSTEM API ENDPOINTS [NEW]
  // ============================================

  // Consolidated Student Dashboard Overview endpoint
  app.get('/api/student/dashboard-overview', authenticate, async (req: any, res) => {
    try {
      const studentId = req.userData.uid;

      // Recalculate score and sync to ensure dashboard consistency
      calculateResumeScore(studentId);

      // 1. Get stats (score, rank, totalStudents)
      const rankRows = db.prepare(`
        SELECT uid,
          (COALESCE(cert_counts.cnt,0)*10 + COALESCE(career_counts.cnt,0)*5) as score
        FROM users u
        LEFT JOIN (
          SELECT user_id, COUNT(*) as cnt FROM certifications
          WHERE status IN ('verified','approved') AND (is_deleted IS NOT TRUE) GROUP BY user_id
        ) cert_counts ON cert_counts.user_id = u.uid
        LEFT JOIN (
          SELECT user_id, COUNT(*) as cnt FROM career_activities
          WHERE status='approved' AND (is_deleted IS NOT TRUE) GROUP BY user_id
        ) career_counts ON career_counts.user_id = u.uid
        WHERE u.role = 'student'
        ORDER BY score DESC
      `).all() as any[];

      const rankIdx = rankRows.findIndex((r: any) => r.uid === studentId);
      const studentRank = rankIdx !== -1 ? rankIdx + 1 : null;
      const studentScore = rankIdx !== -1 ? rankRows[rankIdx].score : 0;
      const totalStudents = rankRows.length;

      // 2. Get opportunities
      const opportunities = db.prepare("SELECT * FROM opportunities WHERE status = 'open' ORDER BY created_at DESC LIMIT 50").all();

      // 3. Get academic profile
      const academicProfile = db.prepare('SELECT * FROM student_academic_profile WHERE student_id = ?').get(studentId) as any;

      // 4. Get notifications (from student_notifications table)
      const notifications = db.prepare(`
        SELECT * FROM student_notifications 
        WHERE student_id = ? 
        ORDER BY created_at DESC LIMIT 20
      `).all(studentId);

      // 5. Get academic performance (semesters, summary, records)
      const semesters = db.prepare("SELECT * FROM student_semester_summary WHERE student_id = ? ORDER BY semester ASC").all(studentId);
      const cgpaSummary = db.prepare("SELECT * FROM student_cgpa_summary WHERE student_id = ?").get(studentId);
      const records = db.prepare(`
        SELECT r.*, s.subject_name, s.subject_code, s.credits
        FROM student_academic_records r
        JOIN academic_subjects s ON r.subject_id = s.id
        WHERE r.student_id = ?
        ORDER BY r.semester DESC, s.subject_name ASC
      `).all(studentId);

      res.json({
        success: true,
        data: {
          stats: {
            studentRank,
            studentScore,
            totalStudents,
            systemHealth: "Operational",
            timestamp: new Date().toISOString()
          },
          opportunities,
          academicProfile: academicProfile || { student_id: studentId, cgpa: 0, arrears: 0, placement_readiness_score: 0 },
          notifications,
          academicPerformance: {
            semesters,
            summary: cgpaSummary || { cgpa: 0, total_arrears: 0, total_semesters: 0 },
            records
          }
        }
      });
    } catch (error: any) {
      console.error("Consolidated student dashboard fetch failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Consolidated Staff Dashboard Overview endpoint
  app.get('/api/staff/dashboard-overview', authenticate, checkRole(['staff', 'hod', 'admin']), async (req: any, res) => {
    try {
      const { college_id, department_id, uid } = req.userData;
      const cacheKey = `staff:dashboard-overview:${college_id || 'any'}:${department_id || 'any'}:${uid}`;
      
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: cached, _cached: true });
      }

      // 1. Fetch dashboard-stats
      const stats = db.prepare(`
        SELECT 
          (SELECT count(*) FROM users WHERE role='student' AND college_id = ? AND department_id = ?) as totalStudents,
          (SELECT count(*) FROM certifications WHERE college_id = ? AND department_id = ? AND status = 'pending') as pendingCerts,
          (SELECT count(*) FROM certifications WHERE college_id = ? AND department_id = ? AND status = 'approved') as approvedCerts,
          (SELECT count(*) FROM student_academic_profile WHERE college_id = ? AND department_id = ? AND arrears > 0) as studentsWithArrears,
          (SELECT avg(cgpa) FROM student_academic_profile WHERE college_id = ? AND department_id = ?) as avgCGPA,
          (SELECT avg(attendance_percentage) FROM student_academic_profile WHERE college_id = ? AND department_id = ?) as avgAttendance
      `).get(college_id, department_id, college_id, department_id, college_id, department_id, college_id, department_id, college_id, department_id, college_id, department_id) as any;

      // 2. Fetch students list
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

      // 3. Fetch analytics (cgpaDist and certTrends)
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
        SELECT to_char(created_at, 'YYYY-MM') as month, count(*) as count
        FROM certifications
        WHERE college_id = ? AND department_id = ?
        GROUP BY month
        ORDER BY month DESC
        LIMIT 6
      `).all(college_id, department_id);

      const responseData = {
        stats,
        students,
        analytics: { cgpaDist, certTrends }
      };

      await cacheService.set(cacheKey, responseData, 60);
      res.json({ success: true, data: responseData });
    } catch (error: any) {
      console.error("Consolidated staff dashboard fetch failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Register broadcast notification queue worker
  queueService.registerHandler('send-broadcast-notification', async (jobData: any) => {
    const { title, message, targetRole, targetCollege, targetDept, targetYear, targetSection } = jobData;
    let query = "SELECT uid FROM users WHERE 1=1";
    const params: any[] = [];

    if (targetRole && targetRole !== 'all') {
      query += " AND role = ?";
      params.push(targetRole);
    }
    if (targetCollege && targetCollege !== 'all' && targetCollege !== 'super_admin') {
      query += " AND college_id = ?";
      params.push(targetCollege);
    }
    if (targetDept && targetDept !== 'all') {
      query += " AND department_id = ?";
      params.push(targetDept);
    }
    if (targetYear && targetYear !== 'all') {
      query += " AND year = ?";
      params.push(targetYear);
    }
    if (targetSection && targetSection !== 'all') {
      query += " AND section = ?";
      params.push(targetSection);
    }

    const targetUsers = db.prepare(query).all(...params) as any[];
    
    // Batch inserts of 100 to prevent event loop block or query issues
    const batchSize = 100;
    for (let i = 0; i < targetUsers.length; i += batchSize) {
      const batch = targetUsers.slice(i, i + batchSize);
      const placeholders = batch.map(() => "(?, ?, ?, ?, ?)").join(", ");
      const sql = `INSERT INTO notifications (id, user_id, title, message, type) VALUES ${placeholders}`;
      const values: any[] = [];
      
      batch.forEach(u => {
        values.push(
          'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          u.uid,
          title,
          message,
          'announcement'
        );
      });
      
      db.prepare(sql).run(...values);
      await new Promise(resolve => setImmediate(resolve));
    }
    return { reached: targetUsers.length };
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
