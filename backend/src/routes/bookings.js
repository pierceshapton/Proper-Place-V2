const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { validationMiddleware } = require('../middleware/validation');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

// Public routes - IMPORTANT: more specific routes must come first!
// Get availability data per date for calendar display
router.get('/availability/place/:placeId', bookingController.getPlaceAvailability);

// Get bookings for a place (for availability checking)
router.get('/place/:placeId', bookingController.getPlaceBookings);

// Protected routes
router.get('/', authMiddleware, bookingController.getBookings);
router.get('/:id', authMiddleware, bookingController.getBookingDetail);
router.post('/', authMiddleware, validationMiddleware('createBooking'), bookingController.createBooking);
router.patch('/:id', authMiddleware, bookingController.updateBooking);
router.delete('/:id', authMiddleware, bookingController.deleteBooking);

module.exports = router;
