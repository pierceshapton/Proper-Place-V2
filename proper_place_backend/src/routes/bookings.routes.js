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
    const { placeId, guestId, checkIn, checkOut, totalPrice } = req.body;

    // Validate required fields
    if (!placeId || !guestId || !checkIn || !checkOut || totalPrice === undefined) {
      return res.status(400).json({
        message: 'Missing required fields',
        errors: [
          'placeId, guestId, checkIn, checkOut, and totalPrice are required',
        ],
      });
    }

    const booking = await BookingsService.createBooking(
      placeId,
      guestId,
      checkIn,
      checkOut,
      totalPrice
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

export default router;
