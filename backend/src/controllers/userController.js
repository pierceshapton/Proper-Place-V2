const db = require('../config/database');
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

module.exports = {
  getUserProfile,
  updateProfile,
  deleteAccount,
};
