import sgMail from '@sendgrid/mail';

export interface DutyEmailItem {
  to: string;
  invigilatorName: string;
  pdfBase64: string;
  fileName?: string;
}

export interface SendEmailPayload {
  items: DutyEmailItem[];
  examName?: string;
  collegeName?: string;
}

export interface SendEmailResultItem {
  to: string;
  invigilatorName: string;
  success: boolean;
  error?: string;
}

export interface SendEmailSummary {
  success: boolean;
  total: number;
  sent: number;
  failed: number;
  results: SendEmailResultItem[];
  error?: string;
}

/**
 * Format invigilator name with appropriate honorific (Ms. for female, Mr. for male)
 * Preserves existing honorific titles (Dr., Prof., etc.) if already present.
 */
export function formatSalutationName(rawName: string): string {
  const trimmed = rawName.trim();
  if (!trimmed) return 'Invigilator';

  // If name already starts with an existing honorific title, preserve it
  const titleRegex = /^(dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?|miss)\s+/i;
  if (titleRegex.test(trimmed)) {
    return trimmed;
  }

  // Extract first word (first name) for gender heuristic
  const words = trimmed.split(/\s+/);
  const firstName = (words[0] || '').toLowerCase().replace(/[^a-z]/g, '');

  const femaleExactNames = new Set([
    'pavithra', 'priya', 'kavitha', 'pooja', 'deepa', 'shweta', 'divya', 'ananya', 'sneha', 'neha',
    'sunitha', 'geetha', 'radhika', 'vidya', 'rekha', 'anita', 'mamatha', 'sushma', 'bhavya', 'roopa',
    'shruthi', 'shruti', 'preethi', 'preeti', 'sowmya', 'soumya', 'ashwini', 'aarthi', 'arti', 'shanthi',
    'shanti', 'gayathri', 'gayatri', 'malathi', 'lakshmi', 'laxmi', 'swathi', 'swati', 'keerthi', 'kirthi',
    'revathi', 'jyothi', 'jyoti', 'jayanthi', 'bharathi', 'barathi', 'padmavathi', 'padma', 'anjali', 'meena',
    'sheela', 'leela', 'rani', 'seema', 'renu', 'tanu', 'madhu', 'poonam', 'parveen', 'shabana', 'fatima',
    'ayesha', 'nasreen', 'susan', 'sarah', 'mary', 'pushpa', 'suma', 'usha', 'veena', 'vanitha', 'savitha',
    'saritha', 'sudha', 'sujata', 'sujatha', 'chaitra', 'chaithra', 'harshitha', 'archana', 'arpitha',
    'anupama', 'sandhya', 'shilpa', 'pallavi', 'rashmi', 'reshma', 'varsha', 'nandini', 'manjula', 'kusuma',
    'kalpana', 'bindu', 'indira', 'komala', 'meenakshi', 'kamala', 'hema', 'nalini', 'shobha', 'rupa',
    'leelavathi', 'bhagya', 'chandana', 'monika', 'tejaswini', 'hemavathi', 'shridevi', 'sridevi', 'renuka',
    'ganga', 'yamuna', 'kavita', 'sunita', 'gita', 'mamta', 'anuradha', 'prathibha', 'pratibha', 'shalini',
    'shobhana', 'bhavana', 'chethana', 'chetana', 'kalyani', 'uma', 'vasantha', 'lalitha', 'girija',
    'sharada', 'sarada', 'anitha', 'madhuri', 'sheetal', 'shikha', 'tanuja', 'namrata', 'payal', 'kajal',
    'alka', 'smita', 'sonal', 'sweta', 'swaroopa', 'meghana', 'sahana', 'spandana', 'nisarga',
    'dhanalakshmi', 'nagaveni', 'rohini', 'yashodha', 'yashoda', 'amrutha', 'amrita', 'sahithi', 'shilpa'
  ]);

  const maleSpecialNamesEndingInA = new Set([
    'krishna', 'rama', 'shiva', 'surya', 'aditya', 'chandra', 'raghu', 'buddha', 'siddhartha',
    'rana', 'somanna', 'basappa', 'mallappa', 'ningappa', 'lingappa', 'sidda', 'malla', 'devendra',
    'indra', 'sharma', 'gupta', 'verma', 'mishra', 'agarwal', 'bhat', 'rao'
  ]);

  let isFemale = false;

  if (femaleExactNames.has(firstName)) {
    isFemale = true;
  } else if (
    firstName.endsWith('shree') ||
    firstName.endsWith('sri') ||
    firstName.endsWith('vathi') ||
    firstName.endsWith('wathi') ||
    firstName.endsWith('kumari') ||
    firstName.endsWith('devi') ||
    firstName.endsWith('bai') ||
    firstName.endsWith('priya') ||
    firstName.endsWith('nisha') ||
    firstName.endsWith('ika')
  ) {
    isFemale = true;
  } else if (
    (firstName.endsWith('a') || firstName.endsWith('i') || firstName.endsWith('ee')) &&
    !maleSpecialNamesEndingInA.has(firstName)
  ) {
    isFemale = true;
  }

  const prefix = isFemale ? 'Ms.' : 'Mr.';
  return `${prefix} ${trimmed}`;
}

/**
 * Generate plain text email body matching exact specification:
 * "Dear [Mr./Ms. Invigilator Name], Your examination duties have been assigned. Please find the attached Duty Summary for your reference. Regards DutyFlow - Examination Duty Management Platform"
 */
export function generatePlainTextEmail(invigilatorName: string): string {
  const salutationName = formatSalutationName(invigilatorName);
  return `Dear ${salutationName},\n\nYour examination duties have been assigned. Please find the attached Duty Summary for your reference.\n\nRegards,\nDutyFlow`;
}

/**
 * Generate rich responsive HTML email body matching institution branding
 */
export function generateHtmlEmail(invigilatorName: string, examName?: string, collegeName?: string): string {
  const institutionTitle = collegeName?.trim() || 'DutyFlow Examination Cell';
  const examinationSubtitle = examName?.trim() || 'Examination Duty Roster';
  const salutationName = formatSalutationName(invigilatorName);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Examination Duty Allotment</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.6;
      margin: 0;
      padding: 24px 12px;
      background-color: #f8fafc;
    }
    .email-container {
      max-width: 580px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
    }
    .header {
      background: linear-gradient(135deg, #3730a3 0%, #4f46e5 100%);
      padding: 28px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0 0 6px 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.015em;
    }
    .header p {
      margin: 0;
      font-size: 13.5px;
      color: #e0e7ff;
      opacity: 0.95;
    }
    .content {
      padding: 30px 24px;
      font-size: 15px;
      color: #334155;
    }
    .salutation {
      font-size: 16px;
      margin-bottom: 16px;
    }
    .body-message {
      margin: 16px 0;
      font-size: 15px;
      color: #334155;
    }
    .signoff {
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
    }
    .signature {
      font-weight: 700;
      color: #4f46e5;
      font-size: 15px;
    }
    .footer {
      padding: 16px 24px;
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>${institutionTitle}</h1>
      <p>${examinationSubtitle}</p>
    </div>
    <div class="content">
      <div class="salutation">Dear <strong>${salutationName}</strong>,</div>
      <div class="body-message">
        Your examination duties have been assigned. Please find the attached Duty Summary for your reference.
      </div>
      <div class="signoff">
        <div>Regards,</div>
        <div class="signature">DutyFlow</div>
      </div>
    </div>
    <div class="footer">
      Automated dispatch from DutyFlow • Please do not reply directly to this notification
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sends one or more emails with base64 PDF attachments through SendGrid.
 */
export async function sendDutySummaryEmails(payload: SendEmailPayload): Promise<SendEmailSummary> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName = process.env.SENDGRID_FROM_NAME || 'DutyFlow';

  if (!apiKey) {
    return {
      success: false,
      total: payload.items.length,
      sent: 0,
      failed: payload.items.length,
      results: [],
      error: 'SendGrid API Key (SENDGRID_API_KEY) is not configured in your server environment variables.',
    };
  }

  if (!fromEmail) {
    return {
      success: false,
      total: payload.items.length,
      sent: 0,
      failed: payload.items.length,
      results: [],
      error: 'SendGrid Sender Email (SENDGRID_FROM_EMAIL) is not configured in your server environment variables.',
    };
  }

  sgMail.setApiKey(apiKey);

  const results: SendEmailResultItem[] = [];
  let sentCount = 0;
  let failedCount = 0;

  for (const item of payload.items) {
    const toEmail = item.to?.trim();
    if (!toEmail || !toEmail.includes('@')) {
      results.push({
        to: item.to || 'Unknown',
        invigilatorName: item.invigilatorName,
        success: false,
        error: 'Invalid or missing email address.',
      });
      failedCount++;
      continue;
    }

    const cleanName = item.invigilatorName.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const safeFileName = item.fileName || `Duty_Summary_${cleanName}.pdf`;

    const mailData: sgMail.MailDataRequired = {
      to: toEmail,
      from: {
        email: fromEmail,
        name: fromName,
      },
      subject: 'Examination Duty Allotment',
      text: generatePlainTextEmail(item.invigilatorName),
      html: generateHtmlEmail(item.invigilatorName, payload.examName, payload.collegeName),
      attachments: [
        {
          content: item.pdfBase64,
          filename: safeFileName,
          type: 'application/pdf',
          disposition: 'attachment',
        },
      ],
    };

    try {
      await sgMail.send(mailData);
      results.push({
        to: toEmail,
        invigilatorName: item.invigilatorName,
        success: true,
      });
      sentCount++;
    } catch (err: any) {
      const errMsg = err?.response?.body?.errors?.[0]?.message || err?.message || 'Failed to send email via SendGrid.';
      console.error(`SendGrid error for ${toEmail}:`, errMsg);
      results.push({
        to: toEmail,
        invigilatorName: item.invigilatorName,
        success: false,
        error: errMsg,
      });
      failedCount++;
    }
  }

  const firstFailure = results.find(r => !r.success);

  return {
    success: failedCount === 0,
    total: payload.items.length,
    sent: sentCount,
    failed: failedCount,
    results,
    error: firstFailure?.error || (failedCount > 0 && sentCount === 0 ? 'Failed to deliver emails. Check SendGrid credentials or recipient addresses.' : undefined),
  };
}
