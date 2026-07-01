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
 * Send a staff invitation email with a link to set their password.
 * @param {string} to – recipient email
 * @param {string} name – recipient's name
 * @param {string} token – password_reset_token (UUID)
 */
async function sendInviteEmail(to, name, token) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://proper-place.co.uk';
  const inviteUrl = `${frontendUrl}/set-password?token=${encodeURIComponent(token)}`;
  const firstName = (name || 'there').split(' ')[0];

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 0;">
      <div style="background: #0f172a; border-radius: 12px 12px 0 0; padding: 28px 32px;">
        <p style="color: #10b981; font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 8px;">Proper Place</p>
        <h1 style="color: #f1f5f9; font-size: 22px; font-weight: 700; margin: 0;">You're invited to the team</h1>
      </div>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; padding: 32px;">
        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
          Hi ${escapeHtml(firstName)},
        </p>
        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          An admin has created a <strong>Proper Place</strong> account for you. Click the button below to set your password and get started.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteUrl}"
             style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none;
                    padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 600;">
            Set my password
          </a>
        </div>
        <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0 0 8px;">
          This link expires in <strong>7 days</strong>. If the button doesn't work, copy and paste this link:
        </p>
        <p style="color: #6b7280; font-size: 12px; word-break: break-all; margin: 0 0 24px;">
          <a href="${inviteUrl}" style="color: #10b981;">${inviteUrl}</a>
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 0; border-top: 1px solid #f3f4f6; padding-top: 20px;">
          If you weren't expecting this, you can safely ignore it. — The Proper Place Team
        </p>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"Proper Place" <${process.env.SMTP_USER}>`,
    to,
    subject: 'You\'ve been invited to Proper Place',
    html,
  });

  logger.info('Invite email sent', { to, messageId: info.messageId });
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

/**
 * Send an admin notification when a host requests account deletion.
 */
async function sendHostDeletionRequestEmail(user) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 0;">
      <div style="background: #b91c1c; color: white; padding: 18px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 17px; font-weight: 600;">⚠️ Host Account Deletion Request</h2>
      </div>
      <div style="background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 28px 24px;">
        <p style="color: #374151; margin: 0 0 20px;">A host has requested their account be deleted. Please review and process manually.</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Name</td><td style="padding: 8px 0; color: #111827; font-weight: 600;">${escapeHtml(user.name)}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td><td style="padding: 8px 0; color: #111827; font-weight: 600;">${escapeHtml(user.email)}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">User ID</td><td style="padding: 8px 0; color: #111827;">${user.id}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Requested at</td><td style="padding: 8px 0; color: #111827;">${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}</td></tr>
        </table>
        <p style="color: #6b7280; font-size: 13px; margin: 0;">Check their listings, active bookings, and payout balance before deleting the account from the admin panel.</p>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"Proper Place" <${process.env.SMTP_USER}>`,
    to: 'pierce.shapton@gmail.com',
    subject: `Host deletion request – ${user.name} (${user.email})`,
    html,
  });

  logger.info('Host deletion request email sent', { userId: user.id, email: user.email, messageId: info.messageId });
  return info;
}

/* ─────────────────────────────────────────────────────────────
   Booking notification emails
   ───────────────────────────────────────────────────────────── */

const APP_URL = process.env.APP_URL || 'https://proper-place.co.uk';

function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return String(d); }
}

function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `£${v.toFixed(2)}`;
}

function bookingDetailsTable(b) {
  const rows = [
    ['Booking reference', b.booking_ref ? `<strong>${escapeHtml(b.booking_ref)}</strong>` : `#${b.id}`],
    ['Site', escapeHtml(b.place_name || '')],
    ['Check-in', formatDate(b.check_in_date)],
    ['Check-out', formatDate(b.check_out_date)],
    b.nights ? ['Nights', String(b.nights)] : null,
    (b.total_price != null) ? ['Total', formatMoney(b.total_price)] : null,
    b.van_registration ? ['Vehicle', escapeHtml(b.van_registration)] : null,
    b.contact_phone ? ['Guest phone', escapeHtml(b.contact_phone)] : null,
  ].filter(Boolean);
  return `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
      ${rows.map(([k, v]) => `
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 40%;">${escapeHtml(k)}</td>
          <td style="padding: 8px 0; color: #111827;">${v}</td>
        </tr>
      `).join('')}
    </table>
  `;
}

function emailShell({ headerBg = '#059669', title, intro, body, ctaHref, ctaLabel, footer }) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 0;">
      <div style="background: ${headerBg}; color: white; padding: 18px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 17px; font-weight: 600;">${title}</h2>
      </div>
      <div style="background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 28px 24px;">
        <p style="color: #374151; margin: 0 0 8px; line-height: 1.55;">${intro}</p>
        ${body || ''}
        ${ctaHref ? `<a href="${ctaHref}" style="display: inline-block; background: ${headerBg}; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 12px 0 4px;">${escapeHtml(ctaLabel || 'View details')}</a>` : ''}
        <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0; line-height: 1.5;">${footer || 'You&rsquo;re receiving this because of activity on your Proper Place account.'}</p>
      </div>
    </div>
  `;
}

async function sendBookingMail(to, subject, html) {
  const info = await transporter.sendMail({
    from: `"Proper Place" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
  logger.info('Booking email sent', { to, subject, messageId: info.messageId });
  return info;
}

/**
 * Host receives a new booking request.
 */
async function sendHostNewBookingEmail({ hostEmail, hostName, guestName, booking }) {
  if (!hostEmail || hostEmail.endsWith('@noemail.properplace.internal')) return null;
  const html = emailShell({
    headerBg: '#059669',
    title: 'New Booking Request',
    intro: `Hi ${escapeHtml(hostName || 'there')}, <strong>${escapeHtml(guestName || 'a guest')}</strong> has just requested to book <strong>${escapeHtml(booking.place_name || 'your site')}</strong>.`,
    body: bookingDetailsTable(booking) +
      `<p style="color:#374151; line-height:1.55; margin:0 0 12px;">Please review and accept or decline within 7 days. If you don&rsquo;t respond, the hold on the guest&rsquo;s card is released automatically.</p>`,
    ctaHref: `${APP_URL}/dashboard`,
    ctaLabel: 'Review booking',
    footer: 'Payment is held (not taken) until you accept the request.',
  });
  return sendBookingMail(hostEmail, `New booking request — ${booking.place_name || 'Proper Place'} (${booking.booking_ref || '#' + booking.id})`, html);
}

/**
 * Guest gets a confirmation that their booking request was submitted (pending host approval).
 */
async function sendGuestBookingSubmittedEmail({ guestEmail, guestName, booking }) {
  if (!guestEmail || guestEmail.endsWith('@noemail.properplace.internal')) return null;
  const html = emailShell({
    headerBg: '#1976D2',
    title: 'Booking request submitted',
    intro: `Hi ${escapeHtml(guestName || 'there')}, thanks for booking with Proper Place. Your request for <strong>${escapeHtml(booking.place_name || 'the site')}</strong> is now with the host for approval.`,
    body: bookingDetailsTable(booking) +
      `<p style="color:#374151; line-height:1.55; margin:0 0 12px;">The host has up to 7 days to respond. Until then your card is authorised but not charged — if they don&rsquo;t respond in time, the hold is released automatically.</p>`,
    ctaHref: `${APP_URL}/dashboard`,
    ctaLabel: 'View booking',
    footer: 'You&rsquo;ll get another email as soon as the host confirms or declines.',
  });
  return sendBookingMail(guestEmail, `Booking request received — ${booking.place_name || 'Proper Place'} (${booking.booking_ref || '#' + booking.id})`, html);
}

/**
 * Guest gets an email when the host accepts the booking.
 */
async function sendGuestBookingConfirmedEmail({ guestEmail, guestName, booking }) {
  if (!guestEmail || guestEmail.endsWith('@noemail.properplace.internal')) return null;
  const html = emailShell({
    headerBg: '#059669',
    title: 'Booking confirmed 🎉',
    intro: `Great news ${escapeHtml(guestName || '')} — your booking at <strong>${escapeHtml(booking.place_name || 'the site')}</strong> has been confirmed by the host.`,
    body: bookingDetailsTable(booking) +
      `<p style="color:#374151; line-height:1.55; margin:0 0 12px;">Payment has been taken. You&rsquo;ll find directions, opening hours and any host instructions in the app.</p>`,
    ctaHref: `${APP_URL}/dashboard`,
    ctaLabel: 'View booking',
    footer: 'Have a great stay!',
  });
  return sendBookingMail(guestEmail, `Booking confirmed — ${booking.place_name || 'Proper Place'} (${booking.booking_ref || '#' + booking.id})`, html);
}

/**
 * Guest gets an email when the host declines the booking.
 */
async function sendGuestBookingRejectedEmail({ guestEmail, guestName, booking }) {
  if (!guestEmail || guestEmail.endsWith('@noemail.properplace.internal')) return null;
  const html = emailShell({
    headerBg: '#b91c1c',
    title: 'Booking not approved',
    intro: `Hi ${escapeHtml(guestName || 'there')}, unfortunately the host wasn&rsquo;t able to approve your booking at <strong>${escapeHtml(booking.place_name || 'the site')}</strong>. No payment has been taken and any hold on your card has been released.`,
    body: bookingDetailsTable(booking),
    ctaHref: `${APP_URL}`,
    ctaLabel: 'Find another site',
    footer: 'Try booking a nearby alternative — plenty of hosts are available.',
  });
  return sendBookingMail(guestEmail, `Booking not approved — ${booking.place_name || 'Proper Place'} (${booking.booking_ref || '#' + booking.id})`, html);
}

/**
 * Both parties get an email when a booking is cancelled.
 * @param {'guest'|'host'|'admin'} cancelledBy - who initiated the cancellation
 * @param {'guest'|'host'} recipientRole - who is receiving this copy
 */
async function sendBookingCancelledEmail({ recipientEmail, recipientName, recipientRole, cancelledBy, booking, refundIssued }) {
  if (!recipientEmail || recipientEmail.endsWith('@noemail.properplace.internal')) return null;
  const bySelf = cancelledBy === recipientRole;
  const byLabel = cancelledBy === 'admin' ? 'Proper Place support' : (cancelledBy === 'guest' ? 'the guest' : 'the host');

  let intro;
  if (bySelf) {
    intro = `Hi ${escapeHtml(recipientName || 'there')}, this confirms you&rsquo;ve cancelled the booking at <strong>${escapeHtml(booking.place_name || 'the site')}</strong>.`;
  } else {
    intro = `Hi ${escapeHtml(recipientName || 'there')}, the booking at <strong>${escapeHtml(booking.place_name || 'the site')}</strong> has been cancelled by ${byLabel}.`;
  }

  const refundNote = refundIssued
    ? `<p style="color:#374151; line-height:1.55; margin:0 0 12px;">${recipientRole === 'guest' ? 'A refund has been issued to your card. It usually appears within 5–10 working days.' : 'The guest&rsquo;s payment has been refunded.'}</p>`
    : `<p style="color:#374151; line-height:1.55; margin:0 0 12px;">No payment was taken, so nothing needs to be refunded.</p>`;

  const html = emailShell({
    headerBg: '#b91c1c',
    title: 'Booking cancelled',
    intro,
    body: bookingDetailsTable(booking) + refundNote,
    ctaHref: `${APP_URL}/dashboard`,
    ctaLabel: 'View bookings',
  });
  return sendBookingMail(recipientEmail, `Booking cancelled — ${booking.place_name || 'Proper Place'} (${booking.booking_ref || '#' + booking.id})`, html);
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendInviteEmail, sendSupportReplyEmail, sendHostDeletionRequestEmail, sendHostNewBookingEmail, sendGuestBookingSubmittedEmail, sendGuestBookingConfirmedEmail, sendGuestBookingRejectedEmail, sendBookingCancelledEmail, transporter };

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
