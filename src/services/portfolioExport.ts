import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UserProfile, Certificate, CareerActivity } from '../types';
import { format } from 'date-fns';

export const exportPortfolioToPDF = (
  profile: UserProfile, 
  certificates: Certificate[], 
  activities: CareerActivity[]
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // 1. Header Section
  doc.setFillColor(30, 64, 175); // Royal Blue
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(profile.name.toUpperCase(), 15, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const rollNo = profile.rollNo || (profile as any).roll_no || 'N/A';
  const deptId = profile.departmentId || (profile as any).department_id || 'N/A';
  const year = profile.year || (profile as any).year || '1st';
  
  doc.text(`${profile.role.replace('_', ' ').toUpperCase()} | Roll No: ${rollNo}`, 15, 28);
  doc.text(`${profile.email} | ${deptId} | ${year} Year`, 15, 34);
  
  // Reset Text Color
  doc.setTextColor(31, 41, 55);
  let currentY = 50;
 
  // 2. Professional Biography
  const customBio = profile.bio || (profile as any).bio;
  const skillsForBio = profile.skills || (profile as any).skills;
  const skillsTextForBio = skillsForBio ? `A highly motivated student with foundational knowledge and practical skills in: ${skillsForBio}. Eager to leverage these abilities in a professional setting.` : '';
  const finalBio = customBio || skillsTextForBio;

  if (finalBio) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PROFESSIONAL SUMMARY', 15, currentY);
    currentY += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitBio = doc.splitTextToSize(finalBio, pageWidth - 30);
    doc.text(splitBio, 15, currentY);
    currentY += (splitBio.length * 5) + 10;
  }
 
  // 3. Core Skills
  const skills = profile.skills || (profile as any).skills;
  if (skills) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CORE SKILLS', 15, currentY);
    currentY += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const skillsText = skills.split(',').map((s: string) => s.trim()).join('  •  ');
    doc.text(skillsText, 15, currentY);
    currentY += 15;
  }

  // 4. Academic Achievements (Verified Certificates)
  const verifiedCerts = certificates.filter(c => c.status === 'verified' || c.status === 'approved');
  if (verifiedCerts.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('VERIFIED CERTIFICATIONS', 15, currentY);
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Event Name', 'Organization', 'Date', 'Type', 'Achievements']],
      body: verifiedCerts.map(c => {
        const name = c.eventName || (c as any).event_name || 'N/A';
        const org = c.eventCollegeName || (c as any).event_college_name || 'N/A';
        const dateStr = c.date || (c as any).date;
        const type = c.type || (c as any).type || 'N/A';
        const prizePos = c.prizePosition || (c as any).prize_position;
        const prizeType = c.prizeType || (c as any).prize_type;
        
        return [
          name,
          org,
          dateStr ? format(new Date(dateStr), 'MMM yyyy') : 'N/A',
          type,
          prizePos ? `${prizePos} (${prizeType || 'Award'})` : 'Participation'
        ];
      }),
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175] },
      styles: { fontSize: 8 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }

  // 5. Career Activities (Internships/Projects)
  if (activities.length > 0) {
    // Check if new page is needed
    if (currentY > 230) {
        doc.addPage();
        currentY = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CAREER & EXTRACURRICULAR ACTIVITIES', 15, currentY);
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Activity', 'Organization', 'Duration', 'Status']],
      body: activities.map(a => {
        const type = a.type || (a as any).type || 'N/A';
        const details = a.details || (a as any).details || '';
        const org = a.organization || (a as any).organization || 'N/A';
        const dur = a.duration || (a as any).duration || 'N/A';
        const status = (a.status || (a as any).status || 'N/A').replace('_', ' ').toUpperCase();
        
        return [
          `${type}: ${details.substring(0, 50)}${details.length > 50 ? '...' : ''}`,
          org,
          dur,
          status
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }, // Emerald Green
      styles: { fontSize: 8 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 20;
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy')} | Student Certificate Tracking & Verification System`, 15, 285);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, 285);
  }

  // Save PDF
  doc.save(`${profile.name.replace(/\s+/g, '_')}_Portfolio.pdf`);
};
