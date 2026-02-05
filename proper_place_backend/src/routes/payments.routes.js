import express from 'express';
import Stripe from 'stripe';
import { query } from '../db/database.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create payment intent
router.post('/create-intent', async (req, res) => {
  try {
    const { amount, currency } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({
        message: 'Missing required fields',
        errors: ['amount and currency are required'],
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ['card'],
    });

    return res.status(200).json({
      message: 'Payment intent created',
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
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
    } = req.body;

    // Verify payment was successful
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId
    );

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        message: 'Payment was not successful',
        paymentStatus: paymentIntent.status,
      });
    }

    // Create booking in database
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
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        message: 'Missing required fields',
        errors: ['paymentIntentId is required'],
      });
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
    });

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
