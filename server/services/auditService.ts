import { db } from '../db';
import * as schema from '../../shared/schema';
import { Request } from 'express';

export type AuditSeverity = 'info' | 'warning' | 'critical';
export type AuditStatus = 'success' | 'failed';

export interface AuditLogEntry {
  userId: string;
  userName: string;
  action: string;
  resource: string;
  severity: AuditSeverity;
  status: AuditStatus;
  ipAddress: string;
  details?: string;
}

function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(schema.auditLogs).values({
      userId: entry.userId,
      userName: entry.userName,
      action: entry.action,
      resource: entry.resource,
      severity: entry.severity,
      status: entry.status,
      ipAddress: entry.ipAddress,
      details: entry.details || null,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

export async function logLogin(req: Request, userId: string, userName: string, success: boolean): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'LOGIN',
    resource: 'Authentication',
    severity: success ? 'info' : 'warning',
    status: success ? 'success' : 'failed',
    ipAddress: getClientIP(req),
    details: success ? `User logged in successfully` : `Failed login attempt`,
  });
}

export async function logLogout(req: Request, userId: string, userName: string): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'LOGOUT',
    resource: 'Authentication',
    severity: 'info',
    status: 'success',
    ipAddress: getClientIP(req),
    details: 'User logged out',
  });
}

export async function logGymCreated(req: Request, userId: string, userName: string, gymName: string, gymId: string): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'CREATE',
    resource: `Gym: ${gymName}`,
    severity: 'info',
    status: 'success',
    ipAddress: getClientIP(req),
    details: `Created gym "${gymName}" (ID: ${gymId})`,
  });
}

export async function logGymUpdated(req: Request, userId: string, userName: string, gymName: string, gymId: string, changes: string): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'UPDATE',
    resource: `Gym: ${gymName}`,
    severity: 'info',
    status: 'success',
    ipAddress: getClientIP(req),
    details: `Updated gym "${gymName}" - ${changes}`,
  });
}

export async function logGymDeleted(req: Request, userId: string, userName: string, gymName: string): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'DELETE',
    resource: `Gym: ${gymName}`,
    severity: 'warning',
    status: 'success',
    ipAddress: getClientIP(req),
    details: `Deleted gym "${gymName}"`,
  });
}

export async function logGymSuspended(req: Request, userId: string, userName: string, gymName: string, reason: string): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'SUSPEND',
    resource: `Gym: ${gymName}`,
    severity: 'critical',
    status: 'success',
    ipAddress: getClientIP(req),
    details: `Suspended gym "${gymName}" - Reason: ${reason}`,
  });
}

export async function logMemberCreated(req: Request, userId: string, userName: string, memberName: string, gymName: string): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'CREATE',
    resource: `Member: ${memberName}`,
    severity: 'info',
    status: 'success',
    ipAddress: getClientIP(req),
    details: `Created member "${memberName}" in gym "${gymName}"`,
  });
}

export async function logMemberUpdated(req: Request, userId: string, userName: string, memberName: string): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'UPDATE',
    resource: `Member: ${memberName}`,
    severity: 'info',
    status: 'success',
    ipAddress: getClientIP(req),
    details: `Updated member "${memberName}"`,
  });
}

export async function logMemberDeleted(req: Request, userId: string, userName: string, memberName: string): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'DELETE',
    resource: `Member: ${memberName}`,
    severity: 'warning',
    status: 'success',
    ipAddress: getClientIP(req),
    details: `Deleted member "${memberName}"`,
  });
}

export async function logInvoiceGenerated(req: Request, userId: string, userName: string, invoiceCount: number, totalAmount: number): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'GENERATE',
    resource: 'Invoices',
    severity: 'info',
    status: 'success',
    ipAddress: getClientIP(req),
    details: `Generated ${invoiceCount} invoices totaling ₹${totalAmount.toLocaleString()}`,
  });
}

export async function logInvoicePaid(req: Request, userId: string, userName: string, invoiceNumber: string, gymName: string, amount: string): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'PAYMENT',
    resource: `Invoice: ${invoiceNumber}`,
    severity: 'info',
    status: 'success',
    ipAddress: getClientIP(req),
    details: `Marked invoice ${invoiceNumber} as paid for ${gymName} - Amount: ₹${amount}`,
  });
}

export async function logPricingChanged(req: Request, userId: string, userName: string, gymName: string, planType: string, rate: string): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'UPDATE',
    resource: `Pricing: ${gymName}`,
    severity: 'info',
    status: 'success',
    ipAddress: getClientIP(req),
    details: `Changed pricing for "${gymName}" to ${planType} plan at ₹${rate}/member`,
  });
}

export async function logUserCreated(req: Request, userId: string, userName: string, newUserName: string, role: string): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'CREATE',
    resource: `User: ${newUserName}`,
    severity: 'info',
    status: 'success',
    ipAddress: getClientIP(req),
    details: `Created ${role} user "${newUserName}"`,
  });
}

export async function logBrandingUpdated(req: Request, userId: string, userName: string, gymName: string): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'UPDATE',
    resource: `Branding: ${gymName}`,
    severity: 'info',
    status: 'success',
    ipAddress: getClientIP(req),
    details: `Updated branding settings for "${gymName}"`,
  });
}

export async function logIntegrationToggled(req: Request, userId: string, userName: string, integrationName: string, newStatus: string): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'UPDATE',
    resource: `Integration: ${integrationName}`,
    severity: 'info',
    status: 'success',
    ipAddress: getClientIP(req),
    details: `${newStatus === 'active' ? 'Enabled' : 'Disabled'} integration "${integrationName}"`,
  });
}

export async function logSecurityEvent(req: Request, userId: string, userName: string, event: string, details: string): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'SECURITY',
    resource: 'System',
    severity: 'critical',
    status: 'success',
    ipAddress: getClientIP(req),
    details: `${event}: ${details}`,
  });
}

export async function logFailedLoginAttempt(req: Request, email: string): Promise<void> {
  await logAuditEvent({
    userId: 'unknown',
    userName: email,
    action: 'LOGIN_FAILED',
    resource: 'Authentication',
    severity: 'warning',
    status: 'failed',
    ipAddress: getClientIP(req),
    details: `Failed login attempt for email: ${email}`,
  });
}

export async function logOrderCreated(req: Request, userId: string, userName: string, orderId: string, amount: string): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'CREATE',
    resource: `Order: ${orderId}`,
    severity: 'info',
    status: 'success',
    ipAddress: getClientIP(req),
    details: `Created order ${orderId} - Amount: ₹${amount}`,
  });
}

export async function logProductCreated(req: Request, userId: string, userName: string, productName: string): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'CREATE',
    resource: `Product: ${productName}`,
    severity: 'info',
    status: 'success',
    ipAddress: getClientIP(req),
    details: `Created product "${productName}"`,
  });
}

export async function logMembershipCreated(req: Request, userId: string, userName: string, memberName: string, planName: string): Promise<void> {
  await logAuditEvent({
    userId,
    userName,
    action: 'CREATE',
    resource: `Membership: ${memberName}`,
    severity: 'info',
    status: 'success',
    ipAddress: getClientIP(req),
    details: `Assigned plan "${planName}" to member "${memberName}"`,
  });
}

export async function logSystemEvent(action: string, resource: string, details: string, severity: AuditSeverity = 'info'): Promise<void> {
  await logAuditEvent({
    userId: 'system',
    userName: 'System',
    action,
    resource,
    severity,
    status: 'success',
    ipAddress: '127.0.0.1',
    details,
  });
}
