const db = require('../config/database');
const logger = require('../utils/logger');

// Keywords for urgency scoring
const URGENCY_KEYWORDS = {
  critical: ['urgent', 'emergency', 'critical', 'broken', 'down', 'crash', 'error', 'payment failed'],
  complaint: ['complaint', 'unhappy', 'disappointed', 'poor', 'bad', 'terrible', 'worst'],
  issue: ['issue', 'problem', 'bug', 'error', 'not working', 'doesn\'t work', 'fails'],
  payment: ['payment', 'charge', 'refund', 'billing', 'money', 'card', 'stripe'],
  safety: ['safety', 'dangerous', 'unsafe', 'problem with safety'],
};

/**
 * Calculate urgency score (0-100) based on message content
 */
function calculateUrgencyScore(subject, message, category) {
  let score = 0;
  const text = `${subject} ${message}`.toLowerCase();

  // Category-based base score
  const categoryScores = {
    'Complaint': 60,
    'Technical Issue': 50,
    'Suggestion': 20,
    'General': 30,
    'Other': 25,
  };
  score = categoryScores[category] || 30;

  // Check for critical keywords
  for (const keyword of URGENCY_KEYWORDS.critical) {
    if (text.includes(keyword)) {
      score = Math.min(100, score + 40);
      break;
    }
  }

  // Check for complaint keywords
  for (const keyword of URGENCY_KEYWORDS.complaint) {
    if (text.includes(keyword)) {
      score = Math.min(100, score + 25);
      break;
    }
  }

  // Check for issue/payment keywords
  for (const keyword of [...URGENCY_KEYWORDS.issue, ...URGENCY_KEYWORDS.payment]) {
    if (text.includes(keyword)) {
      score = Math.min(100, score + 15);
      break;
    }
  }

  // Check for safety keywords (highest priority)
  for (const keyword of URGENCY_KEYWORDS.safety) {
    if (text.includes(keyword)) {
      score = Math.min(100, score + 50);
      break;
    }
  }

  return Math.min(100, score);
}

/**
 * Submit a contact form message
 * POST /contacts/submit
 */
exports.submitContact = async (req, res) => {
  try {
    const { userId, userEmail, category, subject, message } = req.body;

    // Validation - userId is optional for unauthenticated submissions
    if (!userEmail || !category || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate urgency score
    const urgencyScore = calculateUrgencyScore(subject, message, category);

    // Ensure userId is a valid integer (required by DB NOT NULL constraint)
    const safeUserId = Number.isInteger(Number(userId)) && Number(userId) > 0 ? Number(userId) : null;

    if (!safeUserId) {
      return res.status(400).json({ error: 'You must be logged in to submit a contact message' });
    }

    // Insert contact message
    const result = await db.query(
      `INSERT INTO contacts (user_id, user_email, category, subject, message, urgency_score, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'new')
       RETURNING id, created_at, urgency_score`,
      [safeUserId, userEmail, category, subject, message, urgencyScore]
    );

    logger.info(`Contact message submitted by ${userEmail} (userId: ${safeUserId}) with urgency ${urgencyScore}`);

    res.status(201).json({
      success: true,
      message: 'Your message has been received. We\'ll respond within 24 hours.',
      contactId: result.rows[0].id,
      urgencyScore: result.rows[0].urgency_score,
    });
  } catch (error) {
    logger.error('Error submitting contact form:', error);
    res.status(500).json({ error: 'Failed to submit contact message' });
  }
};

/**
 * Get all contact messages for admin (with filtering and sorting)
 * GET /contacts?status=new&sort=urgency
 */
exports.getContacts = async (req, res) => {
  try {
    // Check if user is admin
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify admin role (assuming req.user has role)
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (!userResult.rows[0] || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Query parameters
    const { status = 'new', limit = 50, offset = 0 } = req.query;

    // Fetch contacts with user details
    const result = await db.query(
      `SELECT 
        c.id,
        c.user_id,
        c.user_email,
        u.name,
        u.phone_number,
        u.avatar_url,
        u.role AS user_role,
        c.category,
        c.subject,
        c.message,
        c.urgency_score,
        c.status,
        c.admin_notes,
        c.responded_by,
        c.responded_at,
        c.created_at,
        c.updated_at
      FROM contacts c
      JOIN users u ON c.user_id = u.id
      WHERE c.status = $1
      ORDER BY 
        c.urgency_score DESC,
        c.created_at DESC
      LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM contacts WHERE status = $1',
      [status]
    );

    res.json({
      contacts: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    logger.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
};

/**
 * Get a single contact message with full details
 * GET /contacts/:id
 */
exports.getContact = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify admin role
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (!userResult.rows[0] || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Fetch contact with user details
    const result = await db.query(
      `SELECT 
        c.id,
        c.user_id,
        c.user_email,
        u.name,
        u.phone_number,
        u.email,
        u.avatar_url,
        u.bio,
        u.vehicle_registration,
        u.role,
        c.category,
        c.subject,
        c.message,
        c.urgency_score,
        c.status,
        c.admin_notes,
        c.responded_by,
        c.responded_at,
        c.created_at,
        c.updated_at
      FROM contacts c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1`,
      [id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Mark as read if it was new
    if (result.rows[0].status === 'new') {
      await db.query(
        'UPDATE contacts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['read', id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact details' });
  }
};

/**
 * Update contact message (add admin notes, change status, mark as responded)
 * PATCH /contacts/:id
 */
exports.updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes, status } = req.body;
    const adminId = req.user?.userId;

    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify admin role
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [adminId]);
    if (!userResult.rows[0] || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Build update query
    let updateFields = [];
    let params = [];
    let paramIndex = 1;

    if (adminNotes !== undefined) {
      updateFields.push(`admin_notes = $${paramIndex++}`);
      params.push(adminNotes);
    }

    if (status) {
      updateFields.push(`status = $${paramIndex++}`);
      params.push(status);
      
      // If marking as responded, also set responded_by and responded_at
      if (status === 'responded') {
        updateFields.push(`responded_by = $${paramIndex++}`);
        updateFields.push(`responded_at = CURRENT_TIMESTAMP`);
        params.push(adminId);
      }
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const query = `UPDATE contacts SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await db.query(query, params);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    logger.info(`Contact ${id} updated by admin ${adminId}`);

    res.json({
      success: true,
      contact: result.rows[0],
    });
  } catch (error) {
    logger.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
};

/**
 * Get summary statistics for admin dashboard
 * GET /contacts/stats/summary
 */
exports.getContactStats = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify admin role
    const userResult = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (!userResult.rows[0] || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'new') as new_count,
        COUNT(*) FILTER (WHERE status = 'read') as read_count,
        COUNT(*) FILTER (WHERE status = 'responded') as responded_count,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
        AVG(urgency_score) as avg_urgency,
        MAX(urgency_score) as max_urgency
      FROM contacts
    `);

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching contact stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};
