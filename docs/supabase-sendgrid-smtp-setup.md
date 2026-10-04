# Configuring Supabase Auth Emails Through SendGrid SMTP

This document provides the complete, step-by-step instructions to deliver all Supabase Authentication transactional emails through your existing **SendGrid SMTP** service using the custom sender **`DutyFlow <no-reply@auth.dutyflow.in>`**.

---

## 1. Architectural Flow

The authentication and email delivery architecture operates as follows:

```
User (Signs up / Resets Password)
   │
   ▼
DutyFlow Web App (Next.js)
   │
   ▼
Supabase Auth (GoTrue - Project: axrqlwayiifzmdvebvac)
   │ Generates tokens & secure confirmation links
   ▼
SendGrid SMTP (smtp.sendgrid.net:587 / STARTTLS)
   │ Authenticates via API Key (username: "apikey")
   ▼
Delivered from: DutyFlow <no-reply@auth.dutyflow.in>
   │
   ▼
User Inbox (Branded "DutyFlow — Your Smart Exam Partner")
```

### Complete Service Isolation
* **Invigilator Duty Summary Emails**: Continue using `src/lib/sendgrid.ts` and `/api/send-duty-summary` via the SendGrid Mail API without any changes.
* **Authentication Emails**: Supabase Auth directly connects to SendGrid's SMTP relay server (`smtp.sendgrid.net`) and delivers verification and recovery emails under `no-reply@auth.dutyflow.in`.

---

## 2. Supabase Auth SMTP Configuration

Configure Custom SMTP in your Supabase project dashboard:

1. Open your Supabase project:
   **[https://supabase.com/dashboard/project/axrqlwayiifzmdvebvac](https://supabase.com/dashboard/project/axrqlwayiifzmdvebvac)**
2. Navigate to **Authentication** in the left sidebar ➔ Select **SMTP Settings** (or **Project Settings** ➔ **Authentication** ➔ **SMTP Settings**).
3. Toggle **Enable Custom SMTP** to **ON**.
4. Fill in the following exact configuration:

| Setting Field | Value to Enter | Notes |
| :--- | :--- | :--- |
| **Sender email** | `no-reply@auth.dutyflow.in` | Dedicated auth sender address |
| **Sender name** | `DutyFlow` | Visible sender display name |
| **Host** | `smtp.sendgrid.net` | SendGrid SMTP server host |
| **Port** | `587` | Recommended TLS port |
| **Minimum Transfer Security** | `STARTTLS` | Required for port 587 (or SSL on 465) |
| **Username** | `apikey` | **Must be literally `apikey`** (lowercase) |
| **Password** | `<Your SENDGRID_API_KEY>` | The SendGrid API key from `.env.local` |

5. Click **Save Changes**.

---

## 3. Email Templates Setup in Supabase

DutyFlow branded email templates have been prepared in `supabase/templates/`. They feature:
* Deep navy/indigo gradient branding (`#1E2A5E` to `#4F46E5`).
* DutyFlow logo and the slogan: **"Your Smart Exam Partner"**.
* Responsive design tested across desktop and mobile email clients.
* Direct action CTA buttons, fallback OTP/token boxes, and copyable URL links.
* **Zero Supabase branding** in the visible email content.

To update the templates in Supabase:
1. In the Supabase Dashboard, go to **Authentication** ➔ **Email Templates**.
2. For each template below, update the **Subject** and paste the HTML content from the corresponding file:

### 1. Confirm signup (Email Verification)
* **Subject**: `Confirm Your DutyFlow Account`
* **File Source**: [`supabase/templates/confirm-signup.html`](file:///Users/lokeshmacbookair/Desktop/Dutyflow%20Antigravity/supabase/templates/confirm-signup.html)

### 2. Reset Password
* **Subject**: `Reset Your DutyFlow Password`
* **File Source**: [`supabase/templates/reset-password.html`](file:///Users/lokeshmacbookair/Desktop/Dutyflow%20Antigravity/supabase/templates/reset-password.html)

### 3. Magic Link
* **Subject**: `Your DutyFlow Sign-in Link`
* **File Source**: [`supabase/templates/magic-link.html`](file:///Users/lokeshmacbookair/Desktop/Dutyflow%20Antigravity/supabase/templates/magic-link.html)

### 4. Change Email Address
* **Subject**: `Confirm Your New Email Address`
* **File Source**: [`supabase/templates/change-email.html`](file:///Users/lokeshmacbookair/Desktop/Dutyflow%20Antigravity/supabase/templates/change-email.html)

### 5. Invite User
* **Subject**: `You've Been Invited to DutyFlow`
* **File Source**: [`supabase/templates/invite-user.html`](file:///Users/lokeshmacbookair/Desktop/Dutyflow%20Antigravity/supabase/templates/invite-user.html)

---

## 4. SendGrid Domain Authentication for `auth.dutyflow.in`

To ensure emails from `no-reply@auth.dutyflow.in` land in the user's primary inbox and pass SPF and DKIM checks:

1. Log into your **[SendGrid Dashboard](https://app.sendgrid.com/)**.
2. Go to **Settings** ➔ **Sender Authentication**.
3. Under **Domain Authentication**, click **Authenticate Your Domain** (or **Add Domain**).
4. **Step 1: Which Domain Name System (DNS) host do you use?**
   - Select your DNS provider (e.g., Cloudflare, GoDaddy, Namecheap, Route 53, etc.).
   - Would you also like to brand the links for this domain? Select **Yes** (or No).
5. **Step 2: Domain You Send From**
   - Enter Domain: `dutyflow.in`
   - Under **Advanced Settings**, check **"Use a custom return path"** and specify the subdomain as `auth` (so it configures `auth.dutyflow.in`), OR enter domain directly as `auth.dutyflow.in`.
6. SendGrid will provide DNS records:
   - **2 to 3 CNAME records** for DKIM authentication (e.g. `s1._domainkey.auth.dutyflow.in` and `s2._domainkey.auth.dutyflow.in`).
   - **1 CNAME record** for mail routing / SPF (e.g. `em.auth.dutyflow.in`).
7. Add these DNS records in your DNS manager (e.g. Cloudflare / Domain registrar).
8. Return to SendGrid and click **Verify**.

---

## 5. Testing & Validation

A test script is available in the repository to verify your SendGrid credentials and test dispatch from `no-reply@auth.dutyflow.in`:

```bash
# 1. Run configuration diagnostics
node scripts/test-sendgrid-auth-smtp.js

# 2. Dispatch a live test verification email to your inbox
node scripts/test-sendgrid-auth-smtp.js your-email@domain.com
```

---

## 6. Security Assurance

* **Credentials**: The SendGrid API key is kept exclusively on the server in `.env.local` and never bundled or exposed in client-side code.
* **Tokens**: Passwords, OTPs, recovery tokens, and session refresh tokens are managed exclusively by Supabase Auth and never logged or exposed.
* **Separation of Concerns**: SendGrid acts strictly as an SMTP transport layer; all auth logic and token generation remain inside Supabase.
