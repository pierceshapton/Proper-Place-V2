const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { validationMiddleware } = require('../middleware/validation');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

// Public route - get bookings for a place (for availability checking)
router.get('/place/:placeId', bookingController.getPlaceBookings);

// Protected routes
router.get('/', authMiddleware, bookingController.getBookings);
router.get('/:id', authMiddleware, bookingController.getBookingDetail);
router.post('/', authMiddleware, validationMiddleware('createBooking'), bookingController.createBooking);
router.patch('/:id', authMiddleware, bookingController.updateBooking);
router.delete('/:id', authMiddleware, bookingController.deleteBooking);

module.exports = router;
