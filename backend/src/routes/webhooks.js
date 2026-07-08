const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const db = require('../config/database');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pushService = require('../services/pushNotificationService');

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /webhooks/stripe
 * Stripe sends events here. The raw body is required for signature verification.
 * The raw body middleware is configured in server.js before JSON parsing.
 */
router.post('/stripe', async (req, res) => {
  let event;

  // Verify webhook signature if secret is configured
  if (endpointSecret) {
    const sig = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      logger.error('Webhook signature verification failed:', { error: err.message });
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }
  } else {
    // In development without webhook secret, parse the body directly
    event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    logger.warn('Webhook signature verification skipped (no STRIPE_WEBHOOK_SECRET set)');
  }

  logger.info('Stripe webhook received', { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        // Payment was authorized (manual capture) or fully captured
        const pi = event.data.object;
        logger.info('PaymentIntent succeeded', { id: pi.id, status: pi.status });

        // Record authorization timestamp on the booking
        await db.query(
          `UPDATE bookings SET payment_authorized_at = NOW(), updated_at = NOW()
           WHERE payment_intent_id = $1 AND payment_authorized_at IS NULL`,
          [pi.id]
        );
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        logger.warn('PaymentIntent failed', { id: pi.id, error: pi.last_payment_error?.message });

        // Find the booking and notify the guest
        const bookingRes = await db.query(
          `SELECT b.id, b.user_id, p.name as place_name
           FROM bookings b
           LEFT JOIN places p ON p.id = b.place_id
           WHERE b.payment_intent_id = $1`,
          [pi.id]
        );

        if (bookingRes.rows.length > 0) {
          const booking = bookingRes.rows[0];
          // Mark booking as cancelled since payment failed
          await db.query(
            `UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
            [booking.id]
          );

          // Notify guest
          try {
            await pushService.sendToUser(
              booking.user_id,
              'Payment Failed',
              `Your payment for ${booking.place_name || 'your booking'} could not be processed. Please try again.`,
              { type: 'payment_failed', booking_id: String(booking.id) }
            );
          } catch (e) { /* ignore push errors */ }
        }
        break;
      }

      case 'charge.captured': {
        // Funds have been captured from the customer
        const charge = event.data.object;
        logger.info('Charge captured', { id: charge.id, paymentIntent: charge.payment_intent });

        // Store charge ID on the booking for later transfer
        if (charge.payment_intent) {
          await db.query(
            `UPDATE bookings SET charge_id = $1, updated_at = NOW()
             WHERE payment_intent_id = $2`,
            [charge.id, charge.payment_intent]
          );
        }
        break;
      }

      case 'transfer.created': {
        // Transfer to host's connected account was initiated
        const transfer = event.data.object;
        logger.info('Transfer created', {
          id: transfer.id,
          destination: transfer.destination,
          amount: transfer.amount,
        });

        // Update booking payout status
        if (transfer.metadata?.booking_id) {
          await db.query(
            `UPDATE bookings SET host_payout_status = 'paid', transfer_id = $1, updated_at = NOW()
             WHERE id = $2`,
            [transfer.id, transfer.metadata.booking_id]
          );
        }
        break;
      }

      case 'payment_intent.canceled': {
        // Authorization was cancelled (by host rejection or expiry)
        const pi = event.data.object;
        logger.info('PaymentIntent cancelled', { id: pi.id });
        break;
      }

      default:
        logger.info('Unhandled webhook event type', { type: event.type });
    }

    res.json({ received: true });
  } catch (err) {
    logger.error('Webhook processing error', { type: event.type, error: err.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /webhooks/resend
 * Resend sends email delivery events here (delivered, bounced, complained, etc).
 * Signature verification uses Svix (Resend's webhook infrastructure).
 * The raw body is required for signature verification.
 */
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

router.post('/resend', async (req, res) => {
  let event;
  const rawBody = req.body; // Buffer, thanks to express.raw() middleware in server.js

  if (RESEND_WEBHOOK_SECRET) {
    try {
      const { Webhook } = require('svix');
      const wh = new Webhook(RESEND_WEBHOOK_SECRET);
      const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
      const headers = {
        'svix-id': req.headers['svix-id'],
        'svix-timestamp': req.headers['svix-timestamp'],
        'svix-signature': req.headers['svix-signature'],
      };
      event = wh.verify(bodyStr, headers);
    } catch (err) {
      logger.error('Resend webhook signature verification failed', { error: err.message });
      return res.status(400).json({ error: 'Invalid signature' });
    }
  } else {
    logger.warn('Resend webhook signature verification skipped (no RESEND_WEBHOOK_SECRET set)');
    try {
      const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
      event = typeof rawBody === 'string' ? JSON.parse(rawBody) : (rawBody && typeof rawBody === 'object' && !Buffer.isBuffer(rawBody) ? rawBody : JSON.parse(bodyStr));
    } catch (err) {
      logger.error('Resend webhook body parse failed', { error: err.message });
      return res.status(400).json({ error: 'Invalid body' });
    }
  }

  const type = event.type || 'unknown';
  const data = event.data || {};
  const emailId = data.email_id || data.id;
  const to = Array.isArray(data.to) ? data.to[0] : data.to;
  const tag = (data.tags && data.tags.find && data.tags.find((t) => t.name === 'category')?.value) || null;

  logger.info('Resend webhook received', { type, emailId, to, tag });

  try {
    await db.query(
      `INSERT INTO email_events (provider_id, recipient, tag, event_type, detail, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [emailId || null, to ? String(to).slice(0, 255) : null, tag || null, type, JSON.stringify(data)]
    );
  } catch (err) {
    logger.error('Failed to record resend webhook event', { error: err.message, type });
  }

  // Alert admin on delivery failures
  const alertTypes = new Set(['email.bounced', 'email.complained', 'email.delivery_delayed', 'email.failed']);
  if (alertTypes.has(type)) {
    try {
      const mailer = require('../utils/mailer');
      const bounce = data.bounce || data.reason || {};
      const bounceMsg = typeof bounce === 'string' ? bounce : (bounce.message || JSON.stringify(bounce));
      const label = type.replace('email.', '');
      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:20px;max-width:560px;">
          <h2 style="color:#b91c1c;margin:0 0 12px;">Email delivery ${label}</h2>
          <p style="color:#374151;line-height:1.5;">Recipient <strong>${escapeHtml(String(to || 'unknown'))}</strong> did not receive their ${tag ? `<strong>${escapeHtml(tag)}</strong> ` : ''}email.</p>
          <table style="border-collapse:collapse;margin:16px 0;font-size:14px;">
            <tr><td style="padding:6px 12px;color:#6b7280;">Event</td><td style="padding:6px 12px;color:#111827;font-family:monospace;">${escapeHtml(type)}</td></tr>
            <tr><td style="padding:6px 12px;color:#6b7280;">Subject</td><td style="padding:6px 12px;color:#111827;">${escapeHtml(String(data.subject || ''))}</td></tr>
            <tr><td style="padding:6px 12px;color:#6b7280;">Provider email id</td><td style="padding:6px 12px;font-family:monospace;font-size:12px;">${escapeHtml(String(emailId || ''))}</td></tr>
            <tr><td style="padding:6px 12px;color:#6b7280;vertical-align:top;">Reason</td><td style="padding:6px 12px;color:#b91c1c;font-family:monospace;font-size:12px;white-space:pre-wrap;">${escapeHtml(bounceMsg || 'not provided')}</td></tr>
            <tr><td style="padding:6px 12px;color:#6b7280;">Time</td><td style="padding:6px 12px;color:#111827;">${new Date().toISOString()}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:12px;">Full event details are stored in email_events table.</p>
        </div>
      `;
      mailer.sendAdminAlert({ subject: `${label}: ${tag || 'email'} to ${to || 'unknown'}`, html }).catch(() => {});
    } catch (err) {
      logger.error('Failed to send admin alert for resend event', { error: err.message });
    }
  }

  res.json({ received: true });
});

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = router;
