const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /bookings
 */
async function getBookings(req, res, next) {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM bookings WHERE user_id = $1';
    const params = [userId];
    let paramCount = 2;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM bookings WHERE user_id = $1';
    if (status) countQuery += ` AND status = $2`;
    const countResult = await db.query(countQuery, status ? [userId, status] : [userId]);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      bookings: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get bookings error', { error: error.message });
    next(error);
  }
}

/**
 * GET /bookings/:id
 */
async function getBookingDetail(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await db.query(
      `SELECT b.*, 
              p.name as place_name, p.address as place_address,
              pb.name as pub_name, pb.address as pub_address
       FROM bookings b
       LEFT JOIN places p ON b.place_id = p.id
       LEFT JOIN pubs pb ON b.pub_id = pb.id
       WHERE b.id = $1 AND b.user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'booking_not_found',
        message: 'Booking not found',
      });
    }

    res.json({
      booking: result.rows[0],
    });
  } catch (error) {
    logger.error('Get booking detail error', { error: error.message });
    next(error);
  }
}

/**
 * POST /bookings
 */
async function createBooking(req, res, next) {
  try {
    const userId = req.user.userId;
    const data = req.validatedBody;

    // Calculate nights
    const checkIn = new Date(data.check_in_date);
    const checkOut = new Date(data.check_out_date);
    const nights = Math.floor((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      return res.status(400).json({
        error: 'invalid_dates',
        message: 'Check-out date must be after check-in date',
      });
    }

    // Get place/pub info for pricing
    let totalPrice = 0;
    if (data.place_id) {
      const placeResult = await db.query(
        'SELECT price_per_night FROM places WHERE id = $1',
        [data.place_id]
      );
      if (placeResult.rows.length > 0) {
        totalPrice = placeResult.rows[0].price_per_night * nights;
      }
    } else if (data.pub_id) {
      const pubResult = await db.query(
        'SELECT price_per_night FROM pubs WHERE id = $1',
        [data.pub_id]
      );
      if (pubResult.rows.length > 0) {
        totalPrice = pubResult.rows[0].price_per_night * nights;
      }
    }

    const result = await db.query(
      `INSERT INTO bookings (user_id, place_id, pub_id, check_in_date, check_out_date,
                             number_of_nights, total_price, van_registration,
                             contact_phone, special_requests)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        data.place_id || null,
        data.pub_id || null,
        data.check_in_date,
        data.check_out_date,
        nights,
        totalPrice,
        data.van_registration || null,
        data.contact_phone || null,
        data.special_requests || null,
      ]
    );

    logger.info('Booking created', { userId, bookingId: result.rows[0].id });

    res.status(201).json({
      booking: result.rows[0],
    });
  } catch (error) {
    logger.error('Create booking error', { error: error.message });
    next(error);
  }
}

/**
 * PATCH /bookings/:id
 */
async function updateBooking(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'missing_field',
        message: 'Status field required',
      });
    }

    // Check ownership
    const bookingResult = await db.query(
      'SELECT user_id FROM bookings WHERE id = $1',
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        error: 'booking_not_found',
        message: 'Booking not found',
      });
    }

    if (bookingResult.rows[0].user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Cannot update other user bookings',
      });
    }

    const result = await db.query(
      'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    logger.info('Booking updated', { userId, bookingId: id, status });

    res.json({
      booking: result.rows[0],
    });
  } catch (error) {
    logger.error('Update booking error', { error: error.message });
    next(error);
  }
}

/**
 * DELETE /bookings/:id
 */
async function deleteBooking(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Check ownership
    const bookingResult = await db.query(
      'SELECT user_id FROM bookings WHERE id = $1',
      [id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        error: 'booking_not_found',
        message: 'Booking not found',
      });
    }

    if (bookingResult.rows[0].user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Cannot delete other user bookings',
      });
    }

    await db.query('DELETE FROM bookings WHERE id = $1', [id]);

    logger.info('Booking deleted', { userId, bookingId: id });

    res.json({
      message: 'Booking deleted successfully',
    });
  } catch (error) {
    logger.error('Delete booking error', { error: error.message });
    next(error);
  }
}

module.exports = {
  getBookings,
  getBookingDetail,
  createBooking,
  updateBooking,
  deleteBooking,
};
