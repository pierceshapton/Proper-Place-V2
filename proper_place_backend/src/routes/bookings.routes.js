import express from 'express';
import { BookingsService } from '../services/bookings.service.js';

const router = express.Router();

// GET /bookings/:placeId - Get all bookings for a place
router.get('/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    const bookings = await BookingsService.getBookingsByPlaceId(placeId);
    
    return res.status(200).json({
      message: 'Bookings retrieved successfully',
      bookings,
      count: bookings.length,
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return res.status(500).json({
      message: 'Failed to fetch bookings',
      error: error.message,
    });
  }
});

// GET /bookings/availability/:placeId - Get available dates for a place
router.get('/availability/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'Missing required parameters',
        errors: ['startDate and endDate are required'],
      });
    }

    const availability = await BookingsService.getAvailableDates(
      placeId,
      startDate,
      endDate
    );

    return res.status(200).json({
      message: 'Availability retrieved successfully',
      availability,
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return res.status(500).json({
      message: 'Failed to fetch availability',
      error: error.message,
    });
  }
});

// POST /bookings - Create a new booking
router.post('/', async (req, res) => {
  try {
    const { placeId, guestId, checkIn, checkOut, totalPrice, paymentIntentId, connectedAccountId,
            // camelCase aliases sent by place_detail_screen
            place_id, check_in_date, check_out_date, van_registration, payment_intent_id, connected_account_id } = req.body;

    // Accept both camelCase and snake_case field names
    const resolvedPlaceId       = placeId       ?? place_id;
    const resolvedGuestId       = guestId;
    const resolvedCheckIn       = checkIn       ?? check_in_date;
    const resolvedCheckOut      = checkOut      ?? check_out_date;
    const resolvedTotal         = totalPrice;
    const resolvedPaymentIntent = paymentIntentId ?? payment_intent_id ?? null;
    const resolvedConnectedAcct = connectedAccountId ?? connected_account_id ?? null;

    // Validate required fields
    if (!resolvedPlaceId || !resolvedGuestId || !resolvedCheckIn || !resolvedCheckOut || resolvedTotal === undefined) {
      return res.status(400).json({
        message: 'Missing required fields',
        errors: ['placeId, guestId, checkIn, checkOut, and totalPrice are required'],
      });
    }

    const booking = await BookingsService.createBooking(
      resolvedPlaceId,
      resolvedGuestId,
      resolvedCheckIn,
      resolvedCheckOut,
      resolvedTotal,
      resolvedPaymentIntent,
      resolvedConnectedAcct,
    );

    return res.status(201).json({
      message: 'Booking created successfully',
      booking,
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return res.status(400).json({
      message: 'Failed to create booking',
      error: error.message,
    });
  }
});

// GET /bookings/guest/:guestId - Get bookings for a guest
router.get('/guest/:guestId', async (req, res) => {
  try {
    const { guestId } = req.params;
    const bookings = await BookingsService.getBookingsByGuestId(guestId);

    return res.status(200).json({
      message: 'Guest bookings retrieved successfully',
      bookings,
      count: bookings.length,
    });
  } catch (error) {
    console.error('Error fetching guest bookings:', error);
    return res.status(500).json({
      message: 'Failed to fetch bookings',
      error: error.message,
    });
  }
});

// POST /bookings/:bookingId/cancel - Cancel a booking
router.post('/:bookingId/cancel', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await BookingsService.cancelBooking(bookingId);

    return res.status(200).json({
      message: 'Booking cancelled successfully',
      booking,
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return res.status(500).json({
      message: 'Failed to cancel booking',
      error: error.message,
    });
  }
});

// POST /bookings/:bookingId/complete - Mark stay as finished and capture payment
router.post('/:bookingId/complete', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await BookingsService.completeBooking(bookingId);

    return res.status(200).json({
      message: 'Booking completed and payment captured',
      booking,
    });
  } catch (error) {
    console.error('Error completing booking:', error);
    return res.status(500).json({
      message: 'Failed to complete booking',
      error: error.message,
    });
  }
});

export default router;
