const db = require('../config/database');
const logger = require('../utils/logger');
const pushService = require('../services/pushNotificationService');
const autoMessageController = require('./autoMessageController');
const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51SVJ2DCGmQVz0gpF9CcIAr4tsMN3LKFicySXcKQWB378Mi4BVrUI2UstMGxHzR8vomIV1EJ9fMLz7xiAkQDEqJzp00wfNviq5a');

/**
 * Generate a unique booking reference: PP-YYMMDD-XXXX
 * PP = Proper Place, YYMMDD = date, XXXX = 4-char alphanumeric
 */
async function generateBookingRef() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePrefix = `PP-${yy}${mm}${dd}-`;

  // Try up to 10 times to generate a unique ref
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = crypto.randomBytes(2).toString('hex').toUpperCase(); // 4 hex chars
    const ref = `${datePrefix}${suffix}`;
    const existing = await db.query('SELECT id FROM bookings WHERE booking_ref = $1', [ref]);
    if (existing.rows.length === 0) return ref;
  }
  // Fallback: use timestamp-based suffix
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  return `${datePrefix}${ts}`;
}

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
       WHERE status NOT IN ('cancelled', 'Cancelled', 'Completed')
         AND check_out_date < $1
       RETURNING id, status, charge_id, transfer_id, host_payout_status, place_id, total_price, booking_ref`,
      [now]
    );
    
    if (result.rows.length > 0) {
      logger.info('Auto-completed bookings', { count: result.rows.length, ids: result.rows.map(r => r.id) });

      // Trigger host payouts for completed bookings that have a captured charge but no transfer yet
      for (const booking of result.rows) {
        if (booking.charge_id && !booking.transfer_id && booking.host_payout_status !== 'paid') {
          setImmediate(async () => {
            try {
              await transferToHost(booking.id);
            } catch (e) {
              logger.error('Auto-payout failed for completed booking', { bookingId: booking.id, error: e.message });
            }
          });
        }
      }
    }
    
    return result.rows;
  } catch (error) {
    logger.error('Auto-complete bookings error', { error: error.message });
  }
}

/**
 * Transfer captured funds to host after booking completion.
 * Called automatically when a booking is auto-completed.
 */
async function transferToHost(bookingId) {
  const bookingRes = await db.query(
    `SELECT b.*, p.owner_id, u.stripe_account_id
     FROM bookings b
     JOIN places p ON p.id = b.place_id
     JOIN users u ON u.id = p.owner_id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (bookingRes.rows.length === 0) return;
  const booking = bookingRes.rows[0];

  if (!booking.stripe_account_id) {
    logger.warn('Host payout skipped: no Stripe Connect account', { bookingId, hostId: booking.owner_id });
    await db.query(
      `UPDATE bookings SET host_payout_status = 'awaiting_connect', updated_at = NOW() WHERE id = $1`,
      [bookingId]
    );
    return;
  }

  if (booking.transfer_id || booking.host_payout_status === 'paid') return;
  if (!booking.charge_id) {
    logger.warn('Host payout skipped: no charge_id', { bookingId });
    return;
  }

  // 15% platform commission
  const totalPence = Math.round(parseFloat(booking.total_price) * 100);
  const platformFee = Math.round(totalPence * 0.15);
  const hostPayout = totalPence - platformFee;

  const transfer = await stripe.transfers.create({
    amount: hostPayout,
    currency: 'gbp',
    destination: booking.stripe_account_id,
    source_transaction: booking.charge_id,
    description: `Booking ${booking.booking_ref || booking.id} payout`,
    metadata: {
      booking_id: String(booking.id),
      booking_ref: booking.booking_ref || '',
      platform_fee: String(platformFee),
    },
  });

  await db.query(
    `UPDATE bookings SET transfer_id = $1, host_payout_status = 'paid', updated_at = NOW() WHERE id = $2`,
    [transfer.id, booking.id]
  );

  logger.info('Host payout transferred', { bookingId, transferId: transfer.id, hostPayout, platformFee });

  // Notify host
  try {
    await pushService.sendToUser(booking.owner_id, 'Payout Sent!',
      `£${(hostPayout / 100).toFixed(2)} has been sent to your account for booking ${booking.booking_ref || booking.id}.`,
      { type: 'payout', booking_id: String(booking.id) });
  } catch (e) { /* ignore push errors */ }
}

/**
 * Cancel expired payment authorizations.
 * Stripe holds expire after 7 days. This cancels bookings where the host
 * hasn't responded within 7 days and the auth is about to expire.
 */
async function cancelExpiredAuthorizations() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find pending bookings with payment authorizations older than 7 days
    const result = await db.query(
      `SELECT b.id, b.payment_intent_id, b.user_id, b.payment_authorized_at,
              p.name AS place_name, p.owner_id
       FROM bookings b
       LEFT JOIN places p ON p.id = b.place_id
       WHERE b.status = 'pending'
         AND b.payment_intent_id IS NOT NULL
         AND (
           (b.payment_authorized_at IS NOT NULL AND b.payment_authorized_at < $1)
           OR (b.payment_authorized_at IS NULL AND b.created_at < $1)
         )`,
      [sevenDaysAgo]
    );

    if (result.rows.length === 0) return;

    logger.info('Found expired authorizations to cancel', { count: result.rows.length });

    for (const booking of result.rows) {
      try {
        // Cancel the Stripe hold
        await stripe.paymentIntents.cancel(booking.payment_intent_id);
        logger.info('Expired auth cancelled', { bookingId: booking.id, paymentIntentId: booking.payment_intent_id });
      } catch (stripeErr) {
        // If it's already cancelled/expired, that's fine
        logger.warn('Stripe cancel for expired auth failed (may already be expired)', {
          bookingId: booking.id, error: stripeErr.message,
        });
      }

      // Mark booking as cancelled
      await db.query(
        `UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
        [booking.id]
      );

      // Notify guest
      try {
        await pushService.sendToUser(booking.user_id, 'Booking Expired',
          `Your booking at ${booking.place_name || 'a site'} expired because the host didn't respond in time. Your card hold has been released.`,
          { type: 'booking_update', status: 'expired' });
      } catch (e) { /* ignore */ }

      // Notify host
      if (booking.owner_id) {
        try {
          await pushService.sendToUser(booking.owner_id, 'Booking Expired',
            `A booking at ${booking.place_name || 'your site'} expired because it wasn't reviewed within 7 days.`,
            { type: 'booking_update', status: 'expired' });
        } catch (e) { /* ignore */ }
      }
    }

    logger.info('Expired authorizations processed', { count: result.rows.length });
  } catch (error) {
    logger.error('Cancel expired authorizations error', { error: error.message });
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
              p.name as place_name, p.address as place_address, p.user_id as place_user_id,
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

    // Check if user already has an active booking for overlapping dates (any place)
    const userOverlapResult = await db.query(
      `SELECT id, booking_ref, check_in_date, check_out_date, place_id, pub_id
       FROM bookings
       WHERE user_id = $1
         AND status NOT IN ('cancelled', 'Cancelled')
         AND check_in_date <= $3
         AND check_out_date >= $2`,
      [userId, data.check_in_date, data.check_out_date]
    );

    if (userOverlapResult.rows.length > 0) {
      const existing = userOverlapResult.rows[0];
      const isSamePlace = (data.place_id && existing.place_id == data.place_id) ||
                          (data.pub_id && existing.pub_id == data.pub_id);
      const msg = isSamePlace
        ? 'You already have an active booking at this site for those dates.'
        : 'You already have a booking for overlapping dates. You can only have one booking at a time.';
      return res.status(409).json({
        error: 'duplicate_booking',
        message: msg,
        existing_booking_ref: existing.booking_ref,
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

    // Check capacity – ensure no night in the requested range exceeds the site's capacity
    const targetId = data.place_id || data.pub_id;
    const targetColumn = data.place_id ? 'place_id' : 'pub_id';
    const targetTable = data.place_id ? 'places' : 'pubs';
    if (targetId) {
      // Get site capacity (default 1)
      const capResult = await db.query(
        `SELECT capacity FROM ${targetTable} WHERE id = $1`,
        [targetId]
      );
      const capacity = (capResult.rows.length > 0 && capResult.rows[0].capacity) || 1;

      // Get all overlapping bookings for this site
      const overlapResult = await db.query(
        `SELECT check_in_date, check_out_date FROM bookings
         WHERE ${targetColumn} = $1
           AND status NOT IN ('cancelled', 'Cancelled')
           AND check_in_date < $3
           AND check_out_date > $2`,
        [targetId, data.check_in_date, data.check_out_date]
      );

      // For each night in the requested range, count existing bookings
      const reqCheckIn = new Date(data.check_in_date);
      const reqCheckOut = new Date(data.check_out_date);
      const night = new Date(reqCheckIn);
      night.setHours(0, 0, 0, 0);

      while (night < reqCheckOut) {
        const nightStr = night.toISOString().split('T')[0];
        let count = 0;
        for (const b of overlapResult.rows) {
          const bIn = b.check_in_date.toString().split('T')[0];
          const bOut = b.check_out_date.toString().split('T')[0];
          if (nightStr >= bIn && nightStr < bOut) {
            count++;
          }
        }
        if (count >= capacity) {
          return res.status(409).json({
            error: 'dates_unavailable',
            message: `This site is fully booked on ${nightStr}. Please choose different dates.`,
          });
        }
        night.setDate(night.getDate() + 1);
      }
    }

    // Generate unique booking reference
    const bookingRef = await generateBookingRef();

    const result = await db.query(
      `INSERT INTO bookings (user_id, place_id, pub_id, check_in_date, check_out_date,
                             check_in_time, check_out_time,
                             number_of_nights, total_price, status,
                             early_checkin_fee, late_checkout_fee,
                             van_registration, contact_phone, special_requests, host_seen, booking_ref, payment_intent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, false, $16, $17)
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
        'pending',
        earlyCheckinFee,
        lateCheckoutFee,
        data.van_registration || null,
        data.contact_phone || null,
        data.special_requests || null,
        bookingRef,
        data.payment_intent_id || null,
      ]
    );

    logger.info('Booking created', { userId, bookingId: result.rows[0].id });

    // Notify host about the new booking request (fire-and-forget)
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

    // Notify guest that their booking is pending approval
    if (data.place_id) {
      setImmediate(async () => {
        try {
          const placeRes = await db.query('SELECT name FROM places WHERE id = $1', [data.place_id]);
          await pushService.sendToUser(userId, 'Booking Submitted', `Your booking at ${placeRes.rows[0]?.name || 'a site'} is pending host approval. The host has 7 days to respond — if they don't, the hold on your card will be released and no payment will be taken.`, {
            type: 'booking_update',
            status: 'pending',
          });
        } catch (e) { /* ignore push errors */ }
      });
    }

    // Send auto-messages for new booking (fire-and-forget)
    if (data.place_id) {
      setImmediate(async () => {
        try {
          await autoMessageController.sendOnBookingMessages(result.rows[0].id, data.place_id, userId);
        } catch (e) { /* ignore auto-message errors */ }
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
             p.owner_id as host_id, u_host.name as host_name,
             ur_avg.average_rating as guest_avg_rating,
             ur_avg.review_count as guest_review_count,
             CASE WHEN ur_booking.id IS NOT NULL THEN true ELSE false END as guest_reviewed
      FROM bookings b
      JOIN places p ON b.place_id = p.id
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN users u_host ON p.owner_id = u_host.id
      LEFT JOIN LATERAL (
        SELECT ROUND(AVG(rating)::numeric, 1) as average_rating, COUNT(*) as review_count
        FROM user_reviews WHERE reviewed_user_id = b.user_id
      ) ur_avg ON true
      LEFT JOIN user_reviews ur_booking ON ur_booking.booking_id = b.id
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

/**
 * PUT /bookings/host/mark-seen
 * Mark all bookings for host's places as seen
 */
async function markBookingsSeen(req, res, next) {
  try {
    const userId = req.user.userId;

    const result = await db.query(
      `UPDATE bookings b
       SET host_seen = true
       FROM places p
       WHERE b.place_id = p.id AND p.owner_id = $1 AND (b.host_seen = false OR b.host_seen IS NULL)
       RETURNING b.id`,
      [userId]
    );

    logger.info('Bookings marked as seen', { userId, count: result.rows.length });
    return res.json({ message: 'Bookings marked as seen', count: result.rows.length });
  } catch (error) {
    logger.error('Error marking bookings as seen', { error: error.message });
    next(error);
  }
}

/**
 * GET /bookings/search?q=...
 * Admin only: search bookings by reference, guest name, guest email, or place name
 */
async function searchBookings(req, res, next) {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden', message: 'Admin access required' });
    }

    const { q, page = 1, limit = 20 } = req.query;
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'missing_query', message: 'Search query is required' });
    }

    const searchTerm = `%${q.trim()}%`;
    const offset = (page - 1) * limit;

    const query = `
      SELECT b.*,
             u.name as guest_name, u.email as guest_email, u.phone_number as guest_phone,
             p.name as place_name, p.address as place_address,
             p.owner_id as host_id, u_host.name as host_name, u_host.email as host_email
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN places p ON b.place_id = p.id
      LEFT JOIN users u_host ON p.owner_id = u_host.id
      WHERE b.booking_ref ILIKE $1
         OR u.name ILIKE $1
         OR u.email ILIKE $1
         OR p.name ILIKE $1
         OR CAST(b.id AS TEXT) = $2
      ORDER BY b.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const countQuery = `
      SELECT COUNT(*) FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN places p ON b.place_id = p.id
      WHERE b.booking_ref ILIKE $1
         OR u.name ILIKE $1
         OR u.email ILIKE $1
         OR p.name ILIKE $1
         OR CAST(b.id AS TEXT) = $2
    `;

    const exactTerm = q.trim();
    const result = await db.query(query, [searchTerm, exactTerm, limit, offset]);
    const countResult = await db.query(countQuery, [searchTerm, exactTerm]);
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
    logger.error('Search bookings error', { error: error.message });
    next(error);
  }
}

/**
 * POST /bookings/:id/guest-review
 * Host rates a guest after a completed booking
 */
async function createGuestReview(req, res, next) {
  try {
    const bookingId = req.params.id;
    const reviewerId = req.user.userId;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'invalid_rating', message: 'Rating must be between 1 and 5' });
    }

    // Verify the booking exists, is completed, and the reviewer is the host
    const booking = await db.query(
      `SELECT b.*, p.owner_id FROM bookings b
       JOIN places p ON b.place_id = p.id
       WHERE b.id = $1`,
      [bookingId]
    );

    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Booking not found' });
    }

    const b = booking.rows[0];
    const isHost = b.owner_id === reviewerId;
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isAdmin) {
      return res.status(403).json({ error: 'forbidden', message: 'Only the host can review a guest' });
    }

    if (b.status !== 'completed') {
      return res.status(400).json({ error: 'not_completed', message: 'Can only review guests after booking is completed' });
    }

    // Check if already reviewed
    const existing = await db.query('SELECT id FROM user_reviews WHERE booking_id = $1', [bookingId]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'already_reviewed', message: 'Guest already reviewed for this booking' });
    }

    const result = await db.query(
      `INSERT INTO user_reviews (reviewer_id, reviewed_user_id, booking_id, rating)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [reviewerId, b.user_id, bookingId, rating]
    );

    logger.info('Guest review created', { bookingId, reviewerId, guestId: b.user_id, rating });
    return res.status(201).json({ review: result.rows[0] });
  } catch (error) {
    logger.error('Create guest review error', { error: error.message });
    next(error);
  }
}

/**
 * GET /bookings/guest-rating/:userId
 * Get average guest rating for a user
 */
async function getGuestRating(req, res, next) {
  try {
    const userId = req.params.userId;
    const result = await db.query(
      `SELECT ROUND(AVG(rating)::numeric, 1) as average_rating, COUNT(*) as review_count
       FROM user_reviews WHERE reviewed_user_id = $1`,
      [userId]
    );
    const row = result.rows[0];
    return res.json({
      averageRating: row.average_rating ? parseFloat(row.average_rating) : null,
      reviewCount: parseInt(row.review_count),
    });
  } catch (error) {
    logger.error('Get guest rating error', { error: error.message });
    next(error);
  }
}

/**
 * PUT /bookings/:id/approve
 * Host approves a pending booking — captures the Stripe payment.
 */
async function approveBooking(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Fetch booking + place owner
    const bookingRes = await db.query(
      `SELECT b.*, p.owner_id, p.name AS place_name
       FROM bookings b
       JOIN places p ON p.id = b.place_id
       WHERE b.id = $1`,
      [id]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'booking_not_found', message: 'Booking not found' });
    }

    const booking = bookingRes.rows[0];

    if (booking.owner_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'forbidden', message: 'Only the host or admin can approve bookings' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'invalid_status', message: `Cannot approve a booking with status '${booking.status}'` });
    }

    // Capture the Stripe payment if a payment intent was stored
    let chargeId = null;
    let transferId = null;
    let hostPayoutStatus = 'pending';
    if (booking.payment_intent_id) {
      try {
        const captured = await stripe.paymentIntents.capture(booking.payment_intent_id);
        // Extract the charge ID from the captured payment intent
        if (captured.latest_charge) {
          chargeId = captured.latest_charge;
        } else if (captured.charges?.data?.length > 0) {
          chargeId = captured.charges.data[0].id;
        }

        // If this was a destination charge, Stripe auto-transferred to the host
        if (captured.transfer_data) {
          hostPayoutStatus = 'paid';
          // Retrieve the transfer ID from the charge for tracking
          if (chargeId) {
            try {
              const charge = await stripe.charges.retrieve(chargeId);
              transferId = charge.transfer || null;
            } catch (e) {
              logger.warn('Could not retrieve transfer ID from charge', { chargeId, error: e.message });
            }
          }
        }

        logger.info('Stripe payment captured', { bookingId: id, paymentIntentId: booking.payment_intent_id, chargeId, transferId, hostPayoutStatus });
      } catch (stripeErr) {
        logger.error('Stripe capture failed', { bookingId: id, error: stripeErr.message });
        return res.status(502).json({ error: 'payment_capture_failed', message: 'Failed to capture payment. Please try again.' });
      }
    }

    const result = await db.query(
      `UPDATE bookings SET status = 'confirmed', charge_id = $1, transfer_id = $2, host_payout_status = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
      [chargeId, transferId, hostPayoutStatus, id]
    );

    logger.info('Booking approved', { userId, bookingId: id });

    // Check if this is the host's first confirmed booking — trigger referral bonus
    setImmediate(async () => {
      try {
        // Count confirmed bookings for this host's places
        const hostBookings = await db.query(
          `SELECT COUNT(*) FROM bookings b
           JOIN places p ON p.id = b.place_id
           WHERE p.owner_id = $1 AND b.status = 'confirmed'`,
          [booking.owner_id]
        );
        // If this is the first confirmed booking, complete any pending referral
        if (parseInt(hostBookings.rows[0].count) === 1) {
          const hostRow = await db.query('SELECT email FROM users WHERE id = $1', [booking.owner_id]);
          if (hostRow.rows.length) {
            const { completeReferral } = require('./referralController');
            await completeReferral(hostRow.rows[0].email);
            logger.info('Referral bonus triggered for host first booking', { hostId: booking.owner_id });
          }
        }
      } catch (e) {
        logger.error('Referral completion check failed (non-blocking)', { error: e.message });
      }
    });

    // Notify guest (fire-and-forget)
    setImmediate(async () => {
      try {
        await pushService.sendToUser(booking.user_id, 'Booking Confirmed!', `Your booking at ${booking.place_name} has been approved by the host!`, {
          type: 'booking_update',
          status: 'confirmed',
        });
      } catch (e) { /* ignore */ }
    });

    res.json({ booking: result.rows[0] });
  } catch (error) {
    logger.error('Approve booking error', { error: error.message });
    next(error);
  }
}

/**
 * PUT /bookings/:id/reject
 * Host rejects a pending booking — cancels the Stripe payment hold.
 */
async function rejectBooking(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const bookingRes = await db.query(
      `SELECT b.*, p.owner_id, p.name AS place_name
       FROM bookings b
       JOIN places p ON p.id = b.place_id
       WHERE b.id = $1`,
      [id]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'booking_not_found', message: 'Booking not found' });
    }

    const booking = bookingRes.rows[0];

    if (booking.owner_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'forbidden', message: 'Only the host or admin can reject bookings' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'invalid_status', message: `Cannot reject a booking with status '${booking.status}'` });
    }

    // Cancel the Stripe payment hold if a payment intent was stored
    if (booking.payment_intent_id) {
      try {
        await stripe.paymentIntents.cancel(booking.payment_intent_id);
        logger.info('Stripe payment hold cancelled', { bookingId: id, paymentIntentId: booking.payment_intent_id });
      } catch (stripeErr) {
        logger.error('Stripe cancel failed', { bookingId: id, error: stripeErr.message });
        // Continue with rejection even if Stripe cancel fails — the hold will expire
      }
    }

    const result = await db.query(
      'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['cancelled', id]
    );

    logger.info('Booking rejected', { userId, bookingId: id });

    // Notify guest (fire-and-forget)
    setImmediate(async () => {
      try {
        await pushService.sendToUser(booking.user_id, 'Booking Not Approved', `Your booking at ${booking.place_name} was not approved by the host.`, {
          type: 'booking_update',
          status: 'cancelled',
        });
      } catch (e) { /* ignore */ }
    });

    res.json({ booking: result.rows[0] });
  } catch (error) {
    logger.error('Reject booking error', { error: error.message });
    next(error);
  }
}

/**
 * PUT /bookings/:id/cancel
 * Guest or host cancels a confirmed/pending booking.
 */
async function cancelBooking(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const bookingRes = await db.query(
      `SELECT b.*, p.owner_id, p.name AS place_name
       FROM bookings b
       JOIN places p ON p.id = b.place_id
       WHERE b.id = $1`,
      [id]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ error: 'booking_not_found', message: 'Booking not found' });
    }

    const booking = bookingRes.rows[0];

    // Allow guest (booking owner), host (place owner), or admin
    if (booking.user_id !== userId && booking.owner_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'forbidden', message: 'Cannot cancel this booking' });
    }

    if (booking.status === 'cancelled' || booking.status === 'Completed') {
      return res.status(400).json({ error: 'invalid_status', message: `Cannot cancel a booking with status '${booking.status}'` });
    }

    // Cancel/refund Stripe payment if applicable
    if (booking.payment_intent_id) {
      try {
        const pi = await stripe.paymentIntents.retrieve(booking.payment_intent_id);
        if (pi.status === 'requires_capture') {
          // Not yet captured — just cancel the hold
          await stripe.paymentIntents.cancel(booking.payment_intent_id);
        } else if (pi.status === 'succeeded') {
          // Already captured — issue refund
          await stripe.refunds.create({ payment_intent: booking.payment_intent_id });
        }
        logger.info('Stripe payment cancelled/refunded', { bookingId: id });
      } catch (stripeErr) {
        logger.error('Stripe cancel/refund failed', { bookingId: id, error: stripeErr.message });
      }
    }

    const result = await db.query(
      'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['cancelled', id]
    );

    logger.info('Booking cancelled', { userId, bookingId: id });

    // Notify the other party (fire-and-forget)
    setImmediate(async () => {
      try {
        if (booking.user_id === userId) {
          // Guest cancelled — notify host
          const userRes = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
          await pushService.sendToUser(booking.owner_id, 'Booking Cancelled', `${userRes.rows[0]?.name || 'A guest'} cancelled their booking at ${booking.place_name}`, {
            type: 'booking_update',
            status: 'cancelled',
          });
        } else {
          // Host cancelled — notify guest
          await pushService.sendToUser(booking.user_id, 'Booking Cancelled', `Your booking at ${booking.place_name} has been cancelled by the host.`, {
            type: 'booking_update',
            status: 'cancelled',
          });
        }
      } catch (e) { /* ignore */ }
    });

    res.json({ booking: result.rows[0] });
  } catch (error) {
    logger.error('Cancel booking error', { error: error.message });
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
  markBookingsSeen,
  searchBookings,
  createGuestReview,
  getGuestRating,
  approveBooking,
  rejectBooking,
  cancelBooking,
  cancelExpiredAuthorizations,
  transferToHost,
};
