const express = require('express');
const { authMiddleware, optionalAuthMiddleware, adminMiddleware } = require('../middleware/auth');
const { validationMiddleware } = require('../middleware/validation');
const { placesLimiter } = require('../middleware/rateLimit');
const placeController = require('../controllers/placeController');
const adminController = require('../controllers/adminController');
const externalCalendarsController = require('../controllers/externalCalendarsController');

const router = express.Router();

// Public routes - with rate limiting to prevent scraping
router.get('/', placesLimiter, optionalAuthMiddleware, placeController.getPlaces);

// Protected routes - must be before /:id to avoid conflict
router.get('/host/my-places', authMiddleware, placeController.getHostPlaces);

// External calendars (hosts only) - manage external iCal feed URLs for a place
router.get('/:id/external-calendars', authMiddleware, externalCalendarsController.listExternalCalendars);
router.post('/:id/external-calendars', authMiddleware, externalCalendarsController.createExternalCalendar);
router.delete('/external-calendars/:id', authMiddleware, externalCalendarsController.deleteExternalCalendar);

// Admin routes - must be before /:id to avoid conflict
router.get('/admin/pending', authMiddleware, adminMiddleware, placeController.getPendingPlaces);
router.post('/:id/approve', authMiddleware, adminMiddleware, adminController.approvePlace);
router.post('/:id/reject', authMiddleware, adminMiddleware, adminController.rejectPlace);
router.post('/:id/reopen', authMiddleware, adminMiddleware, adminController.reopenPlace);

router.get('/:id', optionalAuthMiddleware, placeController.getPlaceDetail);
router.post('/', authMiddleware, validationMiddleware('createPlace'), placeController.createPlace);
router.patch('/:id', authMiddleware, validationMiddleware('createPlace'), placeController.updatePlace);
router.delete('/:id', authMiddleware, placeController.deletePlace);
router.post('/:id/set-unavailable', authMiddleware, placeController.setPlaceUnavailable);
router.post('/:id/set-available', authMiddleware, placeController.setPlaceAvailable);
router.delete('/:id/unavailable-period/:periodId', authMiddleware, placeController.removeUnavailablePeriod);

module.exports = router;
