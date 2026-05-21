const db = require('../config/database');
const logger = require('../utils/logger');
const pushService = require('../services/pushNotificationService');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * GET /admin/dashboard
 */
async function getDashboard(req, res, next) {
  try {
    const userCount = await db.query('SELECT COUNT(*) FROM users');
    const placeCount = await db.query(
      "SELECT COUNT(*) FROM places WHERE deleted_at IS NULL"
    );
    const bookingCount = await db.query('SELECT COUNT(*) FROM bookings');
    const reviewCount = await db.query('SELECT COUNT(*) FROM reviews');
    const pendingPlaces = await db.query(
      "SELECT COUNT(*) FROM places WHERE approval_status = 'pending'"
    );
    const activeBookings = await db.query(
      "SELECT COUNT(*) FROM bookings WHERE status IN ('confirmed', 'approved') AND check_out_date >= CURRENT_DATE"
    );
    const revenueResult = await db.query(
      "SELECT COALESCE(SUM(total_price::numeric), 0) as total FROM bookings WHERE status NOT IN ('cancelled')"
    );
    let openContacts = 0;
    try {
      const contactsResult = await db.query("SELECT COUNT(*) FROM contacts WHERE status IN ('new', 'open')");
      openContacts = parseInt(contactsResult.rows[0].count);
    } catch (e) { /* table may not exist yet */ }

    let pendingReferrals = 0;
    try {
      const refResult = await db.query("SELECT COUNT(*) FROM referrals WHERE status = 'pending'");
      pendingReferrals = parseInt(refResult.rows[0].count);
    } catch (e) { /* table may not exist yet */ }

    let pendingHostApplications = 0;
    try {
      const haResult = await db.query("SELECT COUNT(*) FROM host_applications WHERE status = 'pending'");
      pendingHostApplications = parseInt(haResult.rows[0].count);
    } catch (e) { /* table may not exist yet */ }

    res.json({
      dashboard: {
        total_users: parseInt(userCount.rows[0].count),
        total_places: parseInt(placeCount.rows[0].count),
        total_bookings: parseInt(bookingCount.rows[0].count),
        total_reviews: parseInt(reviewCount.rows[0].count),
        pending_approvals: parseInt(pendingPlaces.rows[0].count),
        active_bookings: parseInt(activeBookings.rows[0].count),
        total_revenue: parseFloat(revenueResult.rows[0].total),
        open_contacts: openContacts,
        pending_referrals: pendingReferrals,
        pending_host_applications: pendingHostApplications,
      },
    });
  } catch (error) {
    logger.error('Get dashboard error', { error: error.message });
    next(error);
  }
}

/**
 * GET /admin/places
 */
async function getPlacesForModeration(req, res, next) {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT p.*, u.name as owner_name, u.email as owner_email,
              u.host_contract_accepted_at, u.host_contract_version
       FROM places p
       JOIN users u ON p.owner_id = u.id
       WHERE p.approval_status = $1
       ORDER BY p.created_at ASC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) FROM places WHERE approval_status = $1',
      [status]
    );
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
    logger.error('Get places for moderation error', { error: error.message });
    next(error);
  }
}

/**
 * PATCH /admin/places/:id/approve
 */
async function approvePlace(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;

    const result = await db.query(
      `UPDATE places
       SET approval_status = 'approved', status = 'available', host_status_seen = false, previous_approved_data = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'place_not_found',
        message: 'Place not found',
      });
    }

    // Log admin action
    await db.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'place_approved', 'place', id, 'Approved place and set to available']
    );

    logger.info('Place approved', { adminId, placeId: id });

    // Notify host about approval (fire-and-forget)
    const place = result.rows[0];
    setImmediate(() => {
      pushService.notifyPlaceReview(place.owner_id, place.name, true, null).catch(() => {});
    });

    res.json({
      place: result.rows[0],
    });
  } catch (error) {
    logger.error('Approve place error', { error: error.message });
    next(error);
  }
}

/**
 * PATCH /admin/places/:id/reject
 */
async function rejectPlace(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;
    const { reason } = req.body;

    const result = await db.query(
      `UPDATE places
       SET approval_status = 'rejected', rejection_reason = $2, host_status_seen = false, previous_approved_data = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, reason || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'place_not_found',
        message: 'Place not found',
      });
    }

    // Log admin action
    await db.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'place_rejected', 'place', id, reason || 'Rejected place']
    );

    logger.info('Place rejected', { adminId, placeId: id });

    // Notify host about rejection (fire-and-forget)
    const place = result.rows[0];
    setImmediate(() => {
      pushService.notifyPlaceReview(place.owner_id, place.name, false, reason).catch(() => {});
    });

    res.json({
      place: result.rows[0],
    });
  } catch (error) {
    logger.error('Reject place error', { error: error.message });
    next(error);
  }
}

/**
 * GET /admin/users
 */
async function getUsers(req, res, next) {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        u.id,
        u.email,
        u.name,
        u.username,
        u.role,
        u.verified,
        u.phone_number AS phone,
        u.created_at,
        COUNT(b.id)::int AS bookings_count,
        MAX(b.created_at) AS last_booking_created_at
      FROM users u
      LEFT JOIN bookings b ON b.user_id = u.id
    `;
    const params = [];
    let paramCount = 1;
    const conditions = [];

    if (role) {
      conditions.push(`u.role = $${paramCount}`);
      params.push(role);
      paramCount++;
    }

    if (search) {
      conditions.push(`(u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.username ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;

    query += ` GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    const countResult = await db.query('SELECT COUNT(*) FROM users');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get users error', { error: error.message });
    next(error);
  }
}

/**
 * GET /admin/users/:id
 */
async function getUserDetails(req, res, next) {
  try {
    const { id } = req.params;

    const userResult = await db.query(
      `SELECT id, email, name, role, verified, phone_number AS phone, created_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found',
      });
    }

    const bookingsResult = await db.query(
      `SELECT
         b.id,
         b.booking_ref,
         b.place_id,
         p.name AS place_name,
         p.city AS place_city,
         b.check_in_date,
         b.check_out_date,
         b.total_price,
         b.status,
         b.created_at
       FROM bookings b
       LEFT JOIN places p ON p.id = b.place_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC
       LIMIT 30`,
      [id]
    );

    res.json({
      user: userResult.rows[0],
      bookings: bookingsResult.rows,
    });
  } catch (error) {
    logger.error('Get admin user details error', { error: error.message });
    next(error);
  }
}

/**
 * DELETE /admin/users/:id
 * Permanently delete a user account. If deleting a host, cancel/refund future bookings.
 */
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;

    if (parseInt(id, 10) === adminId) {
      return res.status(400).json({
        error: 'invalid_target',
        message: 'Admins cannot delete their own account from this endpoint',
      });
    }

    const userResult = await db.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found',
      });
    }

    const targetUser = userResult.rows[0];
    const bookingActions = { cancelled: 0, refundsAttempted: 0 };

    if (targetUser.role === 'host') {
      const bookingsToCancel = await db.query(
        `SELECT
           b.id,
           b.payment_intent_id,
           b.status
         FROM bookings b
         JOIN places p ON p.id = b.place_id
         WHERE p.owner_id = $1
           AND b.status NOT IN ('cancelled', 'Cancelled', 'completed', 'Completed', 'rejected', 'Rejected')
           AND b.check_in_date > CURRENT_DATE`,
        [id]
      );

      for (const booking of bookingsToCancel.rows) {
        if (booking.payment_intent_id) {
          try {
            const pi = await stripe.paymentIntents.retrieve(booking.payment_intent_id);
            if (pi.status === 'requires_capture') {
              await stripe.paymentIntents.cancel(booking.payment_intent_id);
              bookingActions.refundsAttempted++;
            } else if (pi.status === 'succeeded') {
              await stripe.refunds.create({ payment_intent: booking.payment_intent_id });
              bookingActions.refundsAttempted++;
            }
          } catch (stripeErr) {
            logger.error('Host deletion booking refund/cancel failed', {
              bookingId: booking.id,
              hostId: id,
              error: stripeErr.message,
            });
          }
        }

        await db.query(
          `UPDATE bookings
           SET status = 'cancelled', updated_at = NOW()
           WHERE id = $1`,
          [booking.id]
        );
        bookingActions.cancelled++;
      }
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);

    await db.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        adminId,
        'user_deleted',
        'user',
        id,
        JSON.stringify({
          deletedUserEmail: targetUser.email,
          deletedUserRole: targetUser.role,
          bookingActions,
        }),
      ]
    );

    logger.info('Admin deleted user', { adminId, deletedUserId: id, bookingActions });

    res.json({
      message: 'User account deleted successfully',
      booking_actions: bookingActions,
    });
  } catch (error) {
    logger.error('Admin delete user error', { error: error.message });
    next(error);
  }
}

/**
 * PATCH /admin/users/:id/role
 */
async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;
    const { role } = req.body;

    if (!['user', 'host', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'invalid_role',
        message: 'Invalid role',
      });
    }

    const result = await db.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found',
      });
    }

    // Log admin action
    await db.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'user_role_updated', 'user', id, `Role updated to: ${role}`]
    );

    logger.info('User role updated', { adminId, userId: id, role });

    res.json({
      user: result.rows[0],
    });
  } catch (error) {
    logger.error('Update user role error', { error: error.message });
    next(error);
  }
}

/**
 * PATCH /admin/users/:id
 */
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;
    const { name, email, phone } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name.trim()); }
    if (email !== undefined) { fields.push(`email = $${idx++}`); values.push(email.trim().toLowerCase()); }
    if (phone !== undefined) { fields.push(`phone_number = $${idx++}`); values.push(phone ? phone.trim() : null); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'no_fields', message: 'No fields to update' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, email, name, phone_number AS phone, role`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'user_not_found', message: 'User not found' });
    }

    await db.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'user_updated', 'user', id, JSON.stringify({ name, email, phone })]
    );

    logger.info('Admin updated user', { adminId, userId: id });

    res.json({ user: result.rows[0] });
  } catch (error) {
    logger.error('Admin update user error', { error: error.message });
    next(error);
  }
}

/**
 * POST /admin/seed-test-messages
 * Seed test messages for demo/testing purposes
 */
async function seedTestMessages(req, res, next) {
  try {
    const adminId = req.user.userId;

    // Get admin user ID (should be 1)
    const adminResult = await db.query(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    );
    
    if (adminResult.rows.length === 0) {
      return res.status(404).json({ error: 'No admin user found' });
    }
    
    const adminUserId = adminResult.rows[0].id;

    // Check if we need to create a test host user
    let hostUserId;
    const hostResult = await db.query(
      `SELECT id FROM users WHERE role = 'host' LIMIT 1`
    );
    
    if (hostResult.rows.length === 0) {
      // Create a test host user
      const newHost = await db.query(
        `INSERT INTO users (email, name, role, password_hash, verified)
         VALUES ('host@example.com', 'Host User', 'host', '$2b$10$placeholder', true)
         ON CONFLICT (email) DO UPDATE SET role = 'host'
         RETURNING id`
      );
      hostUserId = newHost.rows[0].id;
    } else {
      hostUserId = hostResult.rows[0].id;
    }

    // Insert test messages to admin (unread)
    await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content, read, created_at)
       VALUES 
         ($1, $2, 'Hi, I have a question about my listing approval status?', false, NOW() - INTERVAL '2 hours'),
         ($1, $2, 'Also, can you help me understand the pricing guidelines?', false, NOW() - INTERVAL '1 hour')
       ON CONFLICT DO NOTHING`,
      [hostUserId, adminUserId]
    );

    // Insert test pending places (for Approvals badge)
    const pendingPlacesResult = await db.query(
      `INSERT INTO places (owner_id, name, description, address, city, country, latitude, longitude, price_per_night, capacity, approval_status)
       VALUES 
         ($1, 'The Green Valley Farm', 'Beautiful farm with stunning views', '123 Country Lane', 'Bristol', 'UK', 51.4545, -2.5879, 25.00, 4, 'pending'),
         ($1, 'Riverside Meadow', 'Peaceful spot by the river', '45 River Road', 'Bath', 'UK', 51.3811, -2.3590, 30.00, 2, 'pending'),
         ($1, 'Hilltop Haven', 'Quiet location with panoramic views', '78 Hill Street', 'Wells', 'UK', 51.2090, -2.6470, 20.00, 3, 'pending')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [hostUserId]
    );

    // Create a test user for bookings if needed
    let testUserId;
    const testUserResult = await db.query(
      `SELECT id FROM users WHERE email = 'testuser@example.com' LIMIT 1`
    );
    
    if (testUserResult.rows.length === 0) {
      const newTestUser = await db.query(
        `INSERT INTO users (email, name, role, password_hash, verified)
         VALUES ('testuser@example.com', 'Test User', 'user', '$2b$10$placeholder', true)
         ON CONFLICT (email) DO UPDATE SET name = 'Test User'
         RETURNING id`
      );
      testUserId = newTestUser.rows[0].id;
    } else {
      testUserId = testUserResult.rows[0].id;
    }

    // Get an approved place for bookings (or create one)
    let approvedPlaceId;
    const approvedPlaceResult = await db.query(
      `SELECT id FROM places WHERE approval_status = 'approved' LIMIT 1`
    );
    
    if (approvedPlaceResult.rows.length === 0) {
      const newPlace = await db.query(
        `INSERT INTO places (owner_id, name, description, address, city, country, latitude, longitude, price_per_night, capacity, approval_status)
         VALUES ($1, 'Sunny Fields', 'Approved test place', '1 Test Road', 'London', 'UK', 51.5074, -0.1278, 35.00, 4, 'approved')
         RETURNING id`,
        [hostUserId]
      );
      approvedPlaceId = newPlace.rows[0].id;
    } else {
      approvedPlaceId = approvedPlaceResult.rows[0].id;
    }

    // Insert test pending bookings (for Bookings badge)
    await db.query(
      `INSERT INTO bookings (user_id, place_id, check_in_date, check_out_date, number_of_nights, total_price, status, van_registration)
       VALUES 
         ($1, $2, CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '9 days', 2, 70.00, 'pending', 'AB12 CDE'),
         ($1, $2, CURRENT_DATE + INTERVAL '14 days', CURRENT_DATE + INTERVAL '17 days', 3, 105.00, 'pending', 'XY34 FGH'),
         ($1, $2, CURRENT_DATE + INTERVAL '21 days', CURRENT_DATE + INTERVAL '23 days', 2, 70.00, 'confirmed', 'JK56 LMN'),
         ($1, $2, CURRENT_DATE + INTERVAL '28 days', CURRENT_DATE + INTERVAL '30 days', 2, 70.00, 'confirmed', 'PQ78 RST')
       ON CONFLICT DO NOTHING`,
      [testUserId, approvedPlaceId]
    );

    // Log admin action
    await db.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, details)
       VALUES ($1, $2, $3, $4)`,
      [adminId, 'seed_test_data', 'all', 'Test messages, places, and bookings seeded for demo']
    );

    logger.info('Test data seeded', { adminId });

    res.json({
      message: 'Test data seeded successfully',
      hostUserId,
      adminUserId,
      testUserId,
      approvedPlaceId,
      pendingPlacesCreated: pendingPlacesResult.rows.length,
    });
  } catch (error) {
    logger.error('Seed test messages error', { error: error.message });
    next(error);
  }
}

/**
 * DELETE /admin/cleanup-all
 * Delete all messages, bookings, reviews, and places (admin only)
 * WARNING: This is destructive and cannot be undone!
 */
async function cleanupAllData(req, res, next) {
  try {
    const adminId = req.user.userId;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'unauthorized',
        message: 'Only admins can cleanup data',
      });
    }

    console.log('[AdminController] Starting cleanup of all mock data...');

    const deletionResults = {};

    // Delete messages
    const messagesResult = await db.query('DELETE FROM messages');
    deletionResults.messages = 'deleted';
    console.log('[AdminController] ✅ Deleted all messages');

    // Delete reviews
    const reviewsResult = await db.query('DELETE FROM reviews');
    deletionResults.reviews = 'deleted';
    console.log('[AdminController] ✅ Deleted all reviews');

    // Delete bookings
    const bookingsResult = await db.query('DELETE FROM bookings');
    deletionResults.bookings = 'deleted';
    console.log('[AdminController] ✅ Deleted all bookings');

    // Delete places
    const placesResult = await db.query('DELETE FROM places WHERE deleted_at IS NULL');
    deletionResults.places = 'deleted';
    console.log('[AdminController] ✅ Deleted all places');

    // Log the cleanup action
    await db.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, details)
       VALUES ($1, $2, $3, $4)`,
      [adminId, 'cleanup_all_data', 'all', 'All mock messages, places, bookings, reviews deleted for fresh test data']
    );

    logger.info('All mock data cleaned up', { adminId });

    res.json({
      message: 'All mock data deleted successfully',
      status: 'cleaned',
      deletions: deletionResults,
      details: 'Messages, bookings, reviews, and places have been deleted. Ready for fresh test data.',
    });
  } catch (error) {
    logger.error('Cleanup all data error', { error: error.message, stack: error.stack });
    next(error);
  }
}

/**
 * POST /places/:id/reopen
 * Reopen a rejected place (move it back to pending status)
 */
async function reopenPlace(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;

    const result = await db.query(
      `UPDATE places
       SET approval_status = 'pending', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'place_not_found',
        message: 'Place not found',
      });
    }

    // Log admin action
    await db.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'place_reopened', 'place', id, 'Reopened rejected place for review']
    );

    logger.info('Place reopened', { adminId, placeId: id });

    res.json({
      place: result.rows[0],
    });
  } catch (error) {
    logger.error('Reopen place error', { error: error.message });
    next(error);
  }
}

/**
 * PATCH /admin/places/:id
 * Update a place (owner_id, name, etc.)
 */
async function updatePlace(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;
    const allowedFields = ['owner_id', 'name', 'description', 'price_per_night', 'capacity'];
    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        values.push(req.body[field]);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'no_fields', message: 'No valid fields to update' });
    }

    values.push(id);
    const result = await db.query(
      `UPDATE places SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'place_not_found', message: 'Place not found' });
    }

    await db.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'place_updated', 'place', id, JSON.stringify(req.body)]
    );

    logger.info('Place updated by admin', { adminId, placeId: id });
    res.json({ place: result.rows[0] });
  } catch (error) {
    logger.error('Update place error', { error: error.message });
    next(error);
  }
}

/**
 * POST /admin/users/:id/reset-password
 * Admin-only: reset a user's password
 */
async function resetUserPassword(req, res, next) {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const { hashPassword } = require('../utils/hash');
    const passwordHash = await hashPassword(password);

    const result = await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, email, name',
      [passwordHash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info('Admin reset user password', { adminId: req.user.userId, targetUser: result.rows[0].email });
    res.json({ message: 'Password reset successfully', user: result.rows[0] });
  } catch (error) {
    logger.error('Admin reset password error', { error: error.message });
    next(error);
  }
}

/**
 * POST /admin/users/:id/verify
 * Admin-only: manually verify a user's email
 */
async function verifyUser(req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query(
      'UPDATE users SET verified = true, email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1 RETURNING id, email, name, verified',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    logger.info('Admin verified user', { adminId: req.user.userId, targetUser: result.rows[0].email });
    res.json({ message: 'User verified', user: result.rows[0] });
  } catch (error) {
    logger.error('Admin verify user error', { error: error.message });
    next(error);
  }
}

/**
 * POST /admin/users/:id/unverify
 * Admin-only: reset a user's email verification (for testing)
 */
async function unverifyUser(req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE users SET verified = false, email_verification_token = gen_random_uuid(), email_verification_expires = NOW() + interval '24 hours' WHERE id = $1 RETURNING id, email, name, verified`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    logger.info('Admin unverified user', { adminId: req.user.userId, targetUser: result.rows[0].email });
    res.json({ message: 'User unverified', user: result.rows[0] });
  } catch (error) {
    logger.error('Admin unverify user error', { error: error.message });
    next(error);
  }
}

/**
 * GET /admin/host-applications
 */
async function getHostApplications(req, res, next) {
  try {
    const status = req.query.status || 'all';
    let query = `
      SELECT ha.*, u.name as user_name, u.email as user_email
      FROM host_applications ha
      LEFT JOIN users u ON ha.user_id = u.id
    `;
    const params = [];
    if (status !== 'all') {
      query += ' WHERE ha.status = $1';
      params.push(status);
    }
    query += ' ORDER BY ha.created_at DESC';
    const result = await db.query(query, params);
    res.json({ applications: result.rows });
  } catch (error) {
    logger.error('Get host applications error', { error: error.message });
    next(error);
  }
}

/**
 * PATCH /admin/host-applications/:id/approve
 */
async function approveHostApplication(req, res, next) {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;
    const result = await db.query(
      `UPDATE host_applications SET status = 'approved', admin_notes = $1, reviewed_at = NOW(), reviewed_by = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [admin_notes || null, req.user.userId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Host application not found' });
    }
    // Upgrade user role to host
    await db.query("UPDATE users SET role = 'host' WHERE id = $1 AND role = 'user'", [result.rows[0].user_id]);
    // Log admin action
    try {
      await db.query(
        'INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.userId, 'approve_host_application', 'host_application', id, JSON.stringify({ admin_notes })]
      );
    } catch (e) { /* admin_logs may not exist */ }
    // Push notification to applicant
    try {
      await pushService.sendToUser(result.rows[0].user_id, {
        title: 'Host Application Approved!',
        body: 'Your application to become a host has been approved. You can now list your places!',
      });
    } catch (e) { /* push may fail */ }
    res.json({ message: 'Host application approved', application: result.rows[0] });
  } catch (error) {
    logger.error('Approve host application error', { error: error.message });
    next(error);
  }
}

/**
 * PATCH /admin/host-applications/:id/reject
 */
async function rejectHostApplication(req, res, next) {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;
    const result = await db.query(
      `UPDATE host_applications SET status = 'rejected', admin_notes = $1, reviewed_at = NOW(), reviewed_by = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [admin_notes || null, req.user.userId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Host application not found' });
    }
    try {
      await db.query(
        'INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.userId, 'reject_host_application', 'host_application', id, JSON.stringify({ admin_notes })]
      );
    } catch (e) { /* admin_logs may not exist */ }
    try {
      await pushService.sendToUser(result.rows[0].user_id, {
        title: 'Host Application Update',
        body: 'Your host application has been reviewed. Please check the app for details.',
      });
    } catch (e) { /* push may fail */ }
    res.json({ message: 'Host application rejected', application: result.rows[0] });
  } catch (error) {
    logger.error('Reject host application error', { error: error.message });
    next(error);
  }
}

/**
 * POST /admin/users
 * Create a user account on behalf of an admin (pre-verified, no email confirmation needed).
 */
const { hashPassword } = require('../utils/hash');
async function createUserAsAdmin(req, res, next) {
  try {
    const adminId = req.user.userId;
    const { name, email, role = 'host', phone, username } = req.body;

    if (!name && !username) {
      return res.status(400).json({ error: 'validation_error', message: 'name or username is required' });
    }

    // Resolve username: use provided one, or auto-generate from name
    let finalUsername = (username || (name || '').trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_]/g, '')).slice(0, 30);
    if (!finalUsername) finalUsername = 'user';
    const unCheck = await db.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [finalUsername]);
    if (unCheck.rows.length > 0) {
      if (username) {
        return res.status(409).json({ error: 'username_taken', message: 'Username already taken' });
      }
      finalUsername = finalUsername + Math.floor(Math.random() * 9000 + 1000);
    }

    // Email: use provided, or generate a unique no-reply placeholder
    let finalEmail;
    if (email && email.trim()) {
      finalEmail = email.trim().toLowerCase();
      const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [finalEmail]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'email_exists', message: 'An account with this email already exists' });
      }
    } else {
      finalEmail = `${finalUsername}@noemail.properplace.internal`;
    }
    const emailIsPlaceholder = finalEmail.endsWith('@noemail.properplace.internal');

    // Generate a random OTP password (12 chars, mixed case + numbers)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const otpPassword = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

    const passwordHash = await hashPassword(otpPassword);

    const result = await db.query(
      `INSERT INTO users (email, password_hash, name, username, role, verified, phone_number, must_change_password)
       VALUES ($1, $2, $3, $4, $5, true, $6, true)
       RETURNING id, email, name, username, role, verified, created_at`,
      [finalEmail, passwordHash, (name || finalUsername).trim(), finalUsername, role, phone || null]
    );

    const user = result.rows[0];

    await db.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'user_created_by_admin', 'user', user.id, `Admin created account for ${finalEmail}`]
    ).catch(() => {});

    logger.info('Admin created user', { adminId, userId: user.id, email: finalEmail });
    res.status(201).json({ user, otp_password: otpPassword, email_is_placeholder: emailIsPlaceholder });
  } catch (error) {
    logger.error('Admin create user error', { error: error.message });
    next(error);
  }
}

/**
 * POST /admin/places
 * Create a place on behalf of an existing user (owner_id required in body).
 * Admin bypasses the contract check and can set approval_status directly.
 */
async function createPlaceForUser(req, res, next) {
  try {
    const adminId = req.user.userId;
    const {
      owner_id,
      name,
      description,
      address,
      city,
      country,
      postal_code,
      latitude,
      longitude,
      price_per_night,
      capacity,
      amenities,
      place_type,
      opening_hours,
      kitchen_hours,
      food_menu_description,
      serves_food,
      business_description,
      access_route_description,
      approval_status,
      max_vehicle_height_ft,
      max_vehicle_width_ft,
      max_vehicle_length_ft,
      max_nights_per_stay,
      available_days,
    } = req.body;

    if (!owner_id) {
      return res.status(400).json({ error: 'validation_error', message: 'owner_id is required' });
    }

    // Verify the target user exists
    const userCheck = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [owner_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'user_not_found', message: 'Target user not found' });
    }

    // Auto-upgrade user to host role if they aren't already
    if (userCheck.rows[0].role !== 'host' && userCheck.rows[0].role !== 'admin') {
      await db.query("UPDATE users SET role = 'host' WHERE id = $1", [owner_id]);
    }

    const result = await db.query(
      `INSERT INTO places (owner_id, name, description, address, city, country,
                           postal_code, latitude, longitude, price_per_night,
                           capacity, amenities, place_type, opening_hours,
                           kitchen_hours, food_menu_description, serves_food,
                           business_description, access_route_description, approval_status,
                           max_vehicle_height_ft, max_vehicle_width_ft, max_vehicle_length_ft,
                           max_nights_per_stay, available_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
       RETURNING *`,
      [
        owner_id,
        name || null,
        description || null,
        address || null,
        city || null,
        country || null,
        postal_code || null,
        latitude || null,
        longitude || null,
        price_per_night || null,
        capacity || null,
        amenities || null,
        place_type || 'private_land',
        opening_hours || null,
        kitchen_hours || null,
        food_menu_description || null,
        serves_food || false,
        business_description || null,
        access_route_description || null,
        approval_status || 'draft',
        max_vehicle_height_ft || null,
        max_vehicle_width_ft || null,
        max_vehicle_length_ft || null,
        max_nights_per_stay || null,
        available_days || null,
      ]
    );

    const place = result.rows[0];

    // If approved, set status to available as well
    if (approval_status === 'approved') {
      await db.query('UPDATE places SET status = $1 WHERE id = $2', ['available', place.id]);
      place.status = 'available';
    }

    await db.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'place_created_for_user', 'place', place.id, `Admin created place for user ${owner_id}`]
    ).catch(() => {});

    logger.info('Admin created place for user', { adminId, ownerId: owner_id, placeId: place.id });

    // Notify the host (fire-and-forget)
    if (approval_status === 'approved') {
      setImmediate(() => {
        pushService.notifyPlaceReview(owner_id, place.name, true, null).catch(() => {});
      });
    }

    res.status(201).json({ place });
  } catch (error) {
    logger.error('Admin create place for user error', { error: error.message });
    next(error);
  }
}

module.exports = {
  getDashboard,
  getPlacesForModeration,
  approvePlace,
  rejectPlace,
  reopenPlace,
  getUsers,
  getUserDetails,
  deleteUser,
  updateUserRole,
  updateUser,
  updatePlace,
  createPlaceForUser,
  createUserAsAdmin,
  seedTestMessages,
  cleanupAllData,
  resetUserPassword,
  verifyUser,
  unverifyUser,
  getHostApplications,
  approveHostApplication,
  rejectHostApplication,
};
