import express from 'express';
import { db } from './db';
import { authenticate, checkRole } from './middleware';

export function calculateResumeScore(studentId: string) {
  try {
    const user = db.prepare('SELECT name, email, phone_number, city, class, year, section FROM users WHERE uid = ?').get(studentId) as any;
    const profile = db.prepare('SELECT * FROM resume_profiles WHERE student_id = ?').get(studentId) as any;
    const skills = db.prepare('SELECT count(*) as count FROM resume_skills WHERE student_id = ?').get(studentId) as any;
    const projects = db.prepare('SELECT count(*) as count FROM resume_projects WHERE student_id = ?').get(studentId) as any;
    const experience = db.prepare('SELECT count(*) as count FROM resume_experience WHERE student_id = ?').get(studentId) as any;
    const certs = db.prepare("SELECT count(*) as count FROM certifications WHERE user_id = ? AND status = 'approved'").get(studentId) as any;

    let score = 0;
    const suggestions = [];

    // 1. Personal Information = 15%
    let nameVal = user?.name || '';
    let emailVal = user?.email || '';
    let phoneVal = user?.phone_number || '';
    let cityVal = user?.city || '';
    let classVal = user?.class || '';
    let yearVal = user?.year || '';
    let sectionVal = user?.section || '';

    if (nameVal && nameVal.trim() !== '') {
      score += 3;
    } else {
      suggestions.push("Add your name to your profile");
    }

    if (emailVal && emailVal.trim() !== '') {
      score += 3;
    } else {
      suggestions.push("Add your email to your profile");
    }

    if (phoneVal && phoneVal.trim() !== '') {
      score += 3;
    } else {
      suggestions.push("Add your phone number");
    }

    if (cityVal && cityVal.trim() !== '') {
      score += 2;
    } else {
      suggestions.push("Add your city");
    }

    if (classVal && classVal.trim() !== '') {
      score += 2;
    } else {
      suggestions.push("Add your class");
    }

    if (yearVal && yearVal.trim() !== '') {
      score += 1;
    } else {
      suggestions.push("Add your year");
    }

    if (sectionVal && sectionVal.trim() !== '') {
      score += 1;
    } else {
      suggestions.push("Add your section");
    }

    // 2. Professional Headline = 10%
    let headlineVal = profile?.headline || '';
    if (headlineVal && headlineVal.trim() !== '' && headlineVal !== 'Aspiring Professional') {
      score += 10;
    } else {
      suggestions.push("Add a professional headline");
    }

    // 3. Professional Summary = 15%
    let summaryVal = profile?.summary || '';
    if (summaryVal && summaryVal.trim() !== '') {
      score += 15;
    } else {
      suggestions.push("Add a professional summary");
    }

    // 4. LinkedIn URL = 5%
    let linkedinVal = profile?.linkedin_url || '';
    if (linkedinVal && linkedinVal.trim() !== '') {
      score += 5;
    } else {
      suggestions.push("Add your LinkedIn profile");
    }

    // 5. GitHub URL = 5%
    let githubVal = profile?.github_url || '';
    if (githubVal && githubVal.trim() !== '') {
      score += 5;
    } else {
      suggestions.push("Add your GitHub profile");
    }

    // 6. Portfolio Website = 5%
    let portfolioVal = profile?.portfolio_url || '';
    if (portfolioVal && portfolioVal.trim() !== '') {
      score += 5;
    } else {
      suggestions.push("Add your portfolio website");
    }

    // 7. Skills (minimum 5) = 15%
    const skillsCount = skills?.count || 0;
    if (skillsCount >= 5) {
      score += 15;
    } else {
      score += skillsCount * 3;
      suggestions.push("Add at least 5 skills");
    }

    // 8. Projects = 10%
    const projectsCount = projects?.count || 0;
    if (projectsCount >= 2) {
      score += 10;
    } else {
      score += projectsCount * 5;
      suggestions.push("Add key projects (minimum 2)");
    }

    // 9. Work Experience = 10%
    const experienceCount = experience?.count || 0;
    if (experienceCount >= 2) {
      score += 10;
    } else {
      score += experienceCount * 5;
      suggestions.push("Add work experience (minimum 2)");
    }

    // 10. Certifications = 10%
    const certsCount = certs?.count || 0;
    if (certsCount >= 2) {
      score += 10;
    } else {
      score += certsCount * 5;
      suggestions.push("Get certifications approved (minimum 2)");
    }

    const finalScore = Math.min(Math.max(score, 0), 100);

    // Sync to database tables
    // student_academic_profile
    const academicExists = db.prepare('SELECT id FROM student_academic_profile WHERE student_id = ?').get(studentId) as any;
    if (academicExists) {
      db.prepare(`
        UPDATE student_academic_profile 
        SET placement_readiness_score = ?, updated_at = CURRENT_TIMESTAMP
        WHERE student_id = ?
      `).run(finalScore, studentId);
    } else {
      const u = db.prepare('SELECT name, roll_no, department_id, class, year, college_id FROM users WHERE uid = ?').get(studentId) as any;
      if (u) {
        db.prepare(`
          INSERT INTO student_academic_profile (id, student_id, student_name, roll_no, department_id, class, year, college_id, cgpa, arrears, attendance_percentage, placement_readiness_score)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'ap_' + studentId, studentId, u.name || 'Student', u.roll_no || null,
          u.department_id || null, u.class || null, u.year || null,
          u.college_id || null, 0.0, 0, 0.0, finalScore
        );
      }
    }

    // ai_career_insights
    const insightExists = db.prepare('SELECT id FROM ai_career_insights WHERE student_id = ?').get(studentId) as any;
    if (insightExists) {
      db.prepare(`
        UPDATE ai_career_insights 
        SET placement_readiness_score = ?, updated_at = CURRENT_TIMESTAMP
        WHERE student_id = ?
      `).run(finalScore, studentId);
    } else {
      db.prepare(`
        INSERT INTO ai_career_insights (id, student_id, placement_readiness_score, recommended_skills, missing_skills, suggested_certifications, suggested_internships, career_path_suggestions, course_recommendations, smart_alerts, analysis_summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'ci_' + studentId, studentId, finalScore,
        JSON.stringify([]), JSON.stringify([]), JSON.stringify([]), JSON.stringify([]),
        JSON.stringify([]), JSON.stringify([]), JSON.stringify([]),
        'Profile scoring initialized.'
      );
    }

    return { score: finalScore, suggestions };
  } catch (err) {
    console.error("Error calculating resume score:", err);
    return { score: 0, suggestions: [] };
  }
}

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

      calculateResumeScore(student_id);

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
      const projects = db.prepare('SELECT * FROM resume_projects WHERE student_id = ? ORDER BY created_at DESC').all(student_id);
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

      calculateResumeScore(student_id);

      res.json({ success: true, data: { id, project_name } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/resume/projects/:id', authenticate, (req: any, res) => {
    try {
      db.prepare('DELETE FROM resume_projects WHERE id = ? AND student_id = ?').run(req.params.id, req.user.uid);
      calculateResumeScore(req.user.uid);
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
      const experience = db.prepare('SELECT * FROM resume_experience WHERE student_id = ? ORDER BY created_at DESC').all(student_id);
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

      calculateResumeScore(student_id);

      res.json({ success: true, data: { id, company_name } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/resume/experience/:id', authenticate, (req: any, res) => {
    try {
      db.prepare('DELETE FROM resume_experience WHERE id = ? AND student_id = ?').run(req.params.id, req.user.uid);
      calculateResumeScore(req.user.uid);
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
      const skills = db.prepare('SELECT * FROM resume_skills WHERE student_id = ? ORDER BY skill_name ASC').all(student_id);
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
        calculateResumeScore(student_id);
        return res.json({ success: true, message: 'Skill updated' });
      }

      const id = 'skill_' + Date.now();
      db.prepare(`
        INSERT INTO resume_skills (id, student_id, skill_name, skill_level, auto_detected)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, student_id, skill_name, skill_level, auto_detected ? 1 : 0);

      calculateResumeScore(student_id);

      res.json({ success: true, data: { id, skill_name } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/resume/skills/:id', authenticate, (req: any, res) => {
    try {
      db.prepare('DELETE FROM resume_skills WHERE id = ? AND student_id = ?').run(req.params.id, req.user.uid);
      calculateResumeScore(req.user.uid);
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
      const certs = db.prepare("SELECT event_name, type FROM certifications WHERE user_id = ? AND status = 'approved'").all(student_id) as any[];
      
      // 2. Fetch projects
      const projects = db.prepare("SELECT project_name, description, technologies FROM resume_projects WHERE student_id = ?").all(student_id) as any[];
      
      // 3. Fetch activities
      const activities = db.prepare("SELECT type, organization, details FROM career_activities WHERE user_id = ? AND status = 'approved'").all(student_id) as any[];

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
        INSERT INTO resume_skills (id, student_id, skill_name, skill_level, auto_detected)
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

      calculateResumeScore(student_id);

      res.json({ success: true, data: Array.from(detectedSkills), added });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/resume/ai/generate-summary', authenticate, (req: any, res) => {
    try {
      const student_id = req.user.uid;
      
      const user = db.prepare('SELECT name, department_id, class, year FROM users WHERE uid = ?').get(student_id) as any;
      const skills = db.prepare('SELECT skill_name FROM resume_skills WHERE student_id = ?').all(student_id) as any[];
      const certs = db.prepare("SELECT count(*) as count FROM certifications WHERE user_id = ? AND status = 'approved'").get(student_id) as any;
      const projects = db.prepare("SELECT count(*) as count FROM resume_projects WHERE student_id = ?").get(student_id) as any;

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
      const scoreData = calculateResumeScore(student_id);
      res.json({ success: true, score: scoreData.score, suggestions: scoreData.suggestions });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Consolidated Resume Profile endpoint
  app.get('/api/resume/full-profile', authenticate, (req: any, res) => {
    try {
      const student_id = req.user.uid;

      // 1. Get profile
      let profile = db.prepare('SELECT * FROM resume_profiles WHERE student_id = ?').get(student_id) as any;
      if (!profile) {
        const id = 'res_prof_' + Date.now();
        db.prepare(`
          INSERT INTO resume_profiles (id, student_id, headline, summary, languages, interests)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, student_id, 'Aspiring Professional', '', '[]', '[]');
        profile = db.prepare('SELECT * FROM resume_profiles WHERE student_id = ?').get(student_id);
      }

      // 2. Get projects
      const projects = db.prepare('SELECT * FROM resume_projects WHERE student_id = ? ORDER BY created_at DESC').all(student_id);

      // 3. Get experience
      const experience = db.prepare('SELECT * FROM resume_experience WHERE student_id = ? ORDER BY created_at DESC').all(student_id);

      // 4. Get skills
      const skills = db.prepare('SELECT * FROM resume_skills WHERE student_id = ? ORDER BY skill_name ASC').all(student_id);

      // 5. Get score and suggestions dynamically
      const scoreData = calculateResumeScore(student_id);

      res.json({
        success: true,
        data: {
          profile,
          projects,
          experience,
          skills,
          scoreInfo: { score: scoreData.score, suggestions: scoreData.suggestions }
        }
      });
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
      const skills = db.prepare('SELECT * FROM resume_skills WHERE student_id = ?').all(student_id);
      const projects = db.prepare('SELECT * FROM resume_projects WHERE student_id = ?').all(student_id);
      const experience = db.prepare('SELECT * FROM resume_experience WHERE student_id = ?').all(student_id);
      const certs = db.prepare("SELECT * FROM certifications WHERE user_id = ? AND status = 'approved'").all(student_id);

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
