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
       SET approval_status = 'approved', updated_at = NOW()
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
      [adminId, 'place_approved', 'place', id, 'Approved place']
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

    // Log admin action
    await db.query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, details)
       VALUES ($1, $2, $3, $4)`,
      [adminId, 'seed_test_messages', 'messages', 'Test messages seeded for demo']
    );

    logger.info('Test messages seeded', { adminId });

    res.json({
      message: 'Test messages seeded successfully',
      hostUserId,
      adminUserId,
    });
  } catch (error) {
    logger.error('Seed test messages error', { error: error.message });
    next(error);
  }
}

module.exports = {
  getDashboard,
  getPlacesForModeration,
  approvePlace,
  rejectPlace,
  getUsers,
  updateUserRole,
  seedTestMessages,
};
