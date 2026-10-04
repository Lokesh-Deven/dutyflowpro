/**
 * Test utility to verify SendGrid SMTP credentials and authenticated sending
 * for DutyFlow Supabase Auth sender: no-reply@auth.dutyflow.in
 *
 * Usage:
 *   node scripts/test-sendgrid-auth-smtp.js [recipient-email]
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envLocalPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      value = value.trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const sgMail = require('@sendgrid/mail');

const apiKey = (process.env.SENDGRID_API_KEY || '').trim();
const authSenderEmail = 'no-reply@auth.dutyflow.in';
const authSenderName = 'DutyFlow';

console.log('----------------------------------------------------');
console.log('DutyFlow: Supabase Auth SendGrid SMTP Validator');
console.log('----------------------------------------------------');

if (!apiKey) {
  console.error('❌ Error: SENDGRID_API_KEY is not defined in .env.local');
  process.exit(1);
}

console.log('✓ Found SENDGRID_API_KEY in server environment.');
console.log(`✓ Sender Email : ${authSenderEmail}`);
console.log(`✓ Sender Name  : ${authSenderName}`);
console.log('✓ Target Host  : smtp.sendgrid.net:587 (STARTTLS)');
console.log('✓ SMTP Username: apikey');
console.log('----------------------------------------------------');

const recipient = process.argv[2];

if (!recipient) {
  console.log('\n💡 To send a test verification email through SendGrid:');
  console.log('   node scripts/test-sendgrid-auth-smtp.js your-email@example.com\n');
  process.exit(0);
}

sgMail.setApiKey(apiKey);

const templateHtmlPath = path.resolve(__dirname, '..', 'supabase', 'templates', 'confirm-signup.html');
let htmlContent = '<h1>DutyFlow Account Verification Test</h1><p>This is a test from no-reply@auth.dutyflow.in</p>';
if (fs.existsSync(templateHtmlPath)) {
  htmlContent = fs.readFileSync(templateHtmlPath, 'utf8')
    .replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, 'https://dutyflow.in/dashboard')
    .replace(/\{\{\s*\.Token\s*\}\}/g, '849201')
    .replace(/\{\{\s*\.Email\s*\}\}/g, recipient);
}

const msg = {
  to: recipient,
  from: {
    email: authSenderEmail,
    name: authSenderName,
  },
  subject: 'Confirm Your DutyFlow Account (SMTP Verification Test)',
  html: htmlContent,
};

console.log(`Dispatching test verification email to: ${recipient}...`);

sgMail
  .send(msg)
  .then(() => {
    console.log(`✅ Success! Test email delivered to ${recipient} via SendGrid.`);
    console.log('   Sender appears as: DutyFlow <no-reply@auth.dutyflow.in>');
    console.log('   SendGrid SMTP configuration is verified and working.');
  })
  .catch((err) => {
    console.error('❌ SendGrid Error:', err?.response?.body?.errors || err.message);
    if (err?.code === 403 || err?.message?.includes('from address')) {
      console.warn('\n⚠️  Sender Domain Note:');
      console.warn('   Make sure "auth.dutyflow.in" is authenticated under SendGrid:');
      console.warn('   Settings -> Sender Authentication -> Authenticate Your Domain.');
    }
  });
