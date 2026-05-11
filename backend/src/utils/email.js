const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email verification link.
 * @param {string} to – recipient email
 * @param {string} token – verification token (UUID)
 */
async function sendVerificationEmail(to, token) {
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
  const verifyUrl = `${baseUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #1a1a1a; margin-bottom: 16px;">Verify your email</h2>
      <p style="color: #444; line-height: 1.6;">
        Thanks for signing up to <strong>Proper Place App</strong>! Please confirm your email address by tapping the button below.
      </p>
      <a href="${verifyUrl}"
         style="display: inline-block; background: #1976D2; color: #fff; text-decoration: none;
                padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0;">
        Verify Email
      </a>
      <p style="color: #888; font-size: 13px; line-height: 1.5;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${verifyUrl}" style="color: #1976D2;">${verifyUrl}</a>
      </p>
      <p style="color: #aaa; font-size: 12px; margin-top: 32px;">
        If you didn't create a Proper Place account, you can safely ignore this email.
      </p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"Proper Place" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Verify your Proper Place email',
    html,
  });

  logger.info('Verification email sent', { to, messageId: info.messageId });
  return info;
}

/**
 * Send a password reset link.
 * @param {string} to – recipient email
 * @param {string} token – reset token (UUID)
 */
async function sendPasswordResetEmail(to, token) {
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
  const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #1a1a1a; margin-bottom: 16px;">Reset your password</h2>
      <p style="color: #444; line-height: 1.6;">
        We received a request to reset the password for your <strong>Proper Place</strong> account.
        Tap the button below to choose a new password.
      </p>
      <a href="${resetUrl}"
         style="display: inline-block; background: #1976D2; color: #fff; text-decoration: none;
                padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0;">
        Reset Password
      </a>
      <p style="color: #888; font-size: 13px; line-height: 1.5;">
        This link expires in 1 hour. If the button doesn't work, copy and paste this link into your browser:<br/>
        <a href="${resetUrl}" style="color: #1976D2;">${resetUrl}</a>
      </p>
      <p style="color: #aaa; font-size: 12px; margin-top: 32px;">
        If you didn't request a password reset, you can safely ignore this email. Your password won't change.
      </p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"Proper Place" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Reset your Proper Place password',
    html,
  });

  logger.info('Password reset email sent', { to, messageId: info.messageId });
  return info;
}

/**
 * Send an admin reply to a support ticket.
 */
async function sendSupportReplyEmail(to, subject, originalMessage, replyBody) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 0;">
      <div style="background: #1565C0; color: white; padding: 18px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 17px; font-weight: 600;">Proper Place Support</h2>
      </div>
      <div style="background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 28px 24px;">
        <p style="color: #374151; margin: 0 0 12px;">We've responded to your support request:</p>
        <p style="color: #111827; font-weight: 600; margin: 0 0 20px;">${escapeHtml(subject)}</p>
        <div style="background: #EFF6FF; border-left: 4px solid #1565C0; padding: 16px 18px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
          <p style="color: #1e3a5f; margin: 0; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(replyBody)}</p>
        </div>
        <details style="margin-bottom: 20px;">
          <summary style="color: #6b7280; font-size: 13px; cursor: pointer; user-select: none;">Your original message</summary>
          <div style="background: #f9fafb; padding: 12px 14px; border-radius: 6px; color: #6b7280; font-size: 13px; margin-top: 8px; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(originalMessage)}</div>
        </details>
        <p style="color: #6b7280; font-size: 13px; margin: 0 0 24px;">If you have further questions, reply to this email or visit <a href="https://properplace.com/contact" style="color: #1565C0;">properplace.com/contact</a>.</p>
        <p style="color: #9ca3af; font-size: 12px; margin: 0; border-top: 1px solid #f3f4f6; padding-top: 16px;">— The Proper Place Team</p>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"Proper Place Support" <${process.env.SMTP_USER}>`,
    to,
    subject: `Re: ${subject}`,
    html,
  });

  logger.info('Support reply email sent', { to, subject: `Re: ${subject}`, messageId: info.messageId });
  return info;
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendSupportReplyEmail, transporter };

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
