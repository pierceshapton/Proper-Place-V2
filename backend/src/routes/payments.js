const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const db = require('../config/database');

// Initialize Stripe with test secret key
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51SVJ2DCGmQVz0gpF9CcIAr4tsMN3LKFicySXcKQWB378Mi4BVrUI2UstMGxHzR8vomIV1EJ9fMLz7xiAkQDEqJzp00wfNviq5a');

// Create payment intent for Stripe
router.post('/create-intent', async (req, res) => {
  try {
    const { amount, currency, place_id } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({
        message: 'Missing required fields',
        errors: ['amount and currency are required'],
      });
    }

    // Look up the host's Stripe Connect account for this place
    let hostAccountId = null;
    if (place_id) {
      const placeRes = await db.query(
        `SELECT u.stripe_account_id FROM places p
         JOIN users u ON u.id = p.owner_id
         WHERE p.id = $1`,
        [place_id]
      );
      if (placeRes.rows.length > 0) {
        hostAccountId = placeRes.rows[0].stripe_account_id;
      }
    }

    // Create a Stripe payment intent with manual capture
    // Payment is authorised (held) now but only captured when host approves
    const paymentIntentParams = {
      amount: Math.round(amount), // Amount in smallest currency unit (pence)
      currency: currency.toLowerCase(),
      capture_method: 'manual',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        platform: 'proper_place',
      },
    };

    // If the host has a Stripe Connect account, use destination charges
    // so Stripe handles the 15% platform fee and host transfer automatically.
    // With on_behalf_of the host bears Stripe processing fees;
    // the platform keeps the full application_fee_amount (15%).
    if (hostAccountId) {
      const applicationFee = Math.round(amount * 0.15);
      paymentIntentParams.application_fee_amount = applicationFee;
      paymentIntentParams.transfer_data = { destination: hostAccountId };
      paymentIntentParams.on_behalf_of = hostAccountId;
      paymentIntentParams.metadata.host_account = hostAccountId;
      paymentIntentParams.metadata.application_fee = String(applicationFee);
    }
    if (place_id) {
      paymentIntentParams.metadata.place_id = String(place_id);
    }

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    } catch (stripeErr) {
      // If destination charge fails (host account not fully onboarded), retry without Connect
      if (hostAccountId && stripeErr.code === 'insufficient_capabilities_for_transfer') {
        logger.warn(`Host account ${hostAccountId} not ready for transfers, creating standard payment intent`);
        delete paymentIntentParams.application_fee_amount;
        delete paymentIntentParams.transfer_data;
        delete paymentIntentParams.on_behalf_of;
        paymentIntentParams.metadata.connect_skipped = 'true';
        paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
      } else {
        throw stripeErr;
      }
    }

    logger.info(`Payment intent created: ${paymentIntent.id}`, {
      hostAccount: hostAccountId,
      placeId: place_id,
    });
    
    return res.status(200).json({
      message: 'Payment intent created',
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    logger.error('Error creating payment intent:', error);
    return res.status(500).json({
      message: 'Failed to create payment intent',
      error: error.message,
    });
  }
});

// Confirm payment and create booking
router.post('/confirm-and-book', async (req, res) => {
  try {
    const {
      paymentIntentId,
      placeId,
      guestId,
      checkIn,
      checkOut,
      totalPrice,
    } = req.body;

    if (!paymentIntentId || !placeId || !guestId || !checkIn || !checkOut || !totalPrice) {
      return res.status(400).json({
        message: 'Missing required booking fields'
      });
    }

    // For development, assume payment is successful
    logger.info(`Payment confirmed for booking: ${placeId} by ${guestId}`);

    return res.status(201).json({
      message: 'Payment confirmed and booking created',
      paymentIntentId: paymentIntentId,
      success: true,
    });

  } catch (error) {
    logger.error('Error confirming payment:', error);
    return res.status(500).json({
      message: 'Failed to confirm payment and create booking',
      error: error.message,
    });
  }
});

// Refund payment
router.post('/refund', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        message: 'Missing paymentIntentId'
      });
    }

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status === 'requires_capture') {
      await stripe.paymentIntents.cancel(paymentIntentId);
    } else if (pi.status === 'succeeded') {
      await stripe.refunds.create({ payment_intent: paymentIntentId });
    }

    logger.info(`Refund processed for payment intent: ${paymentIntentId}`);

    return res.status(200).json({
      message: 'Refund processed successfully',
      paymentIntentId: paymentIntentId,
      success: true,
    });

  } catch (error) {
    logger.error('Error processing refund:', error);
    return res.status(500).json({
      message: 'Failed to process refund',
      error: error.message,
    });
  }
});

/**
 * POST /payments/transfer-to-host
 * Transfer captured funds to the host's Stripe Connect account after booking completes.
 * Platform keeps 15% commission.
 */
router.post('/transfer-to-host', async (req, res) => {
  try {
    const { booking_id } = req.body;

    if (!booking_id) {
      return res.status(400).json({ message: 'Missing booking_id' });
    }

    // Fetch booking with host info
    const bookingRes = await db.query(
      `SELECT b.*, p.owner_id, u.stripe_account_id
       FROM bookings b
       JOIN places p ON p.id = b.place_id
       JOIN users u ON u.id = p.owner_id
       WHERE b.id = $1`,
      [booking_id]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = bookingRes.rows[0];

    if (!booking.stripe_account_id) {
      return res.status(400).json({
        message: 'Host has not set up their payout account yet',
        error: 'no_connect_account',
      });
    }

    if (booking.transfer_id) {
      return res.status(400).json({
        message: 'Transfer already completed for this booking',
        transfer_id: booking.transfer_id,
      });
    }

    if (!booking.charge_id) {
      return res.status(400).json({
        message: 'No charge found for this booking. Payment may not have been captured.',
      });
    }

    // Calculate host payout: total price minus 15% platform commission
    const totalPence = Math.round(parseFloat(booking.total_price) * 100);
    const platformFee = Math.round(totalPence * 0.15);
    const hostPayout = totalPence - platformFee;

    const transfer = await stripe.transfers.create({
      amount: hostPayout,
      currency: 'gbp',
      destination: booking.stripe_account_id,
      source_transaction: booking.charge_id,
      description: `Booking ${booking.booking_ref || booking.id} payout`,
      metadata: {
        booking_id: String(booking.id),
        booking_ref: booking.booking_ref || '',
        platform_fee: String(platformFee),
      },
    });

    // Store transfer ID on booking
    await db.query(
      `UPDATE bookings SET transfer_id = $1, host_payout_status = 'paid', updated_at = NOW() WHERE id = $2`,
      [transfer.id, booking.id]
    );

    logger.info('Host payout transferred', {
      bookingId: booking.id,
      transferId: transfer.id,
      hostPayout,
      platformFee,
    });

    return res.status(200).json({
      message: 'Transfer to host successful',
      transfer_id: transfer.id,
      host_payout: hostPayout / 100,
      platform_fee: platformFee / 100,
    });

  } catch (error) {
    logger.error('Error transferring to host:', error);
    return res.status(500).json({
      message: 'Failed to transfer to host',
      error: error.message,
    });
  }
});

module.exports = router;
