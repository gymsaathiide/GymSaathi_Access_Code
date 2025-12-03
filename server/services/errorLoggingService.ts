import { db, supabase } from '../db';
import * as schema from '../../shared/schema';
import { lt } from 'drizzle-orm';

interface ErrorContext {
  userId?: string;
  userName: string;
  role: string;
  action: string;
}

const ERROR_TRANSLATIONS: Record<string, string> = {
  'ValidationError': 'Required information was missing.',
  'missing field': 'Required information was missing.',
  'required': 'Required information was missing.',
  'Foreign key constraint': 'The requested data was not valid.',
  'constraint failed': 'The requested data was not valid.',
  'not found': 'The requested item could not be found.',
  'expects numeric': 'The value entered was incorrect or missing.',
  'invalid': 'The information provided was not valid.',
  'type error': 'The information provided was in the wrong format.',
  '500': 'Something went wrong while processing the request.',
  'Internal Server Error': 'Something went wrong while processing the request.',
  'permission denied': 'You do not have permission to perform this action.',
  'unauthorized': 'You do not have permission to perform this action.',
  'forbidden': 'You do not have permission to perform this action.',
  'duplicate': 'This item already exists.',
  'already exists': 'This item already exists.',
  'unique constraint': 'This item already exists.',
  'timeout': 'The request took too long. Please try again.',
  'network error': 'There was a connection problem. Please try again.',
  'payment failed': 'The payment could not be processed.',
  'insufficient': 'There were not enough resources to complete this action.',
  'expired': 'This item has expired.',
  'limit exceeded': 'You have reached the maximum limit.',
  'rate limit': 'Too many requests. Please wait and try again.',
};

function translateError(technicalError: string): string {
  const lowerError = technicalError.toLowerCase();
  
  for (const [pattern, translation] of Object.entries(ERROR_TRANSLATIONS)) {
    if (lowerError.includes(pattern.toLowerCase())) {
      return translation;
    }
  }
  
  return 'Something went wrong while processing your request.';
}

const ACTION_DESCRIPTIONS: Record<string, string> = {
  'order': 'Creating an order',
  'payment': 'Processing a payment',
  'membership': 'Managing membership',
  'notification': 'Sending a notification',
  'product': 'Managing a product',
  'member': 'Managing member details',
  'lead': 'Managing a lead',
  'attendance': 'Recording attendance',
  'enquiry': 'Submitting an enquiry',
  'trainer': 'Managing trainer',
  'plan': 'Managing plan',
  'shop': 'Shop operation',
  'cart': 'Cart operation',
  'checkout': 'Checkout operation',
  'login': 'Logging in',
  'register': 'Registering',
  'password': 'Password operation',
};

function translateAction(action: string): string {
  const lowerAction = action.toLowerCase();
  
  for (const [pattern, translation] of Object.entries(ACTION_DESCRIPTIONS)) {
    if (lowerAction.includes(pattern)) {
      return translation;
    }
  }
  
  return action;
}

export async function logFunctionalError(
  technicalError: string,
  context: ErrorContext
): Promise<void> {
  try {
    const humanReadableError = translateError(technicalError);
    const humanReadableAction = translateAction(context.action);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);

    if (db) {
      await db.insert(schema.securityAudit).values({
        userId: context.userId || null,
        userName: context.userName,
        role: context.role,
        errorMessage: humanReadableError,
        action: humanReadableAction,
        expiresAt,
      });
    } else if (supabase) {
      await supabase.from('security_audit').insert({
        user_id: context.userId || null,
        user_name: context.userName,
        role: context.role,
        error_message: humanReadableError,
        action: humanReadableAction,
        expires_at: expiresAt.toISOString(),
      });
    }

    console.log(`[Security Audit] Logged error for ${context.userName} (${context.role}): ${humanReadableAction}`);
  } catch (error) {
    console.error('Failed to log security audit error:', error);
  }
}

export async function cleanupExpiredLogs(): Promise<number> {
  try {
    const now = new Date();
    let deletedCount = 0;

    if (db) {
      const result = await db
        .delete(schema.securityAudit)
        .where(lt(schema.securityAudit.expiresAt, now));
      deletedCount = result.rowCount || 0;
    } else if (supabase) {
      const { data } = await supabase
        .from('security_audit')
        .delete()
        .lt('expires_at', now.toISOString())
        .select('id');
      deletedCount = data?.length || 0;
    }

    if (deletedCount > 0) {
      console.log(`[Security Audit] Cleaned up ${deletedCount} expired logs`);
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Failed to cleanup expired security audit logs:', error);
    return 0;
  }
}

export async function getSecurityAuditLogs(): Promise<any[]> {
  try {
    await cleanupExpiredLogs();

    if (db) {
      const logs = await db
        .select()
        .from(schema.securityAudit)
        .orderBy(schema.securityAudit.createdAt);
      
      return logs.reverse().map(log => ({
        id: log.id,
        userName: log.userName,
        role: log.role,
        errorMessage: log.errorMessage,
        action: log.action,
        createdAt: log.createdAt,
      }));
    } else if (supabase) {
      const { data } = await supabase
        .from('security_audit')
        .select('*')
        .order('created_at', { ascending: false });
      
      return (data || []).map((log: any) => ({
        id: log.id,
        userName: log.user_name,
        role: log.role,
        errorMessage: log.error_message,
        action: log.action,
        createdAt: log.created_at,
      }));
    }

    return [];
  } catch (error) {
    console.error('Failed to get security audit logs:', error);
    return [];
  }
}

export function createErrorResponse(technicalError: string): { error: string } {
  return { error: translateError(technicalError) };
}
