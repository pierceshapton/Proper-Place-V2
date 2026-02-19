const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /places
 */
async function getPlaces(req, res, next) {
  try {
    const { page = 1, limit = 20, approval_status = 'approved', search } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM places WHERE deleted_at IS NULL';
    const params = [];
    let paramCount = 1;

    if (approval_status) {
      query += ` AND approval_status = $${paramCount}`;
      params.push(approval_status);
      paramCount++;
    }

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM places WHERE deleted_at IS NULL';
    if (approval_status) countQuery += ` AND approval_status = $1`;
    const countResult = await db.query(countQuery, approval_status ? [approval_status] : []);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      places: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get places error', { error: error.message });
    next(error);
  }
}

/**
 * GET /places/:id
 */
async function getPlaceDetail(req, res, next) {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM places WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'place_not_found',
        message: 'Place not found',
      });
    }

    res.json({
      place: result.rows[0],
    });
  } catch (error) {
    logger.error('Get place detail error', { error: error.message });
    next(error);
  }
}

/**
 * POST /places
 */
async function createPlace(req, res, next) {
  try {
    const userId = req.user.userId;
    const data = req.validatedBody;

    const result = await db.query(
      `INSERT INTO places (owner_id, name, description, address, city, country,
                           postal_code, latitude, longitude, price_per_night,
                           capacity, amenities, place_type, opening_hours, 
                           kitchen_hours, food_menu_description, serves_food, 
                           business_description, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        userId,
        data.name,
        data.description || null,
        data.address,
        data.city,
        data.country,
        data.postal_code || null,
        data.latitude,
        data.longitude,
        data.price_per_night || null,
        data.capacity || null,
        data.amenities || null,
        data.place_type || 'private_land',
        data.opening_hours || null,
        data.kitchen_hours || null,
        data.food_menu_description || null,
        data.serves_food || false,
        data.business_description || null,
        data.approval_status || 'pending',
      ]
    );

    logger.info('Place created', { userId, placeId: result.rows[0].id });

    res.status(201).json({
      place: result.rows[0],
    });
  } catch (error) {
    logger.error('Create place error', { error: error.message });
    next(error);
  }
}

/**
 * PATCH /places/:id
 */
async function updatePlace(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const data = req.validatedBody;

    // Check ownership
    const ownerResult = await db.query(
      'SELECT owner_id FROM places WHERE id = $1',
      [id]
    );

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({
        error: 'place_not_found',
        message: 'Place not found',
      });
    }

    if (ownerResult.rows[0].owner_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Cannot update other user places',
      });
    }

    // Build dynamic UPDATE
    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'description', 'address', 'city', 'country', 'postal_code',
      'latitude', 'longitude', 'price_per_night', 'capacity', 'amenities',
      'place_type', 'opening_hours', 'kitchen_hours', 'food_menu_description', 
      'serves_food', 'business_description',
    ];

    for (const field of allowedFields) {
      if (field in data) {
        fields.push(`${field} = $${paramCount}`);
        values.push(data[field]);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({
        error: 'no_updates',
        message: 'No fields to update',
      });
    }

    values.push(id);

    const query = `
      UPDATE places
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);

    logger.info('Place updated', { userId, placeId: id });

    res.json({
      place: result.rows[0],
    });
  } catch (error) {
    logger.error('Update place error', { error: error.message });
    next(error);
  }
}

/**
 * DELETE /places/:id
 */
async function deletePlace(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check ownership
    const ownerResult = await db.query(
      'SELECT owner_id FROM places WHERE id = $1',
      [id]
    );

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({
        error: 'place_not_found',
        message: 'Place not found',
      });
    }

    if (ownerResult.rows[0].owner_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Cannot delete other user places',
      });
    }

    // Soft delete
    await db.query(
      'UPDATE places SET deleted_at = NOW() WHERE id = $1',
      [id]
    );

    logger.info('Place deleted', { userId, placeId: id });

    res.json({
      message: 'Place deleted successfully',
    });
  } catch (error) {
    logger.error('Delete place error', { error: error.message });
    next(error);
  }
}

/**
 * GET /places/host/my-places
 * Returns all places owned by the current user (including drafts)
 */
async function getHostPlaces(req, res, next) {
  try {
    const userId = req.user.userId;

    const result = await db.query(
      `SELECT id, owner_id, name, description, address, city, country, postal_code,
              latitude, longitude, price_per_night, capacity, amenities,
              image_urls as images, 
              COALESCE(business_image_urls, ARRAY[]::TEXT[]) as business_images,
              approval_status, featured, rating, review_count,
              place_type, opening_hours, kitchen_hours, food_menu_description,
              serves_food, created_at, updated_at
       FROM places 
       WHERE owner_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [userId]
    );

    logger.info('Host places fetched', { userId, count: result.rows.length });

    res.json({
      places: result.rows,
    });
  } catch (error) {
    logger.error('Get host places error', { error: error.message });
    next(error);
  }
}

/**
 * POST /places/:id/set-unavailable
 * Set a place unavailable for a date range (or indefinitely)
 * If the place is approved, automatically refund all affected bookings
 */
async function setPlaceUnavailable(req, res, next) {
  try {
    const { id: placeId } = req.params;
    const { startDate, endDate, isIndefinite } = req.body;
    const userId = req.user.userId;

    // Verify ownership
    const ownerResult = await db.query(
      'SELECT approval_status FROM places WHERE id = $1 AND owner_id = $2',
      [placeId, userId]
    );

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Place not found or unauthorized' });
    }

    const placeStatus = ownerResult.rows[0].approval_status;
    const actualEndDate = isIndefinite ? null : endDate;

    // Create unavailable period
    const unavailableResult = await db.query(
      `INSERT INTO unavailable_periods (place_id, start_date, end_date, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING id, start_date, end_date`,
      [placeId, startDate, actualEndDate, 'Host set unavailable']
    );

    // If the place is approved, refund all affected bookings that haven't checked in
    if (placeStatus === 'approved') {
      const refundQuery = `
        UPDATE bookings 
        SET status = 'Cancelled', updated_at = NOW()
        WHERE place_id = $1
          AND status IN ('Pending', 'Confirmed')
          AND check_in_date >= $2
          AND check_in_date <= COALESCE($3, check_in_date)
        RETURNING id, user_id, total_price
      `;

      const affectedBookings = await db.query(
        refundQuery,
        [placeId, startDate, actualEndDate]
      );

      // In a real-world scenario, you would process refunds here (Stripe, PayPal, etc.)
      logger.info('Bookings cancelled and to be refunded', {
        placeId,
        bookingCount: affectedBookings.rows.length,
        totalRefund: affectedBookings.rows.reduce((sum, b) => sum + parseFloat(b.total_price), 0),
      });

      res.json({
        message: 'Place set unavailable. Affected bookings have been cancelled.',
        unavailablePeriod: unavailableResult.rows[0],
        refundedBookings: affectedBookings.rows.length,
        totalRefunded: affectedBookings.rows.reduce((sum, b) => sum + parseFloat(b.total_price), 0),
      });
    } else {
      res.json({
        message: 'Place set unavailable.',
        unavailablePeriod: unavailableResult.rows[0],
      });
    }
  } catch (error) {
    logger.error('Set place unavailable error', { error: error.message });
    next(error);
  }
}

module.exports = {
  getPlaces,
  getPlaceDetail,
  createPlace,
  updatePlace,
  deletePlace,
  getHostPlaces,
  setPlaceUnavailable,
};
