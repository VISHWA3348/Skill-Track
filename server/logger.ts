import path from 'path';
import fs from 'fs';

const LOGS_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}
const LOG_FILE = path.join(LOGS_DIR, 'production.log');

export const logger = {
  log(level: 'info' | 'warn' | 'error', event: string, details: string, meta: Record<string, any> = {}) {
    // Redact any potential credentials, token headers, or password fields from meta
    const sanitizedMeta = { ...meta };
    const sensitiveKeys = ['password', 'password_hash', 'passwordHash', 'token', 'jwt', 'secret', 'authorization'];
    
    for (const key of Object.keys(sanitizedMeta)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
        sanitizedMeta[key] = '[REDACTED]';
      }
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      details,
      metadata: sanitizedMeta
    };
    
    const jsonString = JSON.stringify(logEntry);
    
    // Output standard JSON to console (for cloud providers logging pipeline)
    if (level === 'error') {
      console.error(jsonString);
    } else if (level === 'warn') {
      console.warn(jsonString);
    } else {
      console.log(jsonString);
    }
    
    // Persist to file for security audits
    try {
      fs.appendFileSync(LOG_FILE, jsonString + '\n', 'utf8');
    } catch (err) {
      console.error('CRITICAL ERROR: Failed to append to audit log file:', err);
    }
  },
  
  info(event: string, details: string, meta: Record<string, any> = {}) {
    this.log('info', event, details, meta);
  },
  
  warn(event: string, details: string, meta: Record<string, any> = {}) {
    this.log('warn', event, details, meta);
  },
  
  error(event: string, details: string, meta: Record<string, any> = {}) {
    this.log('error', event, details, meta);
  }
};
