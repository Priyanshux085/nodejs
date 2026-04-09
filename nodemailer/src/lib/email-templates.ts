/**
 * email-templates.ts
 *
 * Collection of reusable HTML email template builders.
 * Each template function accepts typed data and returns a complete
 * HTML string ready to pass as the `html` field in a mail payload.
 *
 * Keeping templates in `src/lib/` makes them separately testable
 * and decoupled from transport logic.
 */

// ---------------------------------------------------------------------------
// Shared styles (inlined for maximum email-client compatibility)
// ---------------------------------------------------------------------------

const FONT_STACK = "Inter, system-ui, -apple-system, Arial, sans-serif";

const BASE_STYLES = `
  body {
    margin: 0;
    padding: 0;
    background-color: #f0f2f5;
    font-family: ${FONT_STACK};
  }
  .wrapper {
    max-width: 600px;
    margin: 40px auto;
    background: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  }
  .header {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    padding: 32px 40px;
    text-align: center;
  }
  .header h1 {
    color: #ffffff;
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }
  .header p {
    color: rgba(255,255,255,0.8);
    margin: 8px 0 0;
    font-size: 14px;
  }
  .body {
    padding: 40px;
    color: #1e293b;
    line-height: 1.7;
    font-size: 15px;
  }
  .footer {
    background: #f8fafc;
    padding: 24px 40px;
    text-align: center;
    color: #94a3b8;
    font-size: 12px;
    border-top: 1px solid #e2e8f0;
  }
`;

// ---------------------------------------------------------------------------
// Template: Welcome Email
// ---------------------------------------------------------------------------

export interface WelcomeTemplateData {
  /** User's display name */
  name: string;
  /** URL for the confirmation / CTA button */
  ctaUrl: string;
  /** Button label */
  ctaLabel?: string;
  /** Organisation / product name */
  appName?: string;
}

/**
 * Generates a styled "Welcome" email HTML body.
 * Used for user registration confirmation flows.
 */
export function buildWelcomeTemplate(data: WelcomeTemplateData): string {
  const {
    name,
    ctaUrl,
    ctaLabel = "Get Started",
    appName = "Our Platform",
  } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to ${appName}</title>
  <style>${BASE_STYLES}
    .cta-btn {
      display: inline-block;
      margin: 24px 0 8px;
      padding: 14px 32px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: #ffffff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      letter-spacing: 0.3px;
    }
    .highlight { color: #6366f1; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Welcome to ${appName} 🎉</h1>
      <p>We're thrilled to have you on board</p>
    </div>
    <div class="body">
      <p>Hi <span class="highlight">${name}</span>,</p>
      <p>
        Thank you for signing up! Your account has been created successfully.
        Click the button below to confirm your email address and start exploring.
      </p>
      <div style="text-align: center;">
        <a href="${ctaUrl}" class="cta-btn">${ctaLabel}</a>
      </div>
      <p style="color: #64748b; font-size: 13px; margin-top: 24px;">
        If you didn't create an account, you can safely ignore this email.
        This link will expire in <strong>24 hours</strong>.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      <p>You received this email because you signed up at ${appName}.</p>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Template: OTP / Verification Code Email
// ---------------------------------------------------------------------------

export interface OtpTemplateData {
  /** User's display name */
  name: string;
  /** The 4–8 character OTP code */
  otp: string;
  /** Minutes until the OTP expires */
  expiresInMinutes?: number;
  /** Organisation / product name */
  appName?: string;
}

/**
 * Generates a styled One-Time-Password email HTML body.
 * Used for 2FA, phone verification, and password reset flows.
 */
export function buildOtpTemplate(data: OtpTemplateData): string {
  const { name, otp, expiresInMinutes = 10, appName = "Our Platform" } = data;

  // Format each OTP digit as an individual styled box
  const otpHtml = otp
    .split("")
    .map(
      (ch) =>
        `<span style="
          display:inline-block;
          width:48px;height:56px;line-height:56px;
          text-align:center;
          font-size:28px;font-weight:700;
          background:#f0f0ff;
          border:2px solid #6366f1;
          border-radius:8px;
          margin:0 4px;
          color:#4338ca;
          letter-spacing:0;
        ">${ch}</span>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your ${appName} verification code</title>
  <style>${BASE_STYLES}
    .otp-box { text-align: center; margin: 28px 0; letter-spacing: 4px; }
    .warning  { background: #fff7ed; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #92400e; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Verify Your Identity 🔐</h1>
      <p>Use the code below to complete verification</p>
    </div>
    <div class="body">
      <p>Hi <strong>${name}</strong>,</p>
      <p>
        Here is your one-time verification code for <strong>${appName}</strong>.
        Enter it in the app to continue.
      </p>
      <div class="otp-box">${otpHtml}</div>
      <div class="warning">
        ⚠️ This code expires in <strong>${expiresInMinutes} minutes</strong>.
        Never share it with anyone — ${appName} staff will never ask for your OTP.
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      <p>If you didn't request this code, please secure your account immediately.</p>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Template: Notification / Report Email
// ---------------------------------------------------------------------------

export interface NotificationItem {
  label: string;
  value: string;
}

export interface NotificationTemplateData {
  /** User's display name */
  name: string;
  /** Notification title / subject summary */
  title: string;
  /** Short description paragraph */
  description: string;
  /** Optional table of key-value items to surface in the email body */
  items?: NotificationItem[];
  /** Organisation / product name */
  appName?: string;
}

/**
 * Generates a styled notification/report email HTML body.
 * Used for system alerts, digest reports, and scheduled summaries.
 */
export function buildNotificationTemplate(
  data: NotificationTemplateData,
): string {
  const { name, title, description, items = [], appName = "Our Platform" } =
    data;

  const tableRows = items
    .map(
      ({ label, value }) => `
      <tr>
        <td style="padding:10px 16px;font-weight:600;color:#475569;background:#f8fafc;border-bottom:1px solid #e2e8f0;white-space:nowrap;">${label}</td>
        <td style="padding:10px 16px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${value}</td>
      </tr>`,
    )
    .join("");

  const tableHtml =
    items.length > 0
      ? `<table style="width:100%;border-collapse:collapse;margin-top:24px;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
           <tbody>${tableRows}</tbody>
         </table>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — ${appName}</title>
  <style>${BASE_STYLES}
    .badge {
      display: inline-block;
      background: #ede9fe;
      color: #7c3aed;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
      margin-bottom: 16px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>📣 ${title}</h1>
      <p>Notification from ${appName}</p>
    </div>
    <div class="body">
      <span class="badge">Notification</span>
      <p>Hi <strong>${name}</strong>,</p>
      <p>${description}</p>
      ${tableHtml}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      <p>This is an automated message — please do not reply directly.</p>
    </div>
  </div>
</body>
</html>`;
}
