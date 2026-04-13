const { pool } = require('../config/database');

// Submit a new host application
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

    // Check for existing pending application
    const existing = await pool.query(
      'SELECT id, status FROM host_applications WHERE user_id = $1 AND status = $2',
      [user_id, 'pending']
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You already have a pending host application' });
    }

    const result = await pool.query(
      `INSERT INTO host_applications
        (user_id, contact_name, email, phone, business_description, address, latitude, longitude, business_type, van_spaces, referral_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [user_id, contact_name, email, phone, business_description || null, address || null, latitude || null, longitude || null, business_type || null, van_spaces || 1, referral_code || null]
    );

    res.status(201).json(result.rows[0]);
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
