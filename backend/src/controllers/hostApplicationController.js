const { pool } = require('../config/database');

// Submit a new host application — auto-approved, user becomes host immediately
const submitApplication = async (req, res) => {
  try {
    const {
      user_id,
      contact_name,
      email,
      phone,
      business_description,
      address,
      latitude,
      longitude,
      business_type,
      van_spaces,
      referral_code,
    } = req.body;

    if (!user_id || !contact_name || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields: user_id, contact_name, email, phone' });
    }

    // Check for existing application (any status)
    const existing = await pool.query(
      'SELECT id, status FROM host_applications WHERE user_id = $1',
      [user_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You already have a host application' });
    }

    // Auto-approve: insert as 'approved'
    const result = await pool.query(
      `INSERT INTO host_applications
        (user_id, contact_name, email, phone, business_description, address, latitude, longitude, business_type, van_spaces, referral_code, status, reviewed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'approved', NOW())
       RETURNING *`,
      [user_id, contact_name, email, phone, business_description || null, address || null, latitude || null, longitude || null, business_type || null, van_spaces || 1, referral_code || null]
    );

    // Upgrade user role to host
    await pool.query("UPDATE users SET role = 'host' WHERE id = $1 AND role = 'user'", [user_id]);

    res.status(201).json({ ...result.rows[0], role_upgraded: true });
  } catch (error) {
    console.error('Error submitting host application:', error);
    res.status(500).json({ error: 'Failed to submit host application' });
  }
};

// Get application status for a user
const getApplicationStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      'SELECT * FROM host_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No host application found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting host application status:', error);
    res.status(500).json({ error: 'Failed to get application status' });
  }
};

module.exports = {
  submitApplication,
  getApplicationStatus,
};
