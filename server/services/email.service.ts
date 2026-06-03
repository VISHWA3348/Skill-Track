import { db } from "../db";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@zinoingroup.in";

// Grow SMTP
const GROW_SMTP_HOST = process.env.GROW_SMTP_HOST || process.env.BREVO_SMTP_HOST;
const GROW_SMTP_PORT = parseInt(process.env.GROW_SMTP_PORT || process.env.BREVO_SMTP_PORT || "587", 10);
const GROW_SMTP_USER = process.env.GROW_SMTP_USER || process.env.BREVO_SMTP_USER;
const GROW_SMTP_PASS = process.env.GROW_SMTP_PASS || process.env.BREVO_SMTP_PASS;

// Google SMTP
const GOOGLE_SMTP_HOST = process.env.GOOGLE_SMTP_HOST || process.env.GMAIL_SMTP_HOST || "smtp.gmail.com";
const GOOGLE_SMTP_PORT = parseInt(process.env.GOOGLE_SMTP_PORT || process.env.GMAIL_SMTP_PORT || "587", 10);
const GOOGLE_SMTP_USER = process.env.GOOGLE_SMTP_USER || process.env.GMAIL_SMTP_USER;
const GOOGLE_SMTP_PASS = process.env.GOOGLE_SMTP_PASS || process.env.GMAIL_SMTP_PASS;

export function initEmailLogsTable() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id VARCHAR(255) PRIMARY KEY,
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        provider_used VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        error_message TEXT,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS failed_email_queue (
        id VARCHAR(255) PRIMARY KEY,
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        html_content TEXT NOT NULL,
        error_message TEXT,
        failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        attempts INTEGER DEFAULT 3
      );
    `);
  } catch (err) {
    console.error("[Email Service] Database tables initialization failed:", err);
  }
}

// Helper to log delivery status
async function logEmailDelivery(recipient: string, subject: string, provider: string, status: string, errorMessage?: string) {
  try {
    const id = "elog_" + Date.now() + Math.random().toString(36).substring(2, 9);
    db.prepare(`
      INSERT INTO email_logs (id, recipient, subject, provider_used, status, error_message, sent_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(id, recipient, subject, provider, status, errorMessage || null);
  } catch (err) {
    console.error("[Email Service] Failed to write to email_logs table:", err);
  }
}

// Helper to store permanently failed email in failed queue
async function addToFailedQueue(recipient: string, subject: string, htmlContent: string, errorMessage: string) {
  try {
    const id = "efail_" + Date.now() + Math.random().toString(36).substring(2, 9);
    db.prepare(`
      INSERT INTO failed_email_queue (id, recipient, subject, html_content, error_message, failed_at, attempts)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 3)
    `).run(id, recipient, subject, htmlContent, errorMessage);
    console.log(`[Email Service] Stored failed email in queue for recipient: ${recipient}`);
  } catch (err) {
    console.error("[Email Service] Failed to write to failed_email_queue table:", err);
  }
}

export async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error("Resend API Key is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject: subject,
      html: html
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Resend API Error: ${errorData.message || response.statusText} (Status ${response.status})`);
  }
}

export async function sendViaGrowSMTP(to: string, subject: string, html: string): Promise<void> {
  if (!GROW_SMTP_HOST || !GROW_SMTP_USER || !GROW_SMTP_PASS) {
    throw new Error("Grow SMTP credentials are not configured");
  }

  const transporter = nodemailer.createTransport({
    host: GROW_SMTP_HOST,
    port: GROW_SMTP_PORT,
    secure: GROW_SMTP_PORT === 465,
    auth: {
      user: GROW_SMTP_USER,
      pass: GROW_SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: to,
    subject: subject,
    html: html
  });
}

export async function sendViaGoogleSMTP(to: string, subject: string, html: string): Promise<void> {
  if (!GOOGLE_SMTP_HOST || !GOOGLE_SMTP_USER || !GOOGLE_SMTP_PASS) {
    throw new Error("Google SMTP credentials are not configured");
  }

  const transporter = nodemailer.createTransport({
    host: GOOGLE_SMTP_HOST,
    port: GOOGLE_SMTP_PORT,
    secure: GOOGLE_SMTP_PORT === 465,
    auth: {
      user: GOOGLE_SMTP_USER,
      pass: GOOGLE_SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: to,
    subject: subject,
    html: html
  });
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  // Ensure tables exist
  initEmailLogsTable();

  // 1. Run Rate Limiter Checks
  const isOtp = subject.toLowerCase().includes("otp") || subject.toLowerCase().includes("verification code");
  const isVerification = subject.toLowerCase().includes("verification") && !isOtp;

  if (isOtp) {
    try {
      const countRes = db.prepare(`
        SELECT COUNT(*) as cnt FROM email_logs 
        WHERE recipient = ? 
        AND (LOWER(subject) LIKE '%otp%' OR LOWER(subject) LIKE '%verification code%')
        AND sent_at >= NOW() - INTERVAL '15 minutes'
        AND status = 'success'
      `).get(to) as any;
      if (countRes && parseInt(countRes.cnt, 10) >= 5) {
        throw new Error("Rate limit exceeded: Maximum 5 OTP requests per 15 minutes.");
      }
    } catch (err: any) {
      if (err.message.includes("Rate limit")) throw err;
    }
  }

  if (isVerification) {
    try {
      const countRes = db.prepare(`
        SELECT COUNT(*) as cnt FROM email_logs 
        WHERE recipient = ? 
        AND LOWER(subject) LIKE '%verification%'
        AND NOT (LOWER(subject) LIKE '%otp%' OR LOWER(subject) LIKE '%verification code%')
        AND sent_at >= NOW() - INTERVAL '15 minutes'
        AND status = 'success'
      `).get(to) as any;
      if (countRes && parseInt(countRes.cnt, 10) >= 3) {
        throw new Error("Rate limit exceeded: Maximum 3 verification email requests per 15 minutes.");
      }
    } catch (err: any) {
      if (err.message.includes("Rate limit")) throw err;
    }
  }

  // 2. Try delivery with retry loop (3 retry attempts with exponential backoff on final failover chain failure)
  const backoffs = [0, 5000, 15000, 30000];
  let lastError: any = null;

  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      console.log(`[Email Service] Retrying failed delivery chain in ${backoffs[attempt] / 1000}s (Attempt ${attempt}/3)...`);
      await new Promise(resolve => setTimeout(resolve, backoffs[attempt]));
    }

    // Try Level 1: Resend
    try {
      await sendViaResend(to, subject, html);
      console.log(`Email sent via Resend to recipient`);
      await logEmailDelivery(to, subject, "Resend", "success");
      return; // Success!
    } catch (error: any) {
      console.error(`Resend failed: ${error.message}`);
      await logEmailDelivery(to, subject, "Resend", "failed", error.message);
      lastError = error;
    }

    // Try Level 2: Grow SMTP
    try {
      await sendViaGrowSMTP(to, subject, html);
      console.log(`Email sent via Grow SMTP to recipient`);
      await logEmailDelivery(to, subject, "Grow SMTP", "success");
      return; // Success!
    } catch (error: any) {
      console.error(`Grow SMTP failed: ${error.message}`);
      await logEmailDelivery(to, subject, "Grow SMTP", "failed", error.message);
      lastError = error;
    }

    // Try Level 3: Google SMTP
    try {
      await sendViaGoogleSMTP(to, subject, html);
      console.log(`Email sent via Google SMTP to recipient`);
      await logEmailDelivery(to, subject, "Google SMTP", "success");
      return; // Success!
    } catch (error: any) {
      console.error(`Google SMTP failed: ${error.message}`);
      await logEmailDelivery(to, subject, "Google SMTP", "failed", error.message);
      lastError = error;
    }
  }

  // If we reach here, all providers and retries failed
  await addToFailedQueue(to, subject, html, lastError?.message || "All email providers failed");
  throw new Error(`Email delivery failed: ${lastError?.message || "All providers exhausted"}`);
}
