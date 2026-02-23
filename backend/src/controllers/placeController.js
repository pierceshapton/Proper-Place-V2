const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /places
 * Returns places that are not indefinitely unavailable.
 * For places with date-range unavailability, includes `isCurrentlyUnavailable` flag.
 */
async function getPlaces(req, res, next) {
  try {
    const { page = 1, limit = 20, approval_status = 'approved', search } = req.query;
    const offset = (page - 1) * limit;

    // Get places that are NOT indefinitely unavailable (status = 'unavailable')
    // COALESCE handles NULL status values (treats them as 'available')
    let query = `
      SELECT p.*, 
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM unavailable_periods up 
            WHERE up.place_id = p.id 
              AND up.start_date <= CURRENT_DATE 
              AND (up.end_date IS NULL OR up.end_date >= CURRENT_DATE)
          ) THEN true 
          ELSE false 
        END as is_currently_unavailable
      FROM places p 
      WHERE p.deleted_at IS NULL 
        AND COALESCE(p.status, 'available') = 'available'
    `;
    const params = [];
    let paramCount = 1;

    if (approval_status) {
      query += ` AND p.approval_status = $${paramCount}`;
      params.push(approval_status);
      paramCount++;
    }

    if (search) {
      query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm);
      paramCount++;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM places WHERE deleted_at IS NULL AND COALESCE(status, 'available') = 'available'`;
    const countParams = [];
    if (approval_status) {
      countQuery += ` AND approval_status = $1`;
      countParams.push(approval_status);
    }
    const countResult = await db.query(countQuery, countParams);
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
              approval_status, status, featured, rating, review_count,
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

    logger.info('Set place unavailable request', { placeId, userId, startDate, endDate, isIndefinite });

    // Verify ownership
    const ownerResult = await db.query(
      'SELECT approval_status, name FROM places WHERE id = $1 AND owner_id = $2',
      [placeId, userId]
    );

    if (ownerResult.rows.length === 0) {
      logger.warn('Place not found or unauthorized', { placeId, userId });
      return res.status(404).json({ message: 'Place not found or unauthorized' });
    }

    const placeApprovalStatus = ownerResult.rows[0].approval_status;
    const placeName = ownerResult.rows[0].name;
    const actualEndDate = isIndefinite ? null : endDate;

    // DIFFERENT BEHAVIOR based on indefinite vs date range:
    // - Indefinite: Set status = 'unavailable' → hidden from map completely
    // - Date range: Keep status = 'available' → still shows on map, marked as "no space available" during that period
    
    if (isIndefinite) {
      // Set status to unavailable - this hides the place from the map
      await db.query(
        'UPDATE places SET status = $1, updated_at = NOW() WHERE id = $2',
        ['unavailable', placeId]
      );
      logger.info('Place set to unavailable (indefinite)', { placeId, placeName });
    }
    // For date range, we DON'T change status - place stays available but has an unavailable period

    // Create unavailable period record
    const unavailableResult = await db.query(
      `INSERT INTO unavailable_periods (place_id, start_date, end_date, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING id, start_date, end_date`,
      [placeId, startDate, actualEndDate, isIndefinite ? 'Host set unavailable indefinitely' : 'Host set unavailable for date range']
    );

    // If the place is approved, refund all affected bookings that haven't checked in
    let refundedBookings = 0;
    let totalRefunded = 0;
    
    if (placeApprovalStatus === 'approved') {
      // For indefinite: cancel ALL future bookings
      // For date range: cancel only bookings within the date range
      let refundQuery;
      let queryParams;
      
      if (isIndefinite) {
        refundQuery = `
          UPDATE bookings 
          SET status = 'Cancelled', updated_at = NOW()
          WHERE place_id = $1
            AND status IN ('Pending', 'Confirmed')
            AND check_in_date >= $2
          RETURNING id, user_id, total_price
        `;
        queryParams = [placeId, startDate];
      } else {
        refundQuery = `
          UPDATE bookings 
          SET status = 'Cancelled', updated_at = NOW()
          WHERE place_id = $1
            AND status IN ('Pending', 'Confirmed')
            AND check_in_date >= $2
            AND check_in_date <= $3
          RETURNING id, user_id, total_price
        `;
        queryParams = [placeId, startDate, endDate];
      }

      const affectedBookings = await db.query(refundQuery, queryParams);
      refundedBookings = affectedBookings.rows.length;
      totalRefunded = affectedBookings.rows.reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);

      logger.info('Bookings cancelled and to be refunded', {
        placeId,
        bookingCount: refundedBookings,
        totalRefund: totalRefunded,
      });
    }

    const message = isIndefinite 
      ? 'Place set unavailable indefinitely. It will be hidden from the map.'
      : `Place will show as unavailable from ${startDate} to ${endDate}. It will still appear on the map but marked as no space available.`;

    res.json({
      message,
      unavailablePeriod: unavailableResult.rows[0],
      refundedBookings,
      totalRefunded,
      placeStatus: isIndefinite ? 'unavailable' : 'available',
      isIndefinite,
    });
  } catch (error) {
    logger.error('Set place unavailable error', { error: error.message, stack: error.stack });
    next(error);
  }
}

/**
 * POST /places/:id/set-available
 * Restores a place from indefinite unavailability back to available
 */
async function setPlaceAvailable(req, res, next) {
  try {
    const { id: placeId } = req.params;
    const userId = req.user.userId;

    logger.info('Set place available request', { placeId, userId });

    // Verify ownership
    const ownerResult = await db.query(
      'SELECT status, name FROM places WHERE id = $1 AND owner_id = $2',
      [placeId, userId]
    );

    if (ownerResult.rows.length === 0) {
      logger.warn('Place not found or unauthorized', { placeId, userId });
      return res.status(404).json({ message: 'Place not found or unauthorized' });
    }

    const currentStatus = ownerResult.rows[0].status;
    const placeName = ownerResult.rows[0].name;

    if (currentStatus === 'available') {
      return res.json({ message: 'Place is already available', placeStatus: 'available' });
    }

    // Set status back to available
    await db.query(
      'UPDATE places SET status = $1, updated_at = NOW() WHERE id = $2',
      ['available', placeId]
    );

    // Remove indefinite unavailable periods (those with NULL end_date)
    await db.query(
      'DELETE FROM unavailable_periods WHERE place_id = $1 AND end_date IS NULL',
      [placeId]
    );

    logger.info('Place restored to available', { placeId, placeName });

    res.json({
      message: 'Place is now available and visible on the map again.',
      placeStatus: 'available',
    });
  } catch (error) {
    logger.error('Set place available error', { error: error.message, stack: error.stack });
    next(error);
  }
}

/**
 * DELETE /places/:id/unavailable-period/:periodId
 * Removes a specific unavailable period (for date-range unavailability)
 */
async function removeUnavailablePeriod(req, res, next) {
  try {
    const { id: placeId, periodId } = req.params;
    const userId = req.user.userId;

    logger.info('Remove unavailable period request', { placeId, periodId, userId });

    // Verify ownership
    const ownerResult = await db.query(
      'SELECT id FROM places WHERE id = $1 AND owner_id = $2',
      [placeId, userId]
    );

    if (ownerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Place not found or unauthorized' });
    }

    // Delete the specific unavailable period
    const deleteResult = await db.query(
      'DELETE FROM unavailable_periods WHERE id = $1 AND place_id = $2 RETURNING *',
      [periodId, placeId]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ message: 'Unavailable period not found' });
    }

    logger.info('Unavailable period removed', { placeId, periodId });

    res.json({
      message: 'Unavailable period removed. The place is now available for those dates.',
      removedPeriod: deleteResult.rows[0],
    });
  } catch (error) {
    logger.error('Remove unavailable period error', { error: error.message });
    next(error);
  }
}

/**
 * GET /places/admin/pending
 * Get all pending places for admin moderation (admin only)
 */
async function getPendingPlaces(req, res, next) {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'access_denied',
        message: 'Admin access required',
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get pending places with host info and their total site count
    const result = await db.query(
      `SELECT p.*, 
              u.name as host_name, 
              u.email as host_email,
              u.created_at as host_joined_at,
              (SELECT COUNT(*) FROM places WHERE owner_id = p.owner_id AND deleted_at IS NULL) as host_total_sites,
              (SELECT COUNT(*) FROM places WHERE owner_id = p.owner_id AND approval_status = 'approved' AND deleted_at IS NULL) as host_approved_sites
       FROM places p
       JOIN users u ON p.owner_id = u.id
       WHERE p.approval_status = 'pending' 
       AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM places 
       WHERE approval_status = 'pending' 
       AND deleted_at IS NULL`
    );
    const total = parseInt(countResult.rows[0].count);

    logger.info('Fetched pending places', { count: result.rows.length, total });

    res.json({
      message: 'Pending places retrieved successfully',
      places: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get pending places error', { error: error.message });
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
  setPlaceAvailable,
  removeUnavailablePeriod,
  getPendingPlaces,
};
