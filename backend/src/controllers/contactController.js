const db = require('../config/database');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

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

    // Validation
    if (!userEmail || !category || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate urgency score
    const urgencyScore = calculateUrgencyScore(subject, message, category);

    // Try to get userId from: 1) auth token, 2) request body, 3) allow null for anonymous
    let safeUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        if (decoded.userId) safeUserId = decoded.userId;
      } catch (e) {
        // Token invalid/expired - fall through to body userId
      }
    }
    if (!safeUserId && Number.isInteger(Number(userId)) && Number(userId) > 0) {
      safeUserId = Number(userId);
    }
    // safeUserId can be null for anonymous/website submissions

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
    const { status, limit = 100, offset = 0 } = req.query;
    const filterByStatus = status && status !== 'all';

    // Fetch contacts with user details
    const contactsQuery = filterByStatus
      ? `SELECT c.id, c.user_id, c.user_email, u.name, u.phone_number, u.avatar_url, u.role AS user_role, c.category, c.subject, c.message, c.urgency_score, c.status, c.admin_notes, c.responded_by, c.responded_at, c.created_at, c.updated_at FROM contacts c LEFT JOIN users u ON c.user_id = u.id WHERE c.status = $1 ORDER BY c.urgency_score DESC, c.created_at DESC LIMIT $2 OFFSET $3`
      : `SELECT c.id, c.user_id, c.user_email, u.name, u.phone_number, u.avatar_url, u.role AS user_role, c.category, c.subject, c.message, c.urgency_score, c.status, c.admin_notes, c.responded_by, c.responded_at, c.created_at, c.updated_at FROM contacts c LEFT JOIN users u ON c.user_id = u.id ORDER BY c.urgency_score DESC, c.created_at DESC LIMIT $1 OFFSET $2`;
    const contactsParams = filterByStatus ? [status, limit, offset] : [limit, offset];
    const result = await db.query(contactsQuery, contactsParams);

    // Get total count
    const countResult = filterByStatus
      ? await db.query('SELECT COUNT(*) as total FROM contacts WHERE status = $1', [status])
      : await db.query('SELECT COUNT(*) as total FROM contacts');

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
      LEFT JOIN users u ON c.user_id = u.id
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

    // Fetch reply thread
    const repliesResult = await db.query(
      `SELECT cr.id, cr.contact_id, cr.admin_id, cr.body, cr.sent_email, cr.created_at, u.name as admin_name
       FROM contact_replies cr
       LEFT JOIN users u ON cr.admin_id = u.id
       WHERE cr.contact_id = $1
       ORDER BY cr.created_at ASC`,
      [id]
    );

    const contact = {
      ...result.rows[0],
      status: result.rows[0].status === 'new' ? 'read' : result.rows[0].status,
      replies: repliesResult.rows,
    };
    res.json({ contact });
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
 * Add a reply to a contact ticket and email the user
 * POST /contacts/:id/reply
 */
exports.addReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body;
    const adminId = req.user?.userId;

    if (!adminId) return res.status(401).json({ error: 'Unauthorized' });
    if (!body || !body.trim()) return res.status(400).json({ error: 'Reply body is required' });

    const userResult = await db.query('SELECT role, name FROM users WHERE id = $1', [adminId]);
    if (!userResult.rows[0] || userResult.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const contactResult = await db.query('SELECT * FROM contacts WHERE id = $1', [id]);
    if (!contactResult.rows[0]) return res.status(404).json({ error: 'Contact not found' });
    const contact = contactResult.rows[0];

    // Insert the reply
    const replyResult = await db.query(
      `INSERT INTO contact_replies (contact_id, admin_id, body, sent_email) VALUES ($1, $2, $3, true) RETURNING *`,
      [id, adminId, body.trim()]
    );
    const reply = { ...replyResult.rows[0], admin_name: userResult.rows[0].name };

    // Advance status to in_progress if it was unactioned
    let newStatus = contact.status;
    if (['new', 'read', 'open'].includes(contact.status)) {
      await db.query(
        `UPDATE contacts SET status = 'in_progress', responded_by = $1, responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [adminId, id]
      );
      newStatus = 'in_progress';
    }

    // Send email to user
    try {
      const { sendSupportReplyEmail } = require('../utils/email');
      await sendSupportReplyEmail(contact.user_email, contact.subject, contact.message, body.trim());
    } catch (emailErr) {
      logger.warn('Support reply email failed', { error: emailErr.message, contactId: id });
      await db.query('UPDATE contact_replies SET sent_email = false WHERE id = $1', [reply.id]);
      reply.sent_email = false;
    }

    logger.info(`Reply added to contact ${id} by admin ${adminId}`);
    res.json({ success: true, reply, status: newStatus });
  } catch (error) {
    logger.error('Error adding contact reply:', error);
    res.status(500).json({ error: 'Failed to add reply' });
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
