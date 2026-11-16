import crypto from 'crypto';

// Common disposable/temporary email provider domains to prevent bot farm signups
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'sharklasers.com',
  'throwawaymail.com',
  'dispostable.com',
  'yopmail.com',
  'trashmail.com',
  'getairmail.com',
  'temp-mail.org',
  'fakeinbox.com',
  'burnermail.io',
  'crazymailing.com',
]);

/**
 * Checks if an email address belongs to a known temporary/disposable provider.
 */
export function isDisposableEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const parts = email.toLowerCase().split('@');
  if (parts.length !== 2) return false;
  return DISPOSABLE_DOMAINS.has(parts[1]);
}

/**
 * Generates a secure 6-digit numeric OTP.
 */
export function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Verifies Cloudflare Turnstile token if TURNSTILE_SECRET_KEY is configured.
 * Skips gracefully in development if secret key is not set.
 */
export async function verifyTurnstileToken(token, remoteIp) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // If not configured, allow in development mode
    return { success: true, bypassed: true };
  }

  if (!token) {
    return { success: false, message: 'Turnstile verification token missing.' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) formData.append('remoteip', remoteIp);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return { success: !!data.success, errorCodes: data['error-codes'] };
  } catch (err) {
    console.error('[Turnstile] verification error:', err.message);
    return { success: false, error: err.message };
  }
}
