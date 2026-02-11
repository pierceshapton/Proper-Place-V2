const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /notifications/counts
 * Get unseen notification counts for the current user
 * Returns: { unreadMessages, pendingBookings, hostRequests, pendingApprovals, siteSubmissions }
 */
async function getNotificationCounts(req, res, next) {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Unread messages count
    const messagesResult = await db.query(
      `SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND read = false`,
      [userId]
    );
    const unreadMessages = parseInt(messagesResult.rows[0]?.count || 0);

    let counts = {
      unreadMessages,
      pendingBookings: 0,
      hostRequests: 0,
      pendingApprovals: 0,
      siteSubmissions: 0,
      pendingHostApplications: 0,
    };

    // Host or Admin: Get pending bookings for their places
    if (userRole === 'host' || userRole === 'admin') {
      let bookingsQuery;
      let bookingsParams;

      if (userRole === 'admin') {
        // Admin sees all pending bookings
        bookingsQuery = `
          SELECT COUNT(*) as count FROM bookings 
          WHERE status IN ('pending', 'confirmed')
        `;
        bookingsParams = [];
      } else {
        // Host sees pending bookings for their places
        bookingsQuery = `
          SELECT COUNT(b.id) as count FROM bookings b
          JOIN places p ON b.place_id = p.id
          WHERE p.owner_id = $1 AND b.status IN ('pending', 'confirmed')
        `;
        bookingsParams = [userId];
      }

      const bookingsResult = await db.query(bookingsQuery, bookingsParams);
      counts.pendingBookings = parseInt(bookingsResult.rows[0]?.count || 0);

      // Host requests (place applications) - pending places awaiting approval from admin
      if (userRole === 'admin') {
        const hostRequestsResult = await db.query(
          `SELECT COUNT(*) as count FROM places WHERE approval_status = 'pending'`
        );
        counts.pendingApprovals = parseInt(hostRequestsResult.rows[0]?.count || 0);
        
        // Pending host applications (if they exist in a separate table)
        try {
          const hostAppsResult = await db.query(
            `SELECT COUNT(*) as count FROM host_applications WHERE status = 'pending'`
          );
          counts.pendingHostApplications = parseInt(hostAppsResult.rows[0]?.count || 0);
        } catch (e) {
          // Table doesn't exist yet - ignore
          counts.pendingHostApplications = 0;
        }
      } else if (userRole === 'host') {
        // Host sees their pending place submissions
        const hostAppsResult = await db.query(
          `SELECT COUNT(*) as count FROM places WHERE owner_id = $1 AND approval_status = 'pending'`,
          [userId]
        );
        counts.siteSubmissions = parseInt(hostAppsResult.rows[0]?.count || 0);
      }
    }

    logger.info('Notification counts retrieved', { userId, counts });
    return res.json(counts);
  } catch (error) {
    logger.error('Error getting notification counts', { error: error.message });
    return next(error);
  }
}

/**
 * PATCH /notifications/messages/:messageId/read
 * Mark a message as read
 */
async function markMessageAsRead(req, res, next) {
  try {
    const userId = req.user.userId;
    const { messageId } = req.params;

    const result = await db.query(
      `UPDATE messages 
       SET read = true 
       WHERE id = $1 AND receiver_id = $2
       RETURNING *`,
      [messageId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    logger.info('Message marked as read', { messageId, userId });
    return res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error marking message as read', { error: error.message });
    return next(error);
  }
}

/**
 * PATCH /notifications/messages/read-all
 * Mark all messages from a sender as read
 */
async function markAllMessagesFromSenderAsRead(req, res, next) {
  try {
    const userId = req.user.userId;
    const { senderId } = req.body;

    if (!senderId) {
      return res.status(400).json({ error: 'senderId is required' });
    }

    const result = await db.query(
      `UPDATE messages 
       SET read = true 
       WHERE receiver_id = $1 AND sender_id = $2 AND read = false
       RETURNING COUNT(*) as updated`,
      [userId, senderId]
    );

    logger.info('All messages from sender marked as read', { userId, senderId });
    return res.json({ 
      message: 'Messages marked as read',
      updated: result.rowCount 
    });
  } catch (error) {
    logger.error('Error marking all messages as read', { error: error.message });
    return next(error);
  }
}

module.exports = {
  getNotificationCounts,
  markMessageAsRead,
  markAllMessagesFromSenderAsRead,
};
