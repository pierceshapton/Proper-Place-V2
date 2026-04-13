const db = require('../config/database');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

/**
 * GET /users/:id
 */
async function getUserProfile(req, res, next) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT id, email, name, avatar_url, bio, phone_number,
              vehicle_registration, vehicle_length, vehicle_height, vehicle_width,
              dark_mode, offline_mode, role, verified, created_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found',
      });
    }

    res.json({
      user: result.rows[0],
    });
  } catch (error) {
    logger.error('Get user profile error', { error: error.message });
    next(error);
  }
}

/**
 * PATCH /users/:id
 */
async function updateProfile(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Users can only update their own profile
    if (parseInt(id) !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Cannot update other user profiles',
      });
    }

    const data = req.validatedBody;
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic UPDATE query
    const allowedFields = [
      'name', 'bio', 'phone_number', 'avatar_url',
      'vehicle_registration', 'vehicle_length', 'vehicle_height', 'vehicle_width',
      'dark_mode', 'offline_mode',
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
      UPDATE users
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING id, email, name, avatar_url, bio, phone_number,
                vehicle_registration, vehicle_length, vehicle_height, vehicle_width,
                dark_mode, offline_mode, role, verified
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found',
      });
    }

    logger.info('User profile updated', { userId: id });

    res.json({
      user: result.rows[0],
    });
  } catch (error) {
    logger.error('Update profile error', { error: error.message });
    next(error);
  }
}

/**
 * DELETE /users/:id
 */
async function deleteAccount(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Users can only delete their own account
    if (parseInt(id) !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Cannot delete other accounts',
      });
    }

    const result = await db.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found',
      });
    }

    logger.info('User account deleted', { userId: id });

    res.json({
      message: 'Account deleted successfully',
    });
  } catch (error) {
    logger.error('Delete account error', { error: error.message });
    next(error);
  }
}

/**
 * GET /users/:id/export
 * GDPR Article 20: Right to data portability
 * Returns all user data in a portable JSON format
 */
async function exportUserData(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Users can only export their own data
    if (parseInt(id) !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Cannot export other user data',
      });
    }

    // Get user profile data
    const userResult = await db.query(
      `SELECT id, email, name, avatar_url, bio, phone_number,
              vehicle_registration, vehicle_length, vehicle_height, vehicle_width,
              role, verified, created_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found',
      });
    }

    // Get user's bookings
    const bookingsResult = await db.query(
      `SELECT id, place_id, check_in_date, check_out_date, 
              total_price, status, created_at
       FROM bookings WHERE user_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    // Get user's reviews
    const reviewsResult = await db.query(
      `SELECT id, place_id, rating, comment, created_at
       FROM reviews WHERE user_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    // Get user's places (if host)
    const placesResult = await db.query(
      `SELECT id, name, description, address, city, postcode, country,
              latitude, longitude, price_per_night, max_vehicle_height,
              max_vehicle_width, max_vehicle_length, amenities,
              status, created_at
       FROM places WHERE host_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    // Get user's messages
    const messagesResult = await db.query(
      `SELECT id, recipient_id, place_id, subject, content, created_at
       FROM messages WHERE sender_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    const exportData = {
      exportedAt: new Date().toISOString(),
      gdprArticle: 'Article 20 - Right to data portability',
      user: userResult.rows[0],
      bookings: bookingsResult.rows,
      reviews: reviewsResult.rows,
      places: placesResult.rows,
      sentMessages: messagesResult.rows,
    };

    logger.info('User data exported', { userId: id });

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="proper-place-data-export-${id}.json"`);
    
    res.json(exportData);
  } catch (error) {
    logger.error('Export user data error', { error: error.message });
    next(error);
  }
}

/**
 * POST /users/change-password
 */
async function changePassword(req, res, next) {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'validation_error', message: 'Current and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'validation_error', message: 'New password must be at least 8 characters' });
    }

    const userResult = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'invalid_password', message: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, userId]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error', { error: error.message });
    next(error);
  }
}

module.exports = {
  getUserProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  exportUserData,
};
