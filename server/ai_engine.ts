import { db } from './db';
import { v4 as uuidv4 } from 'uuid';

interface CareerPath {
  name: string;
  skills: string[];
  certifications: string[];
  internships: string[];
}

const CAREER_PATHS: CareerPath[] = [
  {
    name: "Full Stack Developer",
    skills: ["React", "Node.js", "Express", "MongoDB", "SQL", "JavaScript", "HTML", "CSS", "TypeScript"],
    certifications: ["Meta Front-End Developer", "IBM Full Stack Developer", "AWS Certified Developer"],
    internships: ["Web Development Intern", "Software Engineering Intern", "Frontend Intern"]
  },
  {
    name: "Cloud Engineer",
    skills: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Linux", "Terraform", "Cloud Computing"],
    certifications: ["AWS Cloud Practitioner", "Google Cloud Associate", "Microsoft Azure Fundamentals"],
    internships: ["Cloud Operations Intern", "DevOps Intern", "Cloud Support Intern"]
  },
  {
    name: "AI & Data Science Engineer",
    skills: ["Python", "Machine Learning", "Data Analysis", "SQL", "TensorFlow", "PyTorch", "Statistics"],
    certifications: ["Google Data Analytics", "IBM Data Science", "Microsoft AI Fundamentals"],
    internships: ["Data Science Intern", "AI Research Intern", "Machine Learning Intern"]
  },
  {
    name: "Cybersecurity Analyst",
    skills: ["Network Security", "Ethical Hacking", "Cryptography", "Linux", "SOC", "Firewalls"],
    certifications: ["CompTIA Security+", "Cisco CyberOps", "Google Cybersecurity"],
    internships: ["Security Analyst Intern", "Cybersecurity Intern", "Risk Management Intern"]
  },
  {
    name: "UI/UX Designer",
    skills: ["Figma", "Adobe XD", "User Research", "Wireframing", "Prototyping", "Design Systems"],
    certifications: ["Google UX Design", "Interaction Design Foundation"],
    internships: ["UI/UX Design Intern", "Product Design Intern", "Graphic Design Intern"]
  }
];

export async function analyzeStudentGap(studentId: string) {
  // 1. Fetch Student Data
  const user = db.prepare('SELECT * FROM users WHERE uid = ?').get(studentId) as any;
  const academic = db.prepare('SELECT * FROM student_academic_profile WHERE student_id = ?').get(studentId) as any;
  const skills = db.prepare('SELECT * FROM student_skills WHERE student_id = ?').all() as any[];
  const certs = db.prepare('SELECT * FROM certifications WHERE user_id = ? AND (status = "verified" OR status = "approved")').all() as any[];
  const activities = db.prepare('SELECT * FROM career_activities WHERE user_id = ? AND status = "approved"').all() as any[];

  if (!user) throw new Error("Student not found");

  const studentSkills = [
    ...(user.skills ? user.skills.split(',').map((s: string) => s.trim()) : []),
    ...skills.map(s => s.skill_name)
  ].filter(Boolean);

  const studentCertNames = certs.map(c => c.event_name.toLowerCase());
  const studentActivityTypes = activities.map(a => a.type.toLowerCase());
  const internships = activities.filter(a => a.type.toLowerCase().includes('internship'));

  // 2. Identify Best Career Path Match
  let bestPath = CAREER_PATHS[0];
  let maxScore = -1;

  CAREER_PATHS.forEach(path => {
    let score = 0;
    // Check skills
    path.skills.forEach(s => {
      if (studentSkills.some(ss => ss.toLowerCase().includes(s.toLowerCase()))) score += 2;
    });
    // Check certs
    path.certifications.forEach(c => {
      if (studentCertNames.some(sc => sc.includes(c.toLowerCase()))) score += 5;
    });
    
    if (score > maxScore) {
      maxScore = score;
      bestPath = path;
    }
  });

  // 3. Gap Analysis
  const missingSkills = bestPath.skills.filter(s => 
    !studentSkills.some(ss => ss.toLowerCase().includes(s.toLowerCase()))
  ).slice(0, 5);

  const suggestedCerts = bestPath.certifications.filter(c => 
    !studentCertNames.some(sc => sc.includes(c.toLowerCase()))
  ).slice(0, 3);

  const suggestedInternships = bestPath.internships.filter(i => 
    !studentActivityTypes.some(sa => sa.includes(i.toLowerCase()))
  ).slice(0, 2);

  // 4. Placement Readiness Scoring
  let readinessScore = 0;
  
  // Academic (max 25)
  if (academic) {
    const cgpa = academic.cgpa || 0;
    readinessScore += Math.min((cgpa / 10) * 25, 25);
    if (academic.arrears > 0) readinessScore -= academic.arrears * 5;
  } else if (user.score) {
    readinessScore += Math.min((user.score / 100) * 25, 25);
  }

  // Skills (max 30)
  readinessScore += Math.min(studentSkills.length * 5, 30);

  // Certifications (max 20)
  readinessScore += Math.min(certs.length * 5, 20);

  // Practical Experience (max 25)
  readinessScore += Math.min(activities.length * 5, 25);
  if (internships.length > 0) readinessScore += 10; // Bonus for internship

  readinessScore = Math.max(0, Math.min(100, readinessScore));

  // 5. Smart Alerts
  const alerts: string[] = [];
  if (academic && academic.attendance_percentage < 75) {
    alerts.push("Improve attendance to strengthen placement profile.");
  }
  if (internships.length === 0) {
    alerts.push("Add at least one internship for better opportunities.");
  }
  if (academic && academic.arrears > 0) {
    alerts.push("Clear active arrears to improve placement eligibility.");
  }
  if (readinessScore > 80) {
    alerts.push("Your profile is extremely competitive. Ready for top-tier placements!");
  } else if (readinessScore > 50) {
    alerts.push("Profile is improving. Focus on missing skills to reach the next level.");
  }

  // 6. Persist Results
  const insightId = uuidv4();
  const existing = db.prepare('SELECT id FROM ai_career_insights WHERE student_id = ?').get(studentId) as any;

  if (existing) {
    db.prepare(`
      UPDATE ai_career_insights SET
        placement_readiness_score = ?,
        recommended_skills = ?,
        missing_skills = ?,
        suggested_certifications = ?,
        suggested_internships = ?,
        career_path_suggestions = ?,
        course_recommendations = ?,
        smart_alerts = ?,
        analysis_summary = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE student_id = ?
    `).run(
      readinessScore,
      JSON.stringify(bestPath.skills.slice(0, 5)),
      JSON.stringify(missingSkills),
      JSON.stringify(suggestedCerts),
      JSON.stringify(suggestedInternships),
      JSON.stringify([bestPath.name]),
      JSON.stringify(suggestedCerts.map(c => `Complete ${c} on Coursera/Udemy`)),
      JSON.stringify(alerts),
      `Based on your current profile, you are best suited for a ${bestPath.name} role. You have strong foundation in ${studentSkills.slice(0, 3).join(', ')}.`,
      studentId
    );
  } else {
    db.prepare(`
      INSERT INTO ai_career_insights (
        id, student_id, placement_readiness_score, recommended_skills, missing_skills,
        suggested_certifications, suggested_internships, career_path_suggestions,
        course_recommendations, smart_alerts, analysis_summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      insightId,
      studentId,
      readinessScore,
      JSON.stringify(bestPath.skills.slice(0, 5)),
      JSON.stringify(missingSkills),
      JSON.stringify(suggestedCerts),
      JSON.stringify(suggestedInternships),
      JSON.stringify([bestPath.name]),
      JSON.stringify(suggestedCerts.map(c => `Complete ${c} on Coursera/Udemy`)),
      JSON.stringify(alerts),
      `Based on your current profile, you are best suited for a ${bestPath.name} role.`
    );
  }

  // Update placement_readiness_score in academic profile too for legacy compatibility
  if (academic) {
    db.prepare('UPDATE student_academic_profile SET placement_readiness_score = ? WHERE student_id = ?')
      .run(readinessScore, studentId);
  }

  return {
    placement_readiness_score: readinessScore,
    career_path: bestPath.name,
    missing_skills,
    suggested_certs,
    alerts
  };
}

export async function aggregateDepartmentAnalytics(departmentId: string) {
  const students = db.prepare('SELECT uid FROM users WHERE role = "student" AND department_id = ?').all() as any[];
  
  if (students.length === 0) return null;

  const insights = students.map(s => {
    try {
      return db.prepare('SELECT * FROM ai_career_insights WHERE student_id = ?').get(s.uid) as any;
    } catch (e) { return null; }
  }).filter(Boolean);

  // Aggregate missing skills
  const skillGaps: Record<string, number> = {};
  insights.forEach(insight => {
    const missing = JSON.parse(insight.missing_skills || '[]');
    missing.forEach((s: string) => {
      skillGaps[s] = (skillGaps[s] || 0) + 1;
    });
  });

  const sortedGaps = Object.entries(skillGaps)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));

  // Readiness stats
  const scores = insights.map(i => i.placement_readiness_score);
  const avgReadiness = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  const stats = {
    avg_readiness: avgReadiness,
    top_performers: insights.filter(i => i.placement_readiness_score > 80).length,
    needing_focus: insights.filter(i => i.placement_readiness_score < 50).length,
    total_students: students.length
  };

  const id = uuidv4();
  db.prepare(`
    INSERT INTO ai_analytics_summary (id, scope_type, scope_id, skill_gaps, readiness_stats, updated_at)
    VALUES (?, 'department', ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(scope_id) DO UPDATE SET
      skill_gaps = excluded.skill_gaps,
      readiness_stats = excluded.readiness_stats,
      updated_at = CURRENT_TIMESTAMP
  `).run(id, departmentId, JSON.stringify(sortedGaps), JSON.stringify(stats));

  return { skillGaps: sortedGaps, stats };
}
