import { Express } from 'express';
import { db } from './db';
import { analyzeStudentGap, aggregateDepartmentAnalytics } from './ai_engine';
import { queueService } from './queue';

// Register AI Gap Analysis background worker handler
queueService.registerHandler('ai-analysis', async (jobData: any) => {
  const { studentId } = jobData;
  return await analyzeStudentGap(studentId);
});

export function setupAiApi(app: Express) {
  // Get AI insights for a student
  app.get('/api/ai/insights/:studentId', async (req, res) => {
    try {
      const { studentId } = req.params;
      
      // Try to get existing insights
      let insights = db.prepare('SELECT * FROM ai_career_insights WHERE student_id = ?').get(studentId) as any;
      
      // If not exists or force refresh, recalculate in background worker
      if (!insights || req.query.refresh === 'true') {
        const jobId = await queueService.addJob('ai-analysis', { studentId });
        await queueService.waitForJobResult(jobId);
        insights = db.prepare('SELECT * FROM ai_career_insights WHERE student_id = ?').get(studentId) as any;
      }

      if (!insights) {
        return res.status(404).json({ success: false, error: "Insights not found" });
      }

      // Parse JSON fields
      const data = {
        ...insights,
        recommended_skills: JSON.parse(insights.recommended_skills || '[]'),
        missing_skills: JSON.parse(insights.missing_skills || '[]'),
        suggested_certifications: JSON.parse(insights.suggested_certifications || '[]'),
        suggested_internships: JSON.parse(insights.suggested_internships || '[]'),
        career_path_suggestions: JSON.parse(insights.career_path_suggestions || '[]'),
        course_recommendations: JSON.parse(insights.course_recommendations || '[]'),
        smart_alerts: JSON.parse(insights.smart_alerts || '[]')
      };

      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Force recalculate insights in background worker
  app.post('/api/ai/recalculate/:studentId', async (req, res) => {
    try {
      const { studentId } = req.params;
      const jobId = await queueService.addJob('ai-analysis', { studentId });
      const result = await queueService.waitForJobResult(jobId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get department AI analytics
  app.get('/api/ai/department/:deptId', async (req, res) => {
    try {
      const { deptId } = req.params;
      
      let analytics = db.prepare("SELECT * FROM ai_analytics_summary WHERE scope_type = 'department' AND scope_id = ?").get(deptId) as any;
      
      if (!analytics || req.query.refresh === 'true') {
        const result = await aggregateDepartmentAnalytics(deptId);
        if (!result) return res.status(404).json({ success: false, error: "No data for department" });
        analytics = db.prepare("SELECT * FROM ai_analytics_summary WHERE scope_type = 'department' AND scope_id = ?").get(deptId) as any;
      }

      res.json({ 
        success: true, 
        data: {
          ...analytics,
          skill_gaps: JSON.parse(analytics.skill_gaps || '[]'),
          readiness_stats: JSON.parse(analytics.readiness_stats || '{}')
        } 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get college-wide AI analytics
  app.get('/api/ai/college/:collegeId', async (req, res) => {
    try {
      const { collegeId } = req.params;
      
      // Get all departments in this college
      const depts = db.prepare('SELECT id FROM departments WHERE college_id = ?').all() as any[];
      if (depts.length === 0) {
        return res.json({ success: true, data: { departments: [], globalGaps: [], overallReadiness: 0 } });
      }
      
      const deptIds = depts.map(d => d.id);
      const placeholders = deptIds.map(() => '?').join(',');
      const analyticsRows = db.prepare(`
        SELECT * FROM ai_analytics_summary 
        WHERE scope_type = 'department' AND scope_id IN (${placeholders})
      `).all(...deptIds) as any[];

      const deptAnalytics = depts.map(d => {
        const a = analyticsRows.find(row => row.scope_id === d.id);
        if (!a) return null;
        return {
          deptId: d.id,
          readiness: JSON.parse(a.readiness_stats || '{}').avg_readiness || 0,
          skillGaps: JSON.parse(a.skill_gaps || '[]')
        };
      }).filter(Boolean);

      // Global Skill Gaps
      const globalGaps: Record<string, number> = {};
      deptAnalytics.forEach(da => {
        da.skillGaps.forEach((g: any) => {
          globalGaps[g.skill] = (globalGaps[g.skill] || 0) + g.count;
        });
      });

      const sortedGaps = Object.entries(globalGaps)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, count }));

      res.json({ 
        success: true, 
        data: {
          departments: deptAnalytics,
          globalGaps: sortedGaps,
          overallReadiness: deptAnalytics.reduce((acc, curr) => acc + curr.readiness, 0) / (deptAnalytics.length || 1)
        } 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}
