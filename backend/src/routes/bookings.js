const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { validationMiddleware } = require('../middleware/validation');
const bookingController = require('../controllers/bookingController');
const db = require('../config/database');
const logger = require('../utils/logger');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Public routes - IMPORTANT: more specific routes must come first!
// Get availability data per date for calendar display
router.get('/availability/place/:placeId', bookingController.getPlaceAvailability);

// Get bookings for a place (for availability checking)
router.get('/place/:placeId', bookingController.getPlaceBookings);

// Protected routes
router.get('/all', authMiddleware, bookingController.getAllBookings); // Admin: all bookings
router.get('/search', authMiddleware, bookingController.searchBookings); // Admin: search bookings
router.get('/host/my-bookings', authMiddleware, bookingController.getHostBookings); // Host: bookings for their places
router.get('/host/dashboard', authMiddleware, bookingController.getHostDashboard); // Host: dashboard stats
router.put('/host/mark-seen', authMiddleware, bookingController.markBookingsSeen); // Host: mark bookings as seen
router.put('/user/mark-seen', authMiddleware, bookingController.markUserBookingsSeen); // User: mark bookings as seen
router.get('/guest-rating/:userId(\\d+)', authMiddleware, bookingController.getGuestRating);
router.get('/', authMiddleware, bookingController.getBookings);
router.get('/:id(\\d+)', authMiddleware, bookingController.getBookingDetail);
router.post('/', authMiddleware, validationMiddleware('createBooking'), bookingController.createBooking);
router.patch('/:id(\\d+)', authMiddleware, bookingController.updateBooking);
router.put('/:id(\\d+)/approve', authMiddleware, bookingController.approveBooking);
router.put('/:id(\\d+)/reject', authMiddleware, bookingController.rejectBooking);
router.post('/:id(\\d+)/cancel', authMiddleware, bookingController.cancelBooking);
router.post('/:id(\\d+)/guest-review', authMiddleware, bookingController.createGuestReview);
router.post('/:id(\\d+)/extend', authMiddleware, bookingController.requestExtension);
router.get('/:id(\\d+)/extensions', authMiddleware, bookingController.getBookingExtensions);
router.put('/extensions/:extId(\\d+)/approve', authMiddleware, bookingController.approveExtension);
router.put('/extensions/:extId(\\d+)/reject', authMiddleware, bookingController.rejectExtension);
router.delete('/:id(\\d+)', authMiddleware, bookingController.deleteBooking);

// Mark a booking as completed and capture the held Stripe payment.
// Safe to call when payment was already captured at approve time (idempotent).
router.post('/:id(\\d+)/complete', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const bookingRes = await db.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = bookingRes.rows[0];

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot complete a cancelled booking' });
    }

    // Capture if not already done (approveBooking may have captured it when the host accepted)
    if (booking.payment_intent_id && !booking.payment_captured) {
      try {
        await stripe.paymentIntents.capture(booking.payment_intent_id);
        logger.info('Payment captured on complete', { bookingId: id, paymentIntentId: booking.payment_intent_id });
      } catch (captureErr) {
        // payment_intent_unexpected_state is Stripe's code when already captured
        if (captureErr.code !== 'charge_already_captured' && captureErr.code !== 'payment_intent_unexpected_state') {
          logger.error('Stripe capture failed on complete', { bookingId: id, error: captureErr.message });
          return res.status(502).json({ message: 'Payment capture failed', error: captureErr.message });
        }
        logger.info('Payment already captured, continuing', { bookingId: id });
      }
    }

    const result = await db.query(
      `UPDATE bookings SET status = 'Completed', payment_captured = true, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    logger.info('Booking completed', { bookingId: id });
    return res.status(200).json({ message: 'Booking completed and payment captured', booking: result.rows[0] });
  } catch (error) {
    logger.error('Error completing booking:', error);
    return res.status(500).json({ message: 'Failed to complete booking', error: error.message });
  }
});

module.exports = router;
