import express from 'express';
import Stripe from 'stripe';
import { query } from '../db/database.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Proper Place adds 18% on top of the host's rate so the host always receives
// exactly what they set. The application_fee extracted from the charge must
// therefore be:  gross_amount × (0.18 / 1.18)
const PLATFORM_FEE_PERCENT = 0.18;

// ─── Stripe Connect onboarding ────────────────────────────────────────────────

// Create or retrieve a Stripe Connect account for a host, then return an
// onboarding link so they can enter their bank details on Stripe's hosted page.
router.post('/connect/onboard', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    // Look up user
    const userResult = await query(
      'SELECT user_id, email, name, stripe_connect_account_id, stripe_connect_onboarded FROM users WHERE user_id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];
    let accountId = user.stripe_connect_account_id;

    // Create a new Express account if one doesn't exist yet
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: { user_id: userId },
      });
      accountId = account.id;
      await query(
        'UPDATE users SET stripe_connect_account_id = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        [accountId, userId]
      );
    }

    // Generate a fresh onboarding link (they expire after a short time)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.APP_URL || 'properplace://'}connect/refresh`,
      return_url: `${process.env.APP_URL || 'properplace://'}connect/complete`,
      type: 'account_onboarding',
    });

    return res.status(200).json({
      url: accountLink.url,
      accountId,
    });
  } catch (error) {
    console.error('Error creating Connect onboarding link:', error);
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

    const userResult = await query(
      'SELECT stripe_connect_account_id, stripe_connect_onboarded FROM users WHERE user_id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { stripe_connect_account_id: accountId, stripe_connect_onboarded: alreadyOnboarded } = userResult.rows[0];

    if (!accountId) {
      return res.status(200).json({ onboarded: false, accountId: null });
    }

    // Fetch current state from Stripe
    const account = await stripe.accounts.retrieve(accountId);
    const onboarded = account.details_submitted && account.charges_enabled;

    // Persist the updated state if it changed
    if (onboarded && !alreadyOnboarded) {
      await query(
        'UPDATE users SET stripe_connect_onboarded = true, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
        [userId]
      );
    }

    return res.status(200).json({ onboarded, accountId });
  } catch (error) {
    console.error('Error checking Connect status:', error);
    return res.status(500).json({ message: 'Failed to check Connect status', error: error.message });
  }
});

// ─── Payment intents ──────────────────────────────────────────────────────────

// Create a direct charge on the host's connected account.
// Stripe's processing fee is charged to the connected account (host's 85%).
// Proper Place collects a clean 18% application_fee with no Stripe fee deducted.
router.post('/create-intent', async (req, res) => {
  try {
    const { amount, currency, place_id, check_out_date } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({
        message: 'Missing required fields',
        errors: ['amount and currency are required'],
      });
    }

    // Resolve the host's connected Stripe account from the place
    let connectedAccountId = null;
    if (place_id) {
      const placeResult = await query(
        `SELECT u.stripe_connect_account_id, u.stripe_connect_onboarded
         FROM places p
         JOIN users u ON p.host_id = u.user_id
         WHERE p.place_id = $1`,
        [place_id]
      );
      if (placeResult.rows.length > 0 && placeResult.rows[0].stripe_connect_onboarded) {
        connectedAccountId = placeResult.rows[0].stripe_connect_account_id;
      }
    }

    const applicationFeeAmount = Math.round(amount * (PLATFORM_FEE_PERCENT / (1 + PLATFORM_FEE_PERCENT)));

    // Use manual capture (hold) only when checkout is within 6 days — Stripe
    // card authorisations expire after 7 days on most UK cards.  For longer
    // lead times we charge immediately; the existing cancel route already
    // issues an automatic refund so guests are still protected.
    const daysUntilCheckout = check_out_date
      ? Math.ceil((new Date(check_out_date) - new Date()) / (1000 * 60 * 60 * 24))
      : 0;
    const captureMethod = daysUntilCheckout <= 6 ? 'manual' : 'automatic';

    let paymentIntent;
    if (connectedAccountId) {
      // Direct charge: Stripe's processing fee comes from the host's connected
      // account, so it is deducted from their 85% — not from our 15%.
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount,
          currency,
          payment_method_types: ['card'],
          application_fee_amount: applicationFeeAmount,
          capture_method: captureMethod,
        },
        { stripeAccount: connectedAccountId }
      );
    } else {
      // Fallback: host not yet connected — charge without a split.
      // The booking will still complete; payouts must be handled manually until
      // the host finishes Connect onboarding.
      paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        payment_method_types: ['card'],
        capture_method: captureMethod,
        metadata: { place_id: place_id ?? '' },
      });
    }

    return res.status(200).json({
      message: 'Payment intent created',
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      connectedAccountId,
      // Tell the client whether this is a hold or an immediate charge so it
      // can decide whether to pass paymentIntentId to completeBooking later.
      captureMetho
    }

    return res.status(200).json({
      message: 'Payment intent created',
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      connectedAccountId,
      // Tell the client whether this is a hold or an immediate charge so it
      // can decide whether to pass paymentIntentId to completeBooking later.
      captureMethod,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
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
      connectedAccountId,
    } = req.body;

    // Retrieve the payment intent – use the connected account if provided
    const retrieveOptions = connectedAccountId ? { stripeAccount: connectedAccountId } : {};
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, retrieveOptions);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        message: 'Payment was not successful',
        paymentStatus: paymentIntent.status,
      });
    }

    const result = await query(
      'INSERT INTO bookings (place_id, guest_id, check_in, check_out, total_price, payment_intent_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [placeId, guestId, checkIn, checkOut, totalPrice, paymentIntentId, 'confirmed']
    );

    return res.status(201).json({
      message: 'Payment confirmed and booking created',
      booking: result.rows[0],
    });
  } catch (error) {
    console.error('Error confirming payment and creating booking:', error);
    return res.status(500).json({
      message: 'Failed to confirm payment and create booking',
      error: error.message,
    });
  }
});

// Refund payment
router.post('/refund', async (req, res) => {
  try {
    const { paymentIntentId, connectedAccountId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        message: 'Missing required fields',
        errors: ['paymentIntentId is required'],
      });
    }

    const refundOptions = connectedAccountId ? { stripeAccount: connectedAccountId } : {};
    const refund = await stripe.refunds.create(
      { payment_intent: paymentIntentId },
      refundOptions
    );

    return res.status(200).json({
      message: 'Refund processed successfully',
      refundId: refund.id,
      refundStatus: refund.status,
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    return res.status(500).json({
      message: 'Failed to process refund',
      error: error.message,
    });
  }
});

export default router;

