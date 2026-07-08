const fs = require('fs');
const nodemailer = require('nodemailer');
const logger = require('./logger');
const db = require('../config/database');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_ALERT_EMAIL = process.env.EMAIL_ADMIN_ALERT || 'pierce.shapton@proper-place.co.uk';
const MAIL_FROM_ADDRESS = process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER;

const smtpTransporter = (process.env.SMTP_USER && process.env.SMTP_PASS)
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      requireTLS: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

let resendClient = null;
function getResend() {
  if (!RESEND_API_KEY) return null;
  if (resendClient) return resendClient;
  try {
    const { Resend } = require('resend');
    resendClient = new Resend(RESEND_API_KEY);
    return resendClient;
  } catch (err) {
    logger.error('Failed to load resend package', { error: err.message });
    return null;
  }
}

function attachmentToResend(att) {
  if (!att) return null;
  let content = null;
  if (att.content) {
    content = Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content;
  } else if (att.path) {
    try {
      content = fs.readFileSync(att.path).toString('base64');
    } catch (err) {
      logger.warn('Attachment read failed', { path: att.path, error: err.message });
      return null;
    }
  } else {
    return null;
  }
  const out = { filename: att.filename, content };
  if (att.cid) out.content_id = att.cid;
  return out;
}

async function sendViaResend({ to, from, subject, html, text, attachments, replyTo, tag }) {
  const client = getResend();
  if (!client) throw new Error('Resend not configured');
  const payload = {
    from: from || `Proper Place <${MAIL_FROM_ADDRESS}>`,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  };
  if (text) payload.text = text;
  if (replyTo) payload.reply_to = replyTo;
  if (attachments && attachments.length) {
    payload.attachments = attachments.map(attachmentToResend).filter(Boolean);
  }
  if (tag) payload.tags = [{ name: 'category', value: String(tag).replace(/[^a-zA-Z0-9_-]/g, '_') }];
  const { data, error } = await client.emails.send(payload);
  if (error) {
    const msg = error.message || error.name || JSON.stringify(error);
    throw new Error(`Resend error: ${msg}`);
  }
  return { id: data && data.id, provider: 'resend' };
}

async function sendViaSmtp({ to, from, subject, html, text, attachments, replyTo }) {
  if (!smtpTransporter) throw new Error('SMTP not configured');
  const info = await smtpTransporter.sendMail({
    from: from || `Proper Place <${MAIL_FROM_ADDRESS}>`,
    to,
    subject,
    html,
    text,
    attachments,
    replyTo,
  });
  return { id: info.messageId, provider: 'smtp' };
}

async function recordEmailEvent({ providerId, to, tag, eventType, detail }) {
  try {
    await db.query(
      `INSERT INTO email_events (provider_id, recipient, tag, event_type, detail, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [providerId || null, to ? String(to).slice(0, 255) : null, tag || null, eventType, detail ? JSON.stringify(detail) : null]
    );
  } catch (err) {
    logger.error('Failed to record email_event', { error: err.message, eventType });
  }
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function sendAdminAlert({ subject, html }) {
  const opts = {
    to: ADMIN_ALERT_EMAIL,
    from: `Proper Place Alerts <${MAIL_FROM_ADDRESS}>`,
    subject: `[Proper Place] ${subject}`,
    html,
    tag: 'admin_alert',
  };
  try {
    if (RESEND_API_KEY) return await sendViaResend(opts);
  } catch (err) {
    logger.warn('Admin alert via Resend failed, trying SMTP', { error: err.message });
  }
  try {
    if (smtpTransporter) return await sendViaSmtp(opts);
  } catch (err) {
    logger.error('Admin alert via SMTP failed too', { error: err.message });
  }
  logger.error('ADMIN ALERT NOT DELIVERED', { subject });
  return null;
}

async function sendMail(opts) {
  const { to, tag } = opts;
  const primary = RESEND_API_KEY ? 'resend' : 'smtp';
  const fallback = primary === 'resend' ? 'smtp' : 'resend';

  const errors = [];
  for (const provider of [primary, fallback]) {
    try {
      const result = provider === 'resend' ? await sendViaResend(opts) : await sendViaSmtp(opts);
      if (provider !== primary) {
        logger.warn('Email sent via fallback provider', { primary, fallback: provider, to, tag });
      }
      if (tag && provider === 'resend') {
        recordEmailEvent({ providerId: result.id, to, tag, eventType: 'send.accepted', detail: { provider } });
      }
      return result;
    } catch (err) {
      errors.push({ provider, message: err.message });
      logger.warn(`Email send via ${provider} failed`, { error: err.message, to, tag });
    }
  }

  const summary = errors.map((e) => `${e.provider}: ${e.message}`).join(' | ');
  logger.error('Email send failed on all providers', { to, tag, summary });
  await recordEmailEvent({ to, tag, eventType: 'send.failed', detail: { errors } });

  const alertHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:20px;max-width:560px;">
      <h2 style="color:#b91c1c;margin:0 0 12px;">Email delivery failed</h2>
      <p style="color:#374151;line-height:1.5;">A <strong>${escapeHtml(tag || 'unknown')}</strong> email could not be sent to <strong>${escapeHtml(String(to))}</strong>.</p>
      <table style="border-collapse:collapse;margin:16px 0;font-size:14px;">
        <tr><td style="padding:6px 12px;color:#6b7280;">Subject</td><td style="padding:6px 12px;color:#111827;">${escapeHtml(String(opts.subject || ''))}</td></tr>
        <tr><td style="padding:6px 12px;color:#6b7280;">Time</td><td style="padding:6px 12px;color:#111827;">${new Date().toISOString()}</td></tr>
        <tr><td style="padding:6px 12px;color:#6b7280;vertical-align:top;">Errors</td><td style="padding:6px 12px;color:#b91c1c;font-family:monospace;font-size:12px;white-space:pre-wrap;">${escapeHtml(summary)}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:12px;">Both providers failed. Check backend logs and provider dashboards.</p>
    </div>
  `;
  sendAdminAlert({ subject: `Send failed: ${tag || 'email'} to ${to}`, html: alertHtml }).catch(() => {});

  const err = new Error(`Email send failed: ${summary}`);
  err.emailErrors = errors;
  throw err;
}

module.exports = {
  sendMail,
  sendAdminAlert,
  recordEmailEvent,
  smtpTransporter,
  MAIL_FROM_ADDRESS,
  RESEND_ENABLED: !!RESEND_API_KEY,
};
