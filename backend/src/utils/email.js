const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
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
    <div style="background: #F5F1EB; padding: 32px 0;">
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #FDFCFA; border-radius: 12px;">
        <h2 style="color: #1a1a1a; margin-bottom: 16px;">Verify your email</h2>
        <p style="color: #444; line-height: 1.6;">
          Thanks for signing up to the <strong>Proper Place App</strong>! Please confirm your email address by tapping the button below.
        </p>
        <a href="${verifyUrl}"
           style="display: inline-block; background: #2E7D32; color: #fff; text-decoration: none;
                  padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0;">
          Verify Email
        </a>
        <p style="color: #888; font-size: 13px; line-height: 1.5;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${verifyUrl}" style="color: #2E7D32;">${verifyUrl}</a>
        </p>
        <p style="color: #aaa; font-size: 12px; margin-top: 32px;">
          If you didn't create a Proper Place account, you can safely ignore this email.
        </p>
      </div>
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
    <div style="background: #F5F1EB; padding: 32px 0;">
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #FDFCFA; border-radius: 12px;">
        <h2 style="color: #1a1a1a; margin-bottom: 16px;">Reset your password</h2>
        <p style="color: #444; line-height: 1.6;">
          We received a request to reset the password for your <strong>Proper Place</strong> account.
          Tap the button below to choose a new password.
        </p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #2E7D32; color: #fff; text-decoration: none;
                  padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0;">
          Reset Password
        </a>
        <p style="color: #888; font-size: 13px; line-height: 1.5;">
          This link expires in 1 hour. If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${resetUrl}" style="color: #2E7D32;">${resetUrl}</a>
        </p>
        <p style="color: #aaa; font-size: 12px; margin-top: 32px;">
          If you didn't request a password reset, you can safely ignore this email. Your password won't change.
        </p>
      </div>
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

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
