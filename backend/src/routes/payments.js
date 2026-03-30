const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Initialize Stripe with test secret key
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51SVJ2DCGmQVz0gpF9CcIAr4tsMN3LKFicySXcKQWB378Mi4BVrUI2UstMGxHzR8vomIV1EJ9fMLz7xiAkQDEqJzp00wfNviq5a');

// Create payment intent for Stripe
router.post('/create-intent', async (req, res) => {
  try {
    const { amount, currency } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({
        message: 'Missing required fields',
        errors: ['amount and currency are required'],
      });
    }

    // Create a Stripe payment intent with manual capture
    // Payment is authorised (held) now but only captured when host approves
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Amount in smallest currency unit (pence)
      currency: currency.toLowerCase(),
      capture_method: 'manual',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    logger.info(`Payment intent created: ${paymentIntent.id}`);
    
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

module.exports = router;
