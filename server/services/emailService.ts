import { Resend } from 'resend';

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}
const fromEmail = process.env.RESEND_FROM_EMAIL || 'no-reply@gymsaathi.com';

export interface GymAdminWelcomeEmailPayload {
  gymName: string;
  adminName: string;
  adminEmail: string;
  tempPassword: string;
  loginUrl: string;
}

export interface MemberWelcomeEmailPayload {
  gymName: string;
  memberName: string;
  memberEmail: string;
  tempPassword: string;
  memberPortalUrl: string;
}

export interface PasswordResetEmailPayload {
  userName: string;
  userEmail: string;
  resetLink: string;
  expiryMinutes: number;
}

function getGymAdminWelcomeEmailHtml(payload: GymAdminWelcomeEmailPayload): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to GYMSAATHI</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Hi <strong>${payload.adminName}</strong>,
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          You have been added as a <strong>Gym Admin</strong> for <strong>${payload.gymName}</strong>.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
          <tr>
            <td style="padding: 20px;">
              <p style="color: #666; font-size: 14px; margin: 0 0 10px;"><strong>Your Login Details:</strong></p>
              <p style="color: #333; font-size: 14px; margin: 5px 0;">Email: <strong>${payload.adminEmail}</strong></p>
              <p style="color: #333; font-size: 14px; margin: 5px 0;">Temporary Password: <strong>${payload.tempPassword}</strong></p>
            </td>
          </tr>
        </table>
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
          Please change your password after your first login for security.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center; padding: 20px 0;">
              <a href="${payload.loginUrl}" style="display: inline-block; padding: 14px 30px; background-color: #f97316; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Login to Dashboard
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px; background-color: #1f2937; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} GYMSAATHI. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function getLeadWelcomeEmailHtml(payload: LeadWelcomeEmailPayload): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Thank You for Your Interest!</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Hi <strong>${payload.leadName}</strong>,
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Thank you for your interest in <strong>${payload.gymName}</strong>! 🎉
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          We're excited to have you on board and help you achieve your fitness goals. Our team will be reaching out to you shortly to discuss your requirements and guide you through our membership plans.
        </p>
        ${payload.interestedPlan ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
          <tr>
            <td style="padding: 20px;">
              <p style="color: #666; font-size: 14px; margin: 0 0 10px;"><strong>You showed interest in:</strong></p>
              <p style="color: #f97316; font-size: 16px; margin: 5px 0; font-weight: bold;">${payload.interestedPlan}</p>
            </td>
          </tr>
        </table>
        ` : ''}
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
          <strong>What's Next?</strong>
        </p>
        <ul style="color: #333; font-size: 14px; line-height: 1.8; margin: 0 0 20px; padding-left: 20px;">
          <li>Our fitness advisor will contact you within 24 hours</li>
          <li>We'll schedule a gym tour at your convenience</li>
          <li>Get personalized plan recommendations</li>
          <li>Ask any questions you have about our facilities</li>
        </ul>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <tr>
            <td style="padding: 20px;">
              <p style="color: #92400e; font-size: 14px; margin: 0 0 10px;"><strong>Need immediate assistance?</strong></p>
              <p style="color: #92400e; font-size: 14px; margin: 5px 0;">📞 Call us: <strong>${payload.gymPhone}</strong></p>
              <p style="color: #92400e; font-size: 14px; margin: 5px 0;">📧 Email: <strong>${payload.gymEmail}</strong></p>
            </td>
          </tr>
        </table>
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0; text-align: center;">
          We look forward to welcoming you to our fitness family!
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px; background-color: #1f2937; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} ${payload.gymName} via GYMSAATHI. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function getMemberWelcomeEmailHtml(payload: MemberWelcomeEmailPayload): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to ${payload.gymName}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Hi <strong>${payload.memberName}</strong>,
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Welcome to <strong>${payload.gymName}</strong>! Your member portal is now ready.
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          With your GYMSAATHI portal, you can:
        </p>
        <ul style="color: #333; font-size: 14px; line-height: 1.8; margin: 0 0 20px; padding-left: 20px;">
          <li>View your class schedule</li>
          <li>Track your attendance</li>
          <li>Shop gym products</li>
          <li>Check your membership status</li>
        </ul>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
          <tr>
            <td style="padding: 20px;">
              <p style="color: #666; font-size: 14px; margin: 0 0 10px;"><strong>Your Login Details:</strong></p>
              <p style="color: #333; font-size: 14px; margin: 5px 0;">Email: <strong>${payload.memberEmail}</strong></p>
              <p style="color: #333; font-size: 14px; margin: 5px 0;">Temporary Password: <strong>${payload.tempPassword}</strong></p>
            </td>
          </tr>
        </table>
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
          Please change your password after your first login for security.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center; padding: 20px 0;">
              <a href="${payload.memberPortalUrl}" style="display: inline-block; padding: 14px 30px; background-color: #f97316; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Access Member Portal
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px; background-color: #1f2937; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} GYMSAATHI. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendGymAdminWelcomeEmail(payload: GymAdminWelcomeEmailPayload): Promise<boolean> {
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'false') {
    console.log('[email] Email notifications disabled, skipping gym admin welcome email');
    return true;
  }

  if (!payload.adminEmail) {
    console.log('[email] No email provided for gym admin, skipping');
    return false;
  }

  if (!resend) {
    console.log('[email] RESEND_API_KEY not configured, skipping email');
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `GYMSAATHI <${fromEmail}>`,
      to: payload.adminEmail,
      subject: `Welcome to GYMSAATHI - You're now Gym Admin for ${payload.gymName}`,
      html: getGymAdminWelcomeEmailHtml(payload),
      text: `Hi ${payload.adminName}, Welcome to GYMSAATHI! You have been added as Gym Admin for ${payload.gymName}. Login: ${payload.loginUrl}. Email: ${payload.adminEmail}, Temporary Password: ${payload.tempPassword}. Please change your password after first login.`,
    });

    if (error) {
      console.error('[email] ERROR sending gym admin welcome email:', error);
      return false;
    }

    console.log(`[email] Sent gym admin welcome email to ${payload.adminEmail} (ID: ${data?.id})`);
    return true;
  } catch (error) {
    console.error('[email] ERROR sending gym admin welcome email:', error);
    return false;
  }
}

export async function sendLeadWelcomeEmail(payload: LeadWelcomeEmailPayload): Promise<boolean> {
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'false') {
    console.log('[email] Email notifications disabled, skipping lead welcome email');
    return true;
  }

  if (!payload.leadEmail) {
    console.log('[email] No email provided for lead, skipping');
    return false;
  }

  if (!resend) {
    console.log('[email] RESEND_API_KEY not configured, skipping email');
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${payload.gymName} via GYMSAATHI <${fromEmail}>`,
      to: payload.leadEmail,
      subject: `Welcome! We're Excited to Have You at ${payload.gymName}`,
      html: getLeadWelcomeEmailHtml(payload),
      text: `Hi ${payload.leadName}, Thank you for your interest in ${payload.gymName}! We're excited to help you achieve your fitness goals. Our team will contact you shortly. ${payload.interestedPlan ? `You showed interest in: ${payload.interestedPlan}. ` : ''}Need help? Call ${payload.gymPhone} or email ${payload.gymEmail}.`,
    });

    if (error) {
      console.error('[email] ERROR sending lead welcome email:', error);
      return false;
    }

    console.log(`[email] Sent lead welcome email to ${payload.leadEmail} (ID: ${data?.id})`);
    return true;
  } catch (error) {
    console.error('[email] ERROR sending lead welcome email:', error);
    return false;
  }
}

export async function sendMemberWelcomeEmail(payload: MemberWelcomeEmailPayload): Promise<boolean> {
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'false') {
    console.log('[email] Email notifications disabled, skipping member welcome email');
    return true;
  }

  if (!payload.memberEmail) {
    console.log('[email] No email provided for member, skipping');
    return false;
  }

  if (!resend) {
    console.log('[email] RESEND_API_KEY not configured, skipping email');
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${payload.gymName} via GYMSAATHI <${fromEmail}>`,
      to: payload.memberEmail,
      subject: `Welcome to ${payload.gymName} - Your Member Portal is Ready!`,
      html: getMemberWelcomeEmailHtml(payload),
      text: `Hi ${payload.memberName}, Welcome to ${payload.gymName}! Your GYMSAATHI member portal is ready: ${payload.memberPortalUrl}. Email: ${payload.memberEmail}, Temporary Password: ${payload.tempPassword}. View your classes, attendance and shop in one place. Please change your password after first login.`,
    });

    if (error) {
      console.error('[email] ERROR sending member welcome email:', error);
      return false;
    }

    console.log(`[email] Sent member welcome email to ${payload.memberEmail} (ID: ${data?.id})`);
    return true;
  } catch (error) {
    console.error('[email] ERROR sending member welcome email:', error);
    return false;
  }
}

export interface LeadWelcomeEmailPayload {
  gymName: string;
  leadName: string;
  leadEmail: string;
  interestedPlan?: string;
  gymPhone: string;
  gymEmail: string;
}

export interface TrainerWelcomeEmailPayload {
  gymName: string;
  trainerName: string;
  trainerEmail: string;
  tempPassword: string;
  portalUrl: string;
}

export async function sendTrainerWelcomeEmail(payload: TrainerWelcomeEmailPayload): Promise<boolean> {
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'false') {
    console.log('[email] Email notifications disabled, skipping trainer welcome email');
    return true;
  }

  if (!payload.trainerEmail) {
    console.log('[email] No email provided for trainer, skipping');
    return false;
  }

  if (!resend) {
    console.log('[email] RESEND_API_KEY not configured, skipping email');
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${payload.gymName} via GYMSAATHI <${fromEmail}>`,
      to: payload.trainerEmail,
      subject: `Welcome to ${payload.gymName} - Your Trainer Portal is Ready!`,
      html: getTrainerWelcomeEmailHtml(payload),
      text: `Hi ${payload.trainerName}, Welcome to ${payload.gymName}! Your GYMSAATHI trainer portal is ready: ${payload.portalUrl}. Email: ${payload.trainerEmail}, Temporary Password: ${payload.tempPassword}. Manage classes, track attendance and view member progress. Please change your password after first login.`,
    });

    if (error) {
      console.error('[email] ERROR sending trainer welcome email:', error);
      return false;
    }

    console.log(`[email] Sent trainer welcome email to ${payload.trainerEmail} (ID: ${data?.id})`);
    return true;
  } catch (error) {
    console.error('[email] ERROR sending trainer welcome email:', error);
    return false;
  }
}

function getTrainerWelcomeEmailHtml(payload: TrainerWelcomeEmailPayload): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to ${payload.gymName}!</h1>
        <p style="color: #ffffff; margin: 10px 0 0; opacity: 0.9;">Your Trainer Portal is Ready</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <p style="font-size: 16px; color: #333; margin: 0 0 20px;">Hi <strong>${payload.trainerName}</strong>,</p>
        <p style="font-size: 16px; color: #333; margin: 0 0 20px;">Congratulations! You've been added as a trainer at <strong>${payload.gymName}</strong>. Your GYMSAATHI trainer portal is now ready for you to access.</p>
        
        <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px; color: #333; font-size: 16px;">Your Login Credentials</h3>
          <table cellpadding="0" cellspacing="0" style="width: 100%;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 14px;">Email:</td>
              <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold;">${payload.trainerEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 14px;">Temporary Password:</td>
              <td style="padding: 8px 0; color: #333; font-size: 14px; font-weight: bold; font-family: monospace; background-color: #fff3e0; padding: 5px 10px; border-radius: 4px;">${payload.tempPassword}</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${payload.portalUrl}" style="display: inline-block; padding: 14px 30px; background-color: #f97316; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Access Trainer Portal</a>
        </div>
        
        <div style="background-color: #fef3e2; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Important:</strong> Please change your password after your first login for security.</p>
        </div>
        
        <h3 style="color: #333; margin: 20px 0 10px; font-size: 16px;">What You Can Do:</h3>
        <ul style="color: #666; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
          <li>View and manage your assigned classes</li>
          <li>Track member attendance and progress</li>
          <li>Manage leads and member inquiries</li>
          <li>View the gym shop and member purchases</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px; background-color: #f9f9f9; text-align: center;">
        <p style="margin: 0; color: #666; font-size: 12px;">Powered by GYMSAATHI - Gym Management Made Simple</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface InvoiceEmailPayload {
  gymName: string;
  memberName: string;
  memberEmail: string;
  invoiceNumber: string;
  amount: number;
  dueDate: Date;
  status: string;
  downloadUrl: string;
  pdfBuffer?: Buffer;
}

function getInvoiceEmailHtml(payload: InvoiceEmailPayload): string {
  const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payload.amount);
  const formattedDueDate = new Date(payload.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const isPaid = payload.status === 'paid';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">${isPaid ? 'Payment Receipt' : 'Invoice'} from ${payload.gymName}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Hi <strong>${payload.memberName}</strong>,
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          ${isPaid ? 'Thank you for your payment!' : 'A new invoice has been generated for your account.'}
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0;"><strong style="color: #666;">Invoice Number:</strong></td>
                  <td style="padding: 8px 0; text-align: right; color: #333;">${payload.invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong style="color: #666;">Amount:</strong></td>
                  <td style="padding: 8px 0; text-align: right; color: #f97316; font-size: 18px; font-weight: bold;">${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong style="color: #666;">Due Date:</strong></td>
                  <td style="padding: 8px 0; text-align: right; color: #333;">${formattedDueDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;"><strong style="color: #666;">Status:</strong></td>
                  <td style="padding: 8px 0; text-align: right;">
                    <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; background-color: ${isPaid ? '#dcfce7' : '#fef3c7'}; color: ${isPaid ? '#22c55e' : '#f59e0b'};">
                      ${payload.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center; padding: 20px 0;">
              <a href="${payload.downloadUrl}" style="display: inline-block; padding: 14px 30px; background-color: #f97316; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Download Invoice PDF
              </a>
            </td>
          </tr>
        </table>
        ${!isPaid ? `
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0; text-align: center;">
          Please make the payment before the due date to avoid any service interruptions.
        </p>
        ` : ''}
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px; background-color: #1f2937; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} ${payload.gymName} via GYMSAATHI. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendInvoiceEmail(payload: InvoiceEmailPayload): Promise<boolean> {
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'false') {
    console.log('[email] Email notifications disabled, skipping invoice email');
    return true;
  }

  if (!payload.memberEmail) {
    console.log('[email] No email provided for member, skipping invoice email');
    return false;
  }

  if (!resend) {
    console.log('[email] RESEND_API_KEY not configured, skipping email');
    return false;
  }

  try {
    const isPaid = payload.status === 'paid';
    const subject = isPaid 
      ? `Payment Receipt - Invoice #${payload.invoiceNumber} from ${payload.gymName}`
      : `Invoice #${payload.invoiceNumber} from ${payload.gymName}`;

    const emailOptions: any = {
      from: `${payload.gymName} via GYMSAATHI <${fromEmail}>`,
      to: payload.memberEmail,
      subject: subject,
      html: getInvoiceEmailHtml(payload),
      text: `Hi ${payload.memberName}, ${isPaid ? 'Thank you for your payment!' : 'A new invoice has been generated.'} Invoice #${payload.invoiceNumber}, Amount: INR ${payload.amount}, Due Date: ${new Date(payload.dueDate).toLocaleDateString()}. Download: ${payload.downloadUrl}`,
    };

    if (payload.pdfBuffer) {
      emailOptions.attachments = [{
        filename: `invoice-${payload.invoiceNumber}.pdf`,
        content: payload.pdfBuffer,
      }];
    }

    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error('[email] ERROR sending invoice email:', error);
      return false;
    }

    console.log(`[email] Sent invoice email to ${payload.memberEmail} (ID: ${data?.id})`);
    return true;
  } catch (error) {
    console.error('[email] ERROR sending invoice email:', error);
    return false;
  }
}

export interface PaymentReminderEmailPayload {
  memberName: string;
  memberEmail: string;
  gymName: string;
  amountDue: number;
  dueDate: string;
}

function getPaymentReminderEmailHtml(payload: PaymentReminderEmailPayload): string {
  const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(payload.amountDue);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Payment Reminder</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Hi <strong>${payload.memberName}</strong>,
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          This is a friendly reminder that you have an outstanding payment due at <strong>${payload.gymName}</strong>.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3cd; border-radius: 8px; margin: 20px 0; border: 1px solid #ffc107;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="color: #856404; font-size: 14px; margin: 0 0 10px;">Amount Due</p>
              <p style="color: #333; font-size: 28px; font-weight: bold; margin: 0;">${formattedAmount}</p>
            </td>
          </tr>
        </table>
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
          Please make the payment at your earliest convenience to continue enjoying our services without interruption.
        </p>
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
          If you have already made the payment, please disregard this reminder.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px; background-color: #1f2937; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} ${payload.gymName} via GYMSAATHI. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendPaymentReminderEmail(payload: PaymentReminderEmailPayload): Promise<boolean> {
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'false') {
    console.log('[email] Email notifications disabled, skipping payment reminder email');
    return true;
  }

  if (!payload.memberEmail) {
    console.log('[email] No email provided for member, skipping payment reminder email');
    return false;
  }

  if (!resend) {
    console.log('[email] RESEND_API_KEY not configured, skipping email');
    return false;
  }

  try {
    const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(payload.amountDue);

    const { data, error } = await resend.emails.send({
      from: `${payload.gymName} via GYMSAATHI <${fromEmail}>`,
      to: payload.memberEmail,
      subject: `Payment Reminder - ${formattedAmount} Due at ${payload.gymName}`,
      html: getPaymentReminderEmailHtml(payload),
      text: `Hi ${payload.memberName}, This is a reminder that you have an outstanding payment of ${formattedAmount} due at ${payload.gymName}. Please make the payment at your earliest convenience.`,
    });

    if (error) {
      console.error('[email] ERROR sending payment reminder email:', error);
      return false;
    }

    console.log(`[email] Sent payment reminder email to ${payload.memberEmail} (ID: ${data?.id})`);
    return true;
  } catch (error) {
    console.error('[email] ERROR sending payment reminder email:', error);
    return false;
  }
}

export interface NewLeadNotificationEmailPayload {
  adminEmail: string;
  adminName: string;
  gymName: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string;
  goal?: string;
  source?: string;
  preferredTime?: string;
  message?: string;
  dashboardUrl: string;
}

function getNewLeadNotificationEmailHtml(payload: NewLeadNotificationEmailPayload): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">New Enquiry Received!</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Hi <strong>${payload.adminName}</strong>,
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          You have a new enquiry for <strong>${payload.gymName}</strong>!
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
          <tr>
            <td style="padding: 20px;">
              <p style="color: #666; font-size: 14px; margin: 0 0 10px;"><strong>Lead Details:</strong></p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 5px 0; color: #333;"><strong>Name:</strong></td>
                  <td style="padding: 5px 0; color: #333;">${payload.leadName}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #333;"><strong>Phone:</strong></td>
                  <td style="padding: 5px 0; color: #333;"><a href="tel:${payload.leadPhone}" style="color: #22c55e;">${payload.leadPhone}</a></td>
                </tr>
                ${payload.leadEmail ? `
                <tr>
                  <td style="padding: 5px 0; color: #333;"><strong>Email:</strong></td>
                  <td style="padding: 5px 0; color: #333;"><a href="mailto:${payload.leadEmail}" style="color: #22c55e;">${payload.leadEmail}</a></td>
                </tr>
                ` : ''}
                ${payload.goal ? `
                <tr>
                  <td style="padding: 5px 0; color: #333;"><strong>Goal:</strong></td>
                  <td style="padding: 5px 0; color: #333;">${payload.goal}</td>
                </tr>
                ` : ''}
                ${payload.source ? `
                <tr>
                  <td style="padding: 5px 0; color: #333;"><strong>Source:</strong></td>
                  <td style="padding: 5px 0; color: #333;">${payload.source}</td>
                </tr>
                ` : ''}
                ${payload.preferredTime ? `
                <tr>
                  <td style="padding: 5px 0; color: #333;"><strong>Preferred Time:</strong></td>
                  <td style="padding: 5px 0; color: #333;">${payload.preferredTime}</td>
                </tr>
                ` : ''}
              </table>
              ${payload.message ? `
              <p style="color: #666; font-size: 14px; margin: 15px 0 5px;"><strong>Message:</strong></p>
              <p style="color: #333; font-size: 14px; margin: 0; padding: 10px; background-color: #ffffff; border-radius: 4px;">${payload.message}</p>
              ` : ''}
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center; padding: 20px 0;">
              <a href="${payload.dashboardUrl}" style="display: inline-block; padding: 14px 30px; background-color: #22c55e; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                View Lead in Dashboard
              </a>
            </td>
          </tr>
        </table>
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0; text-align: center;">
          Follow up quickly to convert this lead into a member!
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px; background-color: #1f2937; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} ${payload.gymName} via GYMSAATHI. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendNewLeadNotificationEmail(payload: NewLeadNotificationEmailPayload): Promise<boolean> {
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'false') {
    console.log('[email] Email notifications disabled, skipping new lead notification email');
    return true;
  }

  if (!payload.adminEmail) {
    console.log('[email] No admin email provided, skipping new lead notification');
    return false;
  }

  if (!resend) {
    console.log('[email] RESEND_API_KEY not configured, skipping email');
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `GYMSAATHI <${fromEmail}>`,
      to: payload.adminEmail,
      subject: `New enquiry for ${payload.gymName} – ${payload.leadName}`,
      html: getNewLeadNotificationEmailHtml(payload),
      text: `Hi ${payload.adminName}, You have a new enquiry for ${payload.gymName}! Lead: ${payload.leadName}, Phone: ${payload.leadPhone}${payload.leadEmail ? `, Email: ${payload.leadEmail}` : ''}${payload.goal ? `, Goal: ${payload.goal}` : ''}. View in dashboard: ${payload.dashboardUrl}`,
    });

    if (error) {
      console.error('[email] ERROR sending new lead notification email:', error);
      return false;
    }

    console.log(`[email] Sent new lead notification email to ${payload.adminEmail} (ID: ${data?.id})`);
    return true;
  } catch (error) {
    console.error('[email] ERROR sending new lead notification email:', error);
    return false;
  }
}

function getPasswordResetEmailHtml(payload: PasswordResetEmailPayload): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 40px 30px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Password Reset Request</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Hi <strong>${payload.userName}</strong>,
        </p>
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          We received a request to reset your password for your GYMSAATHI account associated with <strong>${payload.userEmail}</strong>.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
          <tr>
            <td style="padding: 15px 20px;">
              <p style="color: #92400e; font-size: 14px; margin: 0;">
                <strong>Important:</strong> This link will expire in <strong>${payload.expiryMinutes} minutes</strong>.
              </p>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="text-align: center; padding: 20px 0;">
              <a href="${payload.resetLink}" style="display: inline-block; padding: 16px 40px; background-color: #f97316; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Reset My Password
              </a>
            </td>
          </tr>
        </table>
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
          If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
        </p>
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
          If you're having trouble clicking the button, copy and paste the following link into your browser:
        </p>
        <p style="color: #f97316; font-size: 12px; word-break: break-all; margin: 10px 0;">
          ${payload.resetLink}
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px; background-color: #1f2937; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} GYMSAATHI. All rights reserved.
        </p>
        <p style="color: #9ca3af; font-size: 11px; margin: 8px 0 0;">
          This is an automated message. Please do not reply to this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<boolean> {
  if (!resend) {
    console.log('[email] RESEND_API_KEY not configured, skipping password reset email');
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `GYMSAATHI <${fromEmail}>`,
      to: payload.userEmail,
      subject: 'Reset Your GYMSAATHI Password',
      html: getPasswordResetEmailHtml(payload),
      text: `Hi ${payload.userName}, We received a request to reset your password. Click this link to reset: ${payload.resetLink}. This link expires in ${payload.expiryMinutes} minutes. If you didn't request this, please ignore this email.`,
    });

    if (error) {
      console.error('[email] ERROR sending password reset email:', error);
      return false;
    }

    console.log(`[email] Sent password reset email to ${payload.userEmail} (ID: ${data?.id})`);
    return true;
  } catch (error) {
    console.error('[email] ERROR sending password reset email:', error);
    return false;
  }
}

export interface PaymentDetailsEmailPayload {
  recipientEmail: string;
  recipientName: string;
  gymName: string;
  upiId?: string;
  qrUrl?: string;
  holderName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
}

function getPaymentDetailsEmailHtml(payload: PaymentDetailsEmailPayload): string {
  const bankDetailsHtml = payload.bankAccountNumber ? `
    <div style="margin-top: 20px; padding: 15px; background-color: #f8fafc; border-radius: 8px;">
      <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 16px;">Bank Account Details</h3>
      ${payload.holderName ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Account Holder:</strong> ${payload.holderName}</p>` : ''}
      <p style="margin: 5px 0; color: #4b5563;"><strong>Account Number:</strong> ${payload.bankAccountNumber}</p>
      ${payload.ifscCode ? `<p style="margin: 5px 0; color: #4b5563;"><strong>IFSC Code:</strong> ${payload.ifscCode}</p>` : ''}
    </div>
  ` : '';

  const upiHtml = payload.upiId ? `
    <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 8px;">
      <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 16px;">UPI Payment</h3>
      <p style="margin: 5px 0; color: #4b5563;"><strong>UPI ID:</strong> ${payload.upiId}</p>
      ${payload.qrUrl ? `
        <div style="margin-top: 15px; text-align: center;">
          <p style="color: #4b5563; margin-bottom: 10px;">Scan QR Code to Pay:</p>
          <img src="${payload.qrUrl}" alt="UPI QR Code" style="max-width: 200px; border: 1px solid #e5e7eb; border-radius: 8px;" />
        </div>
      ` : ''}
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Details from ${payload.gymName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">💳 Payment Details</h1>
        <p style="color: #ffffff; margin: 10px 0 0; opacity: 0.9;">from ${payload.gymName}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Hi ${payload.recipientName},
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Here are the payment details from <strong>${payload.gymName}</strong>. You can use any of the methods below to make your payment.
        </p>
        ${upiHtml}
        ${bankDetailsHtml}
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 25px 0 0;">
          If you have any questions, please contact your gym directly.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px; background-color: #1f2937; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} GYMSAATHI. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendPaymentDetailsEmail(
  recipientEmail: string,
  recipientName: string,
  paymentDetails: any,
  gymName: string
): Promise<boolean> {
  if (!resend) {
    console.log('[email] RESEND_API_KEY not configured, skipping payment details email');
    return false;
  }

  try {
    const payload: PaymentDetailsEmailPayload = {
      recipientEmail,
      recipientName,
      gymName,
      upiId: paymentDetails.upiId,
      qrUrl: paymentDetails.qrUrl,
      holderName: paymentDetails.holderName,
      bankAccountNumber: paymentDetails.bankAccountNumber,
      ifscCode: paymentDetails.ifscCode,
    };

    // Prepare attachments if QR code exists
    const attachments: { filename: string; content: Buffer }[] = [];
    let qrCid: string | null = null;
    
    if (paymentDetails.qrUrl && paymentDetails.qrUrl.startsWith('data:image/')) {
      try {
        // Extract base64 data from data URL
        const matches = paymentDetails.qrUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          const [, imageType, base64Data] = matches;
          const buffer = Buffer.from(base64Data, 'base64');
          qrCid = 'qrcode@gymsaathi';
          attachments.push({
            filename: `payment-qr.${imageType}`,
            content: buffer,
          });
          // Update payload to use CID reference
          payload.qrUrl = `cid:${qrCid}`;
          console.log(`[email] QR code attached (${buffer.length} bytes, type: ${imageType})`);
        }
      } catch (qrError) {
        console.error('[email] Error processing QR code for attachment:', qrError);
      }
    }

    const emailOptions: any = {
      from: `${gymName} via GYMSAATHI <${fromEmail}>`,
      to: recipientEmail,
      subject: `Payment Details from ${gymName}`,
      html: getPaymentDetailsEmailHtml(payload),
      text: `Hi ${recipientName}, Here are the payment details from ${gymName}. UPI ID: ${paymentDetails.upiId || 'N/A'}. Bank Account: ${paymentDetails.bankAccountNumber || 'N/A'}. IFSC: ${paymentDetails.ifscCode || 'N/A'}.`,
    };

    // Add attachments if QR code exists
    if (attachments.length > 0) {
      emailOptions.attachments = attachments;
    }

    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error('[email] ERROR sending payment details email:', error);
      return false;
    }

    console.log(`[email] Sent payment details email to ${recipientEmail} (ID: ${data?.id})`);
    return true;
  } catch (error) {
    console.error('[email] ERROR sending payment details email:', error);
    return false;
  }
}
