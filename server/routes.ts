import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import "./types";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { z } from "zod";
import { storage } from "./storage";
import { insertMemberSchema, insertPaymentSchema, insertInvoiceSchema, insertLeadSchema, insertProductSchema, insertOrderSchema, insertClassSchema, insertClassTypeSchema, insertClassBookingSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { db, supabaseAdmin } from "./db";
import { eq, and, desc, asc, sql, gte, lte, lt, or, like, isNull, inArray } from "drizzle-orm";
import * as schema from "@shared/schema";
import { sendGymAdminWelcomeEmail, sendMemberWelcomeEmail, sendInvoiceEmail, sendLeadWelcomeEmail, sendNewLeadNotificationEmail, sendTrainerWelcomeEmail, sendPasswordResetEmail, sendPaymentDetailsEmail, sendPaymentReminderEmail, sendOrderConfirmationEmail } from "./services/emailService";
import { sendGymAdminWelcomeWhatsApp, sendMemberWelcomeWhatsApp, sendInvoiceWhatsApp, sendLeadWelcomeWhatsApp, sendNewLeadNotificationWhatsApp, sendTrainerWelcomeWhatsApp, validateAndFormatPhoneNumber, sendPaymentDetailsWhatsApp, sendPaymentReminderWhatsApp, sendOrderConfirmationWhatsApp } from "./services/whatsappService";
import { generateInvoicePdf, type InvoiceData } from "./services/invoicePdfService";
import * as auditService from "./services/auditService";
import { supabaseRepo } from "./supabaseRepository";
import * as userAccess from "./services/userAccess";
import { supabase } from "./supabase";
import { logFunctionalError, getSecurityAuditLogs, cleanupExpiredLogs, createErrorResponse } from "./services/errorLoggingService";
import * as otpService from "./services/otpService";

function isDbAvailable(): boolean {
  return db !== null;
}

const createPaymentSchema = z.object({
  memberId: z.string().uuid(),
  membershipId: z.string().uuid().optional().nullable(),
  orderId: z.string().uuid().optional().nullable(),
  invoiceId: z.string().uuid().optional().nullable(),
  amount: z.coerce.number(),
  totalAmount: z.coerce.number().optional(),
  amountDue: z.coerce.number().optional(),
  paymentType: z.enum(['cash', 'upi', 'card', 'bank_transfer', 'razorpay']),
  paymentSource: z.enum(['membership', 'shop', 'other']).optional(),
  paymentProof: z.string().optional().nullable(),
  transactionRef: z.string().optional().nullable(),
  status: z.enum(['paid', 'pending', 'partially_paid', 'failed', 'refunded']).optional(),
  notes: z.string().optional().nullable(),
});

const createInvoiceSchema = z.object({
  memberId: z.string().uuid(),
  membershipId: z.string().uuid().optional().nullable(),
  orderId: z.string().uuid().optional().nullable(),
  amount: z.coerce.number(),
  subtotal: z.coerce.number().optional().nullable(),
  taxRate: z.coerce.number().optional().nullable(),
  taxAmount: z.coerce.number().optional().nullable(),
  discountRate: z.coerce.number().optional().nullable(),
  discountAmount: z.coerce.number().optional().nullable(),
  amountPaid: z.coerce.number().optional(),
  amountDue: z.coerce.number().optional().nullable(),
  dueDate: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val),
  status: z.enum(['paid', 'pending', 'partially_paid', 'failed', 'refunded']).optional(),
  description: z.string().optional().nullable(),
});

const createLeadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(10),
  interestedPlan: z.string().optional().nullable(),
  goal: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  channel: z.string().optional().nullable(),
  preferredChannel: z.string().optional().nullable(),
  preferredTime: z.string().optional().nullable(),
  status: z.enum(['new', 'contacted', 'interested', 'converted', 'lost']).optional(),
  assignedTo: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  followUpDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => {
    if (!val) return null;
    return typeof val === 'string' ? new Date(val) : val;
  }).optional(),
  utmSource: z.string().optional().nullable(),
  utmMedium: z.string().optional().nullable(),
  utmCampaign: z.string().optional().nullable(),
});

const createProductSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  price: z.coerce.number(),
  mrp: z.coerce.number().optional().nullable(),
  discountPrice: z.coerce.number().optional().nullable(),
  taxPercent: z.coerce.number().optional().nullable(),
  stock: z.coerce.number().int().default(0),
  lowStockAlert: z.coerce.number().int().optional(),
  images: z.string().optional().nullable(),
  variants: z.string().optional().nullable(),
  isFeatured: z.coerce.number().int().optional(),
  isActive: z.coerce.number().int().optional(),
});

const updateProductSchema = createProductSchema.partial();

const updatePaymentSchema = createPaymentSchema.partial();

const updateInvoiceSchema = createInvoiceSchema.partial();

const createOrderSchema = z.object({
  memberId: z.string().uuid(),
  subtotal: z.coerce.number(),
  taxAmount: z.coerce.number().optional().default(0),
  totalAmount: z.coerce.number(),
  status: z.enum(['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']).optional(),
  paymentStatus: z.enum(['unpaid', 'paid', 'refunded']).optional(),
  paymentType: z.enum(['cash', 'upi', 'card', 'bank_transfer', 'razorpay']).optional().nullable(),
  paymentProof: z.string().optional().nullable(),
  transactionRef: z.string().optional().nullable(),
  shippingAddress: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  deliveryDate: z.union([z.string(), z.date(), z.undefined(), z.null()]).transform(val => val != null ? (typeof val === 'string' ? new Date(val) : val) : undefined).optional(),
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().int().positive(),
    price: z.coerce.number(),
    variant: z.string().optional(),
  })).min(1, 'At least one item is required'),
});

const createClassSchema = z.object({
  classTypeId: z.string().uuid(),
  trainerId: z.string().uuid().optional().nullable(),
  startTime: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val),
  endTime: z.union([z.string(), z.date()]).transform(val => typeof val === 'string' ? new Date(val) : val),
  capacity: z.coerce.number().int().positive(),
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
});

const createClassTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  duration: z.coerce.number().int().positive(),
  capacity: z.coerce.number().int().positive(),
  isActive: z.coerce.number().int().optional(),
});

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized - Please log in' });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized - Please log in' });
    }

    const user = await userAccess.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized - User not found' });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
    }

    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post('/api/auth/login', async (req, res) => {
    const startTime = Date.now();
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const normalizedEmail = email.toLowerCase().trim();

      let user: any = null;

      if (isDbAvailable()) {
        user = await db!.select().from(schema.users).where(eq(schema.users.email, normalizedEmail)).limit(1).then(rows => rows[0]);
      } else {
        const supabaseUser = await supabaseRepo.getUserByEmail(normalizedEmail);
        if (supabaseUser) {
          user = {
            id: supabaseUser.id,
            email: supabaseUser.email,
            passwordHash: supabaseUser.password_hash,
            role: supabaseUser.role,
            name: supabaseUser.name,
            phone: supabaseUser.phone,
            profileImageUrl: supabaseUser.profile_image_url,
            isActive: supabaseUser.is_active,
            isOtpVerified: supabaseUser.is_otp_verified,
            createdAt: supabaseUser.created_at,
            lastLogin: supabaseUser.last_login,
          };
        }
      }

      if (!user) {
        auditService.logFailedLoginAttempt(req, normalizedEmail).catch(() => {});
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);

      if (!validPassword) {
        auditService.logFailedLoginAttempt(req, normalizedEmail).catch(() => {});
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is inactive' });
      }

      // OTP verification removed - users can log in directly without email verification

      const gymIdsPromise = isDbAvailable() 
        ? storage.getUserGyms(user.id, user.role)
        : supabaseRepo.getUserGyms(user.id, user.role);

      if (isDbAvailable()) {
        db!.update(schema.users).set({ lastLogin: new Date() }).where(eq(schema.users.id, user.id)).catch(() => {});
      } else {
        supabaseRepo.updateUserLastLogin(user.id).catch(() => {});
      }

      const gymIds = await gymIdsPromise;
      const primaryGymId = gymIds.length > 0 ? gymIds[0] : null;

      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.gymId = primaryGymId;

      const userResponse = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        gymId: primaryGymId,
        gymIds: gymIds,
        phone: user.phone,
        profileImageUrl: user.profileImageUrl,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: new Date().toISOString(),
      };

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const loginTime = Date.now() - startTime;
      console.log(`✅ Login: ${normalizedEmail} (${user.role}) in ${loginTime}ms`);

      auditService.logLogin(req, user.id, user.name, true).catch(() => {});

      res.json({
        user: userResponse,
        message: 'Login successful'
      });
    } catch (error: any) {
      console.error('❌ Login error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    const userId = req.session?.userId;
    const user = userId ? await userAccess.getUserById(userId) : null;

    if (user) {
      try { await auditService.logLogout(req, user.id, user.name); } catch (e) {}
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.json({ message: 'Logout successful' });
    });
  });

  // ==========================================
  // OTP VERIFICATION
  // ==========================================
  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const { userId, otpCode } = req.body;

      if (!userId || !otpCode) {
        return res.status(400).json({ error: 'User ID and OTP code are required' });
      }

      const result = await otpService.verifyOtp(userId, otpCode, 'first_login');

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      let user: any = null;
      if (isDbAvailable()) {
        user = await db!.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1).then(rows => rows[0]);
      } else {
        const supabaseUser = await supabaseRepo.getUserById(userId);
        if (supabaseUser) {
          user = {
            id: supabaseUser.id,
            email: supabaseUser.email,
            role: supabaseUser.role,
            name: supabaseUser.name,
            phone: supabaseUser.phone,
            profileImageUrl: supabaseUser.profile_image_url,
            isActive: supabaseUser.is_active,
          };
        }
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const gymIds = isDbAvailable()
        ? await storage.getUserGyms(user.id, user.role)
        : await supabaseRepo.getUserGyms(user.id, user.role);
      const primaryGymId = gymIds.length > 0 ? gymIds[0] : null;

      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.gymId = primaryGymId;
      delete req.session.pendingOtpUserId;

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      if (isDbAvailable()) {
        db!.update(schema.users).set({ lastLogin: new Date() }).where(eq(schema.users.id, user.id)).catch(() => {});
      }

      auditService.logLogin(req, user.id, user.name, true).catch(() => {});
      console.log(`✅ OTP verified for first-time login: ${user.email}`);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          gymId: primaryGymId,
          gymIds: gymIds,
          phone: user.phone,
          profileImageUrl: user.profileImageUrl,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLogin: new Date().toISOString(),
        },
        message: 'Verification successful! Welcome to GYMSAATHI.'
      });
    } catch (error: any) {
      console.error('❌ OTP verification error:', error);
      res.status(500).json({ error: 'Failed to verify code. Please try again.' });
    }
  });

  app.post('/api/auth/resend-otp', async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const result = await otpService.sendOtpToUser(userId, 'first_login');

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      res.json({ message: result.message });
    } catch (error: any) {
      console.error('❌ Resend OTP error:', error);
      res.status(500).json({ error: 'Failed to send code. Please try again.' });
    }
  });

  // ==========================================
  // FORGOT PASSWORD
  // ==========================================
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      console.log(`🔑 Password reset requested for: ${email}`);

      let user: any = null;

      if (isDbAvailable()) {
        user = await db!.select()
          .from(schema.users)
          .where(eq(schema.users.email, email.toLowerCase()))
          .limit(1)
          .then(rows => rows[0]);
      } else {
        const supabaseUser = await supabaseRepo.getUserByEmail(email);
        if (supabaseUser) {
          user = {
            id: supabaseUser.id,
            email: supabaseUser.email,
            name: supabaseUser.name,
            isActive: supabaseUser.is_active,
          };
        }
      }

      if (!user) {
        console.log(`⚠️ Password reset requested for non-existent email: ${email}`);
        return res.json({ 
          message: 'If an account with that email exists, we have sent a password reset link.' 
        });
      }

      if (!user.isActive) {
        console.log(`⚠️ Password reset requested for inactive account: ${email}`);
        return res.json({ 
          message: 'If an account with that email exists, we have sent a password reset link.' 
        });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      if (isDbAvailable()) {
        await db!.delete(schema.passwordResetTokens)
          .where(eq(schema.passwordResetTokens.userId, user.id));

        await db!.insert(schema.passwordResetTokens).values({
          userId: user.id,
          token: resetToken,
          expiresAt: expiresAt,
          used: 0,
        });
      } else {
        await supabaseRepo.deletePasswordResetTokensForUser(user.id);
        await supabaseRepo.createPasswordResetToken({
          user_id: user.id,
          token: resetToken,
          expires_at: expiresAt.toISOString(),
          used: 0,
        });
      }

      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : (process.env.BASE_URL || 'http://localhost:5000');
      const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

      const emailSent = await sendPasswordResetEmail({
        userName: user.name,
        userEmail: user.email,
        resetLink: resetLink,
        expiryMinutes: 30,
      });

      if (emailSent) {
        console.log(`✅ Password reset email sent to: ${email}`);
      } else {
        console.log(`⚠️ Failed to send password reset email to: ${email}`);
      }

      res.json({ 
        message: 'If an account with that email exists, we have sent a password reset link.' 
      });
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      res.status(500).json({ error: 'Failed to process password reset request' });
    }
  });

  // ==========================================
  // RESET PASSWORD
  // ==========================================
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: 'Token and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      let resetToken: any = null;
      let user: any = null;

      if (isDbAvailable()) {
        resetToken = await db!.select()
          .from(schema.passwordResetTokens)
          .where(eq(schema.passwordResetTokens.token, token))
          .limit(1)
          .then(rows => rows[0]);
      } else {
        const supabaseToken = await supabaseRepo.getPasswordResetToken(token);
        if (supabaseToken) {
          resetToken = {
            id: supabaseToken.id,
            userId: supabaseToken.user_id,
            token: supabaseToken.token,
            expiresAt: supabaseToken.expires_at,
            used: supabaseToken.used,
          };
        }
      }

      if (!resetToken) {
        console.log('❌ Invalid password reset token');
        return res.status(400).json({ error: 'Invalid or expired reset link' });
      }

      if (resetToken.used === 1) {
        console.log('❌ Password reset token already used');
        return res.status(400).json({ error: 'This reset link has already been used' });
      }

      if (new Date() > new Date(resetToken.expiresAt)) {
        console.log('❌ Password reset token expired');
        return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
      }

      if (isDbAvailable()) {
        user = await db!.select()
          .from(schema.users)
          .where(eq(schema.users.id, resetToken.userId))
          .limit(1)
          .then(rows => rows[0]);
      } else {
        const supabaseUser = await supabaseRepo.getUserById(resetToken.userId);
        if (supabaseUser) {
          user = {
            id: supabaseUser.id,
            email: supabaseUser.email,
          };
        }
      }

      if (!user) {
        console.log('❌ User not found for password reset token');
        return res.status(400).json({ error: 'Invalid reset link' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      if (isDbAvailable()) {
        await db!.update(schema.users)
          .set({ passwordHash: passwordHash })
          .where(eq(schema.users.id, user.id));

        await db!.update(schema.passwordResetTokens)
          .set({ used: 1 })
          .where(eq(schema.passwordResetTokens.id, resetToken.id));
      } else {
        const updated = await supabaseRepo.updateUserPassword(user.id, passwordHash);
        if (!updated) {
          return res.status(500).json({ error: 'Failed to update password' });
        }
        await supabaseRepo.markPasswordResetTokenUsed(resetToken.id);
      }

      console.log(`✅ Password successfully reset for: ${user.email}`);

      res.json({ message: 'Password has been reset successfully. You can now login with your new password.' });
    } catch (error) {
      console.error('❌ Reset password error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  // ==========================================
  // VALIDATE RESET TOKEN
  // ==========================================
  app.get('/api/auth/validate-reset-token', async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ valid: false, error: 'Token is required' });
      }

      let resetToken: any = null;

      if (isDbAvailable()) {
        resetToken = await db!.select()
          .from(schema.passwordResetTokens)
          .where(eq(schema.passwordResetTokens.token, token))
          .limit(1)
          .then(rows => rows[0]);
      } else {
        const supabaseToken = await supabaseRepo.getPasswordResetToken(token);
        if (supabaseToken) {
          resetToken = {
            id: supabaseToken.id,
            userId: supabaseToken.user_id,
            token: supabaseToken.token,
            expiresAt: supabaseToken.expires_at,
            used: supabaseToken.used,
          };
        }
      }

      if (!resetToken) {
        return res.json({ valid: false, error: 'Invalid reset link' });
      }

      if (resetToken.used === 1) {
        return res.json({ valid: false, error: 'This reset link has already been used' });
      }

      if (new Date() > new Date(resetToken.expiresAt)) {
        return res.json({ valid: false, error: 'This reset link has expired' });
      }

      res.json({ valid: true });
    } catch (error) {
      console.error('❌ Validate reset token error:', error);
      res.status(500).json({ valid: false, error: 'Failed to validate token' });
    }
  });

  // ==========================================
  // DATABASE HEALTH CHECK
  // ==========================================
  app.get('/api/health/db', async (_req, res) => {
    try {
      const result = await db!.select({ count: sql<number>`count(*)` }).from(schema.gyms);
      res.json({ ok: true, gymsCount: result[0]?.count ?? 0 });
    } catch (err) {
      console.error('DB health check failed:', err);
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // ==========================================
  // PUBLIC ENQUIRY FORM API (No auth required)
  // ==========================================

  // Simple rate limiting for public endpoints
  const enquiryRateLimit = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
  const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute per IP

  const checkRateLimit = (ip: string): boolean => {
    const now = Date.now();
    const entry = enquiryRateLimit.get(ip);

    if (!entry || entry.resetAt < now) {
      enquiryRateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return true;
    }

    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
      return false;
    }

    entry.count++;
    return true;
  };

  // Clean up old rate limit entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of Array.from(enquiryRateLimit.entries())) {
      if (entry.resetAt < now) {
        enquiryRateLimit.delete(ip);
      }
    }
  }, 5 * 60 * 1000); // Clean up every 5 minutes

  // Get gym info for public enquiry form (by slug or ID)
  app.get('/api/public/gym/:gymIdOrSlug', async (req, res) => {
    try {
      const { gymIdOrSlug } = req.params;

      // Check if it's a UUID or a slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gymIdOrSlug);

      let gym;
      if (isUuid) {
        gym = await db!.select().from(schema.gyms).where(eq(schema.gyms.id, gymIdOrSlug)).limit(1).then(rows => rows[0]);
      } else {
        gym = await db!.select().from(schema.gyms).where(eq(schema.gyms.slug, gymIdOrSlug)).limit(1).then(rows => rows[0]);
      }

      if (!gym) {
        return res.status(404).json({ error: 'Gym not found' });
      }

      if (gym.status !== 'active') {
        return res.status(400).json({ error: 'This gym is not currently accepting enquiries' });
      }

      // Get gym branding if available
      const branding = await db!.select().from(schema.branding).where(eq(schema.branding.gymId, gym.id)).limit(1).then(rows => rows[0]);

      res.json({
        id: gym.id,
        name: gym.name,
        slug: gym.slug,
        logoUrl: gym.logoUrl,
        phone: gym.phone,
        email: gym.email,
        address: gym.address,
        branding: branding ? {
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          accentColor: branding.accentColor,
        } : null,
      });
    } catch (error: any) {
      console.error('Error fetching gym for public enquiry:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Submit public enquiry form
  app.post('/api/public/enquiry/:gymIdOrSlug', async (req, res) => {
    try {
      // Rate limiting check
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      if (!checkRateLimit(clientIp)) {
        console.log(`[enquiry] Rate limit exceeded for IP: ${clientIp}`);
        return res.status(429).json({ 
          error: 'Too many requests. Please wait a moment before trying again.' 
        });
      }

      const { gymIdOrSlug } = req.params;
      const { 
        name, 
        email, 
        phone, 
        goal, 
        preferredChannel, 
        preferredTime, 
        source, 
        message,
        utmSource,
        utmMedium,
        utmCampaign,
        honeypot
      } = req.body;

      // Anti-spam honeypot check
      if (honeypot) {
        console.log('[enquiry] Honeypot triggered, ignoring submission');
        return res.json({ status: 'ok', leadId: 'fake', message: 'Enquiry submitted' });
      }

      // Validate required fields
      if (!name || name.trim().length < 2) {
        return res.status(400).json({ error: 'Please enter a valid name (at least 2 characters)' });
      }

      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
      }

      // Validate Indian phone number
      const phoneValidation = validateAndFormatPhoneNumber(phone);
      if (!phoneValidation.isValid) {
        return res.status(400).json({ error: phoneValidation.error || 'Invalid phone number' });
      }

      // Validate email if provided
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
      }

      // Check if it's a UUID or a slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gymIdOrSlug);

      let gym;
      if (isUuid) {
        gym = await db!.select().from(schema.gyms).where(eq(schema.gyms.id, gymIdOrSlug)).limit(1).then(rows => rows[0]);
      } else {
        gym = await db!.select().from(schema.gyms).where(eq(schema.gyms.slug, gymIdOrSlug)).limit(1).then(rows => rows[0]);
      }

      if (!gym) {
        return res.status(404).json({ error: 'Gym not found' });
      }

      if (gym.status !== 'active') {
        return res.status(400).json({ error: 'This gym is not currently accepting enquiries' });
      }

      // Set follow-up date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Create lead record
      const lead = await db!.insert(schema.leads).values({
        gymId: gym.id,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone.trim(),
        goal: goal || null,
        interestedPlan: goal || null,
        message: message?.trim() || null,
        source: source || 'Website form',
        channel: 'online',
        preferredChannel: preferredChannel || null,
        preferredTime: preferredTime || null,
        status: 'new',
        followUpDate: tomorrow,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        whatsappSent: 0,
        emailSent: 0,
      }).returning().then(rows => rows[0]);

      console.log(`[enquiry] New lead created for gym ${gym.name}: ${lead.id}`);

      // Get the gym admin(s) for notifications
      const gymAdmins = await db!.select({
        userId: schema.gymAdmins.userId,
        userName: schema.users.name,
        userEmail: schema.users.email,
        userPhone: schema.users.phone,
      })
      .from(schema.gymAdmins)
      .innerJoin(schema.users, eq(schema.gymAdmins.userId, schema.users.id))
      .where(eq(schema.gymAdmins.gymId, gym.id));

      // Build dashboard URL for notifications
      const baseUrl = process.env.REPLIT_DOMAIN 
        ? `https://${process.env.REPLIT_DOMAIN}`
        : process.env.NODE_ENV === 'production' 
          ? 'https://gymsaathi.com' 
          : 'http://localhost:5000';
      const dashboardUrl = `${baseUrl}/admin/leads?lead=${lead.id}`;

      // Send notifications to all gym admins (async, don't block response)
      for (const admin of gymAdmins) {
        // Send email notification
        if (admin.userEmail) {
          sendNewLeadNotificationEmail({
            adminEmail: admin.userEmail,
            adminName: admin.userName,
            gymName: gym.name,
            leadId: lead.id,
            leadName: lead.name,
            leadPhone: lead.phone,
            leadEmail: lead.email || undefined,
            goal: lead.goal || undefined,
            source: lead.source || undefined,
            preferredTime: lead.preferredTime || undefined,
            message: lead.message || undefined,
            dashboardUrl,
          }).then(sent => {
            if (sent && db) {
              db.update(schema.leads)
                .set({ emailSent: 1 })
                .where(eq(schema.leads.id, lead.id))
                .execute()
                .catch(err => console.error('[enquiry] Failed to update emailSent flag:', err));
            }
          }).catch(err => console.error('[enquiry] Failed to send admin email notification:', err));
        }

        // Send WhatsApp notification
        if (admin.userPhone) {
          sendNewLeadNotificationWhatsApp({
            adminPhone: admin.userPhone,
            adminName: admin.userName,
            gymName: gym.name,
            leadName: lead.name,
            leadPhone: lead.phone,
            leadEmail: lead.email || undefined,
            goal: lead.goal || undefined,
            source: lead.source || undefined,
            dashboardUrl,
          }).then(sent => {
            if (sent && db) {
              db.update(schema.leads)
                .set({ whatsappSent: 1 })
                .where(eq(schema.leads.id, lead.id))
                .execute()
                .catch(err => console.error('[enquiry] Failed to update whatsappSent flag:', err));
            }
          }).catch(err => console.error('[enquiry] Failed to send admin WhatsApp notification:', err));
        }
      }

      // Also send welcome email to the lead if they provided email
      if (email) {
        sendLeadWelcomeEmail({
          gymName: gym.name,
          leadName: lead.name,
          leadEmail: email,
          interestedPlan: goal || undefined,
          gymPhone: gym.phone,
          gymEmail: gym.email,
        }).catch(err => console.error('[enquiry] Failed to send lead welcome email:', err));
      }

      // Send welcome WhatsApp to the lead
      sendLeadWelcomeWhatsApp({
        phoneNumber: phone,
        gymName: gym.name,
        leadName: lead.name,
        interestedPlan: goal || undefined,
        gymPhone: gym.phone,
        gymEmail: gym.email,
      }).catch(err => console.error('[enquiry] Failed to send lead welcome WhatsApp:', err));

      res.json({
        status: 'ok',
        leadId: lead.id,
        message: 'Enquiry submitted successfully',
        gymName: gym.name,
        gymPhone: gym.phone,
      });
    } catch (error: any) {
      console.error('Error submitting public enquiry:', error);
      res.status(500).json({ error: 'Failed to submit enquiry. Please try again.' });
    }
  });

  // Get current gym info for admin
  app.get('/api/gym/info', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const gymId = req.session?.gymId;
      if (!gymId) {
        return res.status(400).json({ error: 'No gym associated with this user' });
      }

      const gym = await db!.select().from(schema.gyms).where(eq(schema.gyms.id, gymId)).limit(1).then(rows => rows[0]);
      if (!gym) {
        return res.status(404).json({ error: 'Gym not found' });
      }

      res.json({
        id: gym.id,
        name: gym.name,
        slug: gym.slug,
        logoUrl: gym.logoUrl,
        phone: gym.phone,
        email: gym.email,
        address: gym.address,
        status: gym.status,
      });
    } catch (error: any) {
      console.error('Error fetching gym info:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate or update gym slug
  app.post('/api/gyms/:id/generate-slug', requireRole('superadmin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { customSlug } = req.body;

      const gym = await db!.select().from(schema.gyms).where(eq(schema.gyms.id, id)).limit(1).then(rows => rows[0]);
      if (!gym) {
        return res.status(404).json({ error: 'Gym not found' });
      }

      // Generate slug from gym name or use custom slug
      let slug = customSlug || gym.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      // Ensure uniqueness
      const existingGym = await db!.select().from(schema.gyms)
        .where(and(eq(schema.gyms.slug, slug), sql`${schema.gyms.id} != ${id}`))
        .limit(1).then(rows => rows[0]);

      if (existingGym) {
        // Add random suffix if slug already exists
        slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
      }

      await db!.update(schema.gyms).set({ slug }).where(eq(schema.gyms.id, id));

      res.json({ slug });
    } catch (error: any) {
      console.error('Error generating gym slug:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/profile', requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { name, phone, profileImageUrl } = req.body;

      if (name === undefined && phone === undefined && profileImageUrl === undefined) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (profileImageUrl !== undefined) updateData.profileImageUrl = profileImageUrl;

      const updatedUser = await db!.update(schema.users).set(updateData).where(eq(schema.users.id, userId)).returning().then(rows => rows[0]);

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const gymIds = await storage.getUserGyms(updatedUser.id, updatedUser.role);
      const primaryGymId = gymIds.length > 0 ? gymIds[0] : null;

      const userResponse = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        gymId: primaryGymId,
        gymIds: gymIds,
        phone: updatedUser.phone,
        profileImageUrl: updatedUser.profileImageUrl,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        lastLogin: updatedUser.lastLogin,
      };

      res.json(userResponse);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      if (!req.session?.userId) {
        console.log('👤 No session found for /api/auth/me');
        return res.json(null);
      }

      console.log(`👤 Session found for user ID: ${req.session.userId}`);

      let user: any = null;
      let gymIds: string[] = [];

      if (isDbAvailable()) {
        user = await db!.select().from(schema.users).where(eq(schema.users.id, req.session.userId)).limit(1).then(rows => rows[0]);
        if (user) {
          gymIds = await storage.getUserGyms(user.id, user.role);
        }
      } else {
        const supabaseUser = await supabaseRepo.getUserById(req.session.userId);
        if (supabaseUser) {
          user = {
            id: supabaseUser.id,
            email: supabaseUser.email,
            role: supabaseUser.role,
            name: supabaseUser.name,
            phone: supabaseUser.phone,
            profileImageUrl: supabaseUser.profile_image_url,
            isActive: supabaseUser.is_active,
            createdAt: supabaseUser.created_at,
            lastLogin: supabaseUser.last_login,
          };
          gymIds = await supabaseRepo.getUserGyms(user.id, user.role);
        }
      }

      if (!user) {
        console.log(`❌ User not found in DB for session userId: ${req.session.userId}`);
        return res.json(null);
      }

      console.log(`✅ Authenticated user: ${user.email} (${user.role})`);

      const primaryGymId = gymIds.length > 0 ? gymIds[0] : null;

      const userResponse = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        gymId: primaryGymId,
        gymIds: gymIds,
        phone: user.phone,
        profileImageUrl: user.profileImageUrl,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      };
      res.json(userResponse);
    } catch (error: any) {
      console.error('❌ Error in /api/auth/me:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/me', requireAuth, async (req, res) => {
    try {
      let user: any = null;
      let member: any = null;

      if (isDbAvailable()) {
        user = await db!.select().from(schema.users).where(eq(schema.users.id, req.session!.userId!)).limit(1).then(rows => rows[0]);
        // Get member info for members AND trainers (trainers may have a linked member record for purchases)
        if (user && (user.role === 'member' || user.role === 'trainer')) {
          member = await db!.select().from(schema.members).where(eq(schema.members.userId, user.id)).limit(1).then(rows => rows[0]);
        }
      } else {
        const supabaseUser = await supabaseRepo.getUserById(req.session!.userId!);
        if (supabaseUser) {
          user = {
            id: supabaseUser.id,
            email: supabaseUser.email,
            role: supabaseUser.role,
            name: supabaseUser.name,
            phone: supabaseUser.phone,
            isActive: supabaseUser.is_active,
            createdAt: supabaseUser.created_at,
            lastLogin: supabaseUser.last_login,
          };
        }
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userResponse = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      };

      if (user.role === 'member' && !member) {
        console.warn(`Member profile not found for user ID: ${user.id}`);
      }

      res.json({ user: userResponse, member: member || null });
    } catch (error: any) {
      console.error('Error in /api/me:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/stats', requireRole('superadmin'), async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: error.message });
    }
  });

  const transformGym = (gym: any) => {
    if (!gym) return gym;
    return {
      id: gym.id,
      name: gym.name,
      owner: gym.owner,
      email: gym.email,
      phone: gym.phone,
      plan: gym.plan,
      status: gym.status,
      members: gym.members,
      revenue: gym.revenue,
      address: gym.address,
      logoUrl: gym.logoUrl,
      createdAt: gym.createdAt,
    };
  };

  app.get('/api/gyms', requireRole('superadmin'), async (req, res) => {
    try {
      let gyms: any[] = [];

      if (isDbAvailable()) {
        gyms = await db!.select().from(schema.gyms);

        // Get member counts for each gym from the members table
        const gymsWithMemberCounts = await Promise.all(gyms.map(async (gym) => {
          const memberCountResult = await db!.select({ count: sql<number>`count(*)` })
            .from(schema.members)
            .where(eq(schema.members.gymId, gym.id));

          const memberCount = Number(memberCountResult[0]?.count || 0);

          return {
            ...gym,
            members: memberCount,
          };
        }));

        res.json(gymsWithMemberCounts.map(transformGym));
      } else {
        const supabaseGyms = await supabaseRepo.getAllGyms();
        gyms = supabaseGyms.map(g => ({
          id: g.id,
          name: g.name,
          owner: g.owner,
          email: g.email,
          phone: g.phone,
          plan: g.plan,
          status: g.status,
          members: g.members,
          revenue: g.revenue,
          address: g.address,
          logoUrl: g.logo_url,
          createdAt: g.created_at
        }));
        res.json(gyms.map(transformGym));
      }
    } catch (error: any) {
      console.error('Error fetching gyms:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/gyms/recent', requireRole('superadmin'), async (req, res) => {
    try {
      let gyms: any[] = [];

      if (isDbAvailable()) {
        gyms = await db!.select().from(schema.gyms).orderBy(desc(schema.gyms.createdAt)).limit(10);

        // Get member counts for each gym from the members table
        const gymsWithMemberCounts = await Promise.all(gyms.map(async (gym) => {
          const memberCountResult = await db!.select({ count: sql<number>`count(*)` })
            .from(schema.members)
            .where(eq(schema.members.gymId, gym.id));

          const memberCount = Number(memberCountResult[0]?.count || 0);

          return {
            ...gym,
            members: memberCount,
          };
        }));

        res.json(gymsWithMemberCounts.map(transformGym));
      } else {
        const supabaseGyms = await supabaseRepo.getAllGyms();
        gyms = supabaseGyms.slice(0, 10).map(g => ({
          id: g.id,
          name: g.name,
          owner: g.owner,
          email: g.email,
          phone: g.phone,
          plan: g.plan,
          status: g.status,
          members: g.members,
          revenue: g.revenue,
          address: g.address,
          logoUrl: g.logo_url,
          createdAt: g.created_at
        }));
        res.json(gyms.map(transformGym));
      }
    } catch (error: any) {
      console.error('Error fetching recent gyms:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/gyms/:id', requireRole('superadmin'), async (req, res) => {
    try {
      let gym: any = null;

      if (isDbAvailable()) {
        gym = await db!.select().from(schema.gyms).where(eq(schema.gyms.id, req.params.id)).limit(1).then(rows => rows[0]);
      } else {
        const supabaseGym = await supabaseRepo.getGymById(req.params.id);
        if (supabaseGym) {
          gym = {
            id: supabaseGym.id,
            name: supabaseGym.name,
            owner: supabaseGym.owner,
            email: supabaseGym.email,
            phone: supabaseGym.phone,
            plan: supabaseGym.plan,
            status: supabaseGym.status,
            members: supabaseGym.members,
            revenue: supabaseGym.revenue,
            address: supabaseGym.address,
            logoUrl: supabaseGym.logo_url,
            createdAt: supabaseGym.created_at
          };
        }
      }

      if (!gym) {
        return res.status(404).json({ error: 'Gym not found' });
      }
      res.json(transformGym(gym));
    } catch (error: any) {
      console.error(`Error fetching gym ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/gyms', requireRole('superadmin'), async (req, res) => {
    try {
      const { adminEmail, adminPassword, ...gymData } = req.body;

      if (!adminEmail || !adminPassword) {
        return res.status(400).json({ error: 'Admin email and password are required' });
      }

      if (adminPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      }

      let existingUser: any = null;
      let gym: any = null;
      let newUser: any = null;

      if (isDbAvailable()) {
        existingUser = await db!.select().from(schema.users).where(eq(schema.users.email, adminEmail)).limit(1).then(rows => rows[0]);
      } else {
        existingUser = await supabaseRepo.getUserByEmail(adminEmail);
      }

      if (existingUser) {
        return res.status(400).json({ error: 'Admin email already exists' });
      }

      const revenue = gymData.plan === 'enterprise' ? '2500' : gymData.plan === 'professional' ? '1500' : '800';
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      if (isDbAvailable()) {
        gym = await db!.insert(schema.gyms).values({
          name: gymData.name,
          owner: gymData.owner,
          email: gymData.email,
          phone: gymData.phone,
          plan: gymData.plan,
          status: gymData.status,
          members: 0,
          revenue: revenue,
          address: gymData.address || null,
          logoUrl: gymData.logoUrl || null
        }).returning().then(rows => rows[0]);

        console.log('🔐 Creating admin user with email:', adminEmail);

        newUser = await db!.insert(schema.users).values({
          email: adminEmail,
          passwordHash: passwordHash,
          role: 'admin',
          name: `${gym.owner} (Admin)`,
          phone: gym.phone || '+1-000-000-0000',
          isActive: 1
        }).returning().then(rows => rows[0]);

        console.log('✅ Admin user created successfully:', newUser.id, newUser.email);

        await db!.insert(schema.gymAdmins).values({
          gymId: gym.id,
          userId: newUser.id
        });
      } else {
        const supabaseGym = await supabaseRepo.createGym({
          name: gymData.name,
          owner: gymData.owner,
          email: gymData.email,
          phone: gymData.phone,
          plan: gymData.plan,
          status: gymData.status,
          members: 0,
          revenue: revenue,
          address: gymData.address || null,
          logo_url: gymData.logoUrl || null
        });

        if (!supabaseGym) {
          return res.status(500).json({ error: 'Failed to create gym' });
        }

        gym = {
          id: supabaseGym.id,
          name: supabaseGym.name,
          owner: supabaseGym.owner,
          email: supabaseGym.email,
          phone: supabaseGym.phone,
          plan: supabaseGym.plan,
          status: supabaseGym.status,
          members: supabaseGym.members,
          revenue: supabaseGym.revenue,
          address: supabaseGym.address,
          logoUrl: supabaseGym.logo_url,
          createdAt: supabaseGym.created_at
        };

        console.log('🔐 Creating admin user with email:', adminEmail);

        const supabaseUser = await supabaseRepo.createUser({
          email: adminEmail,
          password_hash: passwordHash,
          role: 'admin',
          name: `${gym.owner} (Admin)`,
          phone: gym.phone || '+1-000-000-0000',
          is_active: 1
        });

        if (!supabaseUser) {
          return res.status(500).json({ error: 'Failed to create admin user' });
        }

        newUser = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.name
        };

        console.log('✅ Admin user created successfully:', newUser.id, newUser.email);

        await supabaseRepo.createGymAdmin(gym.id, newUser.id);
      }

      const loginUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}/login`
        : 'https://gymsaathi.com/login';

      sendGymAdminWelcomeEmail({
        gymName: gym.name,
        adminName: gym.owner,
        adminEmail: adminEmail,
        tempPassword: adminPassword,
        loginUrl: loginUrl,
      }).catch(err => console.error('[notification] Failed to send gym admin welcome email:', err));

      sendGymAdminWelcomeWhatsApp({
        phoneNumber: gym.phone || '',
        gymName: gym.name,
        personName: gym.owner,
        loginUrl: loginUrl,
        email: adminEmail,
        tempPassword: adminPassword,
      }).catch(err => console.error('[notification] Failed to send gym admin welcome WhatsApp:', err));

      try {
        const currentUser = await userAccess.getUserById(req.session!.userId!);
        await auditService.logGymCreated(req, req.session!.userId!, currentUser?.name || 'System', gym.name, gym.id);
        await auditService.logUserCreated(req, req.session!.userId!, currentUser?.name || 'System', `${gym.owner} (Admin)`, 'admin');
      } catch (e) {
        console.error('Audit logging error:', e);
      }

      res.status(201).json({ 
        gym: transformGym(gym), 
        message: 'Gym and admin account created successfully',
        adminEmail 
      });
    } catch (error: any) {
      console.error('Error creating gym:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/gyms/:id', requireRole('superadmin'), async (req, res) => {
    try {
      console.log('Updating gym with body:', req.body);
      let gym: any = null;

      if (isDbAvailable()) {
        gym = await db!.update(schema.gyms).set(req.body).where(eq(schema.gyms.id, req.params.id)).returning().then(rows => rows[0]);
      } else {
        const updateData: any = { ...req.body };
        if (updateData.logoUrl !== undefined) {
          updateData.logo_url = updateData.logoUrl;
          delete updateData.logoUrl;
        }
        const supabaseGym = await supabaseRepo.updateGym(req.params.id, updateData);
        if (supabaseGym) {
          gym = {
            id: supabaseGym.id,
            name: supabaseGym.name,
            owner: supabaseGym.owner,
            email: supabaseGym.email,
            phone: supabaseGym.phone,
            plan: supabaseGym.plan,
            status: supabaseGym.status,
            members: supabaseGym.members,
            revenue: supabaseGym.revenue,
            address: supabaseGym.address,
            logoUrl: supabaseGym.logo_url,
            createdAt: supabaseGym.created_at
          };
        }
      }

      if (!gym) {
        return res.status(404).json({ error: 'Gym not found' });
      }
      res.json(transformGym(gym));
    } catch (error: any) {
      console.error(`Error updating gym ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/gyms/:id/suspend', requireRole('superadmin'), async (req, res) => {
    try {
      let existingGym: any = null;
      let gym: any = null;

      if (isDbAvailable()) {
        existingGym = await db!.select().from(schema.gyms).where(eq(schema.gyms.id, req.params.id)).limit(1).then(rows => rows[0]);
        if (!existingGym) {
          return res.status(404).json({ error: 'Gym not found' });
        }
        const newStatus = existingGym.status === 'suspended' ? 'active' : 'suspended';
        gym = await db!.update(schema.gyms).set({ status: newStatus as any }).where(eq(schema.gyms.id, req.params.id)).returning().then(rows => rows[0]);
      } else {
        const supabaseGym = await supabaseRepo.getGymById(req.params.id);
        if (!supabaseGym) {
          return res.status(404).json({ error: 'Gym not found' });
        }
        const newStatus = supabaseGym.status === 'suspended' ? 'active' : 'suspended';
        const updatedGym = await supabaseRepo.updateGym(req.params.id, { status: newStatus });
        if (updatedGym) {
          gym = {
            id: updatedGym.id,
            name: updatedGym.name,
            owner: updatedGym.owner,
            email: updatedGym.email,
            phone: updatedGym.phone,
            plan: updatedGym.plan,
            status: updatedGym.status,
            members: updatedGym.members,
            revenue: updatedGym.revenue,
            address: updatedGym.address,
            logoUrl: updatedGym.logo_url,
            createdAt: updatedGym.created_at
          };
        }
      }

      res.json(transformGym(gym));
    } catch (error: any) {
      console.error(`Error suspending gym ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/gyms/:id', requireRole('superadmin'), async (req, res) => {
    try {
      if (isDbAvailable()) {
        await db!.delete(schema.gyms).where(eq(schema.gyms.id, req.params.id));
      } else {
        await supabaseRepo.deleteGym(req.params.id);
      }
      res.status(204).send();
    } catch (error: any) {
      console.error(`Error deleting gym ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/subscriptions', requireRole('superadmin'), async (req, res) => {
    try {
      if (!isDbAvailable()) {
        return res.json([]);
      }
      const subscriptions = await db!.select().from(schema.subscriptions);
      res.json(subscriptions);
    } catch (error: any) {
      console.error('Error fetching subscriptions:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/transactions', requireRole('superadmin'), async (req, res) => {
    try {
      if (!isDbAvailable()) {
        return res.json([]);
      }
      const transactions = await db!.select().from(schema.transactions);
      res.json(transactions);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/branding/:gymId', requireRole('superadmin'), async (req, res) => {
    try {
      if (!isDbAvailable()) {
        return res.status(503).json({ error: 'Database unavailable' });
      }
      const branding = await db!.select().from(schema.branding).where(eq(schema.branding.gymId, req.params.gymId)).limit(1).then(rows => rows[0]);
      if (!branding) {
        return res.status(404).json({ error: 'Branding config not found' });
      }
      res.json(branding);
    } catch (error: any) {
      console.error(`Error fetching branding for gym ${req.params.gymId}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/branding/:gymId', requireRole('superadmin'), async (req, res) => {
    try {
      if (!isDbAvailable()) {
        return res.status(503).json({ error: 'Database unavailable' });
      }
      const existing = await db!.select().from(schema.branding).where(eq(schema.branding.gymId, req.params.gymId)).limit(1).then(rows => rows[0]);
      let branding;
      if (existing) {
        branding = await db!.update(schema.branding).set(req.body).where(eq(schema.branding.gymId, req.params.gymId)).returning().then(rows => rows[0]);
      } else {
        branding = await db!.insert(schema.branding).values({ ...req.body, gymId: req.params.gymId }).returning().then(rows => rows[0]);
      }
      res.json(branding);
    } catch (error: any) {
      console.error(`Error saving branding for gym ${req.params.gymId}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/analytics', requireRole('superadmin'), async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/analytics/revenue-trend', requireRole('superadmin'), async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics.revenueChart);
    } catch (error: any) {
      console.error('Error fetching revenue trend:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/analytics/plan-distribution', requireRole('superadmin'), async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics.planDistribution);
    } catch (error: any) {
      console.error('Error fetching plan distribution:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/audit-logs', requireRole('superadmin'), async (req, res) => {
    try {
      if (!isDbAvailable()) {
        return res.json([]);
      }
      const logs = await db!.select().from(schema.auditLogs);
      res.json(logs);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/integrations', requireRole('superadmin'), async (req, res) => {
    try {
      if (!isDbAvailable()) {
        return res.json([]);
      }
      const integrations = await db!.select().from(schema.integrations);
      res.json(integrations);
    } catch (error: any) {
      console.error('Error fetching integrations:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/integrations', requireRole('superadmin'), async (req, res) => {
    try {
      if (!isDbAvailable()) {
        return res.status(503).json({ error: 'Database unavailable' });
      }
      const integration = await db!.insert(schema.integrations).values(req.body).returning().then(rows => rows[0]);
      res.status(201).json(integration);
    } catch (error: any) {
      console.error('Error creating integration:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/integrations/:id/toggle', requireRole('superadmin'), async (req, res) => {
    try {
      if (!isDbAvailable()) {
        return res.status(503).json({ error: 'Database unavailable' });
      }
      const existing = await db!.select().from(schema.integrations).where(eq(schema.integrations.id, req.params.id)).limit(1).then(rows => rows[0]);
      if (!existing) {
        return res.status(404).json({ error: 'Integration not found' });
      }
      const newStatus = existing.status === 'active' ? 'inactive' : 'active';
      const integration = await db!.update(schema.integrations).set({ status: newStatus as any, lastSync: new Date() }).where(eq(schema.integrations.id, req.params.id)).returning().then(rows => rows[0]);
      res.json(integration);
    } catch (error: any) {
      console.error(`Error toggling integration ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/integrations/:id', requireRole('superadmin'), async (req, res) => {
    try {
      if (!isDbAvailable()) {
        return res.status(503).json({ error: 'Database unavailable' });
      }
      await db!.delete(schema.integrations).where(eq(schema.integrations.id, req.params.id));
      res.status(204).send();
    } catch (error: any) {
      console.error(`Error deleting integration ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // SUPERADMIN BILLING & REVENUE ENDPOINTS
  // ==========================================

  // Get superadmin dashboard stats (KPIs)
  app.get('/api/superadmin/dashboard-stats', requireRole('superadmin'), async (req, res) => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const startOfLastMonth = new Date(lastMonthYear, lastMonth - 1, 1);
      const endOfLastMonth = new Date(currentYear, currentMonth - 1, 0);

      // Get all active gyms
      const allGyms = await db!.select().from(schema.gyms).where(eq(schema.gyms.status, 'active'));

      // Calculate active members for each gym
      let totalActiveMembers = 0;
      let totalRevenue = 0;
      let standardPlanRevenue = 0;
      let customPlanRevenue = 0;

      for (const gym of allGyms) {
        const activeMembers = await db!.select({ count: sql<number>`count(*)` })
          .from(schema.memberships)
          .where(and(
            eq(schema.memberships.gymId, gym.id),
            eq(schema.memberships.status, 'active'),
            gte(schema.memberships.endDate, now)
          ));

        const memberCount = Number(activeMembers[0]?.count || 0);
        totalActiveMembers += memberCount;

        const rate = parseFloat(gym.ratePerMember || '75');
        const gymRevenue = memberCount * rate;
        totalRevenue += gymRevenue;

        if (gym.pricingPlanType === 'custom') {
          customPlanRevenue += gymRevenue;
        } else {
          standardPlanRevenue += gymRevenue;
        }
      }

      // Get last month's revenue from gym invoices or snapshot
      const lastMonthInvoices = await db!.select({
        total: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)`
      }).from(schema.gymInvoices).where(and(
        eq(schema.gymInvoices.month, lastMonth),
        eq(schema.gymInvoices.year, lastMonthYear)
      ));
      const lastMonthRevenue = parseFloat(String(lastMonthInvoices[0]?.total || 0));

      // Calculate trend
      const revenueTrend = lastMonthRevenue > 0 
        ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 100;

      // Get paid and pending amounts for current month
      const currentMonthInvoices = await db!.select({
        paid: sql<number>`COALESCE(SUM(CASE WHEN status = 'paid' THEN CAST(total_amount AS DECIMAL) ELSE 0 END), 0)`,
        pending: sql<number>`COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue') THEN CAST(total_amount AS DECIMAL) ELSE 0 END), 0)`
      }).from(schema.gymInvoices).where(and(
        eq(schema.gymInvoices.month, currentMonth),
        eq(schema.gymInvoices.year, currentYear)
      ));

      res.json({
        totalRevenue,
        revenueTrend: Math.round(revenueTrend * 100) / 100,
        activeGyms: allGyms.length,
        totalMembers: totalActiveMembers,
        mrr: totalRevenue,
        paidAmount: parseFloat(String(currentMonthInvoices[0]?.paid || 0)),
        pendingAmount: parseFloat(String(currentMonthInvoices[0]?.pending || 0)),
        standardPlanRevenue,
        customPlanRevenue,
        currentMonth,
        currentYear
      });
    } catch (error: any) {
      console.error('Error fetching superadmin dashboard stats:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get revenue analytics (trend, breakdown, etc.)
  app.get('/api/superadmin/revenue-analytics', requireRole('superadmin'), async (req, res) => {
    try {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      // Get revenue trend for last 6 months from gym invoices
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthNum = month.getMonth() + 1;
        const year = month.getFullYear();

        const invoiceData = await db!.select({
          total: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)`,
          members: sql<number>`COALESCE(SUM(active_members), 0)`
        }).from(schema.gymInvoices).where(and(
          eq(schema.gymInvoices.month, monthNum),
          eq(schema.gymInvoices.year, year)
        ));

        monthlyData.push({
          month: month.toLocaleString('default', { month: 'short' }),
          year,
          revenue: parseFloat(String(invoiceData[0]?.total || 0)),
          members: Number(invoiceData[0]?.members || 0)
        });
      }

      // Get plan type breakdown
      const allGyms = await db!.select().from(schema.gyms);
      const standardGyms = allGyms.filter(g => g.pricingPlanType !== 'custom').length;
      const customGyms = allGyms.filter(g => g.pricingPlanType === 'custom').length;

      // Calculate revenue by plan type
      let standardRevenue = 0;
      let customRevenue = 0;
      for (const gym of allGyms) {
        const activeMembers = await db!.select({ count: sql<number>`count(*)` })
          .from(schema.memberships)
          .where(and(
            eq(schema.memberships.gymId, gym.id),
            eq(schema.memberships.status, 'active'),
            gte(schema.memberships.endDate, now)
          ));
        const count = Number(activeMembers[0]?.count || 0);
        const rate = parseFloat(gym.ratePerMember || '75');
        if (gym.pricingPlanType === 'custom') {
          customRevenue += count * rate;
        } else {
          standardRevenue += count * rate;
        }
      }

      res.json({
        revenueTrend: monthlyData,
        memberGrowth: monthlyData.map(d => ({ month: d.month, year: d.year, members: d.members })),
        planBreakdown: {
          standard: { count: standardGyms, revenue: standardRevenue },
          custom: { count: customGyms, revenue: customRevenue }
        }
      });
    } catch (error: any) {
      console.error('Error fetching revenue analytics:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get top performing gyms
  app.get('/api/superadmin/top-gyms', requireRole('superadmin'), async (req, res) => {
    try {
      const now = new Date();
      const allGyms = await db!.select().from(schema.gyms).where(eq(schema.gyms.status, 'active'));

      const gymStats = await Promise.all(allGyms.map(async (gym) => {
        const activeMembers = await db!.select({ count: sql<number>`count(*)` })
          .from(schema.memberships)
          .where(and(
            eq(schema.memberships.gymId, gym.id),
            eq(schema.memberships.status, 'active'),
            gte(schema.memberships.endDate, now)
          ));

        const memberCount = Number(activeMembers[0]?.count || 0);
        const rate = parseFloat(gym.ratePerMember || '75');

        return {
          id: gym.id,
          name: gym.name,
          owner: gym.owner,
          activeMembers: memberCount,
          rateType: gym.pricingPlanType === 'custom' ? `₹${rate}` : '₹75',
          rate,
          monthlyBilling: memberCount * rate,
          pricingPlanType: gym.pricingPlanType
        };
      }));

      // Sort by monthly billing, descending
      gymStats.sort((a, b) => b.monthlyBilling - a.monthlyBilling);

      res.json(gymStats.slice(0, 10)); // Top 10
    } catch (error: any) {
      console.error('Error fetching top gyms:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get gym billing list for superadmin
  app.get('/api/superadmin/gym-billing', requireRole('superadmin'), async (req, res) => {
    try {
      const now = new Date();
      const allGyms = await db!.select().from(schema.gyms);

      const billingData = await Promise.all(allGyms.map(async (gym) => {
        const activeMembers = await db!.select({ count: sql<number>`count(*)` })
          .from(schema.memberships)
          .where(and(
            eq(schema.memberships.gymId, gym.id),
            eq(schema.memberships.status, 'active'),
            gte(schema.memberships.endDate, now)
          ));

        const memberCount = Number(activeMembers[0]?.count || 0);
        const rate = parseFloat(gym.ratePerMember || '75');

        // Get latest invoice for this gym
        const latestInvoice = await db!.select()
          .from(schema.gymInvoices)
          .where(eq(schema.gymInvoices.gymId, gym.id))
          .orderBy(desc(schema.gymInvoices.createdAt))
          .limit(1)
          .then(rows => rows[0]);

        // Calculate next invoice date (1st of next month)
        const nextInvoiceDate = new Date(now.getFullYear(), now.getMonth() + 1, gym.billingCycleStart || 1);

        return {
          id: gym.id,
          name: gym.name,
          owner: gym.owner,
          email: gym.email,
          status: gym.status,
          planType: gym.pricingPlanType === 'custom' ? 'Custom' : 'Standard (₹75)',
          activeMembers: memberCount,
          rate,
          monthlyBilling: memberCount * rate,
          billingCycleStart: gym.billingCycleStart || 1,
          nextInvoiceDate: nextInvoiceDate.toISOString(),
          lastInvoice: latestInvoice ? {
            id: latestInvoice.id,
            invoiceNumber: latestInvoice.invoiceNumber,
            status: latestInvoice.status,
            amount: parseFloat(latestInvoice.totalAmount)
          } : null
        };
      }));

      res.json(billingData);
    } catch (error: any) {
      console.error('Error fetching gym billing:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update gym pricing settings
  app.patch('/api/superadmin/gyms/:id/pricing', requireRole('superadmin'), async (req, res) => {
    try {
      const { pricingPlanType, ratePerMember, billingCycleStart } = req.body;

      const updateData: any = {};
      if (pricingPlanType) updateData.pricingPlanType = pricingPlanType;
      if (ratePerMember) updateData.ratePerMember = String(ratePerMember);
      if (billingCycleStart) updateData.billingCycleStart = billingCycleStart;

      const gym = await db!.update(schema.gyms)
        .set(updateData)
        .where(eq(schema.gyms.id, req.params.id))
        .returning()
        .then(rows => rows[0]);

      if (!gym) {
        return res.status(404).json({ error: 'Gym not found' });
      }

      res.json(gym);
    } catch (error: any) {
      console.error('Error updating gym pricing:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all gym invoices (superadmin)
  app.get('/api/superadmin/gym-invoices', requireRole('superadmin'), async (req, res) => {
    try {
      const { month, year, status, gymId } = req.query;

      let conditions = [];
      if (month) conditions.push(eq(schema.gymInvoices.month, Number(month)));
      if (year) conditions.push(eq(schema.gymInvoices.year, Number(year)));
      if (status) conditions.push(eq(schema.gymInvoices.status, status as any));
      if (gymId) conditions.push(eq(schema.gymInvoices.gymId, gymId as string));

      const invoices = await db!.select({
        invoice: schema.gymInvoices,
        gym: schema.gyms
      })
      .from(schema.gymInvoices)
      .leftJoin(schema.gyms, eq(schema.gymInvoices.gymId, schema.gyms.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.gymInvoices.createdAt));

      res.json(invoices.map(row => ({
        ...row.invoice,
        gymName: row.gym?.name,
        gymOwner: row.gym?.owner,
        gymEmail: row.gym?.email
      })));
    } catch (error: any) {
      console.error('Error fetching gym invoices:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate invoices for all gyms (monthly billing run)
  app.post('/api/superadmin/generate-invoices', requireRole('superadmin'), async (req, res) => {
    try {
      const { month, year } = req.body;
      const targetMonth = month || new Date().getMonth() + 1;
      const targetYear = year || new Date().getFullYear();
      const now = new Date();

      const allGyms = await db!.select().from(schema.gyms).where(eq(schema.gyms.status, 'active'));
      const generatedInvoices = [];

      for (const gym of allGyms) {
        // Check if invoice already exists for this month
        const existingInvoice = await db!.select()
          .from(schema.gymInvoices)
          .where(and(
            eq(schema.gymInvoices.gymId, gym.id),
            eq(schema.gymInvoices.month, targetMonth),
            eq(schema.gymInvoices.year, targetYear)
          ))
          .limit(1)
          .then(rows => rows[0]);

        if (existingInvoice) continue; // Skip if already generated

        // Count active members
        const activeMembers = await db!.select({ count: sql<number>`count(*)` })
          .from(schema.memberships)
          .where(and(
            eq(schema.memberships.gymId, gym.id),
            eq(schema.memberships.status, 'active'),
            gte(schema.memberships.endDate, now)
          ));

        const memberCount = Number(activeMembers[0]?.count || 0);
        const rate = parseFloat(gym.ratePerMember || '75');
        const totalAmount = memberCount * rate;

        // Generate invoice number: GS-{gymId first 4 chars}-{MM}{YYYY}
        const invoiceNumber = `GS-${gym.id.substring(0, 4).toUpperCase()}-${String(targetMonth).padStart(2, '0')}${targetYear}`;

        // Due date is 15th of the month
        const dueDate = new Date(targetYear, targetMonth - 1, 15);

        const invoice = await db!.insert(schema.gymInvoices).values({
          invoiceNumber,
          gymId: gym.id,
          month: targetMonth,
          year: targetYear,
          activeMembers: memberCount,
          ratePerMember: String(rate),
          totalAmount: String(totalAmount),
          dueDate,
          status: 'pending'
        }).returning().then(rows => rows[0]);

        generatedInvoices.push({
          ...invoice,
          gymName: gym.name
        });
      }

      if (generatedInvoices.length > 0) {
        const currentUser = await storage.getUserById(req.session!.userId!);
        const totalAmount = generatedInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || '0'), 0);
        await auditService.logInvoiceGenerated(req, req.session!.userId!, currentUser?.name || 'System', generatedInvoices.length, totalAmount);
      }

      res.status(201).json({
        message: `Generated ${generatedInvoices.length} invoices for ${targetMonth}/${targetYear}`,
        invoices: generatedInvoices
      });
    } catch (error: any) {
      console.error('Error generating invoices:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update gym invoice status (mark as paid, etc.)
  app.patch('/api/superadmin/gym-invoices/:id', requireRole('superadmin'), async (req, res) => {
    try {
      const { status, paymentMethod, paymentRef, paidAmount, notes } = req.body;

      const updateData: any = {};
      if (status) updateData.status = status;
      if (paymentMethod) updateData.paymentMethod = paymentMethod;
      if (paymentRef) updateData.paymentRef = paymentRef;
      if (paidAmount) updateData.paidAmount = String(paidAmount);
      if (notes !== undefined) updateData.notes = notes;
      if (status === 'paid') updateData.paidDate = new Date();

      const invoice = await db!.update(schema.gymInvoices)
        .set(updateData)
        .where(eq(schema.gymInvoices.id, req.params.id))
        .returning()
        .then(rows => rows[0]);

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // If marking as paid, check if gym was suspended and reactivate
      if (status === 'paid') {
        const gym = await db!.select().from(schema.gyms)
          .where(eq(schema.gyms.id, invoice.gymId))
          .limit(1)
          .then(rows => rows[0]);

        if (gym && gym.status === 'suspended' && gym.suspensionReason === 'unpaid_invoice') {
          await db!.update(schema.gyms).set({
            status: 'active',
            suspendedAt: null,
            suspensionReason: null
          }).where(eq(schema.gyms.id, invoice.gymId));
        }

        const currentUser = await storage.getUserById(req.session!.userId!);
        await auditService.logInvoicePaid(req, req.session!.userId!, currentUser?.name || 'System', invoice.invoiceNumber, gym?.name || 'Unknown Gym', invoice.totalAmount);
      }

      res.json(invoice);
    } catch (error: any) {
      console.error('Error updating gym invoice:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Check and suspend gyms with overdue invoices (15+ days)
  app.post('/api/superadmin/check-overdue-invoices', requireRole('superadmin'), async (req, res) => {
    try {
      const now = new Date();
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

      // Find pending invoices past due date by more than 15 days
      const overdueInvoices = await db!.select()
        .from(schema.gymInvoices)
        .where(and(
          eq(schema.gymInvoices.status, 'pending'),
          lte(schema.gymInvoices.dueDate, fifteenDaysAgo)
        ));

      const suspendedGyms = [];

      for (const invoice of overdueInvoices) {
        // Update invoice status to overdue
        await db!.update(schema.gymInvoices)
          .set({ status: 'overdue' })
          .where(eq(schema.gymInvoices.id, invoice.id));

        // Suspend the gym
        await db!.update(schema.gyms)
          .set({
            status: 'suspended',
            suspendedAt: now,
            suspensionReason: 'unpaid_invoice'
          })
          .where(eq(schema.gyms.id, invoice.gymId));

        const gym = await db!.select().from(schema.gyms)
          .where(eq(schema.gyms.id, invoice.gymId))
          .limit(1)
          .then(rows => rows[0]);

        suspendedGyms.push({
          gymId: invoice.gymId,
          gymName: gym?.name,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.totalAmount,
          dueDate: invoice.dueDate
        });
      }

      if (suspendedGyms.length > 0) {
        const currentUser = await storage.getUserById(req.session!.userId!);
        for (const suspended of suspendedGyms) {
          await auditService.logGymSuspended(req, req.session!.userId!, currentUser?.name || 'System', suspended.gymName || 'Unknown', `Unpaid invoice: ${suspended.invoiceNumber}`);
        }
      }

      res.json({
        message: `Checked overdue invoices. ${suspendedGyms.length} gyms suspended.`,
        suspendedGyms
      });
    } catch (error: any) {
      console.error('Error checking overdue invoices:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // END SUPERADMIN BILLING ENDPOINTS
  // ==========================================

  // ==========================================
  // SUPERADMIN KPI ENDPOINTS (Dashboard)
  // ==========================================

  // Revenue KPIs endpoint
  app.get('/api/superadmin/kpis/revenue', requireRole('superadmin'), async (req, res) => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const startOfLastMonth = new Date(lastMonthYear, lastMonth - 1, 1);
      const endOfLastMonth = new Date(currentYear, currentMonth - 1, 0);

      // Use Supabase fallback if db is not available
      if (!isDbAvailable()) {
        const allGyms = await supabaseRepo.getAllGyms();
        const activeGyms = allGyms.filter(g => g.status === 'active');

        let mrr = 0;
        let totalActiveMembers = 0;

        for (const gym of activeGyms) {
          const memberships = await supabaseRepo.getMembershipsForGym(gym.id);
          const memberCount = memberships.length;
          totalActiveMembers += memberCount;
          const rate = parseFloat(gym.revenue || '75');
          mrr += memberCount * rate;
        }

        const arr = mrr * 12;
        const invoices = await supabaseRepo.getGymInvoices();
        const thisMonthInvoices = invoices.filter(i => i.month === currentMonth && i.year === currentYear && i.status === 'paid');
        const revenueThisMonth = thisMonthInvoices.reduce((sum, i) => sum + parseFloat(i.total_amount || '0'), 0) || mrr;

        const lastMonthInvoices = invoices.filter(i => i.month === lastMonth && i.year === lastMonthYear && i.status === 'paid');
        const revenuePrevMonth = lastMonthInvoices.reduce((sum, i) => sum + parseFloat(i.total_amount || '0'), 0);

        const revenueGrowth = revenuePrevMonth > 0 
          ? ((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100 
          : (revenueThisMonth > 0 ? 100 : 0);

        const paidInvoices = invoices.filter(i => i.status === 'paid');
        const totalRevenueAllTime = paidInvoices.reduce((sum, i) => sum + parseFloat(i.total_amount || '0'), 0);

        return res.json({
          revenueThisMonth: {
            value: revenueThisMonth,
            growth: Math.round(revenueGrowth * 100) / 100,
            sparkline: []
          },
          revenueAllTime: {
            value: totalRevenueAllTime > 0 ? totalRevenueAllTime : mrr
          },
          mrr: {
            value: mrr,
            formula: `${totalActiveMembers} members × avg rate`
          },
          arr: {
            value: arr,
            formula: 'MRR × 12'
          },
          upcomingRevenue: {
            value: mrr,
            period: 'Next 30 days'
          }
        });
      }

      // Get all gyms for calculations
      const allGyms = await db!.select().from(schema.gyms);
      const activeGyms = allGyms.filter(g => g.status === 'active');

      // Calculate MRR (Monthly Recurring Revenue) = Σ (active members × rate per member)
      let mrr = 0;
      let totalActiveMembers = 0;

      for (const gym of activeGyms) {
        const activeMembers = await db!.select({ count: sql<number>`count(*)` })
          .from(schema.memberships)
          .where(and(
            eq(schema.memberships.gymId, gym.id),
            eq(schema.memberships.status, 'active'),
            gte(schema.memberships.endDate, now)
          ));

        const memberCount = Number(activeMembers[0]?.count || 0);
        totalActiveMembers += memberCount;
        const rate = parseFloat(gym.ratePerMember || '75');
        mrr += memberCount * rate;
      }

      // ARR = 12 × MRR
      const arr = mrr * 12;

      // Total Revenue This Month (from paid invoices this month)
      const thisMonthRevenue = await db!.select({
        total: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)`
      }).from(schema.gymInvoices).where(and(
        eq(schema.gymInvoices.month, currentMonth),
        eq(schema.gymInvoices.year, currentYear),
        eq(schema.gymInvoices.status, 'paid')
      ));
      const revenueThisMonth = parseFloat(String(thisMonthRevenue[0]?.total || 0)) || mrr;

      // Total Revenue Last Month (for comparison)
      const lastMonthRevenue = await db!.select({
        total: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)`
      }).from(schema.gymInvoices).where(and(
        eq(schema.gymInvoices.month, lastMonth),
        eq(schema.gymInvoices.year, lastMonthYear),
        eq(schema.gymInvoices.status, 'paid')
      ));
      const revenuePrevMonth = parseFloat(String(lastMonthRevenue[0]?.total || 0));

      // Revenue growth percentage
      const revenueGrowth = revenuePrevMonth > 0 
        ? ((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100 
        : (revenueThisMonth > 0 ? 100 : 0);

      // Total Revenue All Time (lifetime)
      const allTimeRevenue = await db!.select({
        total: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)`
      }).from(schema.gymInvoices).where(eq(schema.gymInvoices.status, 'paid'));
      const totalRevenueAllTime = parseFloat(String(allTimeRevenue[0]?.total || 0));

      // Upcoming Revenue (Next 30 Days) - based on active memberships renewing
      const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      let upcomingRevenue = 0;

      for (const gym of activeGyms) {
        const renewingMembers = await db!.select({ count: sql<number>`count(*)` })
          .from(schema.memberships)
          .where(and(
            eq(schema.memberships.gymId, gym.id),
            eq(schema.memberships.status, 'active'),
            gte(schema.memberships.endDate, now),
            lte(schema.memberships.endDate, next30Days)
          ));

        const count = Number(renewingMembers[0]?.count || 0);
        const rate = parseFloat(gym.ratePerMember || '75');
        upcomingRevenue += count * rate;
      }

      // If no upcoming renewals calculated, estimate based on MRR
      if (upcomingRevenue === 0) {
        upcomingRevenue = mrr;
      }

      // 6-month sparkline data for revenue trend
      const sparklineData = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthNum = month.getMonth() + 1;
        const year = month.getFullYear();

        const monthRevenue = await db!.select({
          total: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)`
        }).from(schema.gymInvoices).where(and(
          eq(schema.gymInvoices.month, monthNum),
          eq(schema.gymInvoices.year, year)
        ));

        sparklineData.push({
          month: month.toLocaleString('default', { month: 'short' }),
          value: parseFloat(String(monthRevenue[0]?.total || 0))
        });
      }

      res.json({
        revenueThisMonth: {
          value: revenueThisMonth > 0 ? revenueThisMonth : mrr,
          growth: Math.round(revenueGrowth * 100) / 100,
          sparkline: sparklineData
        },
        revenueAllTime: {
          value: totalRevenueAllTime > 0 ? totalRevenueAllTime : mrr
        },
        mrr: {
          value: mrr,
          formula: `${totalActiveMembers} members × avg rate`
        },
        arr: {
          value: arr,
          formula: 'MRR × 12'
        },
        upcomingRevenue: {
          value: upcomingRevenue,
          period: 'Next 30 days'
        }
      });
    } catch (error: any) {
      console.error('Error fetching revenue KPIs:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Platform KPIs endpoint
  app.get('/api/superadmin/kpis/platform', requireRole('superadmin'), async (req, res) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Use Supabase fallback if db is not available
      if (!isDbAvailable()) {
        const allGyms = await supabaseRepo.getAllGyms();
        const activeGyms = allGyms.filter(g => g.status === 'active').length;
        const suspendedGyms = allGyms.filter(g => g.status === 'suspended').length;
        const pendingGyms = allGyms.filter(g => g.status === 'pending').length;

        const memberCount = await supabaseRepo.getMembersCount();
        const activeMemberCount = await supabaseRepo.getActiveMembershipsCount();

        const newGymsThisMonth = allGyms.filter(g => {
          const createdAt = g.created_at ? new Date(g.created_at) : null;
          return createdAt && createdAt >= startOfMonth;
        }).length;

        const newGymsLastMonth = allGyms.filter(g => {
          const createdAt = g.created_at ? new Date(g.created_at) : null;
          return createdAt && createdAt >= startOfLastMonth && createdAt <= endOfLastMonth;
        }).length;

        const gymGrowth = newGymsLastMonth > 0 
          ? ((newGymsThisMonth - newGymsLastMonth) / newGymsLastMonth) * 100 
          : (newGymsThisMonth > 0 ? 100 : 0);

        const gymSparkline = [];
        for (let i = 5; i >= 0; i--) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

          const gymsInMonth = allGyms.filter(g => {
            const createdAt = g.created_at ? new Date(g.created_at) : null;
            return createdAt && createdAt >= monthStart && createdAt <= monthEnd;
          }).length;

          gymSparkline.push({
            month: monthStart.toLocaleString('default', { month: 'short' }),
            value: gymsInMonth
          });
        }

        return res.json({
          totalGyms: {
            value: allGyms.length,
            breakdown: {
              active: activeGyms,
              suspended: suspendedGyms,
              pending: pendingGyms
            }
          },
          activeGyms: {
            value: activeGyms,
            label: 'Paying gyms'
          },
          totalMembers: {
            value: memberCount,
            activeMembers: activeMemberCount
          },
          newGymsThisMonth: {
            value: newGymsThisMonth,
            growth: Math.round(gymGrowth * 100) / 100,
            sparkline: gymSparkline
          }
        });
      }

      // Get all gyms
      const allGyms = await db!.select().from(schema.gyms);

      // Gym status breakdown
      const activeGyms = allGyms.filter(g => g.status === 'active').length;
      const suspendedGyms = allGyms.filter(g => g.status === 'suspended').length;
      const pendingGyms = allGyms.filter(g => g.status === 'pending').length;

      // Total members on platform
      const totalMembers = await db!.select({ count: sql<number>`count(*)` })
        .from(schema.members);
      const memberCount = Number(totalMembers[0]?.count || 0);

      // Active members (with active memberships)
      const activeMembers = await db!.select({ count: sql<number>`count(DISTINCT member_id)` })
        .from(schema.memberships)
        .where(and(
          eq(schema.memberships.status, 'active'),
          gte(schema.memberships.endDate, now)
        ));
      const activeMemberCount = Number(activeMembers[0]?.count || 0);

      // New gyms this month
      const newGymsThisMonth = allGyms.filter(g => {
        const createdAt = g.createdAt ? new Date(g.createdAt) : null;
        return createdAt && createdAt >= startOfMonth;
      }).length;

      // New gyms last month (for comparison)
      const newGymsLastMonth = allGyms.filter(g => {
        const createdAt = g.createdAt ? new Date(g.createdAt) : null;
        return createdAt && createdAt >= startOfLastMonth && createdAt <= endOfLastMonth;
      }).length;

      // Gym growth percentage
      const gymGrowth = newGymsLastMonth > 0 
        ? ((newGymsThisMonth - newGymsLastMonth) / newGymsLastMonth) * 100 
        : (newGymsThisMonth > 0 ? 100 : 0);

      // 6-month gym growth sparkline
      const gymSparkline = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const gymsInMonth = allGyms.filter(g => {
          const createdAt = g.createdAt ? new Date(g.createdAt) : null;
          return createdAt && createdAt >= monthStart && createdAt <= monthEnd;
        }).length;

        gymSparkline.push({
          month: monthStart.toLocaleString('default', { month: 'short' }),
          value: gymsInMonth
        });
      }

      res.json({
        totalGyms: {
          value: allGyms.length,
          breakdown: {
            active: activeGyms,
            suspended: suspendedGyms,
            pending: pendingGyms
          }
        },
        activeGyms: {
          value: activeGyms,
          label: 'Paying gyms'
        },
        totalMembers: {
          value: memberCount,
          activeMembers: activeMemberCount
        },
        newGymsThisMonth: {
          value: newGymsThisMonth,
          growth: Math.round(gymGrowth * 100) / 100,
          sparkline: gymSparkline
        }
      });
    } catch (error: any) {
      console.error('Error fetching platform KPIs:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Trends endpoint (for detailed sparklines and charts)
  app.get('/api/superadmin/kpis/trends', requireRole('superadmin'), async (req, res) => {
    try {
      const now = new Date();
      const months = parseInt(req.query.months as string) || 6;

      // Use Supabase fallback if db is not available
      if (!isDbAvailable()) {
        const allGyms = await supabaseRepo.getAllGyms();
        const invoices = await supabaseRepo.getGymInvoices();

        const revenueTrend = [];
        for (let i = months - 1; i >= 0; i--) {
          const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthNum = month.getMonth() + 1;
          const year = month.getFullYear();

          const monthInvoices = invoices.filter(inv => inv.month === monthNum && inv.year === year);
          const billed = monthInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || '0'), 0);
          const collected = monthInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + parseFloat(inv.total_amount || '0'), 0);

          revenueTrend.push({
            month: month.toLocaleString('default', { month: 'short' }),
            year,
            billed,
            collected
          });
        }

        const memberTrend = [];
        for (let i = months - 1; i >= 0; i--) {
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
          memberTrend.push({
            month: monthEnd.toLocaleString('default', { month: 'short' }),
            value: 0
          });
        }

        const gymTrend = [];
        for (let i = months - 1; i >= 0; i--) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

          const newGyms = allGyms.filter(g => {
            const createdAt = g.created_at ? new Date(g.created_at) : null;
            return createdAt && createdAt >= monthStart && createdAt <= monthEnd;
          }).length;

          const totalToDate = allGyms.filter(g => {
            const createdAt = g.created_at ? new Date(g.created_at) : null;
            return createdAt && createdAt <= monthEnd;
          }).length;

          gymTrend.push({
            month: monthStart.toLocaleString('default', { month: 'short' }),
            newGyms,
            totalGyms: totalToDate
          });
        }

        return res.json({
          revenueTrend,
          memberTrend,
          gymTrend
        });
      }

      // Revenue trend
      const revenueTrend = [];
      for (let i = months - 1; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthNum = month.getMonth() + 1;
        const year = month.getFullYear();

        const monthRevenue = await db!.select({
          total: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL)), 0)`,
          paid: sql<number>`COALESCE(SUM(CASE WHEN status = 'paid' THEN CAST(total_amount AS DECIMAL) ELSE 0 END), 0)`
        }).from(schema.gymInvoices).where(and(
          eq(schema.gymInvoices.month, monthNum),
          eq(schema.gymInvoices.year, year)
        ));

        revenueTrend.push({
          month: month.toLocaleString('default', { month: 'short' }),
          year,
          billed: parseFloat(String(monthRevenue[0]?.total || 0)),
          collected: parseFloat(String(monthRevenue[0]?.paid || 0))
        });
      }

      // Member growth trend
      const allGyms = await db!.select().from(schema.gyms);
      const memberTrend = [];

      for (let i = months - 1; i >= 0; i--) {
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        // Count active memberships at end of each month
        const activeAtMonth = await db!.select({ count: sql<number>`count(DISTINCT member_id)` })
          .from(schema.memberships)
          .where(and(
            eq(schema.memberships.status, 'active'),
            lte(schema.memberships.startDate, monthEnd),
            gte(schema.memberships.endDate, monthEnd)
          ));

        memberTrend.push({
          month: monthEnd.toLocaleString('default', { month: 'short' }),
          value: Number(activeAtMonth[0]?.count || 0)
        });
      }

      // Gym acquisition trend
      const gymTrend = [];
      for (let i = months - 1; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const newGyms = allGyms.filter(g => {
          const createdAt = g.createdAt ? new Date(g.createdAt) : null;
          return createdAt && createdAt >= monthStart && createdAt <= monthEnd;
        }).length;

        const totalToDate = allGyms.filter(g => {
          const createdAt = g.createdAt ? new Date(g.createdAt) : null;
          return createdAt && createdAt <= monthEnd;
        }).length;

        gymTrend.push({
          month: monthStart.toLocaleString('default', { month: 'short' }),
          newGyms,
          totalGyms: totalToDate
        });
      }

      res.json({
        revenueTrend,
        memberTrend,
        gymTrend
      });
    } catch (error: any) {
      console.error('Error fetching KPI trends:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // END SUPERADMIN KPI ENDPOINTS
  // ==========================================

  // Security Audit for Super Admin - functional user errors only
  app.get('/api/superadmin/security-audit', requireRole('superadmin'), async (req, res) => {
    try {
      const logs = await getSecurityAuditLogs();
      res.json(logs);
    } catch (error: any) {
      console.error('Error fetching security audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch security audit logs' });
    }
  });

  // Manual cleanup of expired security audit logs
  app.post('/api/superadmin/security-audit/cleanup', requireRole('superadmin'), async (req, res) => {
    try {
      const deletedCount = await cleanupExpiredLogs();
      res.json({ success: true, deletedCount });
    } catch (error: any) {
      console.error('Error cleaning up security audit logs:', error);
      res.status(500).json({ error: 'Failed to cleanup logs' });
    }
  });

  // ==========================================
  // SUPERADMIN PROFILE & USER MANAGEMENT
  // ==========================================

  // Update superadmin profile
  app.put('/api/superadmin/profile', requireRole('superadmin'), async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { name, email, phone } = req.body;

      if (!name || name.length < 2) {
        return res.status(400).json({ error: 'Name must be at least 2 characters' });
      }

      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Please enter a valid email' });
      }

      // Check if email is taken by another user
      const existingUser = await supabaseRepo.getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Email is already in use by another account' });
      }

      // Update user in database
      const { error } = await supabase
        .from('users')
        .update({ name, email, phone: phone || null })
        .eq('id', userId);

      if (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({ error: 'Failed to update profile' });
      }

      const updatedUser = await supabaseRepo.getUserById(userId);
      res.json({ 
        message: 'Profile updated successfully',
        user: {
          id: updatedUser?.id,
          name: updatedUser?.name,
          email: updatedUser?.email,
          phone: updatedUser?.phone,
          role: updatedUser?.role,
        }
      });
    } catch (error: any) {
      console.error('Error updating superadmin profile:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Upload superadmin profile image
  app.post('/api/superadmin/profile/upload-image', requireRole('superadmin'), async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { base64Image } = req.body;

      if (!base64Image) {
        return res.status(400).json({ error: 'Base64 image data is required' });
      }

      // Validate base64 image format
      if (!base64Image.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format. Please upload a valid image file.' });
      }

      // Check image size (max 2MB)
      const sizeInBytes = (base64Image.length * 3) / 4;
      if (sizeInBytes > 2 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image too large. Please upload an image smaller than 2MB.' });
      }

      // Extract base64 data and image type
      const matches = base64Image.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: 'Invalid base64 image format' });
      }

      const [, imageType, base64Data] = matches;
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `profile-${userId}-${Date.now()}.${imageType}`;

      let profileImageUrl: string;

      // Try to upload to Supabase storage using admin client
      if (supabaseAdmin) {
        try {
          const { data, error } = await supabaseAdmin.storage
            .from('profile-images')
            .upload(fileName, buffer, {
              contentType: `image/${imageType}`,
              upsert: true,
            });

          if (error) {
            // If bucket doesn't exist, create it and retry
            if (error.message.includes('Bucket not found') || error.message.includes('not found')) {
              console.log('[profile-upload] Bucket not found, creating...');
              const { error: createError } = await supabaseAdmin.storage.createBucket('profile-images', {
                public: true,
                fileSizeLimit: 2 * 1024 * 1024,
              });
              
              if (createError && !createError.message.includes('already exists')) {
                console.error('[profile-upload] Failed to create bucket:', createError);
                throw createError;
              }

              // Retry upload
              const { data: retryData, error: retryError } = await supabaseAdmin.storage
                .from('profile-images')
                .upload(fileName, buffer, {
                  contentType: `image/${imageType}`,
                  upsert: true,
                });

              if (retryError) {
                console.error('[profile-upload] Retry upload failed:', retryError);
                throw retryError;
              }
            } else {
              throw error;
            }
          }

          // Get public URL
          const { data: urlData } = supabaseAdmin.storage
            .from('profile-images')
            .getPublicUrl(fileName);

          profileImageUrl = urlData.publicUrl;
          console.log(`[profile-upload] ✅ Uploaded to Supabase storage: ${profileImageUrl}`);
        } catch (storageError: any) {
          console.error('[profile-upload] ❌ Supabase storage failed, using base64:', storageError.message);
          profileImageUrl = base64Image;
        }
      } else {
        console.log('[profile-upload] ⚠️ No Supabase admin client, using base64 storage');
        profileImageUrl = base64Image;
      }

      // Update user profile with new image URL
      const { error } = await supabase
        .from('users')
        .update({ profile_image_url: profileImageUrl })
        .eq('id', userId);

      if (error) {
        console.error('Error updating profile image:', error);
        return res.status(500).json({ error: 'Failed to update profile image' });
      }

      const updatedUser = await supabaseRepo.getUserById(userId);
      res.json({ 
        message: 'Profile image uploaded successfully',
        profileImageUrl,
        user: {
          id: updatedUser?.id,
          name: updatedUser?.name,
          email: updatedUser?.email,
          phone: updatedUser?.phone,
          role: updatedUser?.role,
          profileImageUrl: updatedUser?.profile_image_url,
        }
      });
    } catch (error: any) {
      console.error('Error uploading profile image:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update superadmin password
  app.put('/api/superadmin/password', requireRole('superadmin'), async (req, res) => {
    try {
      const userId = req.session!.userId!;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }

      // Get current user
      const user = await supabaseRepo.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      const { error } = await supabase
        .from('users')
        .update({ password_hash: newPasswordHash })
        .eq('id', userId);

      if (error) {
        console.error('Error updating password:', error);
        return res.status(500).json({ error: 'Failed to update password' });
      }

      res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
      console.error('Error updating superadmin password:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all superadmin users
  app.get('/api/superadmin/users', requireRole('superadmin'), async (req, res) => {
    try {
      const { data: superadmins, error } = await supabase
        .from('users')
        .select('id, name, email, phone, is_active, is_otp_verified, created_at, last_login')
        .eq('role', 'superadmin')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching superadmins:', error);
        return res.status(500).json({ error: 'Failed to fetch superadmins' });
      }

      const formattedSuperadmins = superadmins.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        isActive: u.is_active,
        isOtpVerified: u.is_otp_verified,
        createdAt: u.created_at,
        lastLogin: u.last_login,
      }));

      res.json(formattedSuperadmins);
    } catch (error: any) {
      console.error('Error fetching superadmin users:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create new superadmin user
  app.post('/api/superadmin/users', requireRole('superadmin'), async (req, res) => {
    try {
      const { name, email, phone, password } = req.body;

      if (!name || name.length < 2) {
        return res.status(400).json({ error: 'Name must be at least 2 characters' });
      }

      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Please enter a valid email' });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Check if email is already taken
      const existingUser = await supabaseRepo.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already registered' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create new superadmin user
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          id: crypto.randomUUID(),
          name,
          email,
          phone: phone || null,
          password_hash: passwordHash,
          role: 'superadmin',
          is_active: 1,
          is_otp_verified: 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating superadmin:', error);
        return res.status(500).json({ error: 'Failed to create superadmin' });
      }

      res.json({ 
        message: 'Superadmin created successfully',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
        }
      });
    } catch (error: any) {
      console.error('Error creating superadmin user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete superadmin user
  app.delete('/api/superadmin/users/:id', requireRole('superadmin'), async (req, res) => {
    try {
      const userIdToDelete = req.params.id;
      const currentUserId = req.session!.userId!;

      // Prevent self-deletion
      if (userIdToDelete === currentUserId) {
        return res.status(400).json({ error: 'You cannot delete your own account' });
      }

      // Check if user exists and is a superadmin
      const userToDelete = await supabaseRepo.getUserById(userIdToDelete);
      if (!userToDelete) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (userToDelete.role !== 'superadmin') {
        return res.status(400).json({ error: 'This user is not a superadmin' });
      }

      // Check if there would be at least one superadmin left
      const { data: superadmins, error: countError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'superadmin');

      if (countError) {
        console.error('Error counting superadmins:', countError);
        return res.status(500).json({ error: 'Failed to verify superadmin count' });
      }

      const superadminCount = superadmins?.length || 0;
      if (superadminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last superadmin account' });
      }

      // Delete the user
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userIdToDelete);

      if (error) {
        console.error('Error deleting superadmin:', error);
        return res.status(500).json({ error: 'Failed to delete superadmin' });
      }

      res.json({ message: 'Superadmin deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting superadmin user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // END SUPERADMIN PROFILE & USER MANAGEMENT
  // ==========================================

  app.get('/api/members', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const user = await userAccess.getUserById(req.session!.userId!);
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      let gymId: string | null = null;
      if (isDbAvailable()) {
        if (user.role === 'admin') {
          const gymAdmin = await db!.select().from(schema.gymAdmins).where(eq(schema.gymAdmins.userId, user.id)).limit(1).then(rows => rows[0]);
          gymId = gymAdmin?.gymId || null;
        } else if (user.role === 'trainer') {
          const trainer = await db!.select().from(schema.trainers).where(eq(schema.trainers.userId, user.id)).limit(1).then(rows => rows[0]);
          gymId = trainer?.gymId || null;
        }
      } else {
        gymId = await supabaseRepo.getGymIdForUser(user.id, user.role);
      }

      if (!gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      if (!isDbAvailable()) {
        return res.json([]);
      }

      const filters = {
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
      };

      const members = await storage.listMembers(gymId, filters);
      res.json(members);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/members/:id', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const member = await db!.select().from(schema.members).where(eq(schema.members.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && member.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this member' });
      }

      res.json(member);
    } catch (error: any) {
      console.error(`Error fetching member ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/members', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const { password, dateOfBirth, planId, ...memberFields } = req.body;

      if (!password) {
        return res.status(400).json({ error: 'Password is required for new members' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      }

      const memberDataToValidate = {
        ...memberFields,
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) })
      };

      const validationResult = insertMemberSchema.safeParse(memberDataToValidate);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      const existingUser = await db!.select().from(schema.users).where(eq(schema.users.email, validationResult.data.email)).limit(1).then(rows => rows[0]);

      if (existingUser) {
        return res.status(400).json({ error: 'A user with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = await db!.insert(schema.users).values({
        email: validationResult.data.email,
        passwordHash: passwordHash,
        role: 'member',
        name: validationResult.data.name,
        phone: validationResult.data.phone,
        isActive: 1
      }).returning().then(rows => rows[0]);

      try {
        const member = await db!.insert(schema.members).values({
          userId: newUser.id,
          gymId: user.gymId,
          name: validationResult.data.name,
          email: validationResult.data.email,
          phone: validationResult.data.phone,
          status: validationResult.data.status || 'active',
          address: validationResult.data.address || null,
          photoUrl: validationResult.data.photoUrl || null,
          dateOfBirth: validationResult.data.dateOfBirth || null,
          gender: validationResult.data.gender || null,
          dateOfJoining: validationResult.data.dateOfJoining || null,
          paymentFinalAmount: validationResult.data.paymentFinalAmount ? String(validationResult.data.paymentFinalAmount) : null,
          paymentPaidAmount: validationResult.data.paymentPaidAmount ? String(validationResult.data.paymentPaidAmount) : null,
          paymentMethod: validationResult.data.paymentMethod || null,
          transactionDate: validationResult.data.transactionDate || null,
        }).returning().then(rows => rows[0]);

        const gym = await db!.select().from(schema.gyms).where(eq(schema.gyms.id, user.gymId)).limit(1).then(rows => rows[0]);
        const gymName = gym?.name || 'Your Gym';

        const memberPortalUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}/login`
          : 'https://gymsaathi.com/login';

        sendMemberWelcomeEmail({
          gymName: gymName,
          memberName: validationResult.data.name,
          memberEmail: validationResult.data.email,
          tempPassword: password,
          memberPortalUrl: memberPortalUrl,
        }).catch(err => console.error('[notification] Failed to send member welcome email:', err));

        sendMemberWelcomeWhatsApp({
          phoneNumber: validationResult.data.phone || '',
          gymName: gymName,
          personName: validationResult.data.name,
          portalUrl: memberPortalUrl,
          email: validationResult.data.email,
          tempPassword: password,
        }).catch(err => console.error('[notification] Failed to send member welcome WhatsApp:', err));

        let membership = null;
        if (planId && planId !== 'no-plan') {
          const plan = await db!.select().from(schema.membershipPlans)
            .where(and(
              eq(schema.membershipPlans.id, planId),
              eq(schema.membershipPlans.gymId, user.gymId),
              eq(schema.membershipPlans.isActive, 1)
            ))
            .limit(1).then(rows => rows[0]);

          if (plan) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + plan.duration);

            membership = await db!.insert(schema.memberships).values({
              memberId: member.id,
              planId: plan.id,
              gymId: user.gymId,
              startDate,
              endDate,
              status: 'active',
              autoRenew: 0,
            }).returning().then(rows => rows[0]);
          }
        }

        await auditService.logMemberCreated(req, user.id, user.name || 'Admin', validationResult.data.name, gymName);

        res.status(201).json({ 
          member, 
          membership,
          message: 'Member and login account created successfully',
          email: validationResult.data.email 
        });
      } catch (memberError: any) {
        console.error('Member creation failed, rolling back user creation:', memberError);
        await db!.delete(schema.users).where(eq(schema.users.id, newUser.id));
        throw new Error(`Failed to create member: ${memberError.message}`);
      }
    } catch (error: any) {
      console.error('Error creating member:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/members/:id', requireRole('admin'), async (req, res) => {
    try {
      const existingMember = await db!.select().from(schema.members).where(eq(schema.members.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!existingMember) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && existingMember.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this member' });
      }

      const { dateOfBirth, planId, ...otherFields } = req.body;

      const memberDataToValidate = {
        ...otherFields,
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) })
      };

      const validationResult = insertMemberSchema.partial().safeParse(memberDataToValidate);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      const updatedMember = await db!.update(schema.members).set(validationResult.data).where(eq(schema.members.id, req.params.id)).returning().then(rows => rows[0]);

      let membership = null;
      if (planId !== undefined) {
        if (planId === 'no-plan' || planId === '') {
          await db!.update(schema.memberships)
            .set({ status: 'cancelled' })
            .where(and(
              eq(schema.memberships.memberId, req.params.id),
              eq(schema.memberships.status, 'active')
            ));
        } else {
          const plan = await db!.select().from(schema.membershipPlans)
            .where(and(
              eq(schema.membershipPlans.id, planId),
              eq(schema.membershipPlans.gymId, existingMember.gymId),
              eq(schema.membershipPlans.isActive, 1)
            ))
            .limit(1).then(rows => rows[0]);

          if (plan) {
            await db!.update(schema.memberships)
              .set({ status: 'cancelled' })
              .where(and(
                eq(schema.memberships.memberId, req.params.id),
                eq(schema.memberships.status, 'active')
              ));

            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + plan.duration);

            membership = await db!.insert(schema.memberships).values({
              memberId: req.params.id,
              planId: plan.id,
              gymId: existingMember.gymId,
              startDate,
              endDate,
              status: 'active',
              autoRenew: 0,
            }).returning().then(rows => rows[0]);
          }
        }
      }

      res.json({ ...updatedMember, membership });
    } catch (error: any) {
      console.error(`Error updating member ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/members/:id/membership', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const membership = await db!.select().from(schema.memberships)
        .where(and(
          eq(schema.memberships.memberId, req.params.id),
          eq(schema.memberships.gymId, user.gymId),
          eq(schema.memberships.status, 'active')
        ))
        .orderBy(desc(schema.memberships.createdAt))
        .limit(1).then(rows => rows[0]);

      if (!membership) {
        return res.json(null);
      }

      res.json(membership);
    } catch (error: any) {
      console.error(`Error fetching membership for member ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/members/:id', requireRole('admin'), async (req, res) => {
    try {
      const existingMember = await db!.select().from(schema.members).where(eq(schema.members.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!existingMember) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && existingMember.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this member' });
      }

      await db!.delete(schema.members).where(eq(schema.members.id, req.params.id));
      res.status(204).send();
    } catch (error: any) {
      console.error(`Error deleting member ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/membership-plans', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const plans = await db!.select().from(schema.membershipPlans).where(eq(schema.membershipPlans.gymId, user.gymId));
      res.json(plans);
    } catch (error: any) {
      console.error('Error fetching membership plans:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/membership-plans', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const { name, description, price, duration, durationType, features, isActive } = req.body;

      let durationInDays = duration;
      if (durationType === 'months') {
        durationInDays = duration * 30;
      } else if (durationType === 'years') {
        durationInDays = duration * 365;
      }

      const plan = await db!.insert(schema.membershipPlans).values({
        name,
        description,
        price: String(price),
        duration: durationInDays,
        features: features ? JSON.stringify(features) : null,
        isActive: isActive !== undefined ? (isActive ? 1 : 0) : 1,
        gymId: user.gymId,
      }).returning().then(rows => rows[0]);

      res.status(201).json(plan);
    } catch (error: any) {
      console.error('Error creating membership plan:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/membership-plans/:id', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const existingPlan = await db!.select().from(schema.membershipPlans)
        .where(eq(schema.membershipPlans.id, req.params.id))
        .limit(1).then(rows => rows[0]);

      if (!existingPlan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      if (existingPlan.gymId !== user.gymId) {
        return res.status(403).json({ error: 'Access denied to this plan' });
      }

      const { name, description, price, duration, durationType, features, isActive } = req.body;

      let durationInDays = duration;
      if (durationType === 'months') {
        durationInDays = duration * 30;
      } else if (durationType === 'years') {
        durationInDays = duration * 365;
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = String(price);
      if (duration !== undefined) updateData.duration = durationInDays;
      if (features !== undefined) updateData.features = features ? JSON.stringify(features) : null;
      if (isActive !== undefined) updateData.isActive = isActive ? 1 : 0;

      const updatedPlan = await db!.update(schema.membershipPlans)
        .set(updateData)
        .where(eq(schema.membershipPlans.id, req.params.id))
        .returning().then(rows => rows[0]);

      res.json(updatedPlan);
    } catch (error: any) {
      console.error('Error updating membership plan:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/membership-plans/:id', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const existingPlan = await db!.select().from(schema.membershipPlans)
        .where(eq(schema.membershipPlans.id, req.params.id))
        .limit(1).then(rows => rows[0]);

      if (!existingPlan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      if (existingPlan.gymId !== user.gymId) {
        return res.status(403).json({ error: 'Access denied to this plan' });
      }

      await db!.delete(schema.membershipPlans).where(eq(schema.membershipPlans.id, req.params.id));
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting membership plan:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/memberships', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const membership = await db!.insert(schema.memberships).values({
        ...req.body,
        gymId: user.gymId,
      }).returning().then(rows => rows[0]);

      res.status(201).json(membership);
    } catch (error: any) {
      console.error('Error creating membership:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/members/:id/memberships', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const member = await db!.select().from(schema.members).where(eq(schema.members.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && member.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this member' });
      }

      const memberships = await db!.select().from(schema.memberships).where(eq(schema.memberships.memberId, req.params.id));
      res.json(memberships);
    } catch (error: any) {
      console.error(`Error fetching memberships for member ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============= ADMIN DASHBOARD API =============
  app.get('/api/admin/dashboard', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const user = await userAccess.getUserById(req.session!.userId!);
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      // Get gym ID for the user
      let gymId: string | null = null;
      if (isDbAvailable()) {
        if (user.role === 'admin') {
          const gymAdmin = await db!.select().from(schema.gymAdmins).where(eq(schema.gymAdmins.userId, user.id)).limit(1).then(rows => rows[0]);
          gymId = gymAdmin?.gymId || null;
        } else if (user.role === 'trainer') {
          const trainer = await db!.select().from(schema.trainers).where(eq(schema.trainers.userId, user.id)).limit(1).then(rows => rows[0]);
          gymId = trainer?.gymId || null;
        }
      } else {
        gymId = await supabaseRepo.getGymIdForUser(user.id, user.role);
      }

      if (!gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      // If database is not available, return fallback dashboard data
      if (!isDbAvailable()) {
        console.log('Database not available, returning fallback dashboard data');
        return res.json({
          kpis: {
            activeMembers: 0,
            newMembersThisMonth: 0,
            revenueThisMonth: 0,
            revenueChangePercent: 0,
            pendingDues: 0,
            membersWithDues: 0,
            todayCheckIns: 0,
            todayCheckOuts: 0
          },
          upcomingRenewals: [],
          recentActivity: [],
          memberStatusDistribution: { active: 0, expired: 0, pending: 0 },
          membershipTypeDistribution: [],
          checkInTrend: [],
          revenueTrend: [],
          gymInfo: { 
            name: 'Loading...',
            logoUrl: null
          },
          _note: 'Using fallback data - database unavailable'
        });
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      const next15Days = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Convert to ISO strings for SQL queries
      const nowStr = now.toISOString();
      const todayStr = today.toISOString();
      const tomorrowStr = tomorrow.toISOString();
      const yesterdayStr = yesterday.toISOString();
      const startOfMonthStr = startOfMonth.toISOString();
      const startOfLastMonthStr = startOfLastMonth.toISOString();
      const endOfLastMonthStr = endOfLastMonth.toISOString();
      const next15DaysStr = next15Days.toISOString();
      const sevenDaysAgoStr = sevenDaysAgo.toISOString();

      // KPIs: Active Members
      const activeMembers = await db!.select({ count: sql<number>`count(DISTINCT ${schema.memberships.memberId})` })
        .from(schema.memberships)
        .where(and(
          eq(schema.memberships.gymId, gymId),
          eq(schema.memberships.status, 'active'),
          sql`${schema.memberships.endDate} >= ${nowStr}::timestamp`
        ));
      const activeMemberCount = Number(activeMembers[0]?.count || 0);

      // New members this month
      const newMembersThisMonth = await db!.select({ count: sql<number>`count(*)` })
        .from(schema.members)
        .where(and(
          eq(schema.members.gymId, gymId),
          sql`${schema.members.createdAt} >= ${startOfMonthStr}::timestamp`
        ));
      const newMemberCount = Number(newMembersThisMonth[0]?.count || 0);

      // Revenue this month
      const revenueThisMonth = await db!.select({
        total: sql<number>`COALESCE(SUM(CAST(${schema.payments.amount} AS DECIMAL)), 0)`
      })
        .from(schema.payments)
        .where(and(
          eq(schema.payments.gymId, gymId),
          eq(schema.payments.status, 'paid'),
          sql`${schema.payments.paymentDate} >= ${startOfMonthStr}::timestamp`
        ));
      const revenueThisMonthValue = parseFloat(String(revenueThisMonth[0]?.total || 0));

      // Revenue last month (for comparison)
      const revenueLastMonth = await db!.select({
        total: sql<number>`COALESCE(SUM(CAST(${schema.payments.amount} AS DECIMAL)), 0)`
      })
        .from(schema.payments)
        .where(and(
          eq(schema.payments.gymId, gymId),
          eq(schema.payments.status, 'paid'),
          sql`${schema.payments.paymentDate} >= ${startOfLastMonthStr}::timestamp`,
          sql`${schema.payments.paymentDate} <= ${endOfLastMonthStr}::timestamp`
        ));
      const revenueLastMonthValue = parseFloat(String(revenueLastMonth[0]?.total || 0));
      const revenueChangePercent = revenueLastMonthValue > 0 
        ? ((revenueThisMonthValue - revenueLastMonthValue) / revenueLastMonthValue) * 100 
        : (revenueThisMonthValue > 0 ? 100 : 0);

      // Pending dues - only count pending or partially_paid payments, not paid ones
      const pendingDues = await db!.select({
        total: sql<number>`COALESCE(SUM(CAST(${schema.payments.amountDue} AS DECIMAL)), 0)`,
        count: sql<number>`count(DISTINCT ${schema.payments.memberId})`
      })
        .from(schema.payments)
        .where(and(
          eq(schema.payments.gymId, gymId),
          sql`CAST(${schema.payments.amountDue} AS DECIMAL) > 0`,
          sql`${schema.payments.status} IN ('pending', 'partially_paid')`
        ));
      const pendingDuesAmount = parseFloat(String(pendingDues[0]?.total || 0));
      const pendingDuesMembers = Number(pendingDues[0]?.count || 0);

      // Leads in pipeline
      const leadsInPipeline = await db!.select({ count: sql<number>`count(*)` })
        .from(schema.leads)
        .where(and(
          eq(schema.leads.gymId, gymId),
          sql`${schema.leads.status} IN ('new', 'contacted', 'interested')`
        ));
      const leadsCount = Number(leadsInPipeline[0]?.count || 0);

      // Follow-ups today
      const followupsToday = await db!.select({ count: sql<number>`count(*)` })
        .from(schema.leads)
        .where(and(
          eq(schema.leads.gymId, gymId),
          sql`${schema.leads.followUpDate} >= ${todayStr}::timestamp`,
          sql`${schema.leads.followUpDate} < ${tomorrowStr}::timestamp`
        ));
      const followupsTodayCount = Number(followupsToday[0]?.count || 0);

      // Today's check-ins
      const todaysCheckins = await db!.select({ count: sql<number>`count(*)` })
        .from(schema.attendance)
        .where(and(
          eq(schema.attendance.gymId, gymId),
          sql`${schema.attendance.checkInTime} >= ${todayStr}::timestamp`
        ));
      const todaysCheckinsCount = Number(todaysCheckins[0]?.count || 0);

      // Yesterday's check-ins
      const yesterdaysCheckins = await db!.select({ count: sql<number>`count(*)` })
        .from(schema.attendance)
        .where(and(
          eq(schema.attendance.gymId, gymId),
          sql`${schema.attendance.checkInTime} >= ${yesterdayStr}::timestamp`,
          sql`${schema.attendance.checkInTime} < ${todayStr}::timestamp`
        ));
      const yesterdaysCheckinsCount = Number(yesterdaysCheckins[0]?.count || 0);

      // Today's Classes Summary
      const todaysClasses = await db!.select()
        .from(schema.classes)
        .where(and(
          eq(schema.classes.gymId, gymId),
          sql`${schema.classes.startTime} >= ${todayStr}::timestamp`,
          sql`${schema.classes.startTime} < ${tomorrowStr}::timestamp`
        ));

      const classesTotal = todaysClasses.length;
      const classesCompleted = todaysClasses.filter(c => c.status === 'completed').length;
      const classesOngoing = todaysClasses.filter(c => c.status === 'ongoing').length;
      const classesUpcoming = todaysClasses.filter(c => c.status === 'scheduled').length;

      // Today's Collections by method
      const todayPayments = await db!.select({
        total: sql<number>`COALESCE(SUM(CAST(${schema.payments.amount} AS DECIMAL)), 0)`,
        paymentType: schema.payments.paymentType
      })
        .from(schema.payments)
        .where(and(
          eq(schema.payments.gymId, gymId),
          eq(schema.payments.status, 'paid'),
          sql`${schema.payments.paymentDate} >= ${todayStr}::timestamp`
        ))
        .groupBy(schema.payments.paymentType);

      const collectionsToday = {
        total: todayPayments.reduce((sum, p) => sum + parseFloat(String(p.total || 0)), 0),
        byMethod: {
          cash: parseFloat(String(todayPayments.find(p => p.paymentType === 'cash')?.total || 0)),
          upi: parseFloat(String(todayPayments.find(p => p.paymentType === 'upi')?.total || 0)),
          card: parseFloat(String(todayPayments.find(p => p.paymentType === 'card')?.total || 0)),
          razorpay: parseFloat(String(todayPayments.find(p => p.paymentType === 'razorpay')?.total || 0)),
          bank_transfer: parseFloat(String(todayPayments.find(p => p.paymentType === 'bank_transfer')?.total || 0)),
        }
      };

      // Expiring Soon (next 15 days)
      const expiringSoon = await db!.select({
        membership: schema.memberships,
        member: schema.members,
        plan: schema.membershipPlans
      })
        .from(schema.memberships)
        .leftJoin(schema.members, eq(schema.memberships.memberId, schema.members.id))
        .leftJoin(schema.membershipPlans, eq(schema.memberships.planId, schema.membershipPlans.id))
        .where(and(
          eq(schema.memberships.gymId, gymId),
          eq(schema.memberships.status, 'active'),
          sql`${schema.memberships.endDate} >= ${todayStr}::timestamp`,
          sql`${schema.memberships.endDate} <= ${next15DaysStr}::timestamp`
        ))
        .orderBy(schema.memberships.endDate)
        .limit(10);

      const expiringSoonRows = expiringSoon.map(row => ({
        id: row.member?.id || '',
        name: row.member?.name || 'Unknown',
        email: row.member?.email || '',
        phone: row.member?.phone || '',
        planName: row.plan?.name || 'Unknown Plan',
        expiryDate: row.membership.endDate?.toISOString() || '',
        daysLeft: Math.ceil((new Date(row.membership.endDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }));

      // Overdue memberships
      const overdueMembers = await db!.select({
        membership: schema.memberships,
        member: schema.members,
        plan: schema.membershipPlans
      })
        .from(schema.memberships)
        .leftJoin(schema.members, eq(schema.memberships.memberId, schema.members.id))
        .leftJoin(schema.membershipPlans, eq(schema.memberships.planId, schema.membershipPlans.id))
        .where(and(
          eq(schema.memberships.gymId, gymId),
          sql`${schema.memberships.endDate} < ${todayStr}::timestamp`
        ))
        .orderBy(desc(schema.memberships.endDate))
        .limit(10);

      const overdueRows = overdueMembers.map(row => ({
        id: row.member?.id || '',
        name: row.member?.name || 'Unknown',
        email: row.member?.email || '',
        phone: row.member?.phone || '',
        planName: row.plan?.name || 'Unknown Plan',
        expiryDate: row.membership.endDate?.toISOString() || '',
        daysLeft: Math.ceil((new Date(row.membership.endDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }));

      // Leads: new this month and conversion rate
      const newLeadsThisMonth = await db!.select({ count: sql<number>`count(*)` })
        .from(schema.leads)
        .where(and(
          eq(schema.leads.gymId, gymId),
          sql`${schema.leads.createdAt} >= ${startOfMonthStr}::timestamp`
        ));
      const newLeadsCount = Number(newLeadsThisMonth[0]?.count || 0);

      const convertedLeadsThisMonth = await db!.select({ count: sql<number>`count(*)` })
        .from(schema.leads)
        .where(and(
          eq(schema.leads.gymId, gymId),
          eq(schema.leads.status, 'converted'),
          sql`${schema.leads.updatedAt} >= ${startOfMonthStr}::timestamp`
        ));
      const convertedCount = Number(convertedLeadsThisMonth[0]?.count || 0);
      const conversionRate = newLeadsCount > 0 ? (convertedCount / newLeadsCount) * 100 : 0;

      // Follow-ups today list
      const followupsData = await db!.select()
        .from(schema.leads)
        .where(and(
          eq(schema.leads.gymId, gymId),
          sql`${schema.leads.status} IN ('new', 'contacted', 'interested')`,
          sql`(${schema.leads.followUpDate} <= ${tomorrowStr}::timestamp OR ${schema.leads.followUpDate} IS NULL)`
        ))
        .orderBy(schema.leads.followUpDate)
        .limit(10);

      const followupsRows = followupsData.map(lead => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source || 'Unknown',
        lastContact: lead.updatedAt?.toISOString() || null,
        nextFollowUp: lead.followUpDate?.toISOString() || null,
        status: lead.status
      }));

      // Billing: invoices summary
      const paidInvoicesCount = await db!.select({ count: sql<number>`count(*)` })
        .from(schema.invoices)
        .where(and(
          eq(schema.invoices.gymId, gymId),
          eq(schema.invoices.status, 'paid'),
          sql`${schema.invoices.createdAt} >= ${startOfMonthStr}::timestamp`
        ));

      const pendingInvoicesCount = await db!.select({ count: sql<number>`count(*)` })
        .from(schema.invoices)
        .where(and(
          eq(schema.invoices.gymId, gymId),
          sql`${schema.invoices.status} IN ('pending', 'partially_paid')`,
          sql`${schema.invoices.createdAt} >= ${startOfMonthStr}::timestamp`
        ));

      // Members with dues
      const membersWithDues = await db!.select({
        payment: schema.payments,
        member: schema.members
      })
        .from(schema.payments)
        .leftJoin(schema.members, eq(schema.payments.memberId, schema.members.id))
        .where(and(
          eq(schema.payments.gymId, gymId),
          sql`CAST(${schema.payments.amountDue} AS DECIMAL) > 0`
        ))
        .orderBy(desc(schema.payments.amountDue))
        .limit(10);

      const duesRows = membersWithDues.map(row => ({
        id: row.member?.id || '',
        name: row.member?.name || 'Unknown',
        email: row.member?.email || '',
        phone: row.member?.phone || '',
        dueAmount: parseFloat(row.payment.amountDue || '0'),
        lastPaymentDate: row.payment.paymentDate?.toISOString() || null
      }));

      // Today's Classes with details
      const todaysClassesWithDetails = await db!.select({
        class: schema.classes,
        classType: schema.classTypes,
        trainer: schema.users
      })
        .from(schema.classes)
        .leftJoin(schema.classTypes, eq(schema.classes.classTypeId, schema.classTypes.id))
        .leftJoin(schema.users, eq(schema.classes.trainerId, schema.users.id))
        .where(and(
          eq(schema.classes.gymId, gymId),
          sql`${schema.classes.startTime} >= ${todayStr}::timestamp`,
          sql`${schema.classes.startTime} < ${tomorrowStr}::timestamp`
        ))
        .orderBy(schema.classes.startTime)
        .limit(5);

      const classRows = todaysClassesWithDetails.map(row => ({
        id: row.class.id,
        name: row.classType?.name || 'Unknown Class',
        trainerName: row.trainer?.name || 'Unassigned',
        startTime: row.class.startTime?.toISOString() || '',
        endTime: row.class.endTime?.toISOString() || '',
        booked: row.class.bookedCount || 0,
        capacity: row.class.capacity || 0,
        status: row.class.status || 'scheduled'
      }));

      // Attendance last 7 days
      const attendanceLast7Days = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(today);
        dayStart.setDate(dayStart.getDate() - i);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        const dayStartStr = dayStart.toISOString();
        const dayEndStr = dayEnd.toISOString();

        const dayCheckins = await db!.select({ count: sql<number>`count(*)` })
          .from(schema.attendance)
          .where(and(
            eq(schema.attendance.gymId, gymId),
            sql`${schema.attendance.checkInTime} >= ${dayStartStr}::timestamp`,
            sql`${schema.attendance.checkInTime} < ${dayEndStr}::timestamp`
          ));

        attendanceLast7Days.push({
          date: dayStart.toISOString().split('T')[0],
          checkins: Number(dayCheckins[0]?.count || 0)
        });
      }

      // Shop stats
      const shopRevenueThisMonth = await db!.select({
        total: sql<number>`COALESCE(SUM(CAST(${schema.orders.totalAmount} AS DECIMAL)), 0)`
      })
        .from(schema.orders)
        .where(and(
          eq(schema.orders.gymId, gymId),
          eq(schema.orders.paymentStatus, 'paid'),
          sql`${schema.orders.orderDate} >= ${startOfMonthStr}::timestamp`
        ));

      const ordersToday = await db!.select({ count: sql<number>`count(*)` })
        .from(schema.orders)
        .where(and(
          eq(schema.orders.gymId, gymId),
          sql`${schema.orders.orderDate} >= ${todayStr}::timestamp`
        ));

      const pendingOrders = await db!.select({ count: sql<number>`count(*)` })
        .from(schema.orders)
        .where(and(
          eq(schema.orders.gymId, gymId),
          eq(schema.orders.status, 'pending')
        ));

      // Recent orders
      const recentOrders = await db!.select({
        order: schema.orders,
        member: schema.members
      })
        .from(schema.orders)
        .leftJoin(schema.members, eq(schema.orders.memberId, schema.members.id))
        .where(eq(schema.orders.gymId, gymId))
        .orderBy(desc(schema.orders.orderDate))
        .limit(5);

      const orderRows = await Promise.all(recentOrders.map(async row => {
        const itemsCount = await db!.select({ count: sql<number>`count(*)` })
          .from(schema.orderItems)
          .where(eq(schema.orderItems.orderId, row.order.id));

        return {
          id: row.order.id,
          orderNumber: row.order.orderNumber,
          memberName: row.member?.name || 'Unknown',
          itemsCount: Number(itemsCount[0]?.count || 0),
          amount: parseFloat(row.order.totalAmount),
          status: row.order.status,
          orderDate: row.order.orderDate?.toISOString() || ''
        };
      }));

      // Low stock products
      const lowStockProducts = await db!.select()
        .from(schema.products)
        .where(and(
          eq(schema.products.gymId, gymId),
          eq(schema.products.isActive, 1),
          sql`${schema.products.stock} <= ${schema.products.lowStockAlert}`
        ))
        .limit(5);

      const lowStockRows = lowStockProducts.map(p => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        lowStockAlert: p.lowStockAlert || 10
      }));

      // Build alerts
      const alerts: any[] = [];

      // Expiring memberships today
      const expiringToday = expiringSoonRows.filter(r => r.daysLeft <= 1).length;
      if (expiringToday > 0) {
        alerts.push({
          id: 'expiring-today',
          type: 'expiring_membership',
          title: 'Memberships Expiring Today',
          description: `${expiringToday} membership${expiringToday > 1 ? 's' : ''} expiring today`,
          count: expiringToday,
          link: '/admin/members?filter=expiring'
        });
      }

      // High dues
      const highDuesMembers = duesRows.filter(r => r.dueAmount >= 5000).length;
      if (highDuesMembers > 0) {
        alerts.push({
          id: 'high-dues',
          type: 'high_dues',
          title: 'Members with High Dues',
          description: `${highDuesMembers} member${highDuesMembers > 1 ? 's' : ''} with dues over ₹5,000`,
          count: highDuesMembers,
          link: '/admin/billing?filter=dues'
        });
      }

      // Missed follow-ups
      const missedFollowups = followupsRows.filter(r => r.nextFollowUp && new Date(r.nextFollowUp) < today).length;
      if (missedFollowups > 0) {
        alerts.push({
          id: 'missed-followups',
          type: 'missed_followup',
          title: 'Missed Follow-ups',
          description: `${missedFollowups} lead${missedFollowups > 1 ? 's' : ''} with missed follow-up dates`,
          count: missedFollowups,
          link: '/admin/leads?filter=overdue'
        });
      }

      // Out of stock
      const outOfStock = lowStockRows.filter(r => r.stock === 0).length;
      if (outOfStock > 0) {
        alerts.push({
          id: 'out-of-stock',
          type: 'out_of_stock',
          title: 'Products Out of Stock',
          description: `${outOfStock} product${outOfStock > 1 ? 's' : ''} out of stock`,
          count: outOfStock,
          link: '/admin/shop?filter=outofstock'
        });
      }

      // Low stock
      const lowStockCount = lowStockRows.filter(r => r.stock > 0).length;
      if (lowStockCount > 0) {
        alerts.push({
          id: 'low-stock',
          type: 'low_stock',
          title: 'Low Stock Alert',
          description: `${lowStockCount} product${lowStockCount > 1 ? 's' : ''} running low`,
          count: lowStockCount,
          link: '/admin/shop?filter=lowstock'
        });
      }

      const response = {
        kpis: {
          activeMembers: activeMemberCount,
          newMembersThisMonth: newMemberCount,
          revenueThisMonth: revenueThisMonthValue,
          revenueChangePercent,
          pendingDuesAmount,
          pendingDuesMembers,
          leadsInPipeline: leadsCount,
          followupsToday: followupsTodayCount,
          todaysCheckins: todaysCheckinsCount,
          yesterdaysCheckins: yesterdaysCheckinsCount
        },
        today: {
          classesSummary: {
            total: classesTotal,
            upcoming: classesUpcoming,
            ongoing: classesOngoing,
            completed: classesCompleted
          },
          attendanceToday: {
            checkins: todaysCheckinsCount,
            diffFromYesterday: todaysCheckinsCount - yesterdaysCheckinsCount
          },
          collectionsToday
        },
        renewals: {
          expiringSoon: expiringSoonRows,
          overdue: overdueRows
        },
        leads: {
          newThisMonth: newLeadsCount,
          conversionRate,
          followupsToday: followupsRows
        },
        billing: {
          revenueThisMonth: revenueThisMonthValue,
          paidInvoices: Number(paidInvoicesCount[0]?.count || 0),
          pendingInvoices: Number(pendingInvoicesCount[0]?.count || 0),
          dues: duesRows
        },
        classes: {
          todaysClasses: classRows,
          attendanceLast7Days
        },
        shop: {
          revenueThisMonth: parseFloat(String(shopRevenueThisMonth[0]?.total || 0)),
          ordersToday: Number(ordersToday[0]?.count || 0),
          pendingOrders: Number(pendingOrders[0]?.count || 0),
          recentOrders: orderRows,
          lowStockProducts: lowStockRows
        },
        alerts
      };

      res.json(response);
    } catch (error: any) {
      console.error('Error fetching admin dashboard:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin search API
  app.get('/api/admin/search', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const query = (req.query.q as string || '').toLowerCase().trim();
      if (!query) {
        return res.json({ members: [], leads: [] });
      }

      const gymId = user.gymId;
      const searchPattern = `%${query}%`;
      
      let members: any[] = [];
      let leads: any[] = [];

      if (!isDbAvailable()) {
        // Use Supabase when Drizzle DB is not available
        const { data: memberData } = await supabase
          .from('members')
          .select('id, name, email, phone')
          .eq('gym_id', gymId)
          .or(`name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`)
          .limit(5);
        
        const { data: leadData } = await supabase
          .from('leads')
          .select('id, name, email, phone, status')
          .eq('gym_id', gymId)
          .or(`name.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern}`)
          .limit(5);

        members = (memberData || []).map(m => ({ id: m.id, name: m.name, email: m.email, phone: m.phone, type: 'member' }));
        leads = (leadData || []).map(l => ({ id: l.id, name: l.name, email: l.email, phone: l.phone, status: l.status, type: 'lead' }));
      } else {
        // Use Drizzle with raw SQL for ILIKE (PostgreSQL case-insensitive search)
        const memberResults = await db!.select()
          .from(schema.members)
          .where(and(
            eq(schema.members.gymId, gymId),
            sql`(${schema.members.name} ILIKE ${searchPattern} OR ${schema.members.email} ILIKE ${searchPattern} OR ${schema.members.phone} ILIKE ${searchPattern})`
          ))
          .limit(5);

        const leadResults = await db!.select()
          .from(schema.leads)
          .where(and(
            eq(schema.leads.gymId, gymId),
            sql`(${schema.leads.name} ILIKE ${searchPattern} OR ${schema.leads.email} ILIKE ${searchPattern} OR ${schema.leads.phone} ILIKE ${searchPattern})`
          ))
          .limit(5);

        members = memberResults.map(m => ({ id: m.id, name: m.name, email: m.email, phone: m.phone, type: 'member' }));
        leads = leadResults.map(l => ({ id: l.id, name: l.name, email: l.email, phone: l.phone, status: l.status, type: 'lead' }));
      }

      console.log(`Search query: "${query}" - Found ${members.length} members, ${leads.length} leads`);
      res.json({ members, leads });
    } catch (error: any) {
      console.error('Error in admin search:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Billing Summary API - KPIs for admin dashboard
  app.get('/api/billing/summary', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const { from, to } = req.query;

      // Default to current month if no date range specified
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const dateFrom = from ? new Date(from as string) : startOfMonth;
      const dateTo = to ? new Date(to as string) : endOfMonth;

      // Get all payments for the gym within date range
      const allPayments = await db!.select({
        id: schema.payments.id,
        amount: schema.payments.amount,
        amountDue: schema.payments.amountDue,
        paymentType: schema.payments.paymentType,
        status: schema.payments.status,
        membershipId: schema.payments.membershipId,
        orderId: schema.payments.orderId,
        paymentDate: schema.payments.paymentDate,
      })
        .from(schema.payments)
        .where(and(
          eq(schema.payments.gymId, user.gymId),
          gte(schema.payments.paymentDate, dateFrom),
          lte(schema.payments.paymentDate, dateTo)
        ));

      // Calculate KPIs
      const paidPayments = allPayments.filter(p => p.status === 'paid');
      const pendingPayments = allPayments.filter(p => p.status === 'pending');
      const partiallyPaidPayments = allPayments.filter(p => p.status === 'partially_paid');
      const failedPayments = allPayments.filter(p => p.status === 'failed');
      const refundedPayments = allPayments.filter(p => p.status === 'refunded');

      const totalRevenue = paidPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const partialPaymentsCollected = partiallyPaidPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const totalDues = [...pendingPayments, ...partiallyPaidPayments].reduce((sum, p) => sum + parseFloat(p.amountDue || '0'), 0);
      const avgTicketSize = paidPayments.length > 0 ? totalRevenue / paidPayments.length : 0;

      // Revenue by type (membership vs shop vs other)
      const membershipRevenue = paidPayments
        .filter(p => p.membershipId)
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const shopRevenue = paidPayments
        .filter(p => p.orderId)
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const otherRevenue = totalRevenue - membershipRevenue - shopRevenue;

      // Revenue by payment method
      const cashRevenue = paidPayments
        .filter(p => p.paymentType === 'cash')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const upiRevenue = paidPayments
        .filter(p => p.paymentType === 'upi')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const cardRevenue = paidPayments
        .filter(p => p.paymentType === 'card')        .reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const bankTransferRevenue = paidPayments
        .filter(p => p.paymentType === 'bank_transfer')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const razorpayRevenue = paidPayments
        .filter(p => p.paymentType === 'razorpay')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      // Today's payments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newPaymentsToday = allPayments.filter(p => {
        const paymentDate = new Date(p.paymentDate!);
        return paymentDate >= today;
      }).length;

      // Payment method breakdown for charts
      const paymentMethodBreakdown = [
        { method: 'cash', amount: cashRevenue, count: paidPayments.filter(p => p.paymentType === 'cash').length },
        { method: 'upi', amount: upiRevenue, count: paidPayments.filter(p => p.paymentType === 'upi').length },
        { method: 'card', amount: cardRevenue, count: paidPayments.filter(p => p.paymentType === 'card').length },
        { method: 'bank_transfer', amount: bankTransferRevenue, count: paidPayments.filter(p => p.paymentType === 'bank_transfer').length },
        { method: 'razorpay', amount: razorpayRevenue, count: paidPayments.filter(p => p.paymentType === 'razorpay').length },
      ].filter(m => m.amount > 0 || m.count > 0);

      // Payment type breakdown for charts
      const paymentTypeBreakdown = [
        { type: 'membership', amount: membershipRevenue },
        { type: 'shop', amount: shopRevenue },
        { type: 'other', amount: otherRevenue },
      ].filter(t => t.amount > 0);

      res.json({
        totalRevenue,
        paidPaymentsCount: paidPayments.length,
        pendingPaymentsCount: pendingPayments.length,
        partiallyPaidCount: partiallyPaidPayments.length,
        failedPaymentsCount: failedPayments.length,
        refundedPaymentsCount: refundedPayments.length,
        partialPaymentsCollected,
        totalDues,
        avgTicketSize,
        membershipRevenue,
        shopRevenue,
        otherRevenue,
        cashRevenue,
        upiRevenue,
        cardRevenue,
        bankTransferRevenue,
        razorpayRevenue,
        newPaymentsToday,
        paymentMethodBreakdown,
        paymentTypeBreakdown,
        dateRange: {
          from: dateFrom.toISOString(),
          to: dateTo.toISOString(),
        },
      });
    } catch (error: any) {
      console.error('Error fetching billing summary:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/payments', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const filters = {
        memberId: req.query.memberId as string | undefined,
        status: req.query.status as string | undefined,
        paymentType: req.query.paymentType as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
      };

      const payments = await storage.listPayments(user.gymId, filters);
      res.json(payments);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/payments/:id', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const payment = await db!.select().from(schema.payments).where(eq(schema.payments.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && payment.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this payment' });
      }

      res.json(payment);
    } catch (error: any) {
      console.error(`Error fetching payment ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/payments', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const validationResult = createPaymentSchema.safeParse(req.body);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      const data = validationResult.data;
      const amountPaid = data.amount;
      const totalAmount = data.totalAmount || amountPaid;
      const amountDue = data.amountDue !== undefined ? data.amountDue : (totalAmount - amountPaid);

      let status: 'paid' | 'pending' | 'partially_paid' | 'failed' | 'refunded' = 'paid';
      if (amountDue > 0 && amountPaid > 0) {
        status = 'partially_paid';
      } else if (amountPaid === 0 || amountDue === totalAmount) {
        status = 'pending';
      }

      const paymentSource = data.paymentSource || 
        (data.membershipId ? 'membership' : data.orderId ? 'shop' : 'other');

      const payment = await db!.insert(schema.payments).values({
        ...data,
        gymId: user.gymId,
        totalAmount: totalAmount.toString(),
        amount: amountPaid.toString(),
        amountDue: amountDue.toString(),
        paymentSource: paymentSource,
        status: status,
        paymentDate: new Date(),
      }).returning().then(rows => rows[0]);

      res.status(201).json(payment);
    } catch (error: any) {
      console.error('Error creating payment:', error);
      // Log functional error
      const user = await storage.getUserById(req.session?.userId || '');
      if (user) {
        await logFunctionalError(error.message, {
          userId: user.id,
          userName: user.name,
          role: user.role,
          action: 'Processing a payment',
        });
      }
      res.status(500).json(createErrorResponse(error.message));
    }
  });

  app.patch('/api/payments/:id', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const existing = await db!.select().from(schema.payments).where(eq(schema.payments.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!existing) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      if (existing.gymId !== user.gymId) {
        return res.status(403).json({ error: 'Access denied to this payment' });
      }

      const validationResult = updatePaymentSchema.safeParse(req.body);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      const updateData: any = { ...validationResult.data };
      if (updateData.amount) updateData.amount = updateData.amount.toString();

      const payment = await db!.update(schema.payments).set(updateData).where(eq(schema.payments.id, req.params.id)).returning().then(rows => rows[0]);

      res.json(payment);
    } catch (error: any) {
      console.error(`Error updating payment ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/payments/:id', requireRole('admin'), async (req, res) => {
    try {
      const existingPayment = await db!.select().from(schema.payments).where(eq(schema.payments.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!existingPayment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && existingPayment.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this payment' });
      }

      await db!.delete(schema.payments).where(eq(schema.payments.id, req.params.id));
      res.status(204).send();
    } catch (error: any) {
      console.error(`Error deleting payment ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/members/:id/payments', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const member = await db!.select().from(schema.members).where(eq(schema.members.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && member.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this member' });
      }

      const payments = await db!.select().from(schema.payments).where(eq(schema.payments.memberId, req.params.id));
      res.json(payments);
    } catch (error: any) {
      console.error(`Error fetching payments for member ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Record additional payment against existing dues
  app.post('/api/payments/:id/collect-due', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const existingPayment = await db!.select().from(schema.payments).where(eq(schema.payments.id, req.params.id)).limit(1).then(rows => rows[0]);
      if (!existingPayment) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      if (existingPayment.gymId !== user.gymId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { amount, paymentType, transactionRef, notes } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }

      const currentDue = parseFloat(existingPayment.amountDue || '0');
      if (amount > currentDue + 0.01) { // Allow small floating point tolerance
        return res.status(400).json({ error: `Payment amount cannot exceed due amount of ₹${currentDue.toFixed(2)}` });
      }

      const newAmountPaid = parseFloat(existingPayment.amount) + amount;
      let newAmountDue = currentDue - amount;
      
      // Ensure no negative or tiny remaining amounts due to floating point
      if (newAmountDue < 0.01) {
        newAmountDue = 0;
      }
      
      const newStatus = newAmountDue === 0 ? 'paid' : 'partially_paid';

      const updatedPayment = await db!.update(schema.payments).set({
        amount: newAmountPaid.toFixed(2),
        amountDue: newAmountDue.toFixed(2),
        status: newStatus,
        paymentType: paymentType || existingPayment.paymentType,
        transactionRef: transactionRef || existingPayment.transactionRef,
        notes: notes ? `${existingPayment.notes || ''}\n${new Date().toISOString()}: Collected ₹${amount} - ${notes}` : existingPayment.notes,
      }).where(eq(schema.payments.id, req.params.id)).returning().then(rows => rows[0]);

      res.json(updatedPayment);
    } catch (error: any) {
      console.error('Error collecting due:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Send reminder for pending dues
  app.post('/api/payments/:id/remind', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const payment = await db!.select({
        id: schema.payments.id,
        memberId: schema.payments.memberId,
        totalAmount: schema.payments.totalAmount,
        amount: schema.payments.amount,
        amountDue: schema.payments.amountDue,
        status: schema.payments.status,
        gymId: schema.payments.gymId,
      }).from(schema.payments).where(eq(schema.payments.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      if (payment.gymId !== user.gymId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (payment.status === 'paid') {
        return res.status(400).json({ error: 'Payment is already complete, no reminder needed' });
      }

      const member = await db!.select().from(schema.members).where(eq(schema.members.id, payment.memberId)).limit(1).then(rows => rows[0]);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const gym = await db!.select().from(schema.gyms).where(eq(schema.gyms.id, user.gymId)).limit(1).then(rows => rows[0]);
      const gymName = gym?.name || 'Your Gym';
      const amountDue = parseFloat(payment.amountDue || '0');

      const { channel } = req.body;
      const errors: string[] = [];

      if (channel === 'email' || channel === 'both') {
        if (member.email) {
          try {
            await sendPaymentReminderEmail(
              member.email,
              member.name,
              amountDue,
              new Date(),
              gymName
            );
          } catch (emailError: any) {
            errors.push(`Email: ${emailError.message}`);
          }
        } else {
          errors.push('Email: Member has no email address');
        }
      }

      if (channel === 'whatsapp' || channel === 'both') {
        if (member.phone) {
          try {
            await sendPaymentReminderWhatsApp(
              member.phone,
              member.name,
              amountDue,
              new Date(),
              gymName
            );
          } catch (whatsappError: any) {
            errors.push(`WhatsApp: ${whatsappError.message}`);
          }
        } else {
          errors.push('WhatsApp: Member has no phone number');
        }
      }

      if (errors.length === 0) {
        res.json({ success: true, message: 'Reminder sent successfully' });
      } else if (errors.length < 2 || (channel !== 'both')) {
        res.json({ success: true, message: 'Reminder partially sent', errors });
      } else {
        res.status(500).json({ error: 'Failed to send reminder', details: errors });
      }
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get members with pending dues
  app.get('/api/members-with-dues', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const paymentsWithDues = await db!.select({
        id: schema.payments.id,
        memberId: schema.payments.memberId,
        memberName: schema.members.name,
        memberPhone: schema.members.phone,
        memberEmail: schema.members.email,
        totalAmount: schema.payments.totalAmount,
        amountPaid: schema.payments.amount,
        amountDue: schema.payments.amountDue,
        paymentType: schema.payments.paymentType,
        paymentSource: schema.payments.paymentSource,
        status: schema.payments.status,
        paymentDate: schema.payments.paymentDate,
      })
        .from(schema.payments)
        .innerJoin(schema.members, eq(schema.payments.memberId, schema.members.id))
        .where(and(
          eq(schema.payments.gymId, user.gymId),
          or(
            eq(schema.payments.status, 'partially_paid'),
            eq(schema.payments.status, 'pending')
          )
        ))
        .orderBy(desc(schema.payments.paymentDate));

      res.json(paymentsWithDues);
    } catch (error: any) {
      console.error('Error fetching members with dues:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get revenue trend for last 6 months
  app.get('/api/billing/revenue-trend', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const payments = await db!.select({
        id: schema.payments.id,
        amount: schema.payments.amount,
        status: schema.payments.status,
        paymentDate: schema.payments.paymentDate,
      })
        .from(schema.payments)
        .where(and(
          eq(schema.payments.gymId, user.gymId),
          gte(schema.payments.paymentDate, sixMonthsAgo)
        ));

      // Group by month
      const monthlyData: Record<string, { month: string; year: number; collected: number; pending: number }> = {};

      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleString('en-IN', { month: 'short' });
        monthlyData[key] = { month: monthName, year: date.getFullYear(), collected: 0, pending: 0 };
      }

      payments.forEach(p => {
        if (!p.paymentDate) return;
        const date = new Date(p.paymentDate);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyData[key]) {
          const amount = parseFloat(p.amount);
          if (p.status === 'paid') {
            monthlyData[key].collected += amount;
          } else if (p.status === 'pending' || p.status === 'partially_paid') {
            monthlyData[key].pending += amount;
          }
        }
      });

      res.json(Object.values(monthlyData));
    } catch (error: any) {
      console.error('Error fetching revenue trend:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // CSV Export for billing data
  app.get('/api/billing/export', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const { from, to, type } = req.query;
      const dateFrom = from ? new Date(from as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const dateTo = to ? new Date(to as string) : new Date();

      let csvContent = '';

      if (type === 'invoices') {
        const invoices = await db!.select({
          invoiceNumber: schema.invoices.invoiceNumber,
          memberName: schema.members.name,
          amount: schema.invoices.amount,
          subtotal: schema.invoices.subtotal,
          taxAmount: schema.invoices.taxAmount,
          discountAmount: schema.invoices.discountAmount,
          amountPaid: schema.invoices.amountPaid,
          amountDue: schema.invoices.amountDue,
          status: schema.invoices.status,
          dueDate: schema.invoices.dueDate,
          paidDate: schema.invoices.paidDate,
          createdAt: schema.invoices.createdAt,
        })
          .from(schema.invoices)
          .innerJoin(schema.members, eq(schema.invoices.memberId, schema.members.id))
          .where(and(
            eq(schema.invoices.gymId, user.gymId),
            gte(schema.invoices.createdAt, dateFrom),
            lte(schema.invoices.createdAt, dateTo)
          ))
          .orderBy(desc(schema.invoices.createdAt));

        csvContent = 'Invoice Number,Member Name,Amount (₹),Subtotal (₹),Tax (₹),Discount (₹),Paid (₹),Due (₹),Status,Due Date,Paid Date,Created At\n';
        invoices.forEach(inv => {
          csvContent += `"${inv.invoiceNumber}","${inv.memberName}",${inv.amount},${inv.subtotal || ''},${inv.taxAmount || ''},${inv.discountAmount || ''},${inv.amountPaid || ''},${inv.amountDue || ''},"${inv.status}","${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : ''}","${inv.paidDate ? new Date(inv.paidDate).toLocaleDateString('en-IN') : ''}","${inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-IN') : ''}"\n`;
        });
      } else {
        const payments = await db!.select({
          memberName: schema.members.name,
          totalAmount: schema.payments.totalAmount,
          amountPaid: schema.payments.amount,
          amountDue: schema.payments.amountDue,
          paymentType: schema.payments.paymentType,
          paymentSource: schema.payments.paymentSource,
          status: schema.payments.status,
          transactionRef: schema.payments.transactionRef,
          notes: schema.payments.notes,
          paymentDate: schema.payments.paymentDate,
        })
          .from(schema.payments)
          .innerJoin(schema.members, eq(schema.payments.memberId, schema.members.id))
          .where(and(
            eq(schema.payments.gymId, user.gymId),
            gte(schema.payments.paymentDate, dateFrom),
            lte(schema.payments.paymentDate, dateTo)
          ))
          .orderBy(desc(schema.payments.paymentDate));

        csvContent = 'Member Name,Total Amount (₹),Amount Paid (₹),Amount Due (₹),Payment Method,Source,Status,Transaction Ref,Notes,Date\n';
        payments.forEach(p => {
          csvContent += `"${p.memberName}",${p.totalAmount || ''},${p.amountPaid},${p.amountDue || ''},"${p.paymentType}","${p.paymentSource || ''}","${p.status}","${p.transactionRef || ''}","${(p.notes || '').replace(/"/g, '""')}","${p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : ''}"\n`;
        });
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=billing-${type || 'payments'}-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvContent);
    } catch (error: any) {
      console.error('Error exporting billing data:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/invoices', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const filters = {
        memberId: req.query.memberId as string | undefined,
        status: req.query.status as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
      };

      const invoices = await storage.listInvoices(user.gymId, filters);
      res.json(invoices);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/invoices', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const validationResult = createInvoiceSchema.safeParse(req.body);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      const invoice = await storage.createInvoice({
        ...validationResult.data,
        gymId: user.gymId,
        amount: validationResult.data.amount.toString(),
      });

      const member = await db!.select().from(schema.members).where(eq(schema.members.id, validationResult.data.memberId)).limit(1).then(rows => rows[0]);
      const gym = await db!.select().from(schema.gyms).where(eq(schema.gyms.id, user.gymId)).limit(1).then(rows => rows[0]);

      if (member && gym) {
        const baseUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : 'https://gymsaathi.com';
        const downloadUrl = `${baseUrl}/api/invoices/${invoice.id}/download`;

        const invoiceAmount = typeof invoice.amount === 'number' ? invoice.amount : parseFloat(String(invoice.amount));
        const invoiceData: InvoiceData = {
          invoiceNumber: invoice.invoiceNumber,
          gymName: gym.name,
          gymAddress: gym.address || undefined,
          gymPhone: gym.phone,
          gymEmail: gym.email,
          memberName: member.name,
          memberEmail: member.email,
          memberPhone: member.phone || undefined,
          memberAddress: member.address || undefined,
          amount: invoiceAmount,
          dueDate: new Date(invoice.dueDate),
          paidDate: null,
          status: invoice.status,
          createdAt: new Date(invoice.createdAt!),
          description: 'Gym Membership / Services',
        };

        generateInvoicePdf(invoiceData).then(pdfBuffer => {
          sendInvoiceEmail({
            gymName: gym.name,
            memberName: member.name,
            memberEmail: member.email,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoiceAmount,
            dueDate: new Date(invoice.dueDate),
            status: invoice.status,
            downloadUrl: downloadUrl,
            pdfBuffer: pdfBuffer,
          }).catch(err => console.error('[notification] Failed to send invoice email:', err));
        }).catch(err => console.error('[notification] Failed to generate PDF for email:', err));

        sendInvoiceWhatsApp({
          phoneNumber: member.phone || '',
          gymName: gym.name,
          memberName: member.name,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoiceAmount,
          dueDate: new Date(invoice.dueDate),
          status: invoice.status,
          downloadUrl: downloadUrl,
        }).catch(err => console.error('[notification] Failed to send invoice WhatsApp:', err));
      }

      res.status(201).json(invoice);
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/invoices/:id', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const existing = await db!.select().from(schema.invoices).where(eq(schema.invoices.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!existing) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      if (existing.gymId !== user.gymId) {
        return res.status(403).json({ error: 'Access denied to this invoice' });
      }

      const validationResult = updateInvoiceSchema.safeParse(req.body);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      const updateData: any = { ...validationResult.data };
      if (updateData.amount) updateData.amount = updateData.amount.toString();

      const invoice = await db!.update(schema.invoices).set(updateData).where(eq(schema.invoices.id, req.params.id)).returning().then(rows => rows[0]);

      res.json(invoice);
    } catch (error: any) {
      console.error(`Error updating invoice ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/invoices/:id', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const invoice = await db!.select().from(schema.invoices).where(eq(schema.invoices.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && invoice.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this invoice' });
      }

      res.json(invoice);
    } catch (error: any) {
      console.error(`Error fetching invoice ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/invoices/:id/download', requireRole('admin', 'trainer', 'member'), async (req, res) => {
    try {
      const invoice = await db!.select().from(schema.invoices).where(eq(schema.invoices.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && invoice.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this invoice' });
      }

      const member = await db!.select().from(schema.members).where(eq(schema.members.id, invoice.memberId)).limit(1).then(rows => rows[0]);
      const gym = await db!.select().from(schema.gyms).where(eq(schema.gyms.id, invoice.gymId)).limit(1).then(rows => rows[0]);

      if (!member || !gym) {
        return res.status(404).json({ error: 'Member or gym not found' });
      }

      const invoiceData: InvoiceData = {
        invoiceNumber: invoice.invoiceNumber,
        gymName: gym.name,
        gymAddress: gym.address || undefined,
        gymPhone: gym.phone,
        gymEmail: gym.email,
        gymLogoUrl: gym.logoUrl || undefined,
        memberName: member.name,
        memberEmail: member.email,
        memberPhone: member.phone || undefined,
        memberAddress: member.address || undefined,
        amount: parseFloat(invoice.amount),
        dueDate: new Date(invoice.dueDate),
        paidDate: invoice.paidDate ? new Date(invoice.paidDate) : null,
        status: invoice.status,
        createdAt: new Date(invoice.createdAt!),
        description: 'Gym Membership / Services',
      };

      const pdfBuffer = await generateInvoicePdf(invoiceData);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error(`Error downloading invoice ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/leads', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const user = await userAccess.getUserById(req.session!.userId!);
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      let gymId: string | null = null;
      if (isDbAvailable()) {
        if (user.role === 'admin') {
          const gymAdmin = await db!.select().from(schema.gymAdmins).where(eq(schema.gymAdmins.userId, user.id)).limit(1).then(rows => rows[0]);
          gymId = gymAdmin?.gymId || null;
        } else if (user.role === 'trainer') {
          const trainer = await db!.select().from(schema.trainers).where(eq(schema.trainers.userId, user.id)).limit(1).then(rows => rows[0]);
          gymId = trainer?.gymId || null;
        }
      } else {
        gymId = await supabaseRepo.getGymIdForUser(user.id, user.role);
      }

      if (!gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      if (!isDbAvailable()) {
        return res.json([]);
      }

      const filters = {
        status: req.query.status as string | undefined,
        source: req.query.source as string | undefined,
        search: req.query.search as string | undefined,
      };

      let leads = await storage.listLeads(gymId, filters);

      // For trainers, filter to show only leads they added or are assigned to
      if (user.role === 'trainer') {
        leads = leads.filter(lead => 
          lead.addedBy === user.id || lead.assignedTo === user.id
        );
      }

      res.json(leads);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/leads/:id', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const lead = await db!.select().from(schema.leads).where(eq(schema.leads.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && lead.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this lead' });
      }

      res.json(lead);
    } catch (error: any) {
      console.error(`Error fetching lead ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/leads', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const validationResult = createLeadSchema.safeParse(req.body);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      const leadData: any = {
        ...validationResult.data,
        gymId: user.gymId,
        addedBy: user.id,
      };

      // Ensure followUpDate is properly set or null
      if (leadData.followUpDate === undefined) {
        leadData.followUpDate = null;
      }

      const lead = await db!.insert(schema.leads).values(leadData).returning().then(rows => rows[0]);

      // Send welcome notifications to the lead
      const gym = await db!.select().from(schema.gyms).where(eq(schema.gyms.id, user.gymId)).limit(1).then(rows => rows[0]);

      if (gym) {
        // Send welcome email (only if lead has email)
        if (lead.email) {
          sendLeadWelcomeEmail({
            gymName: gym.name,
            leadName: lead.name,
            leadEmail: lead.email,
            interestedPlan: lead.interestedPlan || undefined,
            gymPhone: gym.phone,
            gymEmail: gym.email,
          }).catch(err => console.error('[notification] Failed to send lead welcome email:', err));
        }

        // Send welcome WhatsApp message
        sendLeadWelcomeWhatsApp({
          phoneNumber: lead.phone,
          gymName: gym.name,
          leadName: lead.name,
          interestedPlan: lead.interestedPlan || undefined,
          gymPhone: gym.phone,
          gymEmail: gym.email,
        }).catch(err => console.error('[notification] Failed to send lead welcome WhatsApp:', err));
      }

      res.status(201).json(lead);
    } catch (error: any) {
      console.error('Error creating lead:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/leads/:id', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const existingLead = await db!.select().from(schema.leads).where(eq(schema.leads.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!existingLead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && existingLead.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this lead' });
      }

      const updateLeadSchema = insertLeadSchema.partial().extend({
        followUpDate: z.union([z.string(), z.date(), z.null(), z.undefined()]).transform(val => {
          if (!val) return null;
          return typeof val === 'string' ? new Date(val) : val;
        }).optional(),
      });

      const validationResult = updateLeadSchema.safeParse(req.body);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      const updateData: any = { ...validationResult.data, updatedAt: new Date() };

      // Ensure followUpDate is properly set or null
      if (updateData.followUpDate === undefined && req.body.followUpDate !== undefined) {
        updateData.followUpDate = null;
      }

      const lead = await db!.update(schema.leads).set(updateData).where(eq(schema.leads.id, req.params.id)).returning().then(rows => rows[0]);

      res.json(lead);
    } catch (error: any) {
      console.error(`Error updating lead ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/leads/:id', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const existingLead = await db!.select().from(schema.leads).where(eq(schema.leads.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!existingLead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && existingLead.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this lead' });
      }

      await db!.delete(schema.leads).where(eq(schema.leads.id, req.params.id));
      res.status(204).send();
    } catch (error: any) {
      console.error(`Error deleting lead ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/leads/:id/convert', requireRole('admin'), async (req, res) => {
    try {
      const existingLead = await db!.select().from(schema.leads).where(eq(schema.leads.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!existingLead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && existingLead.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this lead' });
      }

      if (existingLead.status === 'converted') {
        return res.status(400).json({ error: 'Lead has already been converted' });
      }

      // Check if a member already exists with this email at this gym
      // Note: We only check members table, not users table, because leads don't have user accounts
      // This allows converting a lead even if the email exists as a lead elsewhere
      const memberEmail = req.body.email || existingLead.email;
      const existingMember = await db!.select().from(schema.members)
        .where(and(
          eq(schema.members.email, memberEmail),
          eq(schema.members.gymId, existingLead.gymId)
        ))
        .limit(1).then(rows => rows[0]);

      if (existingMember) {
        return res.status(400).json({ error: 'A member with this email already exists at this gym' });
      }

      // Get gym details for notifications
      const gym = await db!.select().from(schema.gyms).where(eq(schema.gyms.id, existingLead.gymId)).limit(1).then(rows => rows[0]);
      const gymName = gym?.name || 'Your Gym';

      // Generate a temporary password for the new member
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Prepare user data for creation inside transaction
      const userData = {
        email: memberEmail,
        passwordHash: passwordHash,
        name: req.body.name || existingLead.name,
        phone: req.body.phone || existingLead.phone || null,
      };

      // Prepare invoice data if payment was provided
      let invoiceData: { finalAmount: number; paidAmount: number; paymentMethod: string; transactionDate: Date } | undefined;
      if (req.body.paymentFinalAmount && parseFloat(req.body.paymentFinalAmount) > 0) {
        invoiceData = {
          finalAmount: parseFloat(req.body.paymentFinalAmount),
          paidAmount: parseFloat(req.body.paymentPaidAmount || '0'),
          paymentMethod: req.body.paymentMethod || 'cash',
          transactionDate: req.body.transactionDate ? new Date(req.body.transactionDate) : new Date(),
        };
      }

      // Convert lead to member atomically (user, member, lead update, membership, invoice, payment all in one transaction)
      const member = await storage.convertLeadToMember(req.params.id, req.body, invoiceData, userData);

      // Send welcome notifications (async, non-blocking) - only after successful transaction
      // All notification code is wrapped in try-catch to prevent any synchronous errors from bubbling up
      const memberPortalUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}/login`
        : 'https://gymsaathi.com/login';

      try {
        sendMemberWelcomeEmail({
          gymName: gymName,
          memberName: member.name,
          memberEmail: member.email,
          tempPassword: tempPassword,
          memberPortalUrl: memberPortalUrl,
        }).catch(err => console.error('[notification] Failed to send member welcome email (lead conversion):', err));
      } catch (err) {
        console.error('[notification] Error preparing member welcome email:', err);
      }

      try {
        sendMemberWelcomeWhatsApp({
          phoneNumber: member.phone || '',
          gymName: gymName,
          personName: member.name,
          portalUrl: memberPortalUrl,
          email: member.email,
          tempPassword: tempPassword,
        }).catch(err => console.error('[notification] Failed to send member welcome WhatsApp (lead conversion):', err));
      } catch (err) {
        console.error('[notification] Error preparing member welcome WhatsApp:', err);
      }

      // Send invoice notification if invoice was created
      if (member.invoice && invoiceData) {
        const baseUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : 'https://gymsaathi.com';
        const invoiceDownloadUrl = `${baseUrl}/api/invoices/${member.invoice.id}/download`;

        try {
          sendInvoiceEmail({
            gymName: gymName,
            memberName: member.name,
            memberEmail: member.email,
            invoiceNumber: member.invoice.invoiceNumber,
            amount: invoiceData.finalAmount,
            dueDate: invoiceData.transactionDate,
            status: member.invoice.status,
            downloadUrl: invoiceDownloadUrl,
          }).catch(err => console.error('[notification] Failed to send invoice email:', err));
        } catch (err) {
          console.error('[notification] Error preparing invoice email:', err);
        }

        try {
          sendInvoiceWhatsApp({
            phoneNumber: member.phone || '',
            gymName: gymName,
            memberName: member.name,
            invoiceNumber: member.invoice.invoiceNumber,
            amount: invoiceData.finalAmount,
            dueDate: invoiceData.transactionDate,
            status: member.invoice.status,
            downloadUrl: invoiceDownloadUrl,
          }).catch(err => console.error('[notification] Failed to send invoice WhatsApp:', err));
        } catch (err) {
          console.error('[notification] Error preparing invoice WhatsApp:', err);
        }
      }

      // Log audit entry (wrapped in try-catch to not affect response)
      try {
        await auditService.logMemberCreated(req, user!.id, user!.name || 'Admin', member.name, gymName);
      } catch (err) {
        console.error('[audit] Failed to log member created:', err);
      }

      res.status(201).json(member);
    } catch (error: any) {
      console.error(`Error converting lead ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Product Categories
  app.get('/api/product-categories', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      let conditions = [eq(schema.productCategories.gymId, user.gymId)];

      if (req.query.isActive !== undefined) {
        conditions.push(eq(schema.productCategories.isActive, req.query.isActive === 'true' ? 1 : 0));
      }

      const categories = await db!.select().from(schema.productCategories).where(and(...conditions));
      res.json(categories.map(cat => ({
        ...cat,
        isActive: cat.isActive === 1,
      })));
    } catch (error: any) {
      console.error('Error fetching product categories:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/product-categories', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const category = await db!.insert(schema.productCategories).values({
        ...req.body,
        gymId: user.gymId,
      }).returning().then(rows => rows[0]);

      res.status(201).json(category);
    } catch (error: any) {
      console.error('Error creating product category:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/product-categories/:id', requireRole('admin'), async (req, res) => {
    try {
      const category = await db!.update(schema.productCategories).set(req.body).where(eq(schema.productCategories.id, req.params.id)).returning().then(rows => rows[0]);

      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      res.json(category);
    } catch (error: any) {
      console.error('Error updating product category:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/product-categories/:id', requireRole('admin'), async (req, res) => {
    try {
      await db!.delete(schema.productCategories).where(eq(schema.productCategories.id, req.params.id));
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting product category:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/products', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const filters = {
        category: req.query.category as string | undefined,
        search: req.query.search as string | undefined,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      };

      const products = await storage.listProducts(user.gymId, filters);
      res.json(products);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/products/:id', requireAuth, async (req, res) => {
    try {
      const product = await db!.select().from(schema.products).where(eq(schema.products.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && product.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this product' });
      }

      res.json(product);
    } catch (error: any) {
      console.error(`Error fetching product ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/products', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const validationResult = createProductSchema.safeParse(req.body);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      const product = await storage.createProduct({
        ...validationResult.data,
        gymId: user.gymId,
        price: validationResult.data.price.toString(),
        discountPrice: validationResult.data.discountPrice?.toString() || null,
      });

      res.status(201).json(product);
    } catch (error: any) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/products/:id', requireRole('admin'), async (req, res) => {
    try {
      const existingProduct = await db!.select().from(schema.products).where(eq(schema.products.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!existingProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && existingProduct.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this product' });
      }

      const validationResult = updateProductSchema.safeParse(req.body);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      const updateData: any = { ...validationResult.data };
      if (updateData.price) updateData.price = updateData.price.toString();
      if (updateData.discountPrice) updateData.discountPrice = updateData.discountPrice.toString();

      const product = await storage.updateProduct(req.params.id, updateData);

      res.json(product);
    } catch (error: any) {
      console.error(`Error updating product ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/products/:id', requireRole('admin'), async (req, res) => {
    try {
      const existingProduct = await db!.select().from(schema.products).where(eq(schema.products.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!existingProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && existingProduct.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this product' });
      }

      await db!.delete(schema.products).where(eq(schema.products.id, req.params.id));
      res.status(204).send();
    } catch (error: any) {
      console.error(`Error deleting product ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/orders', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const filters = {
        status: req.query.status as string | undefined,
        memberId: req.query.memberId as string | undefined,
      };

      const orders = await storage.listOrders(user.gymId, filters);
      res.json(orders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/orders/:id', requireRole('admin'), async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && order.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this order' });
      }

      res.json(order);
    } catch (error: any) {
      console.error(`Error fetching order ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/orders', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      // Handle trainer orders - they can only order for themselves
      let orderData = req.body;
      if (user.role === 'trainer') {
        // Get trainer info
        const trainer = await db!.select().from(schema.trainers).where(eq(schema.trainers.userId, user.id)).limit(1).then(rows => rows[0]);
        if (!trainer) {
          return res.status(400).json({ error: 'Trainer profile not found' });
        }
        
        // Check if trainer has a linked member record
        let trainerMember = await db!.select().from(schema.members).where(eq(schema.members.userId, user.id)).limit(1).then(rows => rows[0]);
        
        // If no member record exists, auto-create one for the trainer
        if (!trainerMember) {
          const [newMember] = await db!.insert(schema.members).values({
            userId: user.id,
            gymId: trainer.gymId,
            name: trainer.name,
            email: trainer.email,
            phone: trainer.phone || 'N/A',
            status: 'active',
          }).returning();
          trainerMember = newMember;
          console.log(`✅ Auto-created member record for trainer ${trainer.name} (${trainer.id})`);
        }
        
        // Force the memberId to be the trainer's own member record
        orderData = { ...req.body, memberId: trainerMember.id };
      }

      const validationResult = createOrderSchema.safeParse(orderData);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timestamp = Date.now().toString(36).toUpperCase();
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase().padEnd(4, '0');
      const orderNumber = `ORD-${dateStr}-${timestamp.slice(-4)}${randomPart}`;

      const order = await storage.createOrder({
        ...validationResult.data,
        orderNumber,
        gymId: user.gymId,
        subtotal: validationResult.data.subtotal,
        taxAmount: validationResult.data.taxAmount || 0,
        totalAmount: validationResult.data.totalAmount,
        paymentStatus: validationResult.data.paymentStatus || 'unpaid',
      });

      // Get member and gym info for notifications (all non-blocking)
      let memberInfo: any = null;
      let gymInfo: any = null;
      
      try {
        memberInfo = await storage.getMemberById(validationResult.data.memberId);
      } catch (memberError) {
        console.log('Could not fetch member info for notifications (non-critical):', memberError);
      }
      
      try {
        gymInfo = await supabaseRepo.getGymById(user.gymId);
      } catch (gymError) {
        console.log('Could not fetch gym info for notifications (non-critical):', gymError);
      }
      
      const memberName = memberInfo?.name || 'A member';
      const orderTotal = validationResult.data.totalAmount.toFixed(2);
      const gymName = gymInfo?.name || 'Your Gym';
      const orderItems = validationResult.data.items || [];

      // Create admin notifications for new order (non-blocking)
      try {
        const adminUserIds = await supabaseRepo.getGymAdminUserIds(user.gymId);
        
        for (const adminUserId of adminUserIds) {
          await supabaseRepo.createNotification({
            userId: adminUserId,
            title: 'New Shop Order',
            message: `${memberName} placed an order #${orderNumber} for ₹${orderTotal}`,
            type: 'info',
          });
        }
        console.log(`✅ Sent order notifications to ${adminUserIds.length} admin(s)`);
      } catch (notifyError) {
        console.error('Error sending admin order notifications (non-critical):', notifyError);
      }

      // Create member in-app notification (non-blocking)
      try {
        const memberUserId = memberInfo?.userId;
        if (memberUserId && typeof memberUserId === 'string') {
          await supabaseRepo.createNotification({
            userId: memberUserId,
            title: 'Order Confirmed!',
            message: `Your order #${orderNumber} for ₹${orderTotal} has been placed successfully.`,
            type: 'success',
          });
          console.log(`✅ Created member notification for order ${orderNumber}`);
        }
      } catch (notifyError) {
        console.error('Error creating member notification (non-critical):', notifyError);
      }

      // Send WhatsApp notification to member (non-blocking)
      try {
        const memberPhone = memberInfo?.phone;
        if (memberPhone && typeof memberPhone === 'string' && memberPhone.length >= 10 && orderItems.length > 0) {
          await sendOrderConfirmationWhatsApp({
            phoneNumber: memberPhone,
            memberName: memberName,
            orderNumber: orderNumber,
            items: orderItems.map(item => ({
              productName: item.productName,
              quantity: item.quantity,
              price: item.price,
            })),
            totalAmount: validationResult.data.totalAmount,
            gymName: gymName,
          });
          console.log(`✅ Sent order WhatsApp notification to ${memberPhone}`);
        } else {
          console.log('Skipping WhatsApp notification - no valid phone or empty items');
        }
      } catch (whatsappError) {
        console.error('Error sending order WhatsApp (non-critical):', whatsappError);
      }

      // Send Email notification to member (non-blocking)
      try {
        const memberEmail = memberInfo?.email;
        if (memberEmail && typeof memberEmail === 'string' && memberEmail.includes('@') && orderItems.length > 0) {
          await sendOrderConfirmationEmail({
            memberName: memberName,
            memberEmail: memberEmail,
            orderNumber: orderNumber,
            items: orderItems.map(item => ({
              productName: item.productName,
              quantity: item.quantity,
              price: item.price,
            })),
            subtotal: validationResult.data.subtotal,
            taxAmount: validationResult.data.taxAmount || 0,
            totalAmount: validationResult.data.totalAmount,
            gymName: gymName,
            gymEmail: gymInfo?.email || undefined,
            gymPhone: gymInfo?.phone || undefined,
          });
          console.log(`✅ Sent order email notification to ${memberEmail}`);
        } else {
          console.log('Skipping email notification - no valid email or empty items');
        }
      } catch (emailError) {
        console.error('Error sending order email (non-critical):', emailError);
      }

      res.status(201).json(order);
    } catch (error: any) {
      console.error('Error creating order:', error);
      // Log functional error
      const user = await storage.getUserById(req.session?.userId || '');
      if (user) {
        await logFunctionalError(error.message, {
          userId: user.id,
          userName: user.name,
          role: user.role,
          action: 'Creating an order',
        });
      }
      res.status(500).json(createErrorResponse(error.message));
    }
  });

  app.patch('/api/orders/:id/status', requireRole('admin'), async (req, res) => {
    try {
      const existingOrder = await db!.select().from(schema.orders).where(eq(schema.orders.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!existingOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && existingOrder.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this order' });
      }

      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const order = await storage.updateOrderStatus(req.params.id, status);
      res.json(order);
    } catch (error: any) {
      console.error(`Error updating order status ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/orders/:id/payment', requireRole('admin'), async (req, res) => {
    try {
      const existingOrder = await db!.select().from(schema.orders).where(eq(schema.orders.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!existingOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && existingOrder.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this order' });
      }

      const { paymentStatus, paymentType } = req.body;
      if (!paymentStatus) {
        return res.status(400).json({ error: 'Payment status is required' });
      }

      const order = await storage.updateOrderPaymentStatus(req.params.id, paymentStatus, paymentType);
      res.json(order);
    } catch (error: any) {
      console.error(`Error updating order payment ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/members/:id/orders', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      
      // Trainers cannot view order history
      if (user?.role === 'trainer') {
        return res.status(403).json({ error: 'Trainers are not allowed to access order data.' });
      }

      const member = await db!.select().from(schema.members).where(eq(schema.members.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      if (user?.role !== 'superadmin' && member.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this member' });
      }

      const orders = await storage.getOrdersByMember(req.params.id);
      res.json(orders);
    } catch (error: any) {
      console.error(`Error fetching orders for member ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/class-types', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const classTypes = await storage.listClassTypes(user.gymId);
      res.json(classTypes);
    } catch (error: any) {
      console.error('Error fetching class types:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/class-types', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const validationResult = createClassTypeSchema.safeParse(req.body);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      const classType = await storage.createClassType({
        ...validationResult.data,
        gymId: user.gymId,
      });

      res.status(201).json(classType);
    } catch (error: any) {
      console.error('Error creating class type:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/classes', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const filters = {
        classTypeId: req.query.classTypeId as string | undefined,
        trainerId: req.query.trainerId as string | undefined,
        status: req.query.status as string | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const classes = await storage.listClasses(user.gymId, filters);
      res.json(classes);
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/classes/:id', requireAuth, async (req, res) => {
    try {
      const classData = await storage.getClassById(req.params.id);

      if (!classData) {
        return res.status(404).json({ error: 'Class not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && classData.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this class' });
      }

      res.json(classData);
    } catch (error: any) {
      console.error(`Error fetching class ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/classes', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const validationResult = createClassSchema.safeParse(req.body);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      // Convert empty trainerId to null to avoid foreign key constraint violation
      const classData = {
        ...validationResult.data,
        gymId: user.gymId,
        trainerId: validationResult.data.trainerId || null,
      };

      const newClass = await storage.createClass(classData);

      res.status(201).json(newClass);
    } catch (error: any) {
      console.error('Error creating class:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/classes/:id', requireRole('admin'), async (req, res) => {
    try {
      const existingClass = await storage.getClassById(req.params.id);

      if (!existingClass) {
        return res.status(404).json({ error: 'Class not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && existingClass.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this class' });
      }

      const validationResult = createClassSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ error: validationError.message });
      }

      // Convert empty trainerId to null to avoid foreign key constraint violation
      const updateData = {
        ...validationResult.data,
        trainerId: validationResult.data.trainerId === '' ? null : validationResult.data.trainerId,
      };

      const updatedClass = await storage.updateClass(req.params.id, updateData);
      res.json(updatedClass);
    } catch (error: any) {
      console.error(`Error updating class ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/classes/:id', requireRole('admin'), async (req, res) => {
    try {
      const existingClass = await storage.getClassById(req.params.id);

      if (!existingClass) {
        return res.status(404).json({ error: 'Class not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && existingClass.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this class' });
      }

      await storage.deleteClass(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error(`Error deleting class ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/classes/:id/book', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      let memberId: string;
      if (user.role === 'member') {
        const member = await db!.select().from(schema.members).where(eq(schema.members.userId, user.id)).limit(1).then(rows => rows[0]);

        if (!member) {
          return res.status(404).json({ error: 'Member profile not found' });
        }
        memberId = member.id;
      } else {
        const { memberId: providedMemberId } = req.body;
        if (providedMemberId) {
          const memberToCheck = await db!.select().from(schema.members).where(eq(schema.members.id, providedMemberId)).limit(1).then(rows => rows[0]);
          if (!memberToCheck || memberToCheck.gymId !== user.gymId) {
            return res.status(403).json({ error: 'Member not found or does not belong to your gym.' });
          }
          memberId = providedMemberId;
        } else {
          const linkedMember = await db!.select().from(schema.members).where(eq(schema.members.userId, user.id)).limit(1).then(rows => rows[0]);
          if (linkedMember) {
            memberId = linkedMember.id;
          } else {
            return res.status(400).json({ error: 'No member profile found. Please select a member to book this class for.' });
          }
        }
      }

      const booking = await storage.bookClass(req.params.id, memberId);
      res.status(201).json(booking);
    } catch (error: any) {
      console.error(`Error booking class ${req.params.id}:`, error);
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/classes/:id/book', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      let memberId: string;
      if (user.role === 'member') {
        const member = await db!.select().from(schema.members).where(eq(schema.members.userId, user.id)).limit(1).then(rows => rows[0]);

        if (!member) {
          return res.status(404).json({ error: 'Member profile not found' });
        }
        memberId = member.id;
      } else {
        const { memberId: providedMemberId } = req.body;
        if (providedMemberId) {
          const memberToCheck = await db!.select().from(schema.members).where(eq(schema.members.id, providedMemberId)).limit(1).then(rows => rows[0]);
          if (!memberToCheck || memberToCheck.gymId !== user.gymId) {
            return res.status(403).json({ error: 'Member not found or does not belong to your gym.' });
          }
          memberId = providedMemberId;
        } else {
          const linkedMember = await db!.select().from(schema.members).where(eq(schema.members.userId, user.id)).limit(1).then(rows => rows[0]);
          if (linkedMember) {
            memberId = linkedMember.id;
          } else {
            return res.status(400).json({ error: 'No member profile found. Please select a member to cancel this booking for.' });
          }
        }
      }

      await storage.cancelClassBooking(req.params.id, memberId);
      res.json({ message: 'Booking cancelled successfully' });
    } catch (error: any) {
      console.error(`Error cancelling booking for class ${req.params.id}:`, error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/classes/:id/bookings', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const classData = await storage.getClassById(req.params.id);

      if (!classData) {
        return res.status(404).json({ error: 'Class not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && classData.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this class' });
      }

      const bookings = await storage.listClassBookings(req.params.id);
      res.json(bookings);
    } catch (error: any) {
      console.error(`Error fetching bookings for class ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/members/:id/bookings', requireAuth, async (req, res) => {
    try {
      const member = await db!.select().from(schema.members).where(eq(schema.members.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && member.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this member' });
      }

      const bookings = await storage.getMemberBookings(req.params.id);
      res.json(bookings);
    } catch (error: any) {
      console.error(`Error fetching bookings for member ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/trainers', requireAuth, async (req, res) => {
    try {
      const user = await userAccess.getUserById(req.session!.userId!);
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      let gymId: string | null = null;
      if (isDbAvailable()) {
        if (user.role === 'admin') {
          const gymAdmin = await db!.select().from(schema.gymAdmins).where(eq(schema.gymAdmins.userId, user.id)).limit(1).then(rows => rows[0]);
          gymId = gymAdmin?.gymId || null;
        } else if (user.role === 'trainer') {
          const trainer = await db!.select().from(schema.trainers).where(eq(schema.trainers.userId, user.id)).limit(1).then(rows => rows[0]);
          gymId = trainer?.gymId || null;
        }
      } else {
        gymId = await supabaseRepo.getGymIdForUser(user.id, user.role);
      }

      if (!gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      if (!isDbAvailable()) {
        return res.json([]);
      }

      const trainers = await storage.getTrainersByGym(gymId);
      res.json(trainers);
    } catch (error: any) {
      console.error('Error fetching trainers:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/trainers/:id', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const trainer = await storage.getTrainerById(req.params.id);
      if (!trainer) {
        return res.status(404).json({ error: 'Trainer not found' });
      }

      if (trainer.gymId !== user.gymId && user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Access denied to this trainer' });
      }

      res.json(trainer);
    } catch (error: any) {
      console.error('Error fetching trainer:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/trainers', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const createTrainerSchema = z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Valid email is required'),
        password: z.string().min(6, 'Password must be at least 6 characters').optional(),
        phone: z.string().optional(),
        role: z.enum(['trainer', 'head_trainer']).optional(),
        specializations: z.string().optional(),
        certifications: z.string().optional(),
        experience: z.number().int().min(0).optional(),
        bio: z.string().optional(),
        photoUrl: z.string().optional(),
      });

      const validationResult = createTrainerSchema.safeParse(req.body);
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return res.status(400).json({ error: error.message });
      }

      // Check if email already exists for a user
      const existingUser = await db!.select().from(schema.users).where(eq(schema.users.email, validationResult.data.email)).limit(1).then(rows => rows[0]);

      let trainerUserId: string;
      let passwordToSend: string;

      if (existingUser) {
        // Check if this user is already a trainer at this gym
        const existingTrainer = await db!.select().from(schema.trainers).where(and(eq(schema.trainers.userId, existingUser.id), eq(schema.trainers.gymId, user.gymId))).limit(1).then(rows => rows[0]);
        if (existingTrainer) {
          return res.status(400).json({ error: 'This email is already registered as a trainer at your gym' });
        }
        trainerUserId = existingUser.id;
        passwordToSend = '(existing account - use your current password)';
      } else {
        // Use provided password or generate a temporary one
        const tempPassword = validationResult.data.password || (Math.random().toString(36).slice(-8) + 'A1!');
        passwordToSend = tempPassword;
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const newUser = await db!.insert(schema.users).values({
          email: validationResult.data.email,
          passwordHash: hashedPassword,
          name: validationResult.data.name,
          phone: validationResult.data.phone,
          role: 'trainer',
        }).returning().then(rows => rows[0]);

        trainerUserId = newUser.id;

        // Send welcome email and WhatsApp with credentials
        const memberPortalUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}/login`
          : 'https://gymsaathi.com/login';

        const gym = await db!.select().from(schema.gyms).where(eq(schema.gyms.id, user.gymId)).limit(1).then(rows => rows[0]);

        if (gym) {
          // Send welcome email
          sendTrainerWelcomeEmail({
            gymName: gym.name,
            trainerName: validationResult.data.name,
            trainerEmail: validationResult.data.email,
            tempPassword: tempPassword,
            portalUrl: memberPortalUrl,
          }).catch(err => console.error('[notification] Failed to send trainer welcome email:', err));

          // Send WhatsApp welcome message
          if (validationResult.data.phone) {
            sendTrainerWelcomeWhatsApp({
              phoneNumber: validationResult.data.phone,
              gymName: gym.name,
              trainerName: validationResult.data.name,
              email: validationResult.data.email,
              tempPassword: tempPassword,
              portalUrl: memberPortalUrl,
            }).catch(err => console.error('[notification] Failed to send trainer welcome WhatsApp:', err));
          }
        }
      }

      const trainer = await storage.createTrainer({
        userId: trainerUserId,
        gymId: user.gymId,
        name: validationResult.data.name,
        email: validationResult.data.email,
        phone: validationResult.data.phone,
        role: validationResult.data.role,
        specializations: validationResult.data.specializations,
        certifications: validationResult.data.certifications,
        experience: validationResult.data.experience,
        bio: validationResult.data.bio,
        photoUrl: validationResult.data.photoUrl,
      });

      res.status(201).json(trainer);
    } catch (error: any) {
      console.error('Error creating trainer:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/trainers/:id', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const existingTrainer = await storage.getTrainerById(req.params.id);
      if (!existingTrainer) {
        return res.status(404).json({ error: 'Trainer not found' });
      }

      if (existingTrainer.gymId !== user.gymId && user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Access denied to this trainer' });
      }

      const updateTrainerSchema = z.object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        role: z.enum(['trainer', 'head_trainer']).optional(),
        specializations: z.string().optional(),
        certifications: z.string().optional(),
        experience: z.number().int().min(0).optional(),
        bio: z.string().optional(),
        photoUrl: z.string().optional(),
        status: z.enum(['active', 'inactive', 'on_leave']).optional(),
        isActive: z.number().int().min(0).max(1).optional(),
      });

      const validationResult = updateTrainerSchema.safeParse(req.body);
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return res.status(400).json({ error: error.message });
      }

      const trainer = await storage.updateTrainer(req.params.id, validationResult.data);
      res.json(trainer);
    } catch (error: any) {
      console.error('Error updating trainer:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/trainers/:id', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const existingTrainer = await storage.getTrainerById(req.params.id);
      if (!existingTrainer) {
        return res.status(404).json({ error: 'Trainer not found' });
      }

      if (existingTrainer.gymId !== user.gymId && user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Access denied to this trainer' });
      }

      await storage.deleteTrainer(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting trainer:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/trainer/stats', requireRole('trainer'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());

      const members = await db!.select().from(schema.members).where(eq(schema.members.gymId, user.gymId));
      const activeMembers = members.filter(m => m.status === 'active');

      const allClasses = await db!.select().from(schema.classes).where(eq(schema.classes.gymId, user.gymId));
      const todayClasses = allClasses.filter(c => {
        const classDate = new Date(c.startTime);
        return classDate >= today && classDate <= todayEnd;
      });

      const now = new Date();
      const upcomingClasses = todayClasses.filter(c => new Date(c.startTime) > now).length;
      const completedClasses = todayClasses.filter(c => new Date(c.endTime) < now).length;

      const todayAttendance = await db!.select().from(schema.attendance)
        .where(and(
          eq(schema.attendance.gymId, user.gymId),
          gte(schema.attendance.checkInTime, today),
          lte(schema.attendance.checkInTime, todayEnd)
        ));

      const weekAttendance = await db!.select().from(schema.attendance)
        .where(and(
          eq(schema.attendance.gymId, user.gymId),
          gte(schema.attendance.checkInTime, weekStart)
        ));

      const attendanceRate = activeMembers.length > 0 
        ? Math.round((weekAttendance.length / (activeMembers.length * 7)) * 100)
        : 0;

      res.json({
        totalMembers: members.length,
        activeMembers: activeMembers.length,
        todayClasses: todayClasses.length,
        upcomingClasses,
        completedClasses,
        todayCheckIns: todayAttendance.length,
        weeklyCheckIns: weekAttendance.length,
        attendanceRate: Math.min(attendanceRate, 100),
      });
    } catch (error: any) {
      console.error('Error fetching trainer stats:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/trainer/upcoming-classes', requireRole('trainer'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const allClasses = await db!.select().from(schema.classes)
        .where(and(
          eq(schema.classes.gymId, user.gymId),
          gte(schema.classes.startTime, today),
          lte(schema.classes.startTime, todayEnd)
        ))
        .orderBy(schema.classes.startTime);

      const upcomingClasses = await Promise.all(allClasses.map(async (cls) => {
        const bookings = await storage.listClassBookings(cls.id);
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
        const classType = await db!.select().from(schema.classTypes).where(eq(schema.classTypes.id, cls.classTypeId)).limit(1).then(rows => rows[0]);
        return {
          id: cls.id,
          name: classType?.name || 'Class',
          startTime: cls.startTime,
          endTime: cls.endTime,
          enrolledCount: confirmedBookings,
          capacity: cls.capacity,
        };
      }));

      res.json(upcomingClasses);
    } catch (error: any) {
      console.error('Error fetching upcoming classes:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/trainer/recent-checkins', requireRole('trainer'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const recentAttendance = await db!.select({
        id: schema.attendance.id,
        memberId: schema.attendance.memberId,
        checkInTime: schema.attendance.checkInTime,
        status: schema.attendance.status,
        memberName: schema.members.name,
      })
        .from(schema.attendance)
        .innerJoin(schema.members, eq(schema.attendance.memberId, schema.members.id))
        .where(and(
          eq(schema.attendance.gymId, user.gymId),
          gte(schema.attendance.checkInTime, today)
        ))
        .orderBy(desc(schema.attendance.checkInTime))
        .limit(10);

      const formattedCheckins = recentAttendance.map(a => ({
        id: a.id,
        memberName: a.memberName,
        checkInTime: a.checkInTime,
        status: a.status || 'in',
      }));

      res.json(formattedCheckins);
    } catch (error: any) {
      console.error('Error fetching recent check-ins:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/classes/:id/attendance', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const classData = await storage.getClassById(req.params.id);

      if (!classData) {
        return res.status(404).json({ error: 'Class not found' });
      }

      if (classData.gymId !== user.gymId) {
        return res.status(403).json({ error: 'Access denied to this class' });
      }

      const attendanceSchema = z.object({
        memberId: z.string().uuid(),
        status: z.enum(['present', 'absent', 'late']),
      });
      const validationResult = attendanceSchema.safeParse(req.body);

      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return res.status(400).json({ error: error.message });
      }

      const member = await db!.select().from(schema.members).where(eq(schema.members.id, validationResult.data.memberId)).limit(1).then(rows => rows[0]);

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      if (member.gymId !== user.gymId) {
        return res.status(403).json({ error: 'Member does not belong to your gym' });
      }

      const attendance = await storage.markClassAttendance(req.params.id, validationResult.data.memberId, validationResult.data.status);
      res.status(201).json(attendance);
    } catch (error: any) {
      console.error(`Error marking attendance for class ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/classes/:id/attendance', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const classData = await storage.getClassById(req.params.id);

      if (!classData) {
        return res.status(404).json({ error: 'Class not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && classData.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this class' });
      }

      const attendance = await storage.listClassAttendance(req.params.id);
      res.json(attendance);
    } catch (error: any) {
      console.error(`Error fetching attendance for class ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/attendance', requireAuth, async (req, res) => {
    try {
      const gymAttendanceSchema = z.object({
        action: z.enum(['checkIn', 'checkOut']),
        memberId: z.string().optional(),
      });

      const validationResult = gymAttendanceSchema.safeParse(req.body);
      if (!validationResult.success) {
        const error = fromZodError(validationResult.error);
        return res.status(400).json({ error: error.message });
      }

      const { action, memberId: providedMemberId } = validationResult.data;
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      let memberId: string;
      if (user.role === 'member') {
        const member = await db!.select().from(schema.members).where(eq(schema.members.userId, user.id)).limit(1).then(rows => rows[0]);

        if (!member) {
          return res.status(404).json({ error: 'Member profile not found' });
        }
        memberId = member.id;
      } else {
        if (!providedMemberId) {
          return res.status(400).json({ error: 'memberId is required for admin/trainer' });
        }
        const memberToCheck = await db!.select().from(schema.members).where(eq(schema.members.id, providedMemberId)).limit(1).then(rows => rows[0]);

        if (!memberToCheck || memberToCheck.gymId !== user.gymId) {
          return res.status(403).json({ error: 'Member not found or does not belong to your gym.' });
        }
        memberId = providedMemberId;
      }

      const attendance = await storage.markGymAttendance(user.gymId, memberId, action);
      res.status(201).json(attendance);
    } catch (error: any) {
      console.error('Error marking gym attendance:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/attendance', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const filters = {
        memberId: req.query.memberId as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
      };

      const attendance = await storage.listGymAttendance(user.gymId, filters);
      res.json(attendance);
    } catch (error: any) {
      console.error('Error fetching gym attendance:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/attendance/today', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const attendance = await storage.getTodayGymAttendance(user.gymId);
      res.json(attendance);
    } catch (error: any) {
      console.error('Error fetching today\'s gym attendance:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/members/:id/attendance', requireAuth, async (req, res) => {
    try {
      const member = await db!.select().from(schema.members).where(eq(schema.members.id, req.params.id)).limit(1).then(rows => rows[0]);

      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const user = await storage.getUserById(req.session!.userId!);
      if (user?.role !== 'superadmin' && member.gymId !== user?.gymId) {
        return res.status(403).json({ error: 'Access denied to this member' });
      }

      const history = await storage.getMemberAttendanceHistory(req.params.id);
      res.json(history);
    } catch (error: any) {
      console.error(`Error fetching attendance history for member ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/attendance/stats', requireRole('admin', 'trainer'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const period = (req.query.period as 'today' | 'week' | 'month') || 'today';
      const stats = await storage.getAttendanceStats(user.gymId, period);
      res.json(stats);
    } catch (error: any) {
      console.error('Error fetching attendance stats:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/attendance/my-checkin', requireRole('member'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const member = await db!.select().from(schema.members).where(eq(schema.members.userId, user.id)).limit(1).then(rows => rows[0]);

      if (!member) {
        return res.status(404).json({ error: 'Member profile not found' });
      }

      const activeCheckIn = await storage.getMemberActiveCheckIn(member.id);
      res.json(activeCheckIn);
    } catch (error: any) {
      console.error('Error fetching member\'s active check-in:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============= QR ATTENDANCE ROUTES =============

  // Admin: Get QR config for gym
  app.get('/api/admin/attendance/qr/config', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      let config = await storage.getAttendanceQrConfig(user.gymId);

      // If no config exists, create one
      if (!config) {
        config = await storage.createAttendanceQrConfig(user.gymId);
      }

      // Build QR data payload
      const qrPayload = JSON.stringify({
        type: 'gym_attendance',
        gymId: config.gymId,
        secret: config.secret
      });

      res.json({
        gymId: config.gymId,
        isEnabled: config.isEnabled,
        qrData: qrPayload,
        lastRotatedAt: config.lastRotatedAt
      });
    } catch (error: any) {
      console.error('Error fetching QR config:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Generate/Regenerate QR secret
  app.post('/api/admin/attendance/qr/generate', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const config = await storage.regenerateQrSecret(user.gymId);

      // Build QR data payload
      const qrPayload = JSON.stringify({
        type: 'gym_attendance',
        gymId: config.gymId,
        secret: config.secret
      });

      res.json({
        gymId: config.gymId,
        isEnabled: config.isEnabled,
        qrData: qrPayload,
        lastRotatedAt: config.lastRotatedAt
      });
    } catch (error: any) {
      console.error('Error regenerating QR secret:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Toggle QR attendance on/off
  app.post('/api/admin/attendance/qr/toggle', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const { isEnabled } = req.body;
      if (typeof isEnabled !== 'boolean') {
        return res.status(400).json({ error: 'isEnabled must be a boolean' });
      }

      // Ensure config exists
      let config = await storage.getAttendanceQrConfig(user.gymId);
      if (!config) {
        config = await storage.createAttendanceQrConfig(user.gymId);
      }

      config = await storage.toggleQrAttendance(user.gymId, isEnabled);

      res.json({
        gymId: config.gymId,
        isEnabled: config.isEnabled,
        lastRotatedAt: config.lastRotatedAt
      });
    } catch (error: any) {
      console.error('Error toggling QR attendance:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Member: Scan QR code to check in (check-in only, no toggle)
  app.post('/api/member/attendance/scan', requireRole('member'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const { qrData } = req.body;
      if (!qrData) {
        return res.status(400).json({ status: 'error', message: 'QR data is required' });
      }

      // Parse QR payload
      let qrPayload;
      try {
        qrPayload = JSON.parse(qrData);
      } catch {
        return res.status(400).json({ status: 'error', message: 'Invalid QR code format' });
      }

      // Validate QR payload structure
      if (qrPayload.type !== 'gym_attendance' || !qrPayload.gymId || !qrPayload.secret) {
        return res.status(400).json({ status: 'error', message: 'Invalid QR code' });
      }

      const { gymId, secret } = qrPayload;

      // Get QR config for the gym
      const config = await storage.getAttendanceQrConfig(gymId);
      if (!config) {
        return res.status(400).json({ status: 'error', message: 'QR attendance not configured for this gym' });
      }

      // Verify secret using timing-safe comparison
      const configSecret = config.secret || '';
      const providedSecret = secret || '';
      // Guard against length mismatch before timing-safe compare
      if (configSecret.length !== providedSecret.length) {
        return res.status(400).json({ status: 'error', message: 'Invalid QR code. The code may have been updated.' });
      }
      const configSecretBuffer = Buffer.from(configSecret);
      const providedSecretBuffer = Buffer.from(providedSecret);
      if (!crypto.timingSafeEqual(configSecretBuffer, providedSecretBuffer)) {
        return res.status(400).json({ status: 'error', message: 'Invalid QR code. The code may have been updated.' });
      }

      // Check if QR attendance is enabled
      if (!config.isEnabled) {
        return res.status(400).json({ status: 'error', message: 'QR attendance is currently disabled for this gym' });
      }

      // Get member profile for this user at this gym
      const member = await storage.getMemberByUserIdAndGym(user.id, gymId);
      if (!member) {
        return res.status(400).json({ status: 'error', message: 'You are not a member of this gym' });
      }

      // Check eligibility
      const eligibility = await storage.checkMemberQrEligibility(member.id, gymId);
      if (!eligibility.eligible) {
        return res.status(400).json({ status: 'error', message: eligibility.reason });
      }

      // Check if member already has an open session (auto-closes expired ones)
      const openSession = await storage.getOpenAttendanceSession(gymId, member.id, new Date());
      if (openSession) {
        // Member is already in gym - return ALREADY_IN_GYM error
        return res.status(400).json({
          status: 'error',
          code: 'ALREADY_IN_GYM',
          message: "You are already checked in. Use the Check Out button to leave."
        });
      }

      // Create new check-in record
      const record = await storage.createCheckIn(gymId, member.id, 'qr_scan');

      res.json({
        status: 'checked_in',
        message: "You're checked in! Have a great workout!",
        record
      });
    } catch (error: any) {
      console.error('Error processing QR attendance:', error);
      // Handle duplicate check-in race condition gracefully
      if (error.message === 'Already checked in. Please check out first.') {
        return res.status(409).json({ 
          status: 'error', 
          code: 'ALREADY_IN_GYM',
          message: "You are already checked in. Use the Check Out button to leave."
        });
      }
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // Member: Check out via button (not QR)
  app.post('/api/member/attendance/checkout', requireRole('member'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Get member profile
      const member = await db!.select().from(schema.members).where(eq(schema.members.userId, user.id)).limit(1).then(rows => rows[0]);
      if (!member) {
        return res.status(404).json({ 
          status: 'error', 
          code: 'MEMBER_NOT_FOUND',
          message: 'Member profile not found' 
        });
      }

      // Get open session (auto-closes expired sessions)
      const openSession = await storage.getOpenAttendanceSession(member.gymId, member.id, new Date());

      if (!openSession) {
        // No open session - member is not in gym
        return res.status(400).json({
          status: 'error',
          code: 'NOT_IN_GYM',
          message: "You are not currently checked in."
        });
      }

      // Close the session manually
      const record = await storage.closeCheckInManually(openSession.id, new Date());

      res.json({
        status: 'checked_out',
        message: "You're checked out. See you again!",
        record
      });
    } catch (error: any) {
      console.error('Error processing checkout:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // Member: Get attendance history
  app.get('/api/member/attendance/history', requireRole('member'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const member = await db!.select().from(schema.members).where(eq(schema.members.userId, user.id)).limit(1).then(rows => rows[0]);
      if (!member) {
        return res.status(404).json({ error: 'Member profile not found' });
      }

      const limit = parseInt(req.query.limit as string) || 30;

      const history = await db!.select()
        .from(schema.attendance)
        .where(eq(schema.attendance.memberId, member.id))
        .orderBy(desc(schema.attendance.checkInTime))
        .limit(limit);

      res.json(history.map(row => ({
        id: row.id,
        gymId: row.gymId,
        checkInTime: row.checkInTime,
        checkOutTime: row.checkOutTime,
        status: row.status,
        exitType: row.exitType,
        source: row.source,
        createdAt: row.createdAt
      })));
    } catch (error: any) {
      console.error('Error fetching member attendance history:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Member: Get today's attendance status (uses strict state machine with auto-close)
  app.get('/api/member/attendance/today', requireRole('member'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const member = await db!.select().from(schema.members).where(eq(schema.members.userId, user.id)).limit(1).then(rows => rows[0]);
      if (!member) {
        return res.status(404).json({ error: 'Member profile not found' });
      }

      // Use the new state machine-based function with auto-close logic
      const { inGym, lastRecord } = await storage.getMemberAttendanceToday(member.gymId, member.id);

      if (!lastRecord) {
        return res.json({
          status: 'not_checked_in',
          message: 'You have not checked in today',
          record: null
        });
      }

      // Determine status based on inGym flag (which already accounts for auto-close)
      const status = inGym ? 'in_gym' : 'checked_out';

      res.json({
        status,
        message: inGym 
          ? "You're currently in the gym" 
          : lastRecord.exitType === 'auto' 
            ? "Your session was auto-closed after 3 hours" 
            : "You've checked out for the day",
        record: {
          id: lastRecord.id,
          checkInTime: lastRecord.checkInTime,
          checkOutTime: lastRecord.checkOutTime,
          status: lastRecord.status,
          exitType: lastRecord.exitType,
          source: lastRecord.source
        }
      });
    } catch (error: any) {
      console.error('Error fetching today attendance status:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Store Settings Routes
  app.get('/api/store-settings', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const settings = await db!.select().from(schema.storeSettings).where(eq(schema.storeSettings.gymId, user.gymId)).limit(1).then(rows => rows[0]);

      if (!settings) {
        // Create default settings if none exist
        const newSettings = await db!.insert(schema.storeSettings).values({
          gymId: user.gymId,
        }).returning().then(rows => rows[0]);
        return res.json(newSettings);
      }

      res.json(settings);
    } catch (error: any) {
      console.error('Error fetching store settings:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/store-settings', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const existing = await db!.select().from(schema.storeSettings).where(eq(schema.storeSettings.gymId, user.gymId)).limit(1).then(rows => rows[0]);

      let settings;
      if (existing) {
        settings = await db!.update(schema.storeSettings).set({ ...req.body, updatedAt: new Date() }).where(eq(schema.storeSettings.gymId, user.gymId)).returning().then(rows => rows[0]);
      } else {
        settings = await db!.insert(schema.storeSettings).values({
          ...req.body,
          gymId: user.gymId,
        }).returning().then(rows => rows[0]);
      }

      res.json(settings);
    } catch (error: any) {
      console.error('Error updating store settings:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Store Analytics
  app.get('/api/store/analytics', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const today = new Date(new Date().toISOString().split('T')[0]);

      // Revenue this month
      const monthlyOrders = await db!.select().from(schema.orders).where(and(eq(schema.orders.gymId, user.gymId), gte(schema.orders.orderDate, startOfMonth)));
      const revenueThisMonth = monthlyOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);

      // Orders today
      const todayOrders = await db!.select().from(schema.orders).where(and(eq(schema.orders.gymId, user.gymId), gte(schema.orders.orderDate, today)));
      const ordersToday = todayOrders.length;

      // Pending orders
      const pendingOrders = await db!.select().from(schema.orders).where(and(eq(schema.orders.gymId, user.gymId), eq(schema.orders.status, 'pending')));
      const pendingCount = pendingOrders.length;

      // Completed orders
      const completedOrders = await db!.select().from(schema.orders).where(and(eq(schema.orders.gymId, user.gymId), eq(schema.orders.status, 'delivered')));
      const completedCount = completedOrders.length;

      // Low stock alerts
      const products = await db!.select().from(schema.products).where(eq(schema.products.gymId, user.gymId));
      const lowStock = products.filter(p => p.stock <= (p.lowStockAlert ?? 10) && p.stock > 0).length;

      // Best selling products (top 5)
      const allOrders = await db!.select().from(schema.orders).where(eq(schema.orders.gymId, user.gymId));
      const orderIds = allOrders.map(o => o.id);

      const orderItems = orderIds.length > 0 
        ? await db!.select().from(schema.orderItems).where(sql`${schema.orderItems.orderId} IN ${orderIds}`)
        : [];

      const productSales: Record<string, { productId: string; productName: string; totalQuantity: number; revenue: number }> = {};
      orderItems.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            productId: item.productId,
            productName: item.productName,
            totalQuantity: 0,
            revenue: 0,
          };
        }
        productSales[item.productId].totalQuantity += item.quantity;
        productSales[item.productId].revenue += parseFloat(item.price) * item.quantity;
      });

      const bestSelling = Object.values(productSales)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 5);

      // Recent orders
      const recentOrders = await db!.select().from(schema.orders)
        .where(eq(schema.orders.gymId, user.gymId))
        .orderBy(desc(schema.orders.orderDate))
        .limit(10);

      res.json({
        revenueThisMonth,
        ordersToday,
        pendingOrders: pendingCount,
        completedOrders: completedCount,
        lowStockAlerts: lowStock,
        bestSellingProducts: bestSelling,
        recentOrders,
      });
    } catch (error: any) {
      console.error('Error fetching store analytics:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Shop Orders Revenue Dashboard API - Admins only (trainers cannot access order data)
  app.get('/api/admin/shop-revenue', requireRole('admin'), async (req, res) => {
    try {
      const user = await storage.getUserById(req.session!.userId!);
      if (!user || !user.gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const period = (req.query.period as string) || '30days';
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let startDate: Date;
      switch (period) {
        case 'today':
          startDate = today;
          break;
        case '7days':
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      let orders: any[] = [];
      let members: Map<string, string> = new Map();

      if (!isDbAvailable()) {
        // Use Supabase directly when Drizzle DB is not available
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('gym_id', user.gymId)
          .gte('order_date', startDate.toISOString())
          .order('order_date', { ascending: false });

        if (orderError) {
          console.error('Supabase order fetch error:', orderError);
          orders = [];
        } else {
          orders = (orderData || []).map(o => ({
            id: o.id,
            orderNumber: o.order_number,
            memberId: o.member_id,
            totalAmount: o.total_amount,
            status: o.status,
            paymentStatus: o.payment_status,
            orderDate: o.order_date,
            gymId: o.gym_id,
          }));
        }

        // Fetch member names for recent orders
        const memberIds = Array.from(new Set(orders.slice(0, 10).map(o => o.memberId).filter(Boolean)));
        if (memberIds.length > 0) {
          const { data: memberData } = await supabase
            .from('members')
            .select('id, name')
            .in('id', memberIds);
          
          if (memberData) {
            memberData.forEach(m => members.set(m.id, m.name));
          }
        }
      } else {
        // Use Drizzle when available
        orders = await db!.select().from(schema.orders)
          .where(and(
            eq(schema.orders.gymId, user.gymId),
            gte(schema.orders.orderDate, startDate)
          ))
          .orderBy(desc(schema.orders.orderDate));

        // Fetch member names for recent orders
        const memberIds = Array.from(new Set(orders.slice(0, 10).map(o => o.memberId).filter(Boolean)));
        if (memberIds.length > 0 && db) {
          const memberData = await db.select({ id: schema.members.id, name: schema.members.name })
            .from(schema.members)
            .where(inArray(schema.members.id, memberIds));
          
          memberData.forEach(m => members.set(m.id, m.name));
        }
      }

      // Calculate totals
      const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount || '0'), 0);
      const ordersCount = orders.length;
      const avgOrderValue = ordersCount > 0 ? totalRevenue / ordersCount : 0;

      // Today's revenue
      const todayOrders = orders.filter(o => {
        const orderDate = new Date(o.orderDate!);
        return orderDate >= today;
      });
      const todayRevenue = todayOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || '0'), 0);

      // This month's revenue
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      let monthlyRevenue = 0;
      
      if (!isDbAvailable()) {
        const { data: monthlyOrderData } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('gym_id', user.gymId)
          .gte('order_date', startOfMonth.toISOString());
        
        monthlyRevenue = (monthlyOrderData || []).reduce(
          (sum, order) => sum + parseFloat(order.total_amount || '0'), 0
        );
      } else {
        const monthlyOrders = await db!.select().from(schema.orders)
          .where(and(
            eq(schema.orders.gymId, user.gymId),
            gte(schema.orders.orderDate, startOfMonth)
          ));
        monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || '0'), 0);
      }

      // Group orders by date for graph data
      const revenueByDate: Record<string, number> = {};
      
      // Initialize all dates in the range with 0
      const current = new Date(startDate);
      while (current <= now) {
        const dateStr = current.toISOString().split('T')[0];
        revenueByDate[dateStr] = 0;
        current.setDate(current.getDate() + 1);
      }

      // Sum revenue for each date
      orders.forEach(order => {
        if (order.orderDate) {
          const dateStr = new Date(order.orderDate).toISOString().split('T')[0];
          if (revenueByDate[dateStr] !== undefined) {
            revenueByDate[dateStr] += parseFloat(order.totalAmount || '0');
          }
        }
      });

      // Convert to array and sort by date
      const graphData = Object.entries(revenueByDate)
        .map(([date, revenue]) => ({
          date,
          revenue: Math.round(revenue * 100) / 100,
          displayDate: new Date(date).toLocaleDateString('en-IN', { 
            month: 'short', 
            day: 'numeric' 
          }),
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Get recent orders with member info from pre-fetched members map
      const recentOrders = orders.slice(0, 10).map((order) => {
        const memberName = order.memberId ? (members.get(order.memberId) || 'Unknown Member') : 'Unknown Member';
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          memberName,
          totalAmount: parseFloat(order.totalAmount || '0'),
          status: order.status,
          paymentStatus: order.paymentStatus,
          orderDate: order.orderDate,
        };
      });

      res.json({
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        ordersCount,
        todayRevenue: Math.round(todayRevenue * 100) / 100,
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        graphData,
        recentOrders,
        period,
      });
    } catch (error: any) {
      console.error('Error fetching shop revenue:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ NOTIFICATIONS API ============

  // Get notifications for current user
  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      if (!isDbAvailable()) {
        const notifications = await supabaseRepo.getNotifications(userId);
        return res.json(notifications);
      }

      const notifications = await db!.select()
        .from(schema.notifications)
        .where(eq(schema.notifications.userId, userId))
        .orderBy(desc(schema.notifications.createdAt))
        .limit(50);

      res.json(notifications);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get unread notification count
  app.get('/api/notifications/unread-count', requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      if (!isDbAvailable()) {
        const count = await supabaseRepo.getUnreadNotificationCount(userId);
        return res.json({ count });
      }

      const result = await db!.select({ count: sql<number>`count(*)` })
        .from(schema.notifications)
        .where(and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.isRead, 0)
        ));

      res.json({ count: Number(result[0]?.count || 0) });
    } catch (error: any) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mark notification as read
  app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      if (!isDbAvailable()) {
        const success = await supabaseRepo.markNotificationAsRead(req.params.id, userId);
        if (!success) {
          return res.status(404).json({ error: 'Notification not found' });
        }
        return res.json({ success: true });
      }

      const notification = await db!.select()
        .from(schema.notifications)
        .where(and(
          eq(schema.notifications.id, req.params.id),
          eq(schema.notifications.userId, userId)
        ))
        .limit(1)
        .then(rows => rows[0]);

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      await db!.update(schema.notifications)
        .set({ isRead: 1 })
        .where(eq(schema.notifications.id, req.params.id));

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mark all notifications as read
  app.patch('/api/notifications/mark-all-read', requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId!;

      if (!isDbAvailable()) {
        await supabaseRepo.markAllNotificationsAsRead(userId);
        return res.json({ success: true });
      }

      await db!.update(schema.notifications)
        .set({ isRead: 1 })
        .where(eq(schema.notifications.userId, userId));

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // =============================================
  // ADMIN PAYMENT DETAILS ENDPOINTS
  // =============================================

  // Get admin payment details
  app.get('/api/admin/payment-details', requireRole('admin'), async (req, res) => {
    try {
      if (!isDbAvailable()) {
        return res.status(503).json({ error: 'Database not available' });
      }

      const user = await userAccess.getUserById(req.session!.userId!);
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      // Get gymId from gymAdmins table for admin users
      let gymId = user.gymId;
      if (!gymId) {
        const gymAdmin = await db!.select()
          .from(schema.gymAdmins)
          .where(eq(schema.gymAdmins.userId, user.id))
          .limit(1)
          .then(rows => rows[0]);
        gymId = gymAdmin?.gymId || null;
      }

      if (!gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const details = await db!.select()
        .from(schema.adminPaymentDetails)
        .where(eq(schema.adminPaymentDetails.gymId, gymId))
        .limit(1)
        .then(rows => rows[0] || null);

      res.json({ paymentDetails: details });
    } catch (error: any) {
      console.error('Error getting admin payment details:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create or update admin payment details
  app.put('/api/admin/payment-details', requireRole('admin'), async (req, res) => {
    try {
      if (!isDbAvailable()) {
        return res.status(503).json({ error: 'Database not available' });
      }

      const user = await userAccess.getUserById(req.session!.userId!);
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      // Get gymId from gymAdmins table for admin users
      let gymId = user.gymId;
      if (!gymId) {
        const gymAdmin = await db!.select()
          .from(schema.gymAdmins)
          .where(eq(schema.gymAdmins.userId, user.id))
          .limit(1)
          .then(rows => rows[0]);
        gymId = gymAdmin?.gymId || null;
      }

      if (!gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const { qrUrl, upiId, bankAccountNumber, ifscCode, holderName } = req.body;

      // Validate required fields
      if (!upiId && !bankAccountNumber) {
        return res.status(400).json({ error: 'At least UPI ID or Bank Account Number is required' });
      }

      // Check if details already exist for this gym
      const existing = await db!.select()
        .from(schema.adminPaymentDetails)
        .where(eq(schema.adminPaymentDetails.gymId, gymId))
        .limit(1)
        .then(rows => rows[0] || null);

      let details;
      if (existing) {
        // Update existing
        details = await db!.update(schema.adminPaymentDetails)
          .set({
            qrUrl: qrUrl || existing.qrUrl,
            upiId: upiId || existing.upiId,
            bankAccountNumber: bankAccountNumber || existing.bankAccountNumber,
            ifscCode: ifscCode || existing.ifscCode,
            holderName: holderName || existing.holderName,
            updatedAt: new Date(),
          })
          .where(eq(schema.adminPaymentDetails.id, existing.id))
          .returning()
          .then(rows => rows[0]);
      } else {
        // Create new
        details = await db!.insert(schema.adminPaymentDetails)
          .values({
            adminId: user.id,
            gymId: gymId,
            qrUrl,
            upiId,
            bankAccountNumber,
            ifscCode,
            holderName,
          })
          .returning()
          .then(rows => rows[0]);
      }

      res.json({ paymentDetails: details, message: 'Payment details saved successfully' });
    } catch (error: any) {
      console.error('Error saving admin payment details:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Upload QR code - uploads to Supabase storage for public URL access
  app.post('/api/admin/payment-details/upload-qr', requireRole('admin'), async (req, res) => {
    try {
      if (!isDbAvailable()) {
        return res.status(503).json({ error: 'Database not available' });
      }

      const user = await userAccess.getUserById(req.session!.userId!);
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      // Get gymId from gymAdmins table for admin users
      let gymId = user.gymId;
      if (!gymId) {
        const gymAdmin = await db!.select()
          .from(schema.gymAdmins)
          .where(eq(schema.gymAdmins.userId, user.id))
          .limit(1)
          .then(rows => rows[0]);
        gymId = gymAdmin?.gymId || null;
      }

      if (!gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const { base64Image } = req.body;
      if (!base64Image) {
        return res.status(400).json({ error: 'Base64 image data is required' });
      }

      // Validate base64 image format
      if (!base64Image.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format. Please upload a valid image file.' });
      }

      // Check image size (max 2MB)
      const sizeInBytes = (base64Image.length * 3) / 4;
      if (sizeInBytes > 2 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image too large. Please upload an image smaller than 2MB.' });
      }

      // Extract base64 data and image type
      const matches = base64Image.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: 'Invalid base64 image format' });
      }

      const [, imageType, base64Data] = matches;
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `payment-qr-${gymId}-${Date.now()}.${imageType}`;

      let qrUrl: string;

      // Try to upload to Supabase storage using admin client (service role key)
      if (supabaseAdmin) {
        try {
          // Upload to Supabase storage with service role key
          const { data, error } = await supabaseAdmin.storage
            .from('payment-qr-codes')
            .upload(fileName, buffer, {
              contentType: `image/${imageType}`,
              upsert: true,
            });

          if (error) {
            // If bucket doesn't exist, create it and retry
            if (error.message.includes('Bucket not found') || error.message.includes('not found')) {
              console.log('[qr-upload] Bucket not found, creating with service role key...');
              const { error: createError } = await supabaseAdmin.storage.createBucket('payment-qr-codes', {
                public: true,
                fileSizeLimit: 2 * 1024 * 1024,
              });
              
              if (createError && !createError.message.includes('already exists')) {
                console.error('[qr-upload] Failed to create bucket:', createError);
                throw createError;
              }
              console.log('[qr-upload] Bucket created successfully');

              // Retry upload
              const { data: retryData, error: retryError } = await supabaseAdmin.storage
                .from('payment-qr-codes')
                .upload(fileName, buffer, {
                  contentType: `image/${imageType}`,
                  upsert: true,
                });

              if (retryError) {
                console.error('[qr-upload] Retry upload failed:', retryError);
                throw retryError;
              }
              console.log('[qr-upload] Upload succeeded after bucket creation');
            } else {
              console.error('[qr-upload] Upload error:', error.message);
              throw error;
            }
          }

          // Get public URL
          const { data: urlData } = supabaseAdmin.storage
            .from('payment-qr-codes')
            .getPublicUrl(fileName);

          qrUrl = urlData.publicUrl;
          console.log(`[qr-upload] ✅ Uploaded to Supabase storage: ${qrUrl}`);
        } catch (storageError: any) {
          console.error('[qr-upload] ❌ Supabase storage failed, falling back to base64:', storageError.message);
          // Fall back to base64 storage
          qrUrl = base64Image;
        }
      } else {
        console.log('[qr-upload] ⚠️ No Supabase admin client available, using base64 storage');
        // No Supabase admin client, use base64 storage
        qrUrl = base64Image;
      }

      // Update payment details with new QR URL
      const existing = await db!.select()
        .from(schema.adminPaymentDetails)
        .where(eq(schema.adminPaymentDetails.gymId, gymId))
        .limit(1)
        .then(rows => rows[0] || null);

      if (existing) {
        await db!.update(schema.adminPaymentDetails)
          .set({ qrUrl, updatedAt: new Date() })
          .where(eq(schema.adminPaymentDetails.id, existing.id));
      } else {
        await db!.insert(schema.adminPaymentDetails)
          .values({
            adminId: user.id,
            gymId: gymId,
            qrUrl,
          });
      }

      res.json({ qrUrl, message: 'QR code uploaded successfully' });
    } catch (error: any) {
      console.error('Error uploading QR code:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Send payment details to member(s) via WhatsApp/Email
  app.post('/api/admin/payment-details/send', requireRole('admin'), async (req, res) => {
    try {
      if (!isDbAvailable()) {
        return res.status(503).json({ error: 'Database not available' });
      }

      const user = await userAccess.getUserById(req.session!.userId!);
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      // Get gymId from gymAdmins table for admin users
      let gymId = user.gymId;
      if (!gymId) {
        const gymAdmin = await db!.select()
          .from(schema.gymAdmins)
          .where(eq(schema.gymAdmins.userId, user.id))
          .limit(1)
          .then(rows => rows[0]);
        gymId = gymAdmin?.gymId || null;
      }

      if (!gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const { memberIds, channels, customContact, customContactType } = req.body;
      
      // Validate: either memberIds or customContact must be provided
      const hasMembers = memberIds && Array.isArray(memberIds) && memberIds.length > 0;
      const hasCustomContact = customContact && typeof customContact === 'string' && customContact.trim();
      
      if (!hasMembers && !hasCustomContact) {
        return res.status(400).json({ error: 'Please select members or enter a contact to send payment details' });
      }
      if (!channels || (!channels.whatsapp && !channels.email)) {
        return res.status(400).json({ error: 'At least one channel (whatsapp or email) must be selected' });
      }

      // Get payment details
      const paymentDetails = await db!.select()
        .from(schema.adminPaymentDetails)
        .where(eq(schema.adminPaymentDetails.gymId, gymId))
        .limit(1)
        .then(rows => rows[0]);

      if (!paymentDetails) {
        return res.status(404).json({ error: 'Payment details not configured. Please add your payment details first.' });
      }

      // Get gym info
      const gym = await db!.select().from(schema.gyms).where(eq(schema.gyms.id, gymId)).limit(1).then(rows => rows[0]);

      const results = {
        success: [] as string[],
        failed: [] as { contact: string; error: string }[]
      };

      // Handle sending to custom contact (any phone/email)
      if (hasCustomContact) {
        try {
          const contact = customContact.trim();
          const isEmail = contact.includes('@');
          const recipientName = 'Customer';
          
          if (isEmail && channels.email) {
            await sendPaymentDetailsEmail(contact, recipientName, paymentDetails, gym?.name || 'Our Gym');
            results.success.push(contact);
          } else if (!isEmail && channels.whatsapp) {
            const phoneValidation = validateAndFormatPhoneNumber(contact);
            if (phoneValidation.isValid) {
              try {
                await sendPaymentDetailsWhatsApp(contact, recipientName, paymentDetails, gym?.name || 'Our Gym');
                results.success.push(contact);
              } catch (whatsappError) {
                console.log('WhatsApp API not available for custom contact');
                results.failed.push({ contact, error: 'WhatsApp sending failed' });
              }
            } else {
              results.failed.push({ contact, error: 'Invalid phone number format' });
            }
          } else {
            results.failed.push({ contact, error: 'Channel not available for this contact type' });
          }
        } catch (customError: any) {
          results.failed.push({ contact: customContact, error: customError.message });
        }
      }

      // Handle sending to selected members
      if (hasMembers) {
        // Use inArray for proper query
        const members = await db!.select()
          .from(schema.members)
          .where(and(
            eq(schema.members.gymId, gymId),
            inArray(schema.members.id, memberIds)
          ));

        for (const member of members) {
          try {
            if (channels.whatsapp && member.phone) {
              const phoneValidation = validateAndFormatPhoneNumber(member.phone);
              if (phoneValidation.isValid) {
                try {
                  await sendPaymentDetailsWhatsApp(member.phone, member.name, paymentDetails, gym?.name || 'Our Gym');
                } catch (whatsappError) {
                  console.log('WhatsApp API not available, using fallback');
                }
              }
            }

            if (channels.email && member.email) {
              await sendPaymentDetailsEmail(member.email, member.name, paymentDetails, gym?.name || 'Our Gym');
            }

            results.success.push(member.name || member.id);
          } catch (memberError: any) {
            results.failed.push({ contact: member.name || member.id, error: memberError.message });
          }
        }
      }

      const successCount = results.success.length;
      const message = hasCustomContact && !hasMembers
        ? `Payment details sent to ${customContact}`
        : `Payment details sent to ${successCount} recipient(s)`;

      res.json({ message, results });
    } catch (error: any) {
      console.error('Error sending payment details:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // =============================================
  // PENDING PAYMENTS & ANALYTICS ENDPOINTS
  // =============================================

  // Get pending payments with member details
  app.get('/api/admin/pending-payments', requireRole('admin'), async (req, res) => {
    try {
      if (!isDbAvailable()) {
        return res.status(503).json({ error: 'Database not available' });
      }

      const user = await userAccess.getUserById(req.session!.userId!);
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      // Get gymId from gymAdmins table for admin users
      let gymId = user.gymId;
      if (!gymId) {
        const gymAdmin = await db!.select()
          .from(schema.gymAdmins)
          .where(eq(schema.gymAdmins.userId, user.id))
          .limit(1)
          .then(rows => rows[0]);
        gymId = gymAdmin?.gymId || null;
      }

      if (!gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      // Get all invoices with pending/partially_paid status for this gym
      const pendingInvoices = await db!.select({
        invoiceId: schema.invoices.id,
        invoiceNumber: schema.invoices.invoiceNumber,
        memberId: schema.invoices.memberId,
        memberName: schema.members.name,
        memberEmail: schema.members.email,
        memberPhone: schema.members.phone,
        memberJoinedAt: schema.members.joinDate,
        totalAmount: schema.invoices.amount,
        amountPaid: schema.invoices.amountPaid,
        amountDue: schema.invoices.amountDue,
        dueDate: schema.invoices.dueDate,
        status: schema.invoices.status,
        createdAt: schema.invoices.createdAt,
      })
        .from(schema.invoices)
        .innerJoin(schema.members, eq(schema.invoices.memberId, schema.members.id))
        .where(and(
          eq(schema.invoices.gymId, gymId),
          or(
            eq(schema.invoices.status, 'pending'),
            eq(schema.invoices.status, 'partially_paid')
          )
        ))
        .orderBy(desc(schema.invoices.dueDate));

      // Also get members with pending payments (amountDue > 0) from payments table
      const pendingPayments = await db!.select({
        paymentId: schema.payments.id,
        memberId: schema.payments.memberId,
        memberName: schema.members.name,
        memberEmail: schema.members.email,
        memberPhone: schema.members.phone,
        memberJoinedAt: schema.members.joinDate,
        totalAmount: schema.payments.totalAmount,
        amountPaid: schema.payments.amount,
        amountDue: schema.payments.amountDue,
        status: schema.payments.status,
        createdAt: schema.payments.createdAt,
      })
        .from(schema.payments)
        .innerJoin(schema.members, eq(schema.payments.memberId, schema.members.id))
        .where(and(
          eq(schema.payments.gymId, gymId),
          or(
            eq(schema.payments.status, 'pending'),
            eq(schema.payments.status, 'partially_paid')
          )
        ))
        .orderBy(desc(schema.payments.createdAt));

      // Combine and format results
      const allPending = [
        ...pendingInvoices.map(inv => ({
          id: inv.invoiceId,
          type: 'invoice' as const,
          invoiceNumber: inv.invoiceNumber,
          memberId: inv.memberId,
          memberName: inv.memberName,
          memberEmail: inv.memberEmail,
          memberPhone: inv.memberPhone,
          joinedAt: inv.memberJoinedAt,
          totalAmount: parseFloat(inv.totalAmount || '0'),
          amountPaid: parseFloat(inv.amountPaid || '0'),
          amountDue: parseFloat(inv.amountDue || '0'),
          dueDate: inv.dueDate,
          status: inv.status,
          createdAt: inv.createdAt,
        })),
        ...pendingPayments.map(pay => ({
          id: pay.paymentId,
          type: 'payment' as const,
          invoiceNumber: null,
          memberId: pay.memberId,
          memberName: pay.memberName,
          memberEmail: pay.memberEmail,
          memberPhone: pay.memberPhone,
          joinedAt: pay.memberJoinedAt,
          totalAmount: parseFloat(pay.totalAmount || '0'),
          amountPaid: parseFloat(pay.amountPaid || '0'),
          amountDue: parseFloat(pay.amountDue || '0'),
          dueDate: null,
          status: pay.status,
          createdAt: pay.createdAt,
        })),
      ];

      // Calculate summary
      const totalPendingAmount = allPending.reduce((sum, p) => sum + p.amountDue, 0);
      const totalInvoices = allPending.length;

      res.json({
        pendingPayments: allPending,
        summary: {
          totalPendingAmount,
          totalInvoices,
        }
      });
    } catch (error: any) {
      console.error('Error fetching pending payments:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Send payment reminder to a member
  app.post('/api/admin/send-payment-reminder', requireRole('admin'), async (req, res) => {
    try {
      if (!isDbAvailable()) {
        return res.status(503).json({ error: 'Database not available' });
      }

      const user = await userAccess.getUserById(req.session!.userId!);
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      // Get gymId from gymAdmins table for admin users
      let gymId = user.gymId;
      if (!gymId) {
        const gymAdmin = await db!.select()
          .from(schema.gymAdmins)
          .where(eq(schema.gymAdmins.userId, user.id))
          .limit(1)
          .then(rows => rows[0]);
        gymId = gymAdmin?.gymId || null;
      }

      if (!gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const { memberId, memberName, memberPhone, memberEmail, amountDue, dueDate } = req.body;

      if (!memberId) {
        return res.status(400).json({ error: 'Member ID is required' });
      }

      // Get gym info
      const gym = await db!.select().from(schema.gyms).where(eq(schema.gyms.id, gymId)).limit(1).then(rows => rows[0]);
      const gymName = gym?.name || 'Our Gym';

      const results = {
        whatsapp: false,
        email: false,
        errors: [] as string[]
      };

      // Send WhatsApp reminder
      if (memberPhone) {
        try {
          const phoneValidation = validateAndFormatPhoneNumber(memberPhone);
          if (phoneValidation.isValid) {
            await sendPaymentReminderWhatsApp(
              memberPhone,
              memberName || 'Member',
              amountDue,
              dueDate,
              gymName
            );
            results.whatsapp = true;
          } else {
            results.errors.push('Invalid phone number');
          }
        } catch (whatsappError: any) {
          console.error('WhatsApp reminder error:', whatsappError);
          results.errors.push('WhatsApp sending failed');
        }
      }

      // Send Email reminder
      if (memberEmail) {
        try {
          await sendPaymentReminderEmail(
            memberEmail,
            memberName || 'Member',
            amountDue,
            dueDate,
            gymName
          );
          results.email = true;
        } catch (emailError: any) {
          console.error('Email reminder error:', emailError);
          results.errors.push('Email sending failed');
        }
      }

      if (!results.whatsapp && !results.email) {
        return res.status(400).json({ 
          error: 'Could not send reminder. No valid contact info or sending failed.',
          details: results.errors
        });
      }

      res.json({
        success: true,
        message: `Reminder sent via ${[results.whatsapp && 'WhatsApp', results.email && 'Email'].filter(Boolean).join(' and ')}`,
        results
      });
    } catch (error: any) {
      console.error('Error sending payment reminder:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get admin analytics data
  app.get('/api/admin/analytics', requireRole('admin'), async (req, res) => {
    try {
      if (!isDbAvailable()) {
        return res.status(503).json({ error: 'Database not available' });
      }

      const user = await userAccess.getUserById(req.session!.userId!);
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      // Get gymId from gymAdmins table for admin users
      let gymId = user.gymId;
      if (!gymId) {
        const gymAdmin = await db!.select()
          .from(schema.gymAdmins)
          .where(eq(schema.gymAdmins.userId, user.id))
          .limit(1)
          .then(rows => rows[0]);
        gymId = gymAdmin?.gymId || null;
      }

      if (!gymId) {
        return res.status(400).json({ error: 'User must be associated with a gym' });
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get all members for this gym
      const allMembers = await db!.select()
        .from(schema.members)
        .where(eq(schema.members.gymId, gymId));

      const activeMembers = allMembers.filter(m => m.status === 'active');
      const newMembersThisMonth = allMembers.filter(m => 
        m.joinDate && new Date(m.joinDate) >= startOfMonth
      );

      // Get memberships expiring in next 7 days
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const expiringMemberships = await db!.select()
        .from(schema.memberships)
        .where(and(
          eq(schema.memberships.gymId, gymId),
          eq(schema.memberships.status, 'active'),
          lte(schema.memberships.endDate, sevenDaysLater),
          gte(schema.memberships.endDate, now)
        ));

      // Get revenue data - payments for this gym
      const allPayments = await db!.select()
        .from(schema.payments)
        .where(eq(schema.payments.gymId, gymId));

      const paidPayments = allPayments.filter(p => p.status === 'paid');
      const pendingPayments = allPayments.filter(p => p.status === 'pending' || p.status === 'partially_paid');

      const totalCollected = paidPayments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
      const totalPending = pendingPayments.reduce((sum, p) => sum + parseFloat(p.amountDue || '0'), 0);

      // This month's collection
      const thisMonthPayments = paidPayments.filter(p => 
        p.paymentDate && new Date(p.paymentDate) >= startOfMonth
      );
      const thisMonthCollection = thisMonthPayments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

      // Last month's collection for comparison
      const lastMonthPayments = paidPayments.filter(p => 
        p.paymentDate && new Date(p.paymentDate) >= startOfLastMonth && new Date(p.paymentDate) <= endOfLastMonth
      );
      const lastMonthCollection = lastMonthPayments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

      const collectionGrowth = lastMonthCollection > 0 
        ? ((thisMonthCollection - lastMonthCollection) / lastMonthCollection) * 100 
        : (thisMonthCollection > 0 ? 100 : 0);

      // Attendance data for last 7 days
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const attendanceRecords = await db!.select()
        .from(schema.attendance)
        .where(and(
          eq(schema.attendance.gymId, gymId),
          gte(schema.attendance.checkInTime, sevenDaysAgo)
        ));

      // Group attendance by day
      const attendanceByDay: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        attendanceByDay[dateStr] = 0;
      }
      attendanceRecords.forEach(record => {
        if (record.checkInTime) {
          const dateStr = new Date(record.checkInTime).toISOString().split('T')[0];
          if (attendanceByDay[dateStr] !== undefined) {
            attendanceByDay[dateStr]++;
          }
        }
      });

      const attendanceTrend = Object.entries(attendanceByDay).map(([date, count]) => ({
        date,
        day: new Date(date).toLocaleDateString('en-IN', { weekday: 'short' }),
        checkIns: count
      }));

      // Membership plan distribution
      const memberships = await db!.select({
        planName: schema.membershipPlans.name,
        count: sql<number>`count(*)::int`
      })
        .from(schema.memberships)
        .innerJoin(schema.membershipPlans, eq(schema.memberships.planId, schema.membershipPlans.id))
        .where(and(
          eq(schema.memberships.gymId, gymId),
          eq(schema.memberships.status, 'active')
        ))
        .groupBy(schema.membershipPlans.name);

      // Calculate collection rate
      const totalBilled = totalCollected + totalPending;
      const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 100;

      res.json({
        revenue: {
          thisMonth: thisMonthCollection,
          lastMonth: lastMonthCollection,
          growth: Math.round(collectionGrowth * 100) / 100,
          totalCollected,
          totalPending,
          collectionRate: Math.round(collectionRate * 100) / 100,
        },
        members: {
          total: allMembers.length,
          active: activeMembers.length,
          newThisMonth: newMembersThisMonth.length,
          expiringSoon: expiringMemberships.length,
        },
        attendance: {
          trend: attendanceTrend,
          todayCheckIns: attendanceByDay[now.toISOString().split('T')[0]] || 0,
        },
        planDistribution: memberships.map(m => ({
          name: m.planName,
          value: m.count,
        })),
      });
    } catch (error: any) {
      console.error('Error fetching admin analytics:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Diet Planner API Routes

  // Parse body composition report from image using Gemini AI
  app.post('/api/diet-planner/parse-body-composition', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { imageData } = req.body;

      if (!imageData) {
        return res.status(400).json({ error: 'No image data provided' });
      }

      // Check if Gemini API key is configured
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ 
          error: 'AI service not configured',
          message: 'Please configure Gemini API key'
        });
      }

      // Extract base64 data and mime type from data URL
      let base64Data = imageData;
      let mimeType = 'image/jpeg';
      
      if (imageData.startsWith('data:')) {
        const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      const prompt = `Analyze this body composition report image and extract the following metrics. Return ONLY a valid JSON object with these fields (use null for any values not found):

{
  "user_name": "string or null",
  "report_date": "YYYY-MM-DD format or null",
  "weight": "number in kg or null",
  "bmi": "number or null",
  "body_fat_percentage": "number or null",
  "fat_mass": "number in kg or null",
  "fat_free_body_weight": "number in kg or null",
  "muscle_mass": "number in kg or null",
  "muscle_rate": "number percentage or null",
  "skeletal_muscle": "number in kg or null",
  "bone_mass": "number in kg or null",
  "protein_mass": "number in kg or null",
  "protein": "number percentage or null",
  "water_weight": "number in kg or null",
  "body_water": "number percentage or null",
  "subcutaneous_fat": "number percentage or null",
  "visceral_fat": "number level or null",
  "bmr": "number in kcal or null",
  "body_age": "number in years or null",
  "ideal_body_weight": "number in kg or null"
}

Return ONLY the JSON object, no other text.`;

      // Call Gemini API
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1000,
            }
          }),
        }
      );

      if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json();
        console.error('Gemini API error:', errorData);
        return res.status(500).json({ 
          error: 'AI service error',
          message: errorData.error?.message || 'Failed to process image'
        });
      }

      const geminiData = await geminiResponse.json();
      const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!content) {
        return res.status(500).json({ error: 'No response from AI service' });
      }

      // Parse the JSON response
      try {
        // Clean the response - remove markdown code blocks if present
        let jsonStr = content.trim();
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.slice(7);
        }
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith('```')) {
          jsonStr = jsonStr.slice(0, -3);
        }
        jsonStr = jsonStr.trim();

        const parsedData = JSON.parse(jsonStr);
        
        res.json({
          success: true,
          data: parsedData
        });
      } catch (parseError) {
        console.error('Error parsing AI response:', content);
        res.status(500).json({ 
          error: 'Failed to parse body composition data',
          raw: content 
        });
      }
    } catch (error: any) {
      console.error('Error parsing body composition:', error);
      
      if (error.code === 'ECONNREFUSED' || error.message?.includes('connect')) {
        return res.status(503).json({ 
          error: 'AI service unavailable',
          message: 'Connection error: AI services not available'
        });
      }
      
      res.status(500).json({ error: error.message || 'Failed to parse body composition report' });
    }
  });

  // Get initial data for diet planner (body composition, diet plans)
  app.get('/api/diet-planner/initial-data', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Get latest body composition report (order by created_at to get most recent)
      const bodyCompResult = await db!.execute(sql`
        SELECT weight, bmi, bmr, lifestyle, body_fat_percentage
        FROM body_composition_reports
        WHERE user_id = ${req.session.userId}
        ORDER BY created_at DESC
        LIMIT 1
      `);

      // Get active diet plans
      const dietPlansResult = await db!.execute(sql`
        SELECT id, plan_type, goal, total_calories, total_protein, total_carbs, total_fats, created_at
        FROM diet_plans
        WHERE user_id = ${req.session.userId} AND is_active = true
        ORDER BY created_at DESC
      `);

      res.json({
        bodyComposition: bodyCompResult.rows?.[0] || null,
        dietPlans: dietPlansResult.rows || [],
      });
    } catch (error: any) {
      console.error('Error fetching diet planner initial data:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Save body composition report
  app.post('/api/diet-planner/body-composition', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const {
        user_name,
        report_date,
        weight,
        bmi,
        body_fat_percentage,
        fat_mass,
        fat_free_body_weight,
        muscle_mass,
        muscle_rate,
        skeletal_muscle,
        bone_mass,
        protein_mass,
        protein,
        water_weight,
        body_water,
        subcutaneous_fat,
        visceral_fat,
        bmr,
        body_age,
        ideal_body_weight,
        lifestyle
      } = req.body;

      // Calculate BMR if not provided using Mifflin-St Jeor equation (estimate)
      // For adult average: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
      // Without height/age, use simplified estimate: BMR ≈ 24 × weight (kcal/day)
      let calculatedBmr = bmr;
      if (!bmr && weight) {
        const weightNum = parseFloat(weight);
        if (!isNaN(weightNum)) {
          // Simplified BMR estimate: ~22-24 kcal per kg body weight per day
          calculatedBmr = Math.round(weightNum * 22);
        }
      }

      const result = await db!.execute(sql`
        INSERT INTO body_composition_reports (
          user_id, user_name, report_date, weight, bmi, body_fat_percentage,
          fat_mass, fat_free_body_weight, muscle_mass, muscle_rate, skeletal_muscle,
          bone_mass, protein_mass, protein, water_weight, body_water,
          subcutaneous_fat, visceral_fat, bmr, body_age, ideal_body_weight, lifestyle
        ) VALUES (
          ${req.session.userId}, ${user_name || null}, ${report_date ? new Date(report_date) : new Date()},
          ${weight || null}, ${bmi || null}, ${body_fat_percentage || null},
          ${fat_mass || null}, ${fat_free_body_weight || null}, ${muscle_mass || null},
          ${muscle_rate || null}, ${skeletal_muscle || null}, ${bone_mass || null},
          ${protein_mass || null}, ${protein || null}, ${water_weight || null},
          ${body_water || null}, ${subcutaneous_fat || null}, ${visceral_fat || null},
          ${calculatedBmr || null}, ${body_age || null}, ${ideal_body_weight || null}, ${lifestyle || 'moderately_active'}
        )
        RETURNING *
      `);

      res.json({ success: true, report: result.rows?.[0] });
    } catch (error: any) {
      console.error('Error saving body composition:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get nutrition targets based on body composition
  app.get('/api/diet-planner/nutrition-targets', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Get latest body composition
      const bodyCompResult = await db!.execute(sql`
        SELECT weight, bmr, lifestyle
        FROM body_composition_reports
        WHERE user_id = ${req.session.userId}
        ORDER BY report_date DESC
        LIMIT 1
      `);

      const bodyComp = bodyCompResult.rows?.[0];
      
      if (!bodyComp || !bodyComp.bmr) {
        // Return default targets if no body composition
        return res.json({
          calories: 2000,
          protein: 120,
          carbs: 200,
          fats: 65
        });
      }

      // Calculate TDEE based on lifestyle
      const lifestyleFactors: Record<string, number> = {
        sedentary: 1.2,
        moderately_active: 1.55,
        super_active: 1.75
      };
      
      const factor = lifestyleFactors[bodyComp.lifestyle as string] || 1.55;
      const tdee = Math.round(Number(bodyComp.bmr) * factor);
      const weight = Number(bodyComp.weight) || 70;

      // Calculate macros (balanced approach)
      const protein = Math.round(weight * 1.8); // 1.8g per kg bodyweight
      const fats = Math.round(tdee * 0.25 / 9); // 25% of calories from fats
      const carbs = Math.round((tdee - (protein * 4) - (fats * 9)) / 4);

      res.json({
        calories: tdee,
        protein,
        carbs,
        fats
      });
    } catch (error: any) {
      console.error('Error calculating nutrition targets:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get meals for a diet plan
  app.get('/api/diet-planner/meals/:planId', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { planId } = req.params;
      
      const result = await db!.execute(sql`
        SELECT id, day_number, meal_type, meal_name, name_hindi, ingredients, 
               recipe_instructions, prep_time_minutes, cook_time_minutes,
               calories, protein, carbs, fats, portion_size, meal_timing
        FROM meals
        WHERE diet_plan_id = ${planId}
        ORDER BY day_number, 
          CASE meal_type
            WHEN 'breakfast' THEN 1
            WHEN 'lunch' THEN 2
            WHEN 'snack' THEN 3
            WHEN 'dinner' THEN 4
          END
      `);

      res.json(result.rows || []);
    } catch (error: any) {
      console.error('Error fetching meals:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get daily tracking
  app.get('/api/diet-planner/daily-tracking', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { date } = req.query;
      const trackingDate = date || new Date().toISOString().split('T')[0];
      
      const result = await db!.execute(sql`
        SELECT eaten_meals, completed_exercises, water_intake, notes
        FROM daily_tracking
        WHERE user_id = ${req.session.userId} AND tracking_date = ${trackingDate}
      `);

      res.json(result.rows?.[0] || { eaten_meals: [], completed_exercises: [] });
    } catch (error: any) {
      console.error('Error fetching daily tracking:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update daily tracking
  app.post('/api/diet-planner/daily-tracking', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { tracking_date, eaten_meals, completed_exercises, water_intake, notes } = req.body;
      
      const result = await db!.execute(sql`
        INSERT INTO daily_tracking (user_id, tracking_date, eaten_meals, completed_exercises, water_intake, notes)
        VALUES (${req.session.userId}, ${tracking_date}, ${JSON.stringify(eaten_meals || [])}, ${JSON.stringify(completed_exercises || [])}, ${water_intake || 0}, ${notes || null})
        ON CONFLICT (user_id, tracking_date)
        DO UPDATE SET 
          eaten_meals = ${JSON.stringify(eaten_meals || [])},
          completed_exercises = ${JSON.stringify(completed_exercises || [])},
          water_intake = COALESCE(${water_intake}, daily_tracking.water_intake),
          notes = COALESCE(${notes}, daily_tracking.notes),
          updated_at = now()
        RETURNING *
      `);

      res.json(result.rows?.[0]);
    } catch (error: any) {
      console.error('Error updating daily tracking:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate diet plan (simplified - no AI integration for now)
  app.post('/api/diet-planner/generate-plan', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { planType, goal, bmr, bodyWeight, lifestyle, isVegetarian } = req.body;
      
      // Calculate target calories based on goal
      const lifestyleFactors: Record<string, number> = {
        sedentary: 1.2,
        moderately_active: 1.55,
        super_active: 1.75
      };
      
      const factor = lifestyleFactors[lifestyle] || 1.55;
      let targetCalories = Math.round(bmr * factor);
      
      if (goal === 'Fat Loss') {
        targetCalories -= 200;
      } else if (goal === 'Muscle Gain') {
        targetCalories += 200;
      }
      
      // Calculate macros
      const protein = Math.round(bodyWeight * 2); // 2g per kg for muscle building
      const fats = Math.round(targetCalories * 0.25 / 9);
      const carbs = Math.round((targetCalories - (protein * 4) - (fats * 9)) / 4);

      // Deactivate existing plans
      await db!.execute(sql`
        UPDATE diet_plans SET is_active = false WHERE user_id = ${req.session.userId}
      `);

      // Create new diet plan
      const planResult = await db!.execute(sql`
        INSERT INTO diet_plans (user_id, plan_type, goal, total_calories, total_protein, total_carbs, total_fats, is_active)
        VALUES (${req.session.userId}, ${planType}, ${goal}, ${targetCalories}, ${protein}, ${carbs}, ${fats}, true)
        RETURNING *
      `);

      const plan = planResult.rows?.[0];
      if (!plan) {
        throw new Error('Failed to create diet plan');
      }

      // Generate sample meals for the plan
      const numDays = planType === '7-day' ? 7 : 30;
      const mealTemplates = getSampleMeals(isVegetarian);
      
      // Helper to convert JS array to PostgreSQL array format
      const toPgArray = (arr: string[]): string => {
        if (!arr || arr.length === 0) return '{}';
        const escaped = arr.map(item => `"${item.replace(/"/g, '\\"')}"`);
        return `{${escaped.join(',')}}`;
      };
      
      for (let day = 1; day <= numDays; day++) {
        for (const template of mealTemplates) {
          const ingredientsArr = toPgArray(template.ingredients || []);
          const instructionsArr = toPgArray(template.recipe_instructions || []);
          
          await db!.execute(sql`
            INSERT INTO meals (diet_plan_id, day_number, meal_type, meal_name, name_hindi, 
              ingredients, recipe_instructions, prep_time_minutes, cook_time_minutes,
              calories, protein, carbs, fats, portion_size, meal_timing)
            VALUES (${plan.id}, ${day}, ${template.meal_type}, ${template.meal_name}, ${template.name_hindi || null},
              ${ingredientsArr}::text[], ${instructionsArr}::text[],
              ${template.prep_time_minutes || null}, ${template.cook_time_minutes || null},
              ${template.calories}, ${template.protein}, ${template.carbs}, ${template.fats},
              ${template.portion_size || null}, ${template.meal_timing || null})
          `);
        }
      }

      res.json({ success: true, plan });
    } catch (error: any) {
      console.error('Error generating diet plan:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reset diet plan
  app.delete('/api/diet-planner/reset-plan', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Get all plan IDs for user
      const plansResult = await db!.execute(sql`
        SELECT id FROM diet_plans WHERE user_id = ${req.session.userId}
      `);

      const planIds = plansResult.rows?.map((p: any) => p.id) || [];
      
      if (planIds.length > 0) {
        // Delete meals first
        for (const planId of planIds) {
          await db!.execute(sql`DELETE FROM meals WHERE diet_plan_id = ${planId}`);
        }
        // Delete plans
        await db!.execute(sql`DELETE FROM diet_plans WHERE user_id = ${req.session.userId}`);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error resetting diet plan:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get meal logs for a date
  app.get('/api/diet-planner/meal-logs', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { date } = req.query;
      const logDate = date || new Date().toISOString().split('T')[0];

      const result = await db!.execute(sql`
        SELECT ml.id, ml.user_food_id, ml.meal_type, ml.quantity, ml.calories, 
               ml.protein, ml.carbs, ml.fat, ml.notes, ml.created_at,
               uf.name, uf.name_hindi, uf.brand, uf.serving_description, uf.fatsecret_food_id
        FROM meal_logs ml
        LEFT JOIN user_foods uf ON ml.user_food_id = uf.id
        WHERE ml.user_id = ${req.session.userId} AND ml.date = ${logDate}
        ORDER BY ml.created_at ASC
      `);

      const mealLogs = result.rows || [];
      
      // Calculate totals by meal
      const byMeal: Record<string, any> = {
        breakfast: { calories: 0, protein: 0, carbs: 0, fat: 0, items: [] },
        lunch: { calories: 0, protein: 0, carbs: 0, fat: 0, items: [] },
        dinner: { calories: 0, protein: 0, carbs: 0, fat: 0, items: [] },
        snack: { calories: 0, protein: 0, carbs: 0, fat: 0, items: [] },
      };

      const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

      mealLogs.forEach((log: any) => {
        const mealType = log.meal_type;
        if (byMeal[mealType]) {
          const item = {
            id: log.id,
            user_food_id: log.user_food_id,
            meal_type: mealType,
            quantity: log.quantity,
            calories: Number(log.calories),
            protein: Number(log.protein),
            carbs: Number(log.carbs),
            fat: Number(log.fat),
            notes: log.notes,
            created_at: log.created_at,
            user_food: {
              id: log.user_food_id,
              name: log.name,
              name_hindi: log.name_hindi,
              brand: log.brand,
              serving_description: log.serving_description,
              fatsecret_food_id: log.fatsecret_food_id,
            }
          };

          byMeal[mealType].items.push(item);
          byMeal[mealType].calories += Number(log.calories);
          byMeal[mealType].protein += Number(log.protein);
          byMeal[mealType].carbs += Number(log.carbs);
          byMeal[mealType].fat += Number(log.fat);

          totals.calories += Number(log.calories);
          totals.protein += Number(log.protein);
          totals.carbs += Number(log.carbs);
          totals.fat += Number(log.fat);
        }
      });

      res.json({
        date: logDate,
        totals,
        byMeal
      });
    } catch (error: any) {
      console.error('Error fetching meal logs:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Log food
  app.post('/api/diet-planner/log-food', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const {
        mealType,
        logDate,
        source,
        fatsecretFoodId,
        servingId,
        foodName,
        nameHindi,
        brand,
        servingDescription,
        macros,
        quantity,
        notes,
        isVegetarian,
        isVegan,
        imageUrl
      } = req.body;

      // First create or find user food
      let userFoodId: string;
      
      if (source === 'fatsecret' && fatsecretFoodId) {
        // Check for existing food
        const existingResult = await db!.execute(sql`
          SELECT id FROM user_foods 
          WHERE user_id = ${req.session.userId} 
            AND fatsecret_food_id = ${fatsecretFoodId}
            AND serving_id = ${servingId || ''}
          LIMIT 1
        `);

        if (existingResult.rows && existingResult.rows.length > 0) {
          userFoodId = (existingResult.rows[0] as any).id;
        } else {
          // Create new user food
          const foodResult = await db!.execute(sql`
            INSERT INTO user_foods (user_id, fatsecret_food_id, serving_id, name, name_hindi, 
              brand, serving_description, calories, protein, carbs, fat, fiber,
              is_vegetarian, is_vegan, is_custom, image_url)
            VALUES (${req.session.userId}, ${fatsecretFoodId}, ${servingId || null}, ${foodName}, ${nameHindi || null},
              ${brand || null}, ${servingDescription}, ${macros.calories}, ${macros.protein},
              ${macros.carbs}, ${macros.fat}, ${macros.fiber || 0},
              ${isVegetarian || false}, ${isVegan || false}, false, ${imageUrl || null})
            RETURNING id
          `);
          userFoodId = (foodResult.rows?.[0] as any)?.id;
        }
      } else {
        // Manual entry
        const foodResult = await db!.execute(sql`
          INSERT INTO user_foods (user_id, name, name_hindi, brand, serving_description,
            calories, protein, carbs, fat, fiber, is_vegetarian, is_vegan, is_custom, image_url)
          VALUES (${req.session.userId}, ${foodName}, ${nameHindi || null}, ${brand || null},
            ${servingDescription}, ${macros.calories}, ${macros.protein}, ${macros.carbs},
            ${macros.fat}, ${macros.fiber || 0}, ${isVegetarian || false}, ${isVegan || false},
            ${source === 'manual'}, ${imageUrl || null})
          RETURNING id
        `);
        userFoodId = (foodResult.rows?.[0] as any)?.id;
      }

      if (!userFoodId) {
        throw new Error('Failed to create user food');
      }

      // Calculate totals
      const totalCalories = Math.round(macros.calories * quantity);
      const totalProtein = Math.round(macros.protein * quantity * 10) / 10;
      const totalCarbs = Math.round(macros.carbs * quantity * 10) / 10;
      const totalFat = Math.round(macros.fat * quantity * 10) / 10;

      // Create meal log
      const logResult = await db!.execute(sql`
        INSERT INTO meal_logs (user_id, date, meal_type, user_food_id, quantity,
          calories, protein, carbs, fat, notes)
        VALUES (${req.session.userId}, ${logDate}, ${mealType}, ${userFoodId}, ${quantity},
          ${totalCalories}, ${totalProtein}, ${totalCarbs}, ${totalFat}, ${notes || null})
        RETURNING id
      `);

      res.json({
        success: true,
        logId: (logResult.rows?.[0] as any)?.id,
        userFoodId,
        mealType,
        logDate,
        foodName,
        macros: { calories: totalCalories, protein: totalProtein, carbs: totalCarbs, fat: totalFat },
        quantity
      });
    } catch (error: any) {
      console.error('Error logging food:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete meal log
  app.delete('/api/diet-planner/meal-logs/:logId', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { logId } = req.params;
      
      await db!.execute(sql`
        DELETE FROM meal_logs
        WHERE id = ${logId} AND user_id = ${req.session.userId}
      `);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting meal log:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Food search (mock for now - can integrate FatSecret later)
  app.get('/api/diet-planner/food-search', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { query } = req.query;
      
      // Return sample foods for now
      const sampleFoods = [
        { food_id: '1', food_name: 'Chapati / Roti', food_description: 'Per 1 medium (40g) - Calories: 104, Fat: 3.3g, Carbs: 15.3g, Protein: 2.7g' },
        { food_id: '2', food_name: 'Dal (Yellow Lentil)', food_description: 'Per 1 cup - Calories: 180, Fat: 0.8g, Carbs: 32g, Protein: 12g' },
        { food_id: '3', food_name: 'Paneer', food_description: 'Per 100g - Calories: 265, Fat: 20g, Carbs: 1.2g, Protein: 18g' },
        { food_id: '4', food_name: 'Rice (Cooked)', food_description: 'Per 1 cup - Calories: 206, Fat: 0.4g, Carbs: 45g, Protein: 4.3g' },
        { food_id: '5', food_name: 'Chicken Breast', food_description: 'Per 100g - Calories: 165, Fat: 3.6g, Carbs: 0g, Protein: 31g' },
        { food_id: '6', food_name: 'Egg (Boiled)', food_description: 'Per 1 large - Calories: 78, Fat: 5.3g, Carbs: 0.6g, Protein: 6.3g' },
        { food_id: '7', food_name: 'Oats', food_description: 'Per 100g - Calories: 389, Fat: 6.9g, Carbs: 66g, Protein: 16.9g' },
        { food_id: '8', food_name: 'Banana', food_description: 'Per 1 medium - Calories: 105, Fat: 0.4g, Carbs: 27g, Protein: 1.3g' },
      ];

      const searchQuery = (query as string || '').toLowerCase();
      const filteredFoods = sampleFoods.filter(f => 
        f.food_name.toLowerCase().includes(searchQuery)
      );

      res.json({ foods: filteredFoods });
    } catch (error: any) {
      console.error('Error searching foods:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get food details
  app.get('/api/diet-planner/food-details/:foodId', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { foodId } = req.params;
      
      // Sample food details
      const foodDetails: Record<string, any> = {
        '1': { food_id: '1', food_name: 'Chapati / Roti', servings: [
          { serving_id: '1', serving_description: '1 medium (40g)', calories: 104, protein: 2.7, carbohydrate: 15.3, fat: 3.3 },
          { serving_id: '2', serving_description: '1 large (60g)', calories: 156, protein: 4.1, carbohydrate: 23, fat: 5 }
        ]},
        '2': { food_id: '2', food_name: 'Dal (Yellow Lentil)', servings: [
          { serving_id: '1', serving_description: '1 cup cooked', calories: 180, protein: 12, carbohydrate: 32, fat: 0.8 },
          { serving_id: '2', serving_description: '1/2 cup cooked', calories: 90, protein: 6, carbohydrate: 16, fat: 0.4 }
        ]},
        '3': { food_id: '3', food_name: 'Paneer', servings: [
          { serving_id: '1', serving_description: '100g', calories: 265, protein: 18, carbohydrate: 1.2, fat: 20 },
          { serving_id: '2', serving_description: '50g (small piece)', calories: 133, protein: 9, carbohydrate: 0.6, fat: 10 }
        ]},
        '4': { food_id: '4', food_name: 'Rice (Cooked)', servings: [
          { serving_id: '1', serving_description: '1 cup', calories: 206, protein: 4.3, carbohydrate: 45, fat: 0.4 },
          { serving_id: '2', serving_description: '1/2 cup', calories: 103, protein: 2.2, carbohydrate: 22.5, fat: 0.2 }
        ]},
        '5': { food_id: '5', food_name: 'Chicken Breast', servings: [
          { serving_id: '1', serving_description: '100g cooked', calories: 165, protein: 31, carbohydrate: 0, fat: 3.6 },
          { serving_id: '2', serving_description: '150g cooked', calories: 248, protein: 46.5, carbohydrate: 0, fat: 5.4 }
        ]},
        '6': { food_id: '6', food_name: 'Egg (Boiled)', servings: [
          { serving_id: '1', serving_description: '1 large', calories: 78, protein: 6.3, carbohydrate: 0.6, fat: 5.3 },
          { serving_id: '2', serving_description: '2 eggs', calories: 156, protein: 12.6, carbohydrate: 1.2, fat: 10.6 }
        ]},
        '7': { food_id: '7', food_name: 'Oats', servings: [
          { serving_id: '1', serving_description: '50g dry', calories: 195, protein: 8.5, carbohydrate: 33, fat: 3.5 },
          { serving_id: '2', serving_description: '30g dry (1 serving)', calories: 117, protein: 5.1, carbohydrate: 19.8, fat: 2.1 }
        ]},
        '8': { food_id: '8', food_name: 'Banana', servings: [
          { serving_id: '1', serving_description: '1 medium', calories: 105, protein: 1.3, carbohydrate: 27, fat: 0.4 },
          { serving_id: '2', serving_description: '1 large', calories: 121, protein: 1.5, carbohydrate: 31, fat: 0.5 }
        ]},
      };

      const food = foodDetails[foodId] || { food_id: foodId, food_name: 'Unknown Food', servings: [] };
      res.json(food);
    } catch (error: any) {
      console.error('Error fetching food details:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Workout Plan APIs
  
  // Get existing workout plan
  app.get('/api/diet-planner/workout-plan', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const planResult = await db!.execute(sql`
        SELECT id, level, equipment, duration_days
        FROM workout_plans
        WHERE user_id = ${req.session.userId} AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `);

      const plan = planResult.rows?.[0];
      
      if (!plan) {
        return res.json({ plan: null, exercises: [] });
      }

      const exercisesResult = await db!.execute(sql`
        SELECT id, day_number, session_type, exercise_name, sets, reps,
               duration_minutes, rest_seconds, muscles_targeted, 
               form_instructions, mistakes_to_avoid, tips
        FROM workout_exercises
        WHERE workout_plan_id = ${(plan as any).id}
        ORDER BY day_number, 
          CASE session_type
            WHEN 'warm-up' THEN 1
            WHEN 'strength' THEN 2
            WHEN 'hiit' THEN 3
            WHEN 'cardio' THEN 4
            WHEN 'core' THEN 5
            WHEN 'mobility' THEN 6
            WHEN 'stretching' THEN 7
          END
      `);

      res.json({
        plan,
        exercises: exercisesResult.rows || []
      });
    } catch (error: any) {
      console.error('Error fetching workout plan:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate workout plan
  app.post('/api/diet-planner/generate-workout', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { level, equipment, durationDays } = req.body;

      // Deactivate existing plans
      await db!.execute(sql`
        UPDATE workout_plans SET is_active = false WHERE user_id = ${req.session.userId}
      `);

      // Create new workout plan
      const planResult = await db!.execute(sql`
        INSERT INTO workout_plans (user_id, level, equipment, duration_days, is_active)
        VALUES (${req.session.userId}, ${level}, ${JSON.stringify(equipment)}, ${durationDays}, true)
        RETURNING *
      `);

      const plan = planResult.rows?.[0];
      if (!plan) {
        throw new Error('Failed to create workout plan');
      }

      // Generate sample exercises
      const workoutTemplates = getSampleWorkouts(level, equipment);
      
      for (let day = 1; day <= durationDays; day++) {
        const dayWorkouts = workoutTemplates[day % workoutTemplates.length] || workoutTemplates[0];
        
        for (const exercise of dayWorkouts) {
          await db!.execute(sql`
            INSERT INTO workout_exercises (workout_plan_id, day_number, session_type, exercise_name,
              sets, reps, duration_minutes, rest_seconds, muscles_targeted, 
              form_instructions, mistakes_to_avoid, tips)
            VALUES (${(plan as any).id}, ${day}, ${exercise.session_type}, ${exercise.exercise_name},
              ${exercise.sets || null}, ${exercise.reps || null}, ${exercise.duration_minutes || null},
              ${exercise.rest_seconds || null}, ${JSON.stringify(exercise.muscles_targeted || [])},
              ${exercise.form_instructions || null}, ${JSON.stringify(exercise.mistakes_to_avoid || [])},
              ${JSON.stringify(exercise.tips || [])})
          `);
        }
      }

      res.json({ success: true, plan });
    } catch (error: any) {
      console.error('Error generating workout plan:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get recommendations for today (stub - can be enhanced with AI later)
  app.post('/api/diet-planner/recommend-today', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { date, consumedCalories, consumedProtein } = req.body;
      
      // Return empty recommendations for now (can be enhanced with AI later)
      res.json({
        ok: true,
        date: date || new Date().toISOString().split('T')[0],
        remainingCalories: 2000 - (consumedCalories || 0),
        remainingProtein: 120 - (consumedProtein || 0),
        recommendations: []
      });
    } catch (error: any) {
      console.error('Error getting recommendations:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Delete workout plan
  app.delete('/api/diet-planner/workout-plan', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Get all plan IDs for user
      const plansResult = await db!.execute(sql`
        SELECT id FROM workout_plans WHERE user_id = ${req.session.userId}
      `);

      const planIds = plansResult.rows?.map((p: any) => p.id) || [];
      
      if (planIds.length > 0) {
        // Delete exercises first
        for (const planId of planIds) {
          await db!.execute(sql`DELETE FROM workout_exercises WHERE workout_plan_id = ${planId}`);
        }
        // Delete plans
        await db!.execute(sql`DELETE FROM workout_plans WHERE user_id = ${req.session.userId}`);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting workout plan:', error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to get sample meals
function getSampleMeals(isVegetarian: boolean) {
  if (isVegetarian) {
    return [
      { meal_type: 'breakfast', meal_name: 'Oats with Banana and Almonds', name_hindi: 'केले और बादाम के साथ ओट्स', ingredients: ['Oats 50g', 'Banana 1', 'Almonds 10', 'Milk 200ml', 'Honey 1 tsp'], recipe_instructions: ['Boil milk', 'Add oats and cook for 5 mins', 'Top with banana slices and almonds'], prep_time_minutes: 5, cook_time_minutes: 10, calories: 380, protein: 14, carbs: 55, fats: 12, portion_size: '1 bowl', meal_timing: '7:00 AM - 8:00 AM' },
      { meal_type: 'lunch', meal_name: 'Rajma Rice with Salad', name_hindi: 'राजमा चावल और सलाद', ingredients: ['Rajma 1 cup cooked', 'Rice 1 cup', 'Onion', 'Tomato', 'Cucumber'], recipe_instructions: ['Cook rajma in pressure cooker', 'Serve with rice and fresh salad'], prep_time_minutes: 10, cook_time_minutes: 30, calories: 520, protein: 20, carbs: 78, fats: 8, portion_size: '1 plate', meal_timing: '12:30 PM - 1:30 PM' },
      { meal_type: 'snack', meal_name: 'Greek Yogurt with Fruit', name_hindi: 'फल के साथ दही', ingredients: ['Greek Yogurt 150g', 'Mixed fruits', 'Honey'], recipe_instructions: ['Mix yogurt with chopped fruits'], prep_time_minutes: 5, cook_time_minutes: 0, calories: 180, protein: 12, carbs: 24, fats: 4, portion_size: '1 bowl', meal_timing: '4:00 PM - 5:00 PM' },
      { meal_type: 'dinner', meal_name: 'Paneer Bhurji with Chapati', name_hindi: 'पनीर भुर्जी और रोटी', ingredients: ['Paneer 150g', 'Onion', 'Tomato', 'Green chili', 'Chapati 2'], recipe_instructions: ['Crumble paneer', 'Sauté with onion and tomato', 'Serve with chapati'], prep_time_minutes: 10, cook_time_minutes: 15, calories: 480, protein: 28, carbs: 35, fats: 25, portion_size: '1 plate', meal_timing: '7:30 PM - 8:30 PM' },
    ];
  } else {
    return [
      { meal_type: 'breakfast', meal_name: 'Egg Omelette with Toast', name_hindi: 'अंडा आमलेट और टोस्ट', ingredients: ['Eggs 3', 'Toast 2 slices', 'Butter', 'Onion', 'Green chili'], recipe_instructions: ['Beat eggs with onion and chili', 'Cook in pan', 'Serve with buttered toast'], prep_time_minutes: 5, cook_time_minutes: 10, calories: 420, protein: 24, carbs: 30, fats: 22, portion_size: '1 plate', meal_timing: '7:00 AM - 8:00 AM' },
      { meal_type: 'lunch', meal_name: 'Chicken Rice Bowl', name_hindi: 'चिकन राइस बाउल', ingredients: ['Chicken breast 150g', 'Rice 1 cup', 'Vegetables', 'Soy sauce'], recipe_instructions: ['Grill chicken', 'Serve with rice and vegetables'], prep_time_minutes: 10, cook_time_minutes: 25, calories: 550, protein: 40, carbs: 55, fats: 12, portion_size: '1 bowl', meal_timing: '12:30 PM - 1:30 PM' },
      { meal_type: 'snack', meal_name: 'Protein Shake with Banana', name_hindi: 'प्रोटीन शेक', ingredients: ['Whey protein 1 scoop', 'Banana 1', 'Milk 300ml'], recipe_instructions: ['Blend all ingredients'], prep_time_minutes: 5, cook_time_minutes: 0, calories: 280, protein: 30, carbs: 30, fats: 5, portion_size: '1 glass', meal_timing: '4:00 PM - 5:00 PM' },
      { meal_type: 'dinner', meal_name: 'Fish Curry with Roti', name_hindi: 'मछली करी और रोटी', ingredients: ['Fish 200g', 'Curry masala', 'Roti 2'], recipe_instructions: ['Cook fish in curry', 'Serve with roti'], prep_time_minutes: 15, cook_time_minutes: 25, calories: 450, protein: 35, carbs: 35, fats: 18, portion_size: '1 plate', meal_timing: '7:30 PM - 8:30 PM' },
    ];
  }
}

// Helper function to get sample workouts
function getSampleWorkouts(level: string, equipment: string[]) {
  const hasWeights = equipment.includes('dumbbells') || equipment.includes('barbell');
  const hasMachines = equipment.includes('machines');
  
  // Base workout templates
  const workouts: any[][] = [];
  
  // Day 1 - Upper Body
  workouts.push([
    { session_type: 'warm-up', exercise_name: 'Arm Circles', duration_minutes: 2, muscles_targeted: ['Shoulders'], form_instructions: 'Stand straight, extend arms, rotate in circles', tips: ['Start small, increase range'], mistakes_to_avoid: ['Rushing the movement'] },
    { session_type: 'warm-up', exercise_name: 'Jumping Jacks', duration_minutes: 3, muscles_targeted: ['Full Body'], form_instructions: 'Jump while spreading arms and legs', tips: ['Keep core engaged'], mistakes_to_avoid: ['Landing hard'] },
    { session_type: 'strength', exercise_name: 'Push-ups', sets: level === 'beginner' ? 2 : 3, reps: level === 'beginner' ? '8-10' : '12-15', rest_seconds: 60, muscles_targeted: ['Chest', 'Triceps', 'Shoulders'], form_instructions: 'Keep body straight, lower chest to ground', tips: ['Engage core throughout'], mistakes_to_avoid: ['Sagging hips'] },
    { session_type: 'strength', exercise_name: hasWeights ? 'Dumbbell Rows' : 'Bodyweight Rows', sets: 3, reps: '10-12', rest_seconds: 60, muscles_targeted: ['Back', 'Biceps'], form_instructions: 'Pull weight/body towards chest, squeeze back muscles', tips: ['Keep back flat'], mistakes_to_avoid: ['Rounding back'] },
    { session_type: 'core', exercise_name: 'Plank', duration_minutes: 1, muscles_targeted: ['Core'], form_instructions: 'Hold body straight in push-up position on forearms', tips: ['Breathe steadily'], mistakes_to_avoid: ['Dropping hips'] },
  ]);

  // Day 2 - Lower Body
  workouts.push([
    { session_type: 'warm-up', exercise_name: 'High Knees', duration_minutes: 2, muscles_targeted: ['Legs', 'Core'], form_instructions: 'Run in place, bringing knees high', tips: ['Pump arms'], mistakes_to_avoid: ['Leaning back'] },
    { session_type: 'warm-up', exercise_name: 'Leg Swings', duration_minutes: 2, muscles_targeted: ['Hips', 'Legs'], form_instructions: 'Swing leg forward and back', tips: ['Hold onto wall for balance'], mistakes_to_avoid: ['Swinging too fast'] },
    { session_type: 'strength', exercise_name: 'Squats', sets: 3, reps: level === 'beginner' ? '12-15' : '15-20', rest_seconds: 60, muscles_targeted: ['Quads', 'Glutes', 'Hamstrings'], form_instructions: 'Lower body as if sitting, keep chest up', tips: ['Push through heels'], mistakes_to_avoid: ['Knees caving in'] },
    { session_type: 'strength', exercise_name: 'Lunges', sets: 3, reps: '10 each leg', rest_seconds: 60, muscles_targeted: ['Quads', 'Glutes'], form_instructions: 'Step forward, lower back knee to ground', tips: ['Keep front knee over ankle'], mistakes_to_avoid: ['Leaning forward'] },
    { session_type: 'core', exercise_name: 'Bicycle Crunches', sets: 3, reps: '15 each side', rest_seconds: 45, muscles_targeted: ['Abs', 'Obliques'], form_instructions: 'Alternate bringing elbow to opposite knee', tips: ['Slow and controlled'], mistakes_to_avoid: ['Pulling on neck'] },
  ]);

  // Day 3 - Cardio/HIIT
  workouts.push([
    { session_type: 'warm-up', exercise_name: 'March in Place', duration_minutes: 3, muscles_targeted: ['Full Body'], form_instructions: 'March while pumping arms', tips: ['Gradually increase pace'], mistakes_to_avoid: ['Slouching'] },
    { session_type: 'hiit', exercise_name: 'Burpees', sets: 3, reps: level === 'beginner' ? '5-8' : '10-12', rest_seconds: 45, muscles_targeted: ['Full Body'], form_instructions: 'Jump down to push-up, jump back up with arms overhead', tips: ['Modify by stepping if needed'], mistakes_to_avoid: ['Landing hard'] },
    { session_type: 'hiit', exercise_name: 'Mountain Climbers', duration_minutes: 1, muscles_targeted: ['Core', 'Shoulders', 'Legs'], form_instructions: 'Alternate bringing knees to chest in push-up position', tips: ['Keep hips low'], mistakes_to_avoid: ['Bouncing hips'] },
    { session_type: 'cardio', exercise_name: 'Jump Rope (or simulated)', duration_minutes: 5, muscles_targeted: ['Calves', 'Shoulders', 'Cardio'], form_instructions: 'Jump continuously with light hops', tips: ['Stay on toes'], mistakes_to_avoid: ['Jumping too high'] },
    { session_type: 'stretching', exercise_name: 'Full Body Stretch', duration_minutes: 5, muscles_targeted: ['Full Body'], form_instructions: 'Stretch all major muscle groups', tips: ['Hold each stretch 20-30 seconds'], mistakes_to_avoid: ['Bouncing while stretching'] },
  ]);

  return workouts;
}

// Helper function to build payment message
function buildPaymentMessage(paymentDetails: any, gymName: string): string {
  let message = `Payment Details from ${gymName}\n\n`;

  if (paymentDetails.upiId) {
    message += `UPI ID: ${paymentDetails.upiId}\n`;
  }

  if (paymentDetails.holderName) {
    message += `Account Holder: ${paymentDetails.holderName}\n`;
  }

  if (paymentDetails.bankAccountNumber) {
    message += `Bank Account: ${paymentDetails.bankAccountNumber}\n`;
  }

  if (paymentDetails.ifscCode) {
    message += `IFSC Code: ${paymentDetails.ifscCode}\n`;
  }

  if (paymentDetails.qrUrl) {
    message += `\nQR Code: ${paymentDetails.qrUrl}\n`;
  }

  message += `\nPlease use these details to make your payment. Thank you!`;

  return message;
}

