const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Submit a host lead from the QR code signup page
 * POST /host-leads/submit
 */
exports.submitLead = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, propertyType, location, message } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ error: 'First name, last name, email, and phone are required' });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    const result = await db.query(
      `INSERT INTO host_leads (first_name, last_name, email, phone, property_type, location, message, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at`,
      [
        firstName.trim(),
        lastName.trim(),
        email.trim().toLowerCase(),
        phone.trim(),
        propertyType || null,
        location ? location.trim() : null,
        message ? message.trim() : null,
        'qr_code'
      ]
    );

    logger.info(`New host lead submitted: ${email} (ID: ${result.rows[0].id})`);

    res.status(201).json({
      success: true,
      message: 'Your details have been submitted successfully',
      leadId: result.rows[0].id,
    });
  } catch (error) {
    logger.error('Error submitting host lead:', error);
    res.status(500).json({ error: 'Failed to submit your details. Please try again.' });
  }
};

/**
 * Get all host leads (admin only)
 * GET /host-leads
 */
exports.getLeads = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM host_leads';
    const params = [];

    if (status) {
      params.push(status);
      query += ` WHERE status = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';
    params.push(parseInt(limit));
    query += ` LIMIT $${params.length}`;
    params.push(parseInt(offset));
    query += ` OFFSET $${params.length}`;

    const result = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM host_leads';
    const countParams = [];
    if (status) {
      countParams.push(status);
      countQuery += ` WHERE status = $${countParams.length}`;
    }
    const countResult = await db.query(countQuery, countParams);

    res.json({
      leads: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    logger.error('Error fetching host leads:', error);
    res.status(500).json({ error: 'Failed to fetch host leads' });
  }
};

/**
 * Get a single host lead (admin only)
 * GET /host-leads/:id
 */
exports.getLead = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM host_leads WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching host lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
};

/**
 * Update a host lead (admin only)
 * PATCH /host-leads/:id
 */
exports.updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes, followed_up_at } = req.body;

    const updates = [];
    const values = [];

    if (status) {
      values.push(status);
      updates.push(`status = $${values.length}`);
    }
    if (admin_notes !== undefined) {
      values.push(admin_notes);
      updates.push(`admin_notes = $${values.length}`);
    }
    if (followed_up_at) {
      values.push(followed_up_at);
      updates.push(`followed_up_at = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(new Date().toISOString());
    updates.push(`updated_at = $${values.length}`);

    values.push(id);
    const query = `UPDATE host_leads SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating host lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
};

/**
 * Get host lead statistics (admin only)
 * GET /host-leads/stats/summary
 */
exports.getLeadStats = async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'new') as new_leads,
        COUNT(*) FILTER (WHERE status = 'contacted') as contacted,
        COUNT(*) FILTER (WHERE status = 'converted') as converted,
        COUNT(*) FILTER (WHERE status = 'not_interested') as not_interested,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7_days,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as last_30_days
      FROM host_leads
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    logger.error('Error fetching lead stats:', error);
    res.status(500).json({ error: 'Failed to fetch lead statistics' });
  }
};
