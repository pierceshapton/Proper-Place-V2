const express = require('express');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { validationMiddleware } = require('../middleware/validation');
const placeController = require('../controllers/placeController');

const router = express.Router();

// Public routes
router.get('/', optionalAuthMiddleware, placeController.getPlaces);
router.get('/:id', optionalAuthMiddleware, placeController.getPlaceDetail);

// Protected routes
router.post('/', authMiddleware, validationMiddleware('createPlace'), placeController.createPlace);
router.patch('/:id', authMiddleware, validationMiddleware('createPlace'), placeController.updatePlace);
router.delete('/:id', authMiddleware, placeController.deletePlace);

module.exports = router;
