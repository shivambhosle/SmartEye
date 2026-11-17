import nodemailer from 'nodemailer';

// Helper to configure transporter with environment variables
export function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : null;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const service = process.env.SMTP_SERVICE;

  if (!user || !pass) {
    return null; // SMTP not configured, operate in development log mode
  }

  // If using Gmail (either specified by service or host containing gmail)
  if (service?.toLowerCase() === 'gmail' || host?.includes('gmail')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    host: host || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/**
 * Sends a confirmation email to the citizen when an issue is newly registered.
 */
export async function sendIssueRegisteredEmail({ toEmail, userName, issue }) {
  if (!toEmail) return { sent: false };

  const transporter = getTransporter();
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

  if (!transporter) {
    console.log(`\n======================================================`);
    console.log(`[Notification Service] (DEV MODE - SMTP not configured)`);
    console.log(`To: ${toEmail} (${userName})`);
    console.log(`Subject: [SmartEye] Issue #${issueIdShort} Registered: ${readableCategory}`);
    console.log(`Assigned Department: ${departmentName}`);
    console.log(`======================================================\n`);
    return { sent: false, devMode: true };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"${process.env.SMTP_FROM_NAME || 'SmartEye Civic Care'}" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `[SmartEye] Issue #${issueIdShort} Registered: ${readableCategory}`,
      html: htmlContent,
    });
    console.log(`[Notification Service] Registration email sent to ${toEmail}: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Notification Service] Failed to send registration email to ${toEmail}:`, err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Sends a security alert email when the user logs in.
 */
export async function sendLoginAlertEmail({ toEmail, userName, time, ip, userAgent }) {
  if (!toEmail) return { sent: false };

  const transporter = getTransporter();
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

  if (!transporter) {
    console.log(`\n======================================================`);
    console.log(`[Notification Service] (DEV MODE - SMTP not configured)`);
    console.log(`To: ${toEmail} (${userName})`);
    console.log(`Subject: [SmartEye] Security Alert: New Login at ${formattedTime}`);
    console.log(`IP: ${ip} | UserAgent: ${userAgent}`);
    console.log(`======================================================\n`);
    return { sent: false, devMode: true };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"${process.env.SMTP_FROM_NAME || 'SmartEye Civic Care'}" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `[SmartEye] Security Alert: New Login to your Account`,
      html: htmlContent,
    });
    console.log(`[Notification Service] Login alert email sent to ${toEmail}: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Notification Service] Failed to send login email to ${toEmail}:`, err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Sends a status update email to the citizen when their reported issue changes status.
 */
export async function sendStatusUpdateEmail({ toEmail, userName, issue, newStatus, resolutionPhotoUrl, officerNote }) {
  if (!toEmail) return { sent: false };

  const transporter = getTransporter();
  const statusLabels = {
    'open': 'Registered / Under Review',
    'in-progress': 'In Progress (Municipal Crew Assigned)',
    'resolved': 'Resolved & Closed',
  };

  const statusColors = {
    'open': '#f59e0b',
    'in-progress': '#3b82f6',
    'resolved': '#10b981',
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

      <div style="border-top: 1px solid #334155; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #64748b; text-align: center;">
        <p style="margin: 0;">SmartEye Automated Notification Service</p>
        <p style="margin: 4px 0 0;">Thank you for making our city safer and cleaner.</p>
      </div>
    </div>
  `;

  if (!transporter) {
    console.log(`\n======================================================`);
    console.log(`[Notification Service] (DEV MODE - SMTP not configured)`);
    console.log(`To: ${toEmail} (${userName})`);
    console.log(`Subject: [SmartEye] Update on #${issueIdShort}: ${readableStatus}`);
    console.log(`Category: ${readableCategory} | New Status: ${newStatus}`);
    console.log(`======================================================\n`);
    return { sent: false, devMode: true };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"${process.env.SMTP_FROM_NAME || 'SmartEye Civic Care'}" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `[SmartEye] Update on #${issueIdShort}: ${readableStatus}`,
      html: htmlContent,
    });
    console.log(`[Notification Service] Status email sent to ${toEmail}: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Notification Service] Failed to send email to ${toEmail}:`, err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Sends a 6-digit verification OTP email for user registration.
 */
export async function sendVerificationOtpEmail({ toEmail, userName, otp }) {
  if (!toEmail) return { sent: false };
  const transporter = getTransporter();

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

  if (!transporter) {
    console.log(`\n======================================================`);
    console.log(`[Verification Service] (DEV MODE - OTP generated)`);
    console.log(`To: ${toEmail} (${userName})`);
    console.log(`Verification OTP: [ ${otp} ] (Valid for 15 mins)`);
    console.log(`======================================================\n`);
    return { sent: false, devMode: true };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"${process.env.SMTP_FROM_NAME || 'SmartEye Civic Care'}" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `[SmartEye] Your Verification Code: ${otp}`,
      html: htmlContent,
    });
    return { sent: true };
  } catch (err) {
    console.error(`[Verification Service] Failed to send OTP to ${toEmail}:`, err.message);
    return { sent: false, error: err.message };
  }
}
