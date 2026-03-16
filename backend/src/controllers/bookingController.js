const db = require('../config/database');
const logger = require('../utils/logger');
const pushService = require('../services/pushNotificationService');

/**
 * Auto-complete bookings that have passed checkout at midday
 */
async function autoCompleteBookings() {
  try {
    const now = new Date();
    
    // Find bookings past their checkout date at 12:00 PM (noon)
    const result = await db.query(
      `UPDATE bookings 
       SET status = 'Completed', updated_at = NOW()
       WHERE status != 'Cancelled' 
         AND status != 'Completed'
         AND check_out_date < $1
       RETURNING id, status`,
      [now]
    );
    
    if (result.rows.length > 0) {
      logger.info('Auto-completed bookings', { count: result.rows.length, ids: result.rows.map(r => r.id) });
    }
    
    return result.rows;
  } catch (error) {
    logger.error('Auto-complete bookings error', { error: error.message });
  }
}

/**
 * GET /bookings
 */
async function getBookings(req, res, next) {
  try {
    // Auto-complete bookings first
    await autoCompleteBookings();
    
    const userId = req.user.userId;
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT b.*, p.owner_id as host_id, u_host.name as host_name FROM bookings b LEFT JOIN places p ON b.place_id = p.id LEFT JOIN users u_host ON p.owner_id = u_host.id WHERE b.user_id = $1';
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

    // Default times to 12:00 (midday)
    const checkInTime = data.check_in_time || '12:00';
    const checkOutTime = data.check_out_time || '12:00';
    
    // Calculate early check-in and late check-out fees
    // Early check-in is before 12:00, late check-out is after 12:00
    let earlyCheckinFee = 0;
    let lateCheckoutFee = 0;
    
    // Parse times for fee calculation
    const [checkInHour] = checkInTime.split(':').map(Number);
    const [checkOutHour] = checkOutTime.split(':').map(Number);
    
    // Fee rate: £5 per hour deviation from midday
    const hourlyFeeRate = 5;
    
    if (checkInHour < 12) {
      // Early check-in fee
      earlyCheckinFee = (12 - checkInHour) * hourlyFeeRate;
    }
    
    if (checkOutHour > 12) {
      // Late check-out fee
      lateCheckoutFee = (checkOutHour - 12) * hourlyFeeRate;
    }

    // Get place/pub info for pricing
    let basePrice = 0;
    if (data.place_id) {
      const placeResult = await db.query(
        'SELECT price_per_night FROM places WHERE id = $1',
        [data.place_id]
      );
      if (placeResult.rows.length > 0) {
        basePrice = placeResult.rows[0].price_per_night * nights;
      }
    } else if (data.pub_id) {
      const pubResult = await db.query(
        'SELECT price_per_night FROM pubs WHERE id = $1',
        [data.pub_id]
      );
      if (pubResult.rows.length > 0) {
        basePrice = pubResult.rows[0].price_per_night * nights;
      }
    }
    
    // Total price includes base price + time-based fees
    const totalPrice = basePrice + earlyCheckinFee + lateCheckoutFee;

    const result = await db.query(
      `INSERT INTO bookings (user_id, place_id, pub_id, check_in_date, check_out_date,
                             check_in_time, check_out_time,
                             number_of_nights, total_price, status,
                             early_checkin_fee, late_checkout_fee,
                             van_registration, contact_phone, special_requests)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        userId,
        data.place_id || null,
        data.pub_id || null,
        data.check_in_date,
        data.check_out_date,
        checkInTime,
        checkOutTime,
        nights,
        totalPrice,
        'confirmed',
        earlyCheckinFee,
        lateCheckoutFee,
        data.van_registration || null,
        data.contact_phone || null,
        data.special_requests || null,
      ]
    );

    logger.info('Booking created', { userId, bookingId: result.rows[0].id });

    // Notify host about the new booking (fire-and-forget)
    if (data.place_id) {
      setImmediate(async () => {
        try {
          const placeRes = await db.query('SELECT name, owner_id FROM places WHERE id = $1', [data.place_id]);
          const userRes = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
          if (placeRes.rows[0]?.owner_id) {
            await pushService.notifyNewBooking(
              placeRes.rows[0].owner_id,
              userRes.rows[0]?.name || 'A guest',
              placeRes.rows[0].name,
              result.rows[0].id
            );
          }
        } catch (e) { /* ignore push errors */ }
      });
    }

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

    // Notify booking owner about status change (fire-and-forget)
    const booking = result.rows[0];
    setImmediate(async () => {
      try {
        const placeRes = await db.query('SELECT name FROM places WHERE id = $1', [booking.place_id]);
        await pushService.notifyBookingUpdate(booking.user_id, placeRes.rows[0]?.name || 'a site', status);
      } catch (e) { /* ignore push errors */ }
    });

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

/**
 * GET /bookings/place/:placeId
 * Get all bookings for a specific place (for availability checking)
 */
async function getPlaceBookings(req, res, next) {
  try {
    const { placeId } = req.params;
    const { from_date, to_date } = req.query;
    
    let query = `
      SELECT id, check_in_date, check_out_date, 
             COALESCE(check_in_time, '12:00:00') as check_in_time,
             COALESCE(check_out_time, '12:00:00') as check_out_time,
             status
      FROM bookings 
      WHERE place_id = $1 
        AND status NOT IN ('cancelled', 'Cancelled')
    `;
    const params = [placeId];
    let paramCount = 2;
    
    // Filter by date range if provided
    if (from_date) {
      query += ` AND check_out_date >= $${paramCount}`;
      params.push(from_date);
      paramCount++;
    }
    if (to_date) {
      query += ` AND check_in_date <= $${paramCount}`;
      params.push(to_date);
      paramCount++;
    }
    
    query += ' ORDER BY check_in_date ASC';
    
    const result = await db.query(query, params);
    
    res.json({
      bookings: result.rows,
    });
  } catch (error) {
    logger.error('Get place bookings error', { error: error.message });
    next(error);
  }
}

/**
 * GET /availability/place/:placeId
 * Get place availability data - capacity and available spaces per date for booking calendar
 * Query params: from_date (YYYY-MM-DD), to_date (YYYY-MM-DD), num_days (default 365)
 */
async function getPlaceAvailability(req, res, next) {
  try {
    const { placeId } = req.params;
    const { from_date, to_date, num_days = 365 } = req.query;

    // Get place capacity
    const placeResult = await db.query(
      'SELECT id, capacity, name FROM places WHERE id = $1 AND deleted_at IS NULL',
      [placeId]
    );

    if (placeResult.rows.length === 0) {
      return res.status(404).json({
        error: 'place_not_found',
        message: 'Place not found',
      });
    }

    const place = placeResult.rows[0];
    const capacity = place.capacity || 1;

    // Determine date range
    const startDate = from_date ? new Date(from_date) : new Date();
    const endDate = to_date
      ? new Date(to_date)
      : new Date(new Date(startDate).setDate(startDate.getDate() + parseInt(num_days)));

    // Get all bookings in date range (only count confirmed/completed bookings)
    const bookingsResult = await db.query(
      `SELECT check_in_date, check_out_date, status
       FROM bookings 
       WHERE place_id = $1 
         AND status IN ('confirmed', 'Completed')
         AND check_out_date > $2
         AND check_in_date <= $3
       ORDER BY check_in_date ASC`,
      [placeId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );
    
    logger.info('Place availability query', {
      placeId,
      capacity,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      bookingsFound: bookingsResult.rows.length,
      bookings: bookingsResult.rows
    });

    // Calculate availability for each date
    const availability = {};
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Count how many bookings cover this date
      let bookedCount = 0;
      for (const booking of bookingsResult.rows) {
        // Use string comparison to avoid timezone issues
        const checkInStr = booking.check_in_date.toString().split('T')[0];
        const checkOutStr = booking.check_out_date.toString().split('T')[0];

        // A date is occupied if it falls within the booking range
        // (check_in <= date < check_out)
        if (dateStr >= checkInStr && dateStr < checkOutStr) {
          bookedCount++;
          logger.info('Date occupied by booking', { dateStr, checkInStr, checkOutStr, bookedCount });
        }
      }

      const availableSpaces = Math.max(0, capacity - bookedCount);
      const isFull = availableSpaces === 0;

      availability[dateStr] = {
        date: dateStr,
        capacity,
        booked: bookedCount,
        available: availableSpaces,
        isFull,
      };
      
      logger.info('Date availability calculated', { dateStr, capacity, booked: bookedCount, available: availableSpaces, isFull });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      place: {
        id: place.id,
        name: place.name,
        capacity,
      },
      availability,
    });
  } catch (error) {
    logger.error('Get place availability error', { error: error.message });
    next(error);
  }
}

/**
 * GET /bookings/host/my-bookings - Get all bookings for the current host's places
 */
async function getHostBookings(req, res, next) {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    await autoCompleteBookings();

    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;

    // Admin in host mode sees all bookings; regular hosts see only their places' bookings
    const isAdmin = userRole === 'admin';

    let query = `
      SELECT b.*,
             u.name as guest_name, u.email as guest_email,
             p.name as place_name, p.address as place_address,
             p.owner_id as host_id, u_host.name as host_name
      FROM bookings b
      JOIN places p ON b.place_id = p.id
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN users u_host ON p.owner_id = u_host.id
    `;
    const params = [];
    let paramCount = 1;

    if (!isAdmin) {
      query += ` WHERE p.owner_id = $${paramCount}`;
      params.push(userId);
      paramCount++;
    } else {
      query += ' WHERE 1=1';
    }

    if (status) {
      query += ` AND b.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    let countQuery = isAdmin
      ? 'SELECT COUNT(*) FROM bookings'
      : 'SELECT COUNT(*) FROM bookings b JOIN places p ON b.place_id = p.id WHERE p.owner_id = $1';
    const countParams = isAdmin ? [] : [userId];
    if (status) {
      countQuery += isAdmin
        ? ` WHERE status = $1`
        : ` AND b.status = $2`;
      countParams.push(status);
    }
    const countResult = await db.query(countQuery, countParams);
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
    logger.error('Get host bookings error', { error: error.message });
    next(error);
  }
}

/**
 * GET /bookings/all - Admin only: get all bookings system-wide
 */
async function getAllBookings(req, res, next) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden', message: 'Admin access required' });
    }

    await autoCompleteBookings();

    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT b.*, 
             u.name as guest_name, u.email as guest_email,
             p.name as place_name, p.address as place_address,
             p.owner_id as host_id, u_host.name as host_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN places p ON b.place_id = p.id
      LEFT JOIN users u_host ON p.owner_id = u_host.id
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` WHERE b.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    let countQuery = 'SELECT COUNT(*) FROM bookings';
    if (status) countQuery += ` WHERE status = $1`;
    const countResult = await db.query(countQuery, status ? [status] : []);
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
    logger.error('Get all bookings error', { error: error.message });
    next(error);
  }
}

module.exports = {
  getBookings,
  getBookingDetail,
  createBooking,
  updateBooking,
  deleteBooking,
  autoCompleteBookings,
  getPlaceBookings,
  getPlaceAvailability,
  getAllBookings,
  getHostBookings,
};
