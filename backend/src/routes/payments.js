const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const db = require('../config/database');

// Initialize Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Platform fee percentage kept by Proper Place
const PLATFORM_FEE_PERCENT = 0.15;

// ─── Stripe Connect onboarding ────────────────────────────────────────────────

// Create or retrieve a Stripe Connect Express account for a host, then return
// an onboarding link so they can enter their bank details on Stripe's hosted page.
router.post('/connect/onboard', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const userResult = await db.query(
      'SELECT id, email, name, stripe_account_id, stripe_onboarding_complete FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];
    let accountId = user.stripe_account_id;

    // Create a new Express account if one does not exist yet
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: { user_id: String(userId) },
      });
      accountId = account.id;
      await db.query(
        'UPDATE users SET stripe_account_id = $1, updated_at = NOW() WHERE id = $2',
        [accountId, userId]
      );
    }

    // Generate a fresh onboarding link (they expire quickly)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: 'properplace://connect/refresh',
      return_url: 'properplace://connect/complete',
      type: 'account_onboarding',
    });

    logger.info('Connect onboarding link created', { userId, accountId });
    return res.status(200).json({ url: accountLink.url, accountId });
  } catch (error) {
    logger.error('Error creating Connect onboarding link:', error);
    return res.status(500).json({ message: 'Failed to create onboarding link', error: error.message });
  }
});

// Called after the host returns from Stripe's onboarding page to check status
router.post('/connect/status', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const userResult = await db.query(
      'SELECT stripe_account_id, stripe_onboarding_complete FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { stripe_account_id: accountId, stripe_onboarding_complete: alreadyOnboarded } = userResult.rows[0];

    if (!accountId) {
      return res.status(200).json({ onboarded: false, accountId: null });
    }

    // Fetch current state from Stripe
    const account = await stripe.accounts.retrieve(accountId);
    const onboarded = account.details_submitted && account.charges_enabled;

    // Persist updated state if it changed
    if (onboarded && !alreadyOnboarded) {
      await db.query(
        'UPDATE users SET stripe_onboarding_complete = true, updated_at = NOW() WHERE id = $1',
        [userId]
      );
    }

    return res.status(200).json({ onboarded, accountId });
  } catch (error) {
    logger.error('Error checking Connect status:', error);
    return res.status(500).json({ message: 'Failed to check Connect status', error: error.message });
  }
});

// ─── Payment intents ──────────────────────────────────────────────────────────

// Create payment intent for Stripe
router.post('/create-intent', async (req, res) => {
  try {
    const { amount, currency, place_id, check_out_date } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({
        message: 'Missing required fields',
        errors: ['amount and currency are required'],
      });
    }

    // Look up the host's Stripe Connect account for this place
    if (!place_id) {
      return res.status(400).json({
        message: 'place_id is required',
        errors: ['place_id is required to process payment'],
      });
    }

    const placeRes = await db.query(
      `SELECT u.stripe_account_id, u.id as host_id FROM places p
       JOIN users u ON u.id = p.owner_id
       WHERE p.id = $1`,
      [place_id]
    );

    if (placeRes.rows.length === 0) {
      return res.status(404).json({ message: 'Place not found' });
    }

    const hostAccountId = placeRes.rows[0].stripe_account_id;

    // Host MUST have a Stripe Connect account for bookings
    if (!hostAccountId) {
      return res.status(400).json({
        message: 'This host has not set up their payout account yet. Bookings cannot be processed until the host completes Stripe Connect setup.',
        code: 'host_connect_required',
      });
    }

    // Destination charges: 15% application fee to platform, 85% auto-transferred to host.
    // Note: on_behalf_of is intentionally omitted — mobile SDKs require the PI to be
    // looked up on the platform account, which is incompatible with on_behalf_of.
    const applicationFee = Math.round(Math.round(amount) * PLATFORM_FEE_PERCENT);

    // Hybrid capture: hold the card (manual) when checkout is within 6 days —
    // Stripe card authorisations expire after 7 days on most UK cards.
    // For longer lead times, charge immediately; cancellation triggers an automatic refund.
    const daysUntilCheckout = check_out_date
      ? Math.ceil((new Date(check_out_date) - new Date()) / (1000 * 60 * 60 * 24))
      : 0;
    const captureMethod = daysUntilCheckout <= 6 ? 'manual' : 'automatic';

    const paymentIntentParams = {
      amount: Math.round(amount),
      currency: currency.toLowerCase(),
      capture_method: captureMethod,
      automatic_payment_methods: { enabled: true },
      application_fee_amount: applicationFee,
      transfer_data: { destination: hostAccountId },
      metadata: {
        platform: 'proper_place',
        place_id: String(place_id),
        host_account: hostAccountId,
        application_fee: String(applicationFee),
      },
    };

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    } catch (stripeErr) {
      if (stripeErr.code === 'insufficient_capabilities_for_transfer') {
        return res.status(400).json({
          message: 'The host\'s Stripe account is not fully set up for payments. Please ask the host to complete their Stripe onboarding.',
          code: 'host_connect_incomplete',
        });
      }
      throw stripeErr;
    }

    logger.info(`Payment intent created: ${paymentIntent.id}`, {
      hostAccount: hostAccountId,
      placeId: place_id,
      captureMethod,
    });

    return res.status(200).json({
      message: 'Payment intent created',
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      connectedAccountId: hostAccountId,
      captureMethod,
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
