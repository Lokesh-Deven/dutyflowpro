import sgMail from '@sendgrid/mail';
import { supabase } from './supabase';
export * from './superadmin-types';
import {
  SUPERADMIN_EMAIL,
  SUPERADMIN_RECOVERY_EMAIL,
  SUPERADMIN_COOKIE_NAME,
  SuperAdminStats,
  InstitutionRegistrationRecord,
  SuperAdminSessionPayload,
} from './superadmin-types';

/**
 * Configure SendGrid credentials safely from environment variables
 */
function getSecretKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dutyflow-superadmin-secret-2026';
}

/**
 * Creates a cryptographically signed Super Admin session token (24-hour expiration)
 */
export async function createSuperAdminToken(): Promise<string> {
  const payload = {
    email: SUPERADMIN_EMAIL,
    role: 'super_admin',
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };
  const payloadStr = JSON.stringify(payload);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(getSecretKey()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(payloadStr));
  const sigHex = Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const b64Payload = Buffer.from(payloadStr).toString('base64url');
  return `${b64Payload}.${sigHex}`;
}

/**
 * Verifies the validity and cryptographic signature of a Super Admin session token
 */
export async function verifySuperAdminToken(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const [b64Payload, sigHex] = token.split('.');
    if (!b64Payload || !sigHex) return false;
    const payloadStr = Buffer.from(b64Payload, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadStr);

    if (payload.email !== SUPERADMIN_EMAIL || payload.role !== 'super_admin') return false;
    if (Date.now() > payload.exp) return false;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(getSecretKey()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const expectedSig = new Uint8Array(sigHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
    const valid = await crypto.subtle.verify('HMAC', key, expectedSig, enc.encode(payloadStr));
    return valid;
  } catch {
    return false;
  }
}


/**
 * Native SHA-256 hash helper using Web Crypto API
 */
export async function hashValue(val: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(val.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a random 6-digit numeric OTP
 */
export function generateSixDigitOtp(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return String(randomNum);
}

// In-memory OTP cache for instant fallback verification
interface CachedOtp {
  hash: string;
  expiresAt: number;
}
const activeOtpCache: Record<string, CachedOtp[]> = {};

export function storeOtpInMemory(email: string, otpHash: string, ttlMs: number = 10 * 60 * 1000): void {
  const cleanEmail = email.trim().toLowerCase();
  const list = (activeOtpCache[cleanEmail] || []).filter(item => item.expiresAt > Date.now());
  list.push({ hash: otpHash, expiresAt: Date.now() + ttlMs });
  activeOtpCache[cleanEmail] = list;
}

export function verifyOtpFromMemory(email: string, otpHash: string): boolean {
  const cleanEmail = email.trim().toLowerCase();
  const list = (activeOtpCache[cleanEmail] || []).filter(item => item.expiresAt > Date.now());
  const matchIndex = list.findIndex(item => item.hash === otpHash);
  if (matchIndex !== -1) {
    list.splice(matchIndex, 1);
    activeOtpCache[cleanEmail] = list;
    return true;
  }
  return false;
}

function ensureSendGridConfigured(): boolean {
  const apiKey = (process.env.SENDGRID_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!apiKey) return false;
  sgMail.setApiKey(apiKey);
  return true;
}

/**
 * Dispatches 2FA OTP email to the authorized Super Admin
 */
export async function sendSuperAdminOtpEmail(otp: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!ensureSendGridConfigured()) {
      return { success: false, error: 'SendGrid API key not configured on server.' };
    }

    const fromEmail = (process.env.SENDGRID_FROM_EMAIL || 'admin@dutyflow.in').trim().replace(/^["']|["']$/g, '');
    const fromName = (process.env.SENDGRID_FROM_NAME || 'DutyFlow Security').trim().replace(/^["']|["']$/g, '');

    const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>DutyFlow Super Admin 2FA Code</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0F172A; margin: 0; padding: 24px; color: #1E293B; }
    .card { max-width: 480px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); border: 1px solid #E2E8F0; }
    .header { background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 32px 24px; text-align: center; border-bottom: 2px solid #6342E8; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; }
    .badge { display: inline-block; background: rgba(99, 66, 232, 0.2); color: #A78BFA; border: 1px solid rgba(167, 139, 250, 0.4); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 32px 24px; text-align: center; }
    .otp-box { background: #F8FAFC; border: 2px dashed #CBD5E1; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .otp-code { font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #6342E8; margin: 0; }
    .meta { font-size: 12px; color: #64748B; margin-top: 12px; line-height: 1.5; }
    .warning { background: #FFFBEB; border: 1px solid #FCD34D; color: #92400E; border-radius: 8px; padding: 12px; font-size: 12px; margin-top: 20px; text-align: left; }
    .footer { background: #F8FAFC; padding: 16px 24px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>DutyFlow</h1>
      <div class="badge">Super Admin Security Verification</div>
    </div>
    <div class="content">
      <p style="font-size: 14px; color: #334155; margin: 0 0 8px 0; font-weight: 600;">Two-Factor Authentication Required</p>
      <p style="font-size: 13px; color: #64748B; margin: 0;">Use the 6-digit security code below to complete your Super Admin dashboard access:</p>
      
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
      </div>
      
      <p class="meta">This code will expire in <strong>10 minutes</strong>.<br>If you did not request this login, your account password may be compromised. Please investigate immediately.</p>
      
      <div class="warning">
        <strong>Security Notice:</strong> DutyFlow staff will never ask for this code. Authorized access is restricted exclusively to <code>${SUPERADMIN_EMAIL}</code>.
      </div>
    </div>
    <div class="footer">
      DutyFlow — Examination Duty Management Platform &bull; Automated Security Protocol
    </div>
  </div>
</body>
</html>`;

    await sgMail.send({
      to: SUPERADMIN_EMAIL,
      from: { email: fromEmail, name: fromName },
      subject: `[DutyFlow Security] Your 2FA Verification Code: ${otp}`,
      text: `Your DutyFlow Super Admin 2FA verification code is: ${otp}. It will expire in 10 minutes. If you did not request this, secure your account immediately.`,
      html: htmlBody,
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error sending Super Admin 2FA email:', err?.response?.body || err);
    return { success: false, error: err?.message || 'Failed to send 2FA OTP email.' };
  }
}

/**
 * Dispatches account recovery instructions to the authorized recovery email
 */
export async function sendSuperAdminRecoveryEmail(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!ensureSendGridConfigured()) {
      return { success: false, error: 'SendGrid API key not configured on server.' };
    }

    const fromEmail = (process.env.SENDGRID_FROM_EMAIL || 'admin@dutyflow.in').trim().replace(/^["']|["']$/g, '');
    const fromName = (process.env.SENDGRID_FROM_NAME || 'DutyFlow Security').trim().replace(/^["']|["']$/g, '');

    const htmlBody = `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #0F172A; padding: 24px; color: #1E293B;">
  <div style="max-width: 480px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 32px; border: 1px solid #E2E8F0;">
    <h2 style="color: #0F172A; margin-top: 0;">DutyFlow Super Admin Recovery</h2>
    <p style="font-size: 13px; color: #475569; line-height: 1.6;">
      An account recovery request was initiated for the primary Super Admin account (<code>${SUPERADMIN_EMAIL}</code>).
    </p>
    <p style="font-size: 13px; color: #475569; line-height: 1.6;">
      As the designated recovery address (<code>${SUPERADMIN_RECOVERY_EMAIL}</code>), this notification is delivered for security confirmation.
    </p>
    <div style="background: #F1F5F9; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 12px; color: #334155;">
      To reset your password, visit the Super Admin login portal at <strong>https://www.dutyflow.in/superadmin</strong> or trigger a Supabase password reset link to your primary administrator mailbox.
    </div>
    <p style="font-size: 11px; color: #94A3B8;">DutyFlow Automated Security Protocol</p>
  </div>
</body>
</html>`;

    await sgMail.send({
      to: SUPERADMIN_RECOVERY_EMAIL,
      from: { email: fromEmail, name: fromName },
      subject: `[DutyFlow Security] Super Admin Account Recovery Notification`,
      text: `An account recovery request was received for DutyFlow Super Admin. Notification sent to designated recovery email: ${SUPERADMIN_RECOVERY_EMAIL}.`,
      html: htmlBody,
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error sending recovery email:', err);
    return { success: false, error: err?.message || 'Failed to send recovery email.' };
  }
}

/**
 * Dispatches an official Approval & Code Activation email to an institution administrator
 */
export async function sendInstitutionApprovedEmail(
  adminEmail: string,
  collegeName: string,
  institutionCode: string
): Promise<void> {
  try {
    if (!ensureSendGridConfigured()) return;
    const fromEmail = (process.env.SENDGRID_FROM_EMAIL || 'admin@dutyflow.in').trim().replace(/^["']|["']$/g, '');
    const fromName = (process.env.SENDGRID_FROM_NAME || 'DutyFlow Administration').trim().replace(/^["']|["']$/g, '');

    const htmlBody = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; padding: 24px; color: #0F172A;">
  <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="background: #1E2A5E; padding: 28px 24px; text-align: center;">
      <h1 style="color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 800;">DutyFlow</h1>
      <p style="color: #93C5FD; margin: 4px 0 0 0; font-size: 12px;">Official Institution Approval</p>
    </div>
    <div style="padding: 28px 24px;">
      <h2 style="font-size: 18px; color: #10B981; margin-top: 0;">Congratulations! Your Institution Has Been Approved</h2>
      <p style="font-size: 13px; color: #475569; line-height: 1.6;">
        We are pleased to inform you that <strong>${collegeName}</strong> has been officially verified and approved by the DutyFlow Super Administration.
      </p>

      <div style="background: #F1F5F9; border-left: 4px solid #6342E8; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <span style="font-size: 11px; text-transform: uppercase; color: #6342E8; font-weight: 700; letter-spacing: 1px;">Your Official Institution Code</span>
        <div style="font-size: 32px; font-weight: 900; font-family: monospace; color: #1E2A5E; margin-top: 4px;">${institutionCode}</div>
        <p style="font-size: 11px; color: #64748B; margin: 4px 0 0 0;">Students and invigilators will use this 3-digit code to access their dedicated exam portals.</p>
      </div>

      <p style="font-size: 13px; color: #475569; line-height: 1.6;">
        All institutional outputs, duty allocations, student seating diagrams, and report generation features are now fully unlocked for your account.
      </p>

      <div style="text-align: center; margin: 28px 0 16px 0;">
        <a href="https://www.dutyflow.in/dashboard" style="background: #6342E8; color: #FFFFFF; font-weight: 700; font-size: 13px; padding: 12px 28px; border-radius: 10px; text-decoration: none; display: inline-block;">
          Go to DutyFlow Dashboard
        </a>
      </div>
    </div>
    <div style="background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 14px 24px; text-align: center; font-size: 11px; color: #94A3B8;">
      DutyFlow &bull; Automated Institutional Management &bull; Support: admin@dutyflow.in
    </div>
  </div>
</body>
</html>`;

    await sgMail.send({
      to: adminEmail,
      from: { email: fromEmail, name: fromName },
      subject: `[DutyFlow] Your Institution has been Approved! (Institution Code: ${institutionCode})`,
      text: `Congratulations! ${collegeName} has been approved by DutyFlow Super Admin. Your official Institution Code is: ${institutionCode}. All institutional features are now unlocked.`,
      html: htmlBody,
    });
  } catch (err) {
    console.error('Error sending institution approved email:', err);
  }
}

/**
 * Dispatches an official Rejection notification email to an institution administrator
 */
export async function sendInstitutionRejectedEmail(
  adminEmail: string,
  collegeName: string,
  reason?: string
): Promise<void> {
  try {
    if (!ensureSendGridConfigured()) return;
    const fromEmail = (process.env.SENDGRID_FROM_EMAIL || 'admin@dutyflow.in').trim().replace(/^["']|["']$/g, '');
    const fromName = (process.env.SENDGRID_FROM_NAME || 'DutyFlow Administration').trim().replace(/^["']|["']$/g, '');

    const explanation = reason?.trim() || 'Your registration could not be verified according to DutyFlow institutional guidelines.';

    const htmlBody = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; padding: 24px; color: #0F172A;">
  <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden;">
    <div style="background: #0F172A; padding: 28px 24px; text-align: center;">
      <h1 style="color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 800;">DutyFlow</h1>
      <p style="color: #EF4444; margin: 4px 0 0 0; font-size: 12px; font-weight: 700;">Registration Notice</p>
    </div>
    <div style="padding: 28px 24px;">
      <h2 style="font-size: 16px; color: #0F172A; margin-top: 0;">Institution Registration Status Update</h2>
      <p style="font-size: 13px; color: #475569; line-height: 1.6;">
        Thank you for your interest in DutyFlow. After reviewing the registration for <strong>${collegeName}</strong>, our administrative team was unable to approve this account at this time.
      </p>
      <div style="background: #FEF2F2; border-left: 4px solid #EF4444; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 12px; color: #991B1B;">
        <strong>Reason:</strong> ${explanation}
      </div>
      <p style="font-size: 13px; color: #475569; line-height: 1.6;">
        If you believe this decision was made in error or wish to provide updated verification documentation, please contact our support team at <a href="mailto:admin@dutyflow.in">admin@dutyflow.in</a>.
      </p>
    </div>
  </div>
</body>
</html>`;

    await sgMail.send({
      to: adminEmail,
      from: { email: fromEmail, name: fromName },
      subject: `[DutyFlow] Notice regarding your institution registration`,
      text: `Notice regarding registration for ${collegeName}: ${explanation}. Contact admin@dutyflow.in for inquiries.`,
      html: htmlBody,
    });
  } catch (err) {
    console.error('Error sending institution rejected email:', err);
  }
}
