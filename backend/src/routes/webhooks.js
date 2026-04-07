const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const db = require('../config/database');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51SVJ2DCGmQVz0gpF9CcIAr4tsMN3LKFicySXcKQWB378Mi4BVrUI2UstMGxHzR8vomIV1EJ9fMLz7xiAkQDEqJzp00wfNviq5a');
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

module.exports = router;
