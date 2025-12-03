import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq, and, gt, lt } from 'drizzle-orm';
import { sendOtpEmail } from './emailService';

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;
const OTP_RATE_LIMIT_MINUTES = 1;

export interface OtpResult {
  success: boolean;
  message: string;
  requiresOtp?: boolean;
  userId?: string;
}

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

async function verifyOtpHash(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

export async function createOtp(
  userId: string,
  purpose: string = 'first_login'
): Promise<{ success: boolean; otp?: string; message: string }> {
  if (!db) {
    return { success: false, message: 'Database not available' };
  }

  try {
    const now = new Date();
    const rateLimitTime = new Date(now.getTime() - OTP_RATE_LIMIT_MINUTES * 60 * 1000);

    const recentOtp = await db
      .select()
      .from(schema.otpVerifications)
      .where(
        and(
          eq(schema.otpVerifications.userId, userId),
          eq(schema.otpVerifications.purpose, purpose),
          gt(schema.otpVerifications.createdAt, rateLimitTime),
          eq(schema.otpVerifications.used, 0)
        )
      )
      .limit(1)
      .then(rows => rows[0]);

    if (recentOtp) {
      return {
        success: false,
        message: 'Please wait a minute before requesting a new code'
      };
    }

    await db
      .update(schema.otpVerifications)
      .set({ used: 1 })
      .where(
        and(
          eq(schema.otpVerifications.userId, userId),
          eq(schema.otpVerifications.purpose, purpose),
          eq(schema.otpVerifications.used, 0)
        )
      );

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await db.insert(schema.otpVerifications).values({
      userId,
      otpHash,
      purpose,
      expiresAt,
      used: 0,
      attempts: 0
    });

    console.log(`[otp] Created OTP for user ${userId} (purpose: ${purpose}), expires at ${expiresAt.toISOString()}`);
    return { success: true, otp, message: 'OTP created successfully' };
  } catch (error) {
    console.error('[otp] Error creating OTP:', error);
    return { success: false, message: 'Failed to create verification code' };
  }
}

export async function verifyOtp(
  userId: string,
  otpCode: string,
  purpose: string = 'first_login'
): Promise<OtpResult> {
  if (!db) {
    return { success: false, message: 'Database not available' };
  }

  try {
    const now = new Date();

    const otpRecord = await db
      .select()
      .from(schema.otpVerifications)
      .where(
        and(
          eq(schema.otpVerifications.userId, userId),
          eq(schema.otpVerifications.purpose, purpose),
          eq(schema.otpVerifications.used, 0),
          gt(schema.otpVerifications.expiresAt, now)
        )
      )
      .orderBy(schema.otpVerifications.createdAt)
      .limit(1)
      .then(rows => rows[0]);

    if (!otpRecord) {
      return {
        success: false,
        message: 'The code has expired or is invalid. Please request a new one.'
      };
    }

    if ((otpRecord.attempts || 0) >= MAX_OTP_ATTEMPTS) {
      await db
        .update(schema.otpVerifications)
        .set({ used: 1 })
        .where(eq(schema.otpVerifications.id, otpRecord.id));

      return {
        success: false,
        message: 'Too many incorrect attempts. Please request a new code.'
      };
    }

    const isValid = await verifyOtpHash(otpCode, otpRecord.otpHash);

    if (!isValid) {
      await db
        .update(schema.otpVerifications)
        .set({ attempts: (otpRecord.attempts || 0) + 1 })
        .where(eq(schema.otpVerifications.id, otpRecord.id));

      const remainingAttempts = MAX_OTP_ATTEMPTS - (otpRecord.attempts || 0) - 1;
      return {
        success: false,
        message: `Incorrect code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`
      };
    }

    await db
      .update(schema.otpVerifications)
      .set({ used: 1 })
      .where(eq(schema.otpVerifications.id, otpRecord.id));

    if (purpose === 'first_login') {
      await db
        .update(schema.users)
        .set({ isOtpVerified: 1 })
        .where(eq(schema.users.id, userId));
    }

    console.log(`[otp] OTP verified successfully for user ${userId} (purpose: ${purpose})`);
    return { success: true, message: 'Verification successful' };
  } catch (error) {
    console.error('[otp] Error verifying OTP:', error);
    return { success: false, message: 'Failed to verify code. Please try again.' };
  }
}

export async function sendOtpToUser(
  userId: string,
  purpose: string = 'first_login'
): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: 'Database not available' };
  }

  try {
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)
      .then(rows => rows[0]);

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const otpResult = await createOtp(userId, purpose);
    if (!otpResult.success || !otpResult.otp) {
      return { success: false, message: otpResult.message };
    }

    const purposeText = purpose === 'first_login' 
      ? 'complete your first login' 
      : purpose === 'email_change'
      ? 'verify your email change'
      : 'verify your account';

    const emailSent = await sendOtpEmail({
      recipientEmail: user.email,
      recipientName: user.name,
      otpCode: otpResult.otp,
      purpose: purposeText,
      expiryMinutes: OTP_EXPIRY_MINUTES
    });

    if (!emailSent) {
      console.log(`[otp] Email not sent, OTP for ${user.email}: ${otpResult.otp}`);
    }

    return {
      success: true,
      message: `A verification code has been sent to ${maskEmail(user.email)}`
    };
  } catch (error) {
    console.error('[otp] Error sending OTP:', error);
    return { success: false, message: 'Failed to send verification code' };
  }
}

export async function cleanupExpiredOtps(): Promise<void> {
  if (!db) return;

  try {
    const now = new Date();
    await db
      .delete(schema.otpVerifications)
      .where(lt(schema.otpVerifications.expiresAt, now));
    
    console.log('[otp] Cleaned up expired OTPs');
  } catch (error) {
    console.error('[otp] Error cleaning up expired OTPs:', error);
  }
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart[0]}${localPart[1]}***@${domain}`;
}

export async function checkUserNeedsOtp(userId: string): Promise<boolean> {
  if (!db) return false;

  try {
    const user = await db
      .select({ isOtpVerified: schema.users.isOtpVerified })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)
      .then(rows => rows[0]);

    return user ? (user.isOtpVerified || 0) === 0 : false;
  } catch (error) {
    console.error('[otp] Error checking OTP status:', error);
    return false;
  }
}
