import axios from 'axios';
import FormData from 'form-data';

export interface GymAdminWelcomeWhatsAppPayload {
  phoneNumber: string;
  gymName: string;
  personName: string;
  loginUrl: string;
  email: string;
  tempPassword: string;
}

export interface MemberWelcomeWhatsAppPayload {
  phoneNumber: string;
  gymName: string;
  personName: string;
  portalUrl: string;
  email: string;
  tempPassword: string;
}

export interface LeadWelcomeWhatsAppPayload {
  phoneNumber: string;
  gymName: string;
  leadName: string;
  interestedPlan?: string;
  gymPhone: string;
  gymEmail: string;
}

export interface PhoneValidationResult {
  isValid: boolean;
  formattedNumber: string;
  error?: string;
}

export function validateAndFormatPhoneNumber(phone: string): PhoneValidationResult {
  if (!phone || phone.trim() === '') {
    return { isValid: false, formattedNumber: '', error: 'Phone number is required' };
  }

  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0091')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('091')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length >= 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  
  if (cleaned.length > 10) {
    return { 
      isValid: false, 
      formattedNumber: '', 
      error: `Phone number has extra digits after removing country code. Please enter only 10 digits.` 
    };
  }
  
  if (cleaned.length !== 10) {
    return { 
      isValid: false, 
      formattedNumber: '', 
      error: `Phone number must be exactly 10 digits. You entered ${cleaned.length} digits.` 
    };
  }
  
  if (!/^[6-9]/.test(cleaned)) {
    return { 
      isValid: false, 
      formattedNumber: '', 
      error: 'Indian mobile numbers must start with 6, 7, 8, or 9' 
    };
  }

  return { isValid: true, formattedNumber: '+91' + cleaned };
}

function formatPhoneNumber(phone: string): string | null {
  const result = validateAndFormatPhoneNumber(phone);
  if (!result.isValid) {
    console.log(`[whatsapp] Invalid phone number: ${phone} - ${result.error}`);
    return null;
  }
  return result.formattedNumber;
}

async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  const apiSecret = process.env.WATX_API_KEY;
  const baseUrl = process.env.WATX_BASE_URL;
  const accountId = process.env.WATX_INSTANCE_ID;

  if (!apiSecret || !baseUrl || !accountId) {
    console.log('[whatsapp] WatX credentials not fully configured (need WATX_API_KEY, WATX_BASE_URL, WATX_INSTANCE_ID)');
    return false;
  }

  const formattedPhone = formatPhoneNumber(phoneNumber);
  
  if (!formattedPhone) {
    console.log('[whatsapp] Skipping message - invalid phone number');
    return false;
  }
  
  try {
    const form = new FormData();
    form.append('secret', apiSecret);
    form.append('account', accountId);
    form.append('recipient', formattedPhone);
    form.append('type', 'text');
    form.append('message', message);

    console.log(`[whatsapp] Sending message to ${formattedPhone} via WatX API...`);

    const response = await axios.post(`${baseUrl}/send/whatsapp`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    if (response.data && response.data.status === 200) {
      console.log(`[whatsapp] SUCCESS: Message sent to ${formattedPhone}`, response.data);
      return true;
    } else {
      console.error('[whatsapp] API returned non-200 status:', response.data);
      return false;
    }
  } catch (error: any) {
    if (error.response) {
      console.error('[whatsapp] API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('[whatsapp] Network Error - no response received:', error.message);
    } else {
      console.error('[whatsapp] Error:', error.message);
    }
    return false;
  }
}

export async function sendGymAdminWelcomeWhatsApp(payload: GymAdminWelcomeWhatsAppPayload): Promise<boolean> {
  if (process.env.ENABLE_WHATSAPP_NOTIFICATIONS === 'false') {
    console.log('[whatsapp] WhatsApp notifications disabled, skipping gym admin welcome message');
    return true;
  }

  if (!payload.phoneNumber) {
    console.log('[whatsapp] No phone number provided for gym admin, skipping');
    return false;
  }

  const message = `🏋️ *Welcome to GYMSAATHI!*

Hi ${payload.personName},

You have been added as *Gym Admin* for *${payload.gymName}*.

🔐 *Your Login Details:*
📧 Email: ${payload.email}
🔑 Temp Password: ${payload.tempPassword}

🌐 Login here: ${payload.loginUrl}

Please change your password after your first login.

- Team GYMSAATHI`;

  return sendWhatsAppMessage(payload.phoneNumber, message);
}

export async function sendLeadWelcomeWhatsApp(payload: LeadWelcomeWhatsAppPayload): Promise<boolean> {
  if (process.env.ENABLE_WHATSAPP_NOTIFICATIONS === 'false') {
    console.log('[whatsapp] WhatsApp notifications disabled, skipping lead welcome message');
    return true;
  }

  if (!payload.phoneNumber) {
    console.log('[whatsapp] No phone number provided for lead, skipping');
    return false;
  }

  const message = `🎉 *Thank You for Your Interest!*

Hi ${payload.leadName},

Thank you for showing interest in *${payload.gymName}*! 💪

We're excited to help you achieve your fitness goals.

${payload.interestedPlan ? `✅ *You're interested in:* ${payload.interestedPlan}\n\n` : ''}📋 *What's Next?*
✓ Our team will contact you within 24 hours
✓ Schedule a gym tour at your convenience
✓ Get personalized plan recommendations
✓ Ask any questions about our facilities

📞 *Need immediate assistance?*
Call: ${payload.gymPhone}
Email: ${payload.gymEmail}

We look forward to welcoming you to our fitness family! 🏋️

- Team ${payload.gymName}`;

  return sendWhatsAppMessage(payload.phoneNumber, message);
}

export async function sendMemberWelcomeWhatsApp(payload: MemberWelcomeWhatsAppPayload): Promise<boolean> {
  if (process.env.ENABLE_WHATSAPP_NOTIFICATIONS === 'false') {
    console.log('[whatsapp] WhatsApp notifications disabled, skipping member welcome message');
    return true;
  }

  if (!payload.phoneNumber) {
    console.log('[whatsapp] No phone number provided for member, skipping');
    return false;
  }

  const message = `🏋️ *Welcome to ${payload.gymName}!*

Hi ${payload.personName},

Your GYMSAATHI member portal is ready!

🔐 *Your Login Details:*
📧 Email: ${payload.email}
🔑 Temp Password: ${payload.tempPassword}

🌐 Login here: ${payload.portalUrl}

Track your classes, attendance, and shop for gym products - all in one place!

- Team ${payload.gymName}`;

  return sendWhatsAppMessage(payload.phoneNumber, message);
}

export interface TrainerWelcomeWhatsAppPayload {
  phoneNumber: string;
  gymName: string;
  trainerName: string;
  portalUrl: string;
  email: string;
  tempPassword: string;
}

export async function sendTrainerWelcomeWhatsApp(payload: TrainerWelcomeWhatsAppPayload): Promise<boolean> {
  if (process.env.ENABLE_WHATSAPP_NOTIFICATIONS === 'false') {
    console.log('[whatsapp] WhatsApp notifications disabled, skipping trainer welcome message');
    return true;
  }

  if (!payload.phoneNumber) {
    console.log('[whatsapp] No phone number provided for trainer, skipping');
    return false;
  }

  const message = `🏋️ *Welcome to ${payload.gymName} - Trainer Portal!*

Hi ${payload.trainerName},

You have been added as a *Trainer* at *${payload.gymName}*! 💪

🔐 *Your Login Details:*
📧 Email: ${payload.email}
🔑 Temp Password: ${payload.tempPassword}

🌐 Login here: ${payload.portalUrl}

*As a trainer, you can:*
✅ Manage your classes and schedule
✅ Track member attendance
✅ Add and follow up with leads
✅ Access the gym shop

Please change your password after your first login.

- Team ${payload.gymName}`;

  return sendWhatsAppMessage(payload.phoneNumber, message);
}

export interface InvoiceWhatsAppPayload {
  phoneNumber: string;
  gymName: string;
  memberName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: Date;
  status: string;
  downloadUrl: string;
}

export async function sendInvoiceWhatsApp(payload: InvoiceWhatsAppPayload): Promise<boolean> {
  if (process.env.ENABLE_WHATSAPP_NOTIFICATIONS === 'false') {
    console.log('[whatsapp] WhatsApp notifications disabled, skipping invoice message');
    return true;
  }

  if (!payload.phoneNumber) {
    console.log('[whatsapp] No phone number provided for member, skipping invoice message');
    return false;
  }

  const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payload.amount);
  const formattedDueDate = new Date(payload.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const isPaid = payload.status === 'paid';

  const message = isPaid
    ? `🧾 *Payment Receipt from ${payload.gymName}*

Hi ${payload.memberName},

Thank you for your payment! ✅

📋 *Receipt Details:*
🔢 Invoice #: ${payload.invoiceNumber}
💰 Amount: ${formattedAmount}
📅 Date: ${formattedDueDate}
✅ Status: PAID

📥 Download your receipt: ${payload.downloadUrl}

- Team ${payload.gymName}`
    : `🧾 *New Invoice from ${payload.gymName}*

Hi ${payload.memberName},

A new invoice has been generated for your account.

📋 *Invoice Details:*
🔢 Invoice #: ${payload.invoiceNumber}
💰 Amount: ${formattedAmount}
📅 Due Date: ${formattedDueDate}
⏳ Status: PENDING

📥 Download invoice: ${payload.downloadUrl}

Please make the payment before the due date.

- Team ${payload.gymName}`;

  return sendWhatsAppMessage(payload.phoneNumber, message);
}


export interface NewLeadNotificationWhatsAppPayload {
  adminPhone: string;
  adminName: string;
  gymName: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string;
  goal?: string;
  source?: string;
  dashboardUrl: string;
}

export async function sendNewLeadNotificationWhatsApp(payload: NewLeadNotificationWhatsAppPayload): Promise<boolean> {
  if (process.env.ENABLE_WHATSAPP_NOTIFICATIONS === 'false') {
    console.log('[whatsapp] WhatsApp notifications disabled, skipping new lead notification');
    return true;
  }

  if (!payload.adminPhone) {
    console.log('[whatsapp] No admin phone number provided, skipping new lead notification');
    return false;
  }

  const message = `🔔 *New Enquiry for ${payload.gymName}*

Hi ${payload.adminName},

You have a new enquiry!

👤 *Lead Details:*
📛 Name: ${payload.leadName}
📱 Phone: ${payload.leadPhone}${payload.leadEmail ? `
📧 Email: ${payload.leadEmail}` : ''}${payload.goal ? `
🎯 Goal: ${payload.goal}` : ''}${payload.source ? `
📍 Source: ${payload.source}` : ''}

🔗 View in Dashboard:
${payload.dashboardUrl}

Follow up quickly to convert this lead!

- Team GYMSAATHI`;

  return sendWhatsAppMessage(payload.adminPhone, message);
}

async function sendWhatsAppMediaMessage(phoneNumber: string, imageUrl: string, caption: string): Promise<boolean> {
  const apiSecret = process.env.WATX_API_KEY;
  const baseUrl = process.env.WATX_BASE_URL;
  const accountId = process.env.WATX_INSTANCE_ID;

  if (!apiSecret || !baseUrl || !accountId) {
    console.log('[whatsapp] UPMtech API credentials not fully configured for media message (need WATX_API_KEY, WATX_BASE_URL, WATX_INSTANCE_ID)');
    return false;
  }

  const formattedPhone = formatPhoneNumber(phoneNumber);
  
  if (!formattedPhone) {
    console.log('[whatsapp] Skipping media message - invalid phone number');
    return false;
  }
  
  try {
    const form = new FormData();
    form.append('secret', apiSecret);
    form.append('account', accountId);
    form.append('recipient', formattedPhone);
    form.append('type', 'media');
    form.append('media_url', imageUrl);
    form.append('media_type', 'image');
    if (caption) {
      form.append('message', caption);
    }

    console.log(`[whatsapp] Sending media message (image + caption) to ${formattedPhone} via UPMtech API...`);
    console.log(`[whatsapp] Image URL: ${imageUrl}`);

    const response = await axios.post(`${baseUrl}/send/whatsapp`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    if (response.data && response.data.status === 200) {
      console.log(`[whatsapp] SUCCESS: Media message sent to ${formattedPhone}`, response.data);
      return true;
    } else {
      console.error('[whatsapp] API returned non-200 status for media:', response.data);
      return false;
    }
  } catch (error: any) {
    if (error.response) {
      console.error('[whatsapp] Media API Error:', error.response.status, error.response.data);
    } else {
      console.error('[whatsapp] Media Error:', error.message);
    }
    return false;
  }
}

export async function sendPaymentDetailsWhatsApp(
  recipientPhone: string,
  recipientName: string,
  paymentDetails: any,
  gymName: string
): Promise<boolean> {
  if (process.env.ENABLE_WHATSAPP_NOTIFICATIONS === 'false') {
    console.log('[whatsapp] WhatsApp notifications disabled, skipping payment details');
    return true;
  }

  if (!recipientPhone) {
    console.log('[whatsapp] No phone number provided, skipping payment details WhatsApp');
    return false;
  }

  let caption = `💳 *Payment Details from ${gymName}*

Hi ${recipientName},

Here are the payment details you requested:
`;

  if (paymentDetails.upiId) {
    caption += `
📲 *UPI ID:* ${paymentDetails.upiId}`;
  }

  if (paymentDetails.holderName) {
    caption += `

🏦 *Bank Details:*
👤 Account Holder: ${paymentDetails.holderName}`;
  }

  if (paymentDetails.bankAccountNumber) {
    caption += `
🔢 Account No: ${paymentDetails.bankAccountNumber}`;
  }

  if (paymentDetails.ifscCode) {
    caption += `
🏛️ IFSC: ${paymentDetails.ifscCode}`;
  }

  caption += `

For any queries, please contact your gym.

- Team ${gymName}`;

  if (paymentDetails.qrUrl && paymentDetails.qrUrl.startsWith('http')) {
    console.log(`[whatsapp] Sending payment QR code with UPI details to ${recipientPhone}`);
    console.log(`[whatsapp] QR URL: ${paymentDetails.qrUrl}`);
    return sendWhatsAppMediaMessage(recipientPhone, paymentDetails.qrUrl, caption);
  }

  if (paymentDetails.qrUrl && paymentDetails.qrUrl.startsWith('data:')) {
    console.log(`[whatsapp] QR code is base64 (not a public URL), cannot send via WhatsApp media API`);
    caption += `\n\n📸 *Note:* QR code available via email.`;
  }

  return sendWhatsAppMessage(recipientPhone, caption);
}

export async function sendPaymentReminderWhatsApp(
  recipientPhone: string,
  recipientName: string,
  amountDue: number,
  dueDate: string | Date | null,
  gymName: string
): Promise<boolean> {
  if (process.env.ENABLE_WHATSAPP_NOTIFICATIONS === 'false') {
    console.log('[whatsapp] WhatsApp notifications disabled, skipping payment reminder');
    return true;
  }

  if (!recipientPhone) {
    console.log('[whatsapp] No phone number provided, skipping payment reminder WhatsApp');
    return false;
  }

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amountDue);

  const dueDateStr = dueDate 
    ? new Date(dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'soon';

  const message = `🔔 *Payment Reminder from ${gymName}*

Hi ${recipientName},

This is a friendly reminder about your pending payment.

💰 *Amount Due:* ${formattedAmount}
📅 *Due Date:* ${dueDateStr}

Please make the payment at your earliest convenience to continue enjoying uninterrupted services.

For payment methods, please contact your gym or ask for payment details.

Thank you for being a valued member!

- Team ${gymName}`;

  return sendWhatsAppMessage(recipientPhone, message);
}
