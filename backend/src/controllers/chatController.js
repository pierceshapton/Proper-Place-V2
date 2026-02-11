const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * DELETE /contacts/:id
 * Delete a contact/conversation
 */
async function deleteContact(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Delete the contact
    const result = await db.query(
      `DELETE FROM contacts WHERE id = $1 AND (user_id = $2 OR recipient_id = $2)
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    logger.info('Contact deleted', { contactId: id, userId });
    return res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    logger.error('Error deleting contact', { error: error.message });
    return next(error);
  }
}

/**
 * PATCH /contacts/:id/unread
 * Mark a contact/conversation as unread
 */
async function markContactAsUnread(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Update the contact's unread flag
    const result = await db.query(
      `UPDATE contacts 
       SET unread = true, updated_at = NOW()
       WHERE id = $1 AND (user_id = $2 OR recipient_id = $2)
       RETURNING id, unread`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    logger.info('Contact marked as unread', { contactId: id, userId });
    return res.json({
      message: 'Contact marked as unread',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Error marking contact as unread', { error: error.message });
    return next(error);
  }
}

/**
 * PATCH /contacts/:id/read
 * Mark a contact/conversation as read
 */
async function markContactAsRead(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Update the contact's unread flag
    const result = await db.query(
      `UPDATE contacts 
       SET unread = false, updated_at = NOW()
       WHERE id = $1 AND (user_id = $2 OR recipient_id = $2)
       RETURNING id, unread`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    logger.info('Contact marked as read', { contactId: id, userId });
    return res.json({
      message: 'Contact marked as read',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Error marking contact as read', { error: error.message });
    return next(error);
  }
}

/**
 * DELETE /messages/:id
 * Delete a single message
 */
async function deleteMessage(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Only allow deleting own messages or as admin
    const result = await db.query(
      `DELETE FROM messages 
       WHERE id = $1 AND (sender_id = $2 OR $2 IN (SELECT id FROM users WHERE role = 'admin'))
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found or unauthorized' });
    }

    logger.info('Message deleted', { messageId: id, userId });
    return res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    logger.error('Error deleting message', { error: error.message });
    return next(error);
  }
}

module.exports = {
  deleteContact,
  markContactAsUnread,
  markContactAsRead,
  deleteMessage,
};
