import nodemailer from 'nodemailer';

/**
 * Universal email dispatcher that handles:
 * 1. Google Apps Script Webhook (Native Gmail via HTTPS port 443 - zero block, arrives in Inbox)
 * 2. Brevo API (Transactional API via HTTPS port 443)
 * 3. Resend API (Transactional API via HTTPS port 443)
 * 4. Nodemailer SMTP (Local development or paid servers with open SMTP ports)
 */
async function dispatchEmail({ to, subject, html, devSummary }) {
  if (!to) return { sent: false };

  // 1. Google Apps Script Webhook (Recommended for Gmail on cloud hosts like Render)
  if (process.env.GMAIL_WEBHOOK_URL) {
    try {
      const fromName = process.env.SMTP_FROM_NAME || 'SmartEye Civic Care';
      const res = await fetch(process.env.GMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          html,
          fromName,
        }),
        redirect: 'follow',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.success || data.status === 'ok')) {
        console.log(`[Notification Service] Email delivered via Gmail Webhook to ${to}`);
        return { sent: true, method: 'gmail-webhook' };
      }
      console.warn(`[Notification Service] Gmail Webhook response:`, data);
    } catch (err) {
      console.error(`[Notification Service] Gmail Webhook failed:`, err.message);
    }
  }

  // 2. Brevo Transactional Email API (HTTPS port 443)
  if (process.env.BREVO_API_KEY) {
    try {
      const senderEmail = process.env.SMTP_USER || 'smarteye.civic@gmail.com';
      const senderName = process.env.SMTP_FROM_NAME || 'SmartEye Civic Care';
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.messageId) {
        console.log(`[Notification Service] Email delivered via Brevo API to ${to}: ${data.messageId}`);
        return { sent: true, method: 'brevo' };
      }
      console.warn(`[Notification Service] Brevo API response:`, data);
    } catch (err) {
      console.error(`[Notification Service] Brevo API failed:`, err.message);
    }
  }

  // 3. Resend Email API (HTTPS port 443)
  if (process.env.RESEND_API_KEY) {
    try {
      const fromAddr = process.env.SMTP_FROM || 'SmartEye <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddr,
          to: [to],
          subject,
          html,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.id) {
        console.log(`[Notification Service] Email delivered via Resend API to ${to}: ${data.id}`);
        return { sent: true, method: 'resend' };
      }
      console.warn(`[Notification Service] Resend API error:`, data);
    } catch (err) {
      console.error(`[Notification Service] Resend API failed:`, err.message);
    }
  }

  // 4. Nodemailer SMTP (Works locally or on servers with open SMTP ports)
  const transporter = getTransporter();
  if (transporter) {
    try {
      const fromAddr = process.env.SMTP_FROM || `"${process.env.SMTP_FROM_NAME || 'SmartEye Civic Care'}" <${process.env.SMTP_USER}>`;
      const info = await transporter.sendMail({
        from: fromAddr,
        to,
        subject,
        html,
      });
      console.log(`[Notification Service] Email delivered via SMTP to ${to}: ${info.messageId}`);
      return { sent: true, messageId: info.messageId, method: 'smtp' };
    } catch (err) {
      console.warn(`[Notification Service] SMTP send failed (${err.code || err.message}). Note: Render Free blocks ports 465/587.`);
      return { sent: false, error: err.message };
    }
  }

  // 5. Dev Mode Fallback
  if (devSummary) {
    console.log(`\n======================================================`);
    console.log(`[Notification Service] (DEV MODE - SMTP / Webhook not active)`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    devSummary();
    console.log(`======================================================\n`);
  }
  return { sent: false, devMode: true };
}

// Helper to configure transporter with environment variables
export function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : null;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const service = process.env.SMTP_SERVICE;

  if (!user || !pass) {
    return null;
  }

  if (service?.toLowerCase() === 'gmail' || host?.includes('gmail')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 4000,
    });
  }

  return nodemailer.createTransport({
    host: host || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 4000,
    greetingTimeout: 4000,
    socketTimeout: 4000,
  });
}

/**
 * Sends a confirmation email to the citizen when an issue is newly registered.
 */
export async function sendIssueRegisteredEmail({ toEmail, userName, issue }) {
  if (!toEmail) return { sent: false };

  const readableCategory = (issue.category || 'Civic Issue').replace(/_/g, ' ').toUpperCase();
  const issueIdShort = String(issue._id).slice(-6).toUpperCase();
  const departmentName = issue.department || 'Municipal Grievance Cell';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 600px; margin: auto;">
      <div style="text-align: center; border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #38bdf8; margin: 0; font-size: 24px;">SmartEye Civic Action</h2>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Issue Successfully Registered</p>
      </div>

      <p style="font-size: 16px; color: #e2e8f0;">Hello <strong>${userName || 'Citizen'}</strong>,</p>
      <p style="font-size: 15px; color: #cbd5e1; line-height: 1.5;">
        Thank you for reporting. Your civic issue has been officially registered in the system with reference ID <strong>#${issueIdShort}</strong>.
      </p>

      <div style="background-color: #1e293b; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8;">Category</div>
        <div style="font-size: 18px; font-weight: bold; color: #f8fafc; margin-top: 4px;">
          ${readableCategory}
        </div>
        <div style="font-size: 13px; color: #94a3b8; margin-top: 8px;">
          Assigned Department: <strong style="color: #38bdf8;">${departmentName}</strong>
        </div>
        <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">
          Current Status: <strong style="color: #f59e0b;">OPEN (Under Review)</strong>
        </div>
        ${issue.userNote ? `<div style="font-size: 13px; color: #cbd5e1; margin-top: 8px; font-style: italic;">"Note: ${issue.userNote}"</div>` : ''}
      </div>

      <p style="font-size: 14px; color: #94a3b8;">
        You will receive automated updates via email as soon as a municipal crew is assigned or when the issue is resolved.
      </p>

      <div style="border-top: 1px solid #334155; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #64748b; text-align: center;">
        <p style="margin: 0;">SmartEye Automated Notification Service</p>
        <p style="margin: 4px 0 0;">Thank you for contributing towards a better city.</p>
      </div>
    </div>
  `;

  return dispatchEmail({
    to: toEmail,
    subject: `[SmartEye] Issue #${issueIdShort} Registered: ${readableCategory}`,
    html: htmlContent,
    devSummary: () => console.log(`Assigned Department: ${departmentName}`),
  });
}

/**
 * Sends a security alert email when the user logs in.
 */
export async function sendLoginAlertEmail({ toEmail, userName, time, ip, userAgent }) {
  if (!toEmail) return { sent: false };

  const formattedTime = time ? new Date(time).toLocaleString() : new Date().toLocaleString();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 500px; margin: auto;">
      <div style="text-align: center; border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #38bdf8; margin: 0; font-size: 22px;">SmartEye Security Alert</h2>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Account Login Detected</p>
      </div>

      <p style="font-size: 15px; color: #e2e8f0;">Hello <strong>${userName || 'Citizen'}</strong>,</p>
      <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
        A successful login was just recorded for your SmartEye account:
      </p>

      <div style="background-color: #1e293b; padding: 14px 18px; border-radius: 8px; margin: 16px 0; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
        <div><strong>Date & Time:</strong> ${formattedTime}</div>
        ${ip ? `<div><strong>IP Address:</strong> ${ip}</div>` : ''}
        ${userAgent ? `<div><strong>Device / Browser:</strong> ${userAgent}</div>` : ''}
      </div>

      <p style="font-size: 12px; color: #94a3b8;">
        If this was you, no action is needed. If you did not log in, please reset your password immediately.
      </p>

      <div style="border-top: 1px solid #334155; padding-top: 14px; margin-top: 20px; font-size: 11px; color: #64748b; text-align: center;">
        SmartEye Security Notification
      </div>
    </div>
  `;

  return dispatchEmail({
    to: toEmail,
    subject: `[SmartEye] Security Alert: New Login to your Account`,
    html: htmlContent,
    devSummary: () => console.log(`IP: ${ip} | UserAgent: ${userAgent}`),
  });
}

/**
 * Sends a status update email to the citizen when their reported issue changes status.
 */
export async function sendStatusUpdateEmail({ toEmail, userName, issue, newStatus, resolutionPhotoUrl, officerNote }) {
  if (!toEmail) return { sent: false };

  const statusLabels = {
    'open': 'Registered / Under Review',
    'in-progress': 'In Progress (Municipal Crew Assigned)',
    'resolved': 'Resolved & Closed',
    'rejected': 'REJECTED — Prohibited / Invalid Evidence',
  };

  const statusColors = {
    'open': '#f59e0b',
    'in-progress': '#3b82f6',
    'resolved': '#10b981',
    'rejected': '#ef4444',
  };

  const readableCategory = (issue.category || 'Civic Issue').replace(/_/g, ' ').toUpperCase();
  const readableStatus = statusLabels[newStatus] || newStatus;
  const statusColor = statusColors[newStatus] || '#3b82f6';
  const issueIdShort = String(issue._id).slice(-6).toUpperCase();

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 600px; margin: auto;">
      <div style="text-align: center; border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 20px;">
        <h2 style="color: #38bdf8; margin: 0; font-size: 24px;">SmartEye Civic Action</h2>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Municipal Grievance Redressal System</p>
      </div>

      <p style="font-size: 16px; color: #e2e8f0;">Hello <strong>${userName || 'Citizen'}</strong>,</p>
      <p style="font-size: 15px; color: #cbd5e1; line-height: 1.5;">
        There is an official update regarding your reported issue <strong>#${issueIdShort} (${readableCategory})</strong>.
      </p>

      <div style="background-color: #1e293b; border-left: 4px solid ${statusColor}; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8;">New Status</div>
        <div style="font-size: 20px; font-weight: bold; color: ${statusColor}; margin-top: 4px;">
          ${readableStatus}
        </div>
        ${issue.department ? `<div style="font-size: 13px; color: #94a3b8; margin-top: 6px;">Department: <strong>${issue.department}</strong></div>` : ''}
        ${officerNote ? `<div style="font-size: 13px; color: #cbd5e1; margin-top: 8px; font-style: italic;">"Official Note: ${officerNote}"</div>` : ''}
      </div>

      ${
        newStatus === 'resolved' && resolutionPhotoUrl
          ? `
        <div style="margin: 20px 0; text-align: center;">
          <p style="font-size: 14px; color: #10b981; font-weight: bold; margin-bottom: 8px;">Resolution Proof (Work Completed):</p>
          <img src="${resolutionPhotoUrl.startsWith('http') ? resolutionPhotoUrl : `http://localhost:3000${resolutionPhotoUrl}`}" alt="Resolution Proof" style="max-width: 100%; max-height: 240px; border-radius: 8px; border: 1px solid #334155;" />
        </div>
      `
          : ''
      }

      ${
        newStatus === 'rejected'
          ? `
        <div style="background-color: #450a0a; border: 1px solid #ef4444; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #f87171; margin: 0 0 8px 0; font-size: 15px; display: flex; align-items: center;">⚠️ Notice of Violation & Rejection</h3>
          <p style="color: #fecaca; font-size: 13px; line-height: 1.5; margin: 0 0 10px 0;">
            This report was formally <strong>rejected</strong> by municipal administrators due to submission of <strong>prohibited or spoofed media</strong> (such as photos taken of computer/phone screens, synthetic duplicates, or non-authentic imagery).
          </p>
          <div style="background-color: #1e1b1b; padding: 10px 14px; border-radius: 6px; font-size: 12px; color: #fca5a5;">
            <strong>Mandatory Civic Guidelines:</strong>
            <ul style="margin: 6px 0 0 0; padding-left: 18px; line-height: 1.5;">
              <li>All civic reports must feature authentic, live physical photographs taken on location.</li>
              <li>Re-photographing computer screens or printed images is strictly prohibited.</li>
              <li>Repeated submissions of spoofed media may result in account review or restriction.</li>
            </ul>
          </div>
        </div>
      `
          : ''
      }

      <div style="border-top: 1px solid #334155; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #64748b; text-align: center;">
        <p style="margin: 0;">SmartEye Automated Notification Service</p>
        <p style="margin: 4px 0 0;">Thank you for making our city safer and cleaner.</p>
      </div>
    </div>
  `;

  return dispatchEmail({
    to: toEmail,
    subject: `[SmartEye] Update on #${issueIdShort}: ${readableStatus}`,
    html: htmlContent,
    devSummary: () => console.log(`Category: ${readableCategory} | New Status: ${newStatus}`),
  });
}

/**
 * Sends a 6-digit verification OTP email for user registration.
 */
export async function sendVerificationOtpEmail({ toEmail, userName, otp }) {
  if (!toEmail) return { sent: false };

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 500px; margin: auto;">
      <h2 style="color: #38bdf8; text-align: center; margin-top: 0;">Verify Your SmartEye Account</h2>
      <p style="color: #cbd5e1; font-size: 15px;">Hello <strong>${userName || 'Citizen'}</strong>,</p>
      <p style="color: #cbd5e1; font-size: 14px;">Use the verification code below to verify your email address. This code will expire in 15 minutes.</p>
      <div style="background-color: #1e293b; padding: 18px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8;">${otp}</span>
      </div>
      <p style="color: #64748b; font-size: 12px; text-align: center;">If you did not request this, please ignore this email.</p>
    </div>
  `;

  return dispatchEmail({
    to: toEmail,
    subject: `[SmartEye] Your Verification Code: ${otp}`,
    html: htmlContent,
    devSummary: () => console.log(`Verification OTP: [ ${otp} ] (Valid for 15 mins)`),
  });
}
