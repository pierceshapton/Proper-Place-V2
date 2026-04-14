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
router.get('/all', authMiddleware, bookingController.getAllBookings); // Admin: all bookings
router.get('/search', authMiddleware, bookingController.searchBookings); // Admin: search bookings
router.get('/host/my-bookings', authMiddleware, bookingController.getHostBookings); // Host: bookings for their places
router.put('/host/mark-seen', authMiddleware, bookingController.markBookingsSeen); // Host: mark bookings as seen
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

module.exports = router;
