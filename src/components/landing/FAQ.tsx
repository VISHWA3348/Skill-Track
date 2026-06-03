import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const faqs = [
  {
    q: "How does certificate verification work?",
    a: "Every certificate issued through Skill Track contains a unique cryptographic hash and a QR code. When scanned or searched, our system verifies the record against the institution's encrypted database instantly, checking for digital signature matches."
  },
  {
    q: "Is my student data secure?",
    a: "Yes, we use enterprise-grade encryption for data at rest and TLS for data in transit. We also implement strict Role-Based Access Control (RBAC) to ensure only authorized personnel can access sensitive information."
  },
  {
    q: "Can multiple colleges use the same platform?",
    a: "Absolutely. Skill Track is a multi-tenant platform, meaning each college has its own isolated workspace, branding, and database tables while benefiting from our centralized verification network."
  },
  {
    q: "Is there mobile support available?",
    a: "Yes, Skill Track is fully responsive and works perfectly on smartphones, tablets, and desktops. Students can upload files, check leaderboards, and update resumes on the go."
  },
  {
    q: "Who can upload certificates to the platform?",
    a: "Students upload their own extracurricular certifications, course badges, and activity details. The documents then enter the verification approval chain before showing up on their verified portfolios."
  },
  {
    q: "How does the three-tier verification process operate?",
    a: "First, a student uploads a credential. Second, department staff members audit the details and files. Third, the HOD reviews the staff validation and grants final sign-off, moving the status to 'Verified'."
  },
  {
    q: "What happens if a certificate is rejected?",
    a: "If staff or HODs reject a submission, they input feedback detailing the reason (e.g. invalid file, missing dates). The student receives a notification and can correct and resubmit the certificate."
  },
  {
    q: "How does the GPS geotagging verification work?",
    a: "When students create career activity logs, the platform can capture location metadata. This adds an extra verification layer to confirm participation in off-campus events and workshops."
  },
  {
    q: "Can I export student achievement reports?",
    a: "Yes, College Admins and HODs can export comprehensive student achievement records and leaderboard rankings as structured Excel spreadsheets for university audits."
  },
  {
    q: "How does a student construct a resume?",
    a: "The built-in Resume Builder pulls data directly from verified student records (academic history, verified certificates, and career activities) to auto-populate high-quality PDF templates."
  },
  {
    q: "What is the role of the invite code system?",
    a: "Invite codes (format: CAMP-DEPT-XXXXXX) automate registration. When a student or staff uses a code to sign up, the platform inherits their college ID, department, and role automatically, preventing manual bypass."
  },
  {
    q: "Can a student manually select their role during signup?",
    a: "No, to prevent privilege bypass, we have removed manual role selectors. Users must register using a validated invite code which determines their specific profile role."
  },
  {
    q: "How does the AI career path recommendation feature work?",
    a: "Our AI engine analyzes the certifications, skills, and activities recorded in the student profile to detect placement gaps and recommend tailored courses and placement opportunities."
  },
  {
    q: "Can recruiters search student portfolios directly?",
    a: "Recruiters can access student portfolios using unique public sharing links or scanning profile QR codes. This gives them instant visibility into a student's verified skills ledger."
  },
  {
    q: "Is there a digital signature check for background checks?",
    a: "Yes, recruiters and verification agencies can query the verification API to check if a specific credential matches the cryptographic hash issued by the university."
  },
  {
    q: "How do I request an institutional access demo?",
    a: "University administrators can request a demo by visiting the Enterprise Solutions page and submitting an access request form. Our team will coordinate setup details."
  }
];

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-6">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">Frequently Asked Questions</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Everything you need to know about the Skill Track platform.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div 
              key={i}
              className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full p-6 lg:p-8 text-left flex justify-between items-center group"
              >
                <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {faq.q}
                </span>
                <div className={`p-2 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-all ${openIndex === i ? 'rotate-180 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : ''}`}>
                  <ChevronDown className="w-5 h-5 flex-shrink-0" />
                </div>
              </button>
              
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 lg:px-8 pb-8 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-50 dark:border-gray-700 pt-6">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
