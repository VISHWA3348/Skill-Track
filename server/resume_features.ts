import express from 'express';
import { db } from './db';
import { authenticate, checkRole } from './middleware';

export function setupResumeFeatures(app: express.Express) {

  // ============================================
  // RESUME PROFILE CRUD
  // ============================================

  app.get('/api/resume/profile', authenticate, (req: any, res) => {
    try {
      const student_id = req.user.uid;
      let profile = db.prepare('SELECT * FROM resume_profiles WHERE student_id = ?').get(student_id) as any;
      
      if (!profile) {
        // Create a default profile if not exists
        const id = 'res_prof_' + Date.now();
        db.prepare(`
          INSERT INTO resume_profiles (id, student_id, headline, summary, languages, interests)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, student_id, 'Aspiring Professional', '', '[]', '[]');
        profile = db.prepare('SELECT * FROM resume_profiles WHERE student_id = ?').get(student_id);
      }

      res.json({ success: true, data: profile });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/resume/profile', authenticate, (req: any, res) => {
    try {
      const student_id = req.user.uid;
      const { headline, summary, linkedin_url, github_url, portfolio_url, languages, interests, template_name, public_visibility } = req.body;
      
      db.prepare(`
        UPDATE resume_profiles 
        SET headline = ?, summary = ?, linkedin_url = ?, github_url = ?, portfolio_url = ?, 
            languages = ?, interests = ?, template_name = ?, public_visibility = ?
        WHERE student_id = ?
      `).run(
        headline, summary, linkedin_url, github_url, portfolio_url, 
        typeof languages === 'string' ? languages : JSON.stringify(languages || []),
        typeof interests === 'string' ? interests : JSON.stringify(interests || []),
        template_name || 'modern',
        public_visibility ? 1 : 0,
        student_id
      );

      res.json({ success: true, message: 'Resume profile updated' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================
  // PROJECTS CRUD
  // ============================================

  app.get('/api/resume/projects', authenticate, (req: any, res) => {
    try {
      const student_id = req.user.uid;
      const projects = db.prepare('SELECT * FROM resume_projects WHERE student_id = ? ORDER BY created_at DESC').all();
      res.json({ success: true, data: projects });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/resume/projects', authenticate, (req: any, res) => {
    try {
      const student_id = req.user.uid;
      const { project_name, description, technologies, github_url, live_url } = req.body;
      const id = 'proj_' + Date.now();
      
      db.prepare(`
        INSERT INTO resume_projects (id, student_id, project_name, description, technologies, github_url, live_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, student_id, project_name, description, technologies, github_url, live_url);

      res.json({ success: true, data: { id, project_name } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/resume/projects/:id', authenticate, (req: any, res) => {
    try {
      db.prepare('DELETE FROM resume_projects WHERE id = ? AND student_id = ?').run(req.params.id, req.user.uid);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================
  // EXPERIENCE CRUD
  // ============================================

  app.get('/api/resume/experience', authenticate, (req: any, res) => {
    try {
      const student_id = req.user.uid;
      const experience = db.prepare('SELECT * FROM resume_experience WHERE student_id = ? ORDER BY created_at DESC').all();
      res.json({ success: true, data: experience });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/resume/experience', authenticate, (req: any, res) => {
    try {
      const student_id = req.user.uid;
      const { company_name, role, duration, description } = req.body;
      const id = 'exp_' + Date.now();
      
      db.prepare(`
        INSERT INTO resume_experience (id, student_id, company_name, role, duration, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, student_id, company_name, role, duration, description);

      res.json({ success: true, data: { id, company_name } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/resume/experience/:id', authenticate, (req: any, res) => {
    try {
      db.prepare('DELETE FROM resume_experience WHERE id = ? AND student_id = ?').run(req.params.id, req.user.uid);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================
  // SKILLS CRUD
  // ============================================

  app.get('/api/resume/skills', authenticate, (req: any, res) => {
    try {
      const student_id = req.user.uid;
      const skills = db.prepare('SELECT * FROM resume_skills WHERE student_id = ? ORDER BY skill_name ASC').all();
      res.json({ success: true, data: skills });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/resume/skills', authenticate, (req: any, res) => {
    try {
      const student_id = req.user.uid;
      const { skill_name, skill_level, auto_detected } = req.body;
      
      // Check if skill exists
      const existing = db.prepare('SELECT id FROM resume_skills WHERE student_id = ? AND skill_name = ?').get(student_id, skill_name);
      if (existing) {
        db.prepare('UPDATE resume_skills SET skill_level = ? WHERE id = ?').run(skill_level, (existing as any).id);
        return res.json({ success: true, message: 'Skill updated' });
      }

      const id = 'skill_' + Date.now();
      db.prepare(`
        INSERT INTO resume_skills (id, student_id, skill_name, skill_level, auto_detected)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, student_id, skill_name, skill_level, auto_detected ? 1 : 0);

      res.json({ success: true, data: { id, skill_name } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/resume/skills/:id', authenticate, (req: any, res) => {
    try {
      db.prepare('DELETE FROM resume_skills WHERE id = ? AND student_id = ?').run(req.params.id, req.user.uid);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================
  // AI FEATURES
  // ============================================

  app.post('/api/resume/ai/detect-skills', authenticate, (req: any, res) => {
    try {
      const student_id = req.user.uid;
      
      // 1. Fetch certifications
      const certs = db.prepare("SELECT event_name, type FROM certifications WHERE user_id = ? AND status = 'approved'").all() as any[];
      
      // 2. Fetch projects
      const projects = db.prepare("SELECT project_name, description, technologies FROM resume_projects WHERE student_id = ?").all() as any[];
      
      // 3. Fetch activities
      const activities = db.prepare("SELECT type, organization, details FROM career_activities WHERE user_id = ? AND status = 'approved'").all() as any[];

      const detectedSkills = new Set<string>();
      const skillKeywords: Record<string, string[]> = {
        'Python': ['python', 'django', 'flask', 'pandas', 'numpy'],
        'JavaScript': ['javascript', 'js', 'react', 'node', 'express', 'vue', 'angular', 'typescript', 'ts'],
        'Java': ['java', 'spring', 'hibernate'],
        'Cloud Computing': ['aws', 'azure', 'google cloud', 'gcp', 'cloud', 'devops'],
        'Data Science': ['data science', 'machine learning', 'ml', 'ai', 'artificial intelligence', 'deep learning'],
        'Web Development': ['html', 'css', 'web', 'frontend', 'backend', 'fullstack'],
        'Mobile App Development': ['android', 'ios', 'react native', 'flutter', 'swift', 'kotlin'],
        'Database': ['sql', 'mysql', 'postgresql', 'mongodb', 'firebase', 'database', 'db'],
        'UI/UX Design': ['figma', 'adobe xd', 'ui', 'ux', 'design'],
        'Communication': ['soft skills', 'communication', 'leadership', 'presentation'],
        'Cyber Security': ['cyber security', 'ethical hacking', 'networking', 'security']
      };

      const scanText = (text: string) => {
        if (!text) return;
        const lowerText = text.toLowerCase();
        Object.entries(skillKeywords).forEach(([skill, keywords]) => {
          if (keywords.some(k => lowerText.includes(k))) {
            detectedSkills.add(skill);
          }
        });
      };

      certs.forEach(c => scanText(`${c.event_name} ${c.type}`));
      projects.forEach(p => scanText(`${p.project_name} ${p.description} ${p.technologies}`));
      activities.forEach(a => scanText(`${a.type} ${a.organization} ${a.details}`));

      // Save detected skills
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO resume_skills (id, student_id, skill_name, skill_level, auto_detected)
        VALUES (?, ?, ?, ?, ?)
      `);

      const added = [];
      detectedSkills.forEach(skill => {
        const id = 'skill_ai_' + Math.random().toString(36).substr(2, 9);
        // Only insert if not exists
        const check = db.prepare('SELECT id FROM resume_skills WHERE student_id = ? AND skill_name = ?').get(student_id, skill);
        if (!check) {
          insertStmt.run(id, student_id, skill, 'Intermediate', 1);
          added.push(skill);
        }
      });

      res.json({ success: true, data: Array.from(detectedSkills), added });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/resume/ai/generate-summary', authenticate, (req: any, res) => {
    try {
      const student_id = req.user.uid;
      
      const user = db.prepare('SELECT name, department_id, class, year FROM users WHERE uid = ?').get(student_id) as any;
      const skills = db.prepare('SELECT skill_name FROM resume_skills WHERE student_id = ?').all() as any[];
      const certs = db.prepare("SELECT count(*) as count FROM certifications WHERE user_id = ? AND status = 'approved'").get() as any;
      const projects = db.prepare("SELECT count(*) as count FROM resume_projects WHERE student_id = ?").get() as any;

      const skillList = skills.map(s => s.skill_name).slice(0, 5).join(', ');
      const dept = user.department_id || 'Engineering';
      
      let summary = `Motivated ${dept} student with a strong foundation in ${skillList || 'academic studies'}. `;
      
      if (certs.count > 0) {
        summary += `Successfully completed ${certs.count} professional certifications. `;
      }
      
      if (projects.count > 0) {
        summary += `Experienced in developing ${projects.count} technical projects. `;
      }
      
      summary += `Seeking opportunities to apply my technical skills and contribute to innovative projects in a professional environment.`;

      res.json({ success: true, summary });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================
  // ANALYTICS & SCORE
  // ============================================

  app.get('/api/resume/score', authenticate, (req: any, res) => {
    try {
      const student_id = req.user.uid;
      
      const profile = db.prepare('SELECT * FROM resume_profiles WHERE student_id = ?').get(student_id) as any;
      const skills = db.prepare('SELECT count(*) as count FROM resume_skills WHERE student_id = ?').get() as any;
      const projects = db.prepare('SELECT count(*) as count FROM resume_projects WHERE student_id = ?').get() as any;
      const experience = db.prepare('SELECT count(*) as count FROM resume_experience WHERE student_id = ?').get() as any;
      const certs = db.prepare("SELECT count(*) as count FROM certifications WHERE user_id = ? AND status = 'approved'").get() as any;

      let score = 20; // Base score for having an account
      const suggestions = [];

      if (profile?.summary) score += 15; else suggestions.push("Add a professional summary");
      if (profile?.linkedin_url) score += 5; else suggestions.push("Add your LinkedIn profile");
      if (profile?.github_url) score += 5; else suggestions.push("Add your GitHub profile");
      
      if (skills.count >= 5) score += 15; else if (skills.count > 0) score += 10; else suggestions.push("Add at least 5 skills");
      if (projects.count >= 2) score += 20; else if (projects.count > 0) score += 10; else suggestions.push("Add technical projects");
      if (experience.count > 0) score += 10; else suggestions.push("Add internship or work experience");
      if (certs.count > 0) score += 10; else suggestions.push("Get more certifications approved");

      res.json({ success: true, score: Math.min(score, 100), suggestions });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================
  // PUBLIC VIEW
  // ============================================

  app.get('/api/public/resume/:id', (req, res) => {
    try {
      const student_id = req.params.id;
      
      const profile = db.prepare('SELECT * FROM resume_profiles WHERE student_id = ?').get(student_id) as any;
      if (!profile || profile.public_visibility === 0) {
        return res.status(404).json({ error: 'Resume not found or private' });
      }

      const user = db.prepare('SELECT name, email, department_id, college_name, profile_photo FROM users WHERE uid = ?').get(student_id) as any;
      const skills = db.prepare('SELECT * FROM resume_skills WHERE student_id = ?').all();
      const projects = db.prepare('SELECT * FROM resume_projects WHERE student_id = ?').all();
      const experience = db.prepare('SELECT * FROM resume_experience WHERE student_id = ?').all();
      const certs = db.prepare("SELECT * FROM certifications WHERE user_id = ? AND status = 'approved'").all();

      res.json({
        success: true,
        data: {
          user,
          profile,
          skills,
          projects,
          experience,
          certs
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

}
