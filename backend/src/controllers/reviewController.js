const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /places/:id/reviews
 */
async function getPlaceReviews(req, res, next) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT r.*, u.name, u.avatar_url
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.place_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    // Get count
    const countResult = await db.query(
      'SELECT COUNT(*) FROM reviews WHERE place_id = $1',
      [id]
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({
      reviews: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get place reviews error', { error: error.message });
    next(error);
  }
}

/**
 * GET /pubs/:id/reviews
 */
async function getPubReviews(req, res, next) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT r.*, u.name, u.avatar_url
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.pub_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    // Get count
    const countResult = await db.query(
      'SELECT COUNT(*) FROM reviews WHERE pub_id = $1',
      [id]
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({
      reviews: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get pub reviews error', { error: error.message });
    next(error);
  }
}

/**
 * POST /places/:id/reviews
 */
async function createPlaceReview(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const data = req.validatedBody;

    // Check if user has booked this place
    const bookingResult = await db.query(
      'SELECT id FROM bookings WHERE user_id = $1 AND place_id = $2 AND status = $3',
      [userId, id, 'completed']
    );

    if (bookingResult.rows.length === 0) {
      return res.status(403).json({
        error: 'cannot_review',
        message: 'Can only review places you have booked',
      });
    }

    // Check if already reviewed
    const existingReview = await db.query(
      'SELECT id FROM reviews WHERE user_id = $1 AND place_id = $2',
      [userId, id]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({
        error: 'already_reviewed',
        message: 'You have already reviewed this place',
      });
    }

    const result = await db.query(
      `INSERT INTO reviews (user_id, place_id, rating, title, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, id, data.rating, data.title || null, data.comment || null]
    );

    // Update place rating
    await updatePlaceRating(id);

    logger.info('Place review created', { userId, placeId: id });

    res.status(201).json({
      review: result.rows[0],
    });
  } catch (error) {
    logger.error('Create place review error', { error: error.message });
    next(error);
  }
}

/**
 * POST /pubs/:id/reviews
 */
async function createPubReview(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const data = req.validatedBody;

    // Check if user has booked this pub
    const bookingResult = await db.query(
      'SELECT id FROM bookings WHERE user_id = $1 AND pub_id = $2 AND status = $3',
      [userId, id, 'completed']
    );

    if (bookingResult.rows.length === 0) {
      return res.status(403).json({
        error: 'cannot_review',
        message: 'Can only review pubs you have booked',
      });
    }

    // Check if already reviewed
    const existingReview = await db.query(
      'SELECT id FROM reviews WHERE user_id = $1 AND pub_id = $2',
      [userId, id]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({
        error: 'already_reviewed',
        message: 'You have already reviewed this pub',
      });
    }

    const result = await db.query(
      `INSERT INTO reviews (user_id, pub_id, rating, title, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, id, data.rating, data.title || null, data.comment || null]
    );

    // Update pub rating
    await updatePubRating(id);

    logger.info('Pub review created', { userId, pubId: id });

    res.status(201).json({
      review: result.rows[0],
    });
  } catch (error) {
    logger.error('Create pub review error', { error: error.message });
    next(error);
  }
}

/**
 * PATCH /reviews/:id
 */
async function updateReview(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { rating, title, comment } = req.body;

    // Check ownership
    const reviewResult = await db.query(
      'SELECT user_id, place_id, pub_id FROM reviews WHERE id = $1',
      [id]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({
        error: 'review_not_found',
        message: 'Review not found',
      });
    }

    if (reviewResult.rows[0].user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Cannot update other user reviews',
      });
    }

    const result = await db.query(
      `UPDATE reviews
       SET rating = COALESCE($1, rating),
           title = COALESCE($2, title),
           comment = COALESCE($3, comment),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [rating || null, title || null, comment || null, id]
    );

    // Update ratings
    const review = reviewResult.rows[0];
    if (review.place_id) await updatePlaceRating(review.place_id);
    if (review.pub_id) await updatePubRating(review.pub_id);

    logger.info('Review updated', { userId, reviewId: id });

    res.json({
      review: result.rows[0],
    });
  } catch (error) {
    logger.error('Update review error', { error: error.message });
    next(error);
  }
}

/**
 * DELETE /reviews/:id
 */
async function deleteReview(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check ownership
    const reviewResult = await db.query(
      'SELECT user_id, place_id, pub_id FROM reviews WHERE id = $1',
      [id]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({
        error: 'review_not_found',
        message: 'Review not found',
      });
    }

    if (reviewResult.rows[0].user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Cannot delete other user reviews',
      });
    }

    await db.query('DELETE FROM reviews WHERE id = $1', [id]);

    // Update ratings
    const review = reviewResult.rows[0];
    if (review.place_id) await updatePlaceRating(review.place_id);
    if (review.pub_id) await updatePubRating(review.pub_id);

    logger.info('Review deleted', { userId, reviewId: id });

    res.json({
      message: 'Review deleted successfully',
    });
  } catch (error) {
    logger.error('Delete review error', { error: error.message });
    next(error);
  }
}

/**
 * Helper: Update place rating
 */
async function updatePlaceRating(placeId) {
  const result = await db.query(
    `SELECT AVG(rating)::DECIMAL(3,2) as avg_rating, COUNT(*) as count
     FROM reviews WHERE place_id = $1`,
    [placeId]
  );

  const avgRating = result.rows[0].avg_rating;
  const reviewCount = parseInt(result.rows[0].count);

  await db.query(
    'UPDATE places SET rating = $1, review_count = $2 WHERE id = $3',
    [avgRating, reviewCount, placeId]
  );
}

/**
 * Helper: Update pub rating
 */
async function updatePubRating(pubId) {
  const result = await db.query(
    `SELECT AVG(rating)::DECIMAL(3,2) as avg_rating, COUNT(*) as count
     FROM reviews WHERE pub_id = $1`,
    [pubId]
  );

  const avgRating = result.rows[0].avg_rating;
  const reviewCount = parseInt(result.rows[0].count);

  await db.query(
    'UPDATE pubs SET rating = $1, review_count = $2 WHERE id = $3',
    [avgRating, reviewCount, pubId]
  );
}

module.exports = {
  getPlaceReviews,
  getPubReviews,
  createPlaceReview,
  createPubReview,
  updateReview,
  deleteReview,
};
