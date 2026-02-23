const db = require('../config/database');
const logger = require('../utils/logger');

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

    res.json({
      dashboard: {
        total_users: parseInt(userCount.rows[0].count),
        total_places: parseInt(placeCount.rows[0].count),
        total_bookings: parseInt(bookingCount.rows[0].count),
        total_reviews: parseInt(reviewCount.rows[0].count),
        pending_approvals: parseInt(pendingPlaces.rows[0].count),
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
      `SELECT p.*, u.name as owner_name, u.email as owner_email
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
       SET approval_status = 'approved', status = 'available', updated_at = NOW()
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
       SET approval_status = 'rejected', updated_at = NOW()
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
      [adminId, 'place_rejected', 'place', id, reason || 'Rejected place']
    );

    logger.info('Place rejected', { adminId, placeId: id });

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
    const { page = 1, limit = 20, role } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT id, email, name, role, verified, created_at FROM users';
    const params = [];
    let paramCount = 1;

    if (role) {
      query += ` WHERE role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
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

module.exports = {
  getDashboard,
  getPlacesForModeration,
  approvePlace,
  rejectPlace,
  reopenPlace,
  getUsers,
  updateUserRole,
  seedTestMessages,
  cleanupAllData,
};
