const express = require('express');
const { optionalAuthMiddleware } = require('../middleware/auth');
const { validationMiddleware } = require('../middleware/validation');
const reviewController = require('../controllers/reviewController');

const router = express.Router();

// Get reviews
router.get('/places/:id/reviews', optionalAuthMiddleware, reviewController.getPlaceReviews);
router.get('/pubs/:id/reviews', optionalAuthMiddleware, reviewController.getPubReviews);

// Create/update reviews (protected)
router.post('/places/:id', optionalAuthMiddleware, validationMiddleware('createReview'), reviewController.createPlaceReview);
router.post('/pubs/:id', optionalAuthMiddleware, validationMiddleware('createReview'), reviewController.createPubReview);
router.patch('/:id', optionalAuthMiddleware, reviewController.updateReview);
router.delete('/:id', optionalAuthMiddleware, reviewController.deleteReview);

module.exports = router;
