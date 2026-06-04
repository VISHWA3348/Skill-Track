import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { logger } from './logger';

let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error('CRITICAL_BOOT_FAILURE', 'JWT_SECRET environment variable is not defined. System is shutting down for security.');
  process.exit(1);
}

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

export const generateToken = (payload: any): string => {
  // Enforce standard secure HS256 algorithm for signing
  return jwt.sign(payload, JWT_SECRET as string, { algorithm: 'HS256', expiresIn: '1d' });
};

export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters long' };
  return { valid: true };
};

export const verifyToken = (token: string): any => {
  try {
    // Explicitly enforce HS256 to reject any 'none' algorithm or signature tampering bypasses
    return jwt.verify(token, JWT_SECRET as string, { algorithms: ['HS256'] });
  } catch (e: any) {
    logger.warn('JWT_VERIFICATION_FAILED', `Failed to verify token: ${e.message}`);
    return null;
  }
};
