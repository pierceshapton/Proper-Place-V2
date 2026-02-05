const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /pubs
 */
async function getPubs(req, res, next) {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM pubs';
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` WHERE name ILIKE $${paramCount} OR city ILIKE $${paramCount}`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    const countResult = await db.query('SELECT COUNT(*) FROM pubs');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      pubs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Get pubs error', { error: error.message });
    next(error);
  }
}

/**
 * GET /pubs/:id
 */
async function getPubDetail(req, res, next) {
  try {
    const { id } = req.params;

    const result = await db.query('SELECT * FROM pubs WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'pub_not_found',
        message: 'Pub not found',
      });
    }

    res.json({
      pub: result.rows[0],
    });
  } catch (error) {
    logger.error('Get pub detail error', { error: error.message });
    next(error);
  }
}

/**
 * POST /pubs (Admin only)
 */
async function createPub(req, res, next) {
  try {
    const data = req.body;

    const result = await db.query(
      `INSERT INTO pubs (name, description, address, city, country, postal_code,
                        latitude, longitude, price_per_night, capacity, facilities,
                        phone, website)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
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
        data.facilities || null,
        data.phone || null,
        data.website || null,
      ]
    );

    logger.info('Pub created', { pubId: result.rows[0].id });

    res.status(201).json({
      pub: result.rows[0],
    });
  } catch (error) {
    logger.error('Create pub error', { error: error.message });
    next(error);
  }
}

/**
 * PATCH /pubs/:id (Admin only)
 */
async function updatePub(req, res, next) {
  try {
    const { id } = req.params;
    const data = req.body;

    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'name', 'description', 'address', 'city', 'country', 'postal_code',
      'latitude', 'longitude', 'price_per_night', 'capacity', 'facilities',
      'open_now', 'hours_open', 'phone', 'website',
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
      UPDATE pubs
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'pub_not_found',
        message: 'Pub not found',
      });
    }

    logger.info('Pub updated', { pubId: id });

    res.json({
      pub: result.rows[0],
    });
  } catch (error) {
    logger.error('Update pub error', { error: error.message });
    next(error);
  }
}

/**
 * DELETE /pubs/:id (Admin only)
 */
async function deletePub(req, res, next) {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM pubs WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'pub_not_found',
        message: 'Pub not found',
      });
    }

    logger.info('Pub deleted', { pubId: id });

    res.json({
      message: 'Pub deleted successfully',
    });
  } catch (error) {
    logger.error('Delete pub error', { error: error.message });
    next(error);
  }
}

module.exports = {
  getPubs,
  getPubDetail,
  createPub,
  updatePub,
  deletePub,
};
