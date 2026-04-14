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

    // Unread messages count (only messages with a booking_id that the user can actually see)
    // For admin in host/admin mode, also count messages sent to hosts of managed places
    // In user mode, only count messages directly to the admin
    const mode = req.query.mode || '';
    let effectiveReceiverIds = [userId];
    if (userRole === 'admin' && mode !== 'user') {
      const hostsResult = await db.query(
        `SELECT DISTINCT p.owner_id FROM places p WHERE p.owner_id IS NOT NULL AND p.owner_id != $1`,
        [userId]
      );
      effectiveReceiverIds.push(...hostsResult.rows.map(r => r.owner_id));
    }
    const receiverPlaceholders = effectiveReceiverIds.map((_, i) => `$${i + 1}`).join(', ');

    // Mark all incoming messages as delivered (recipient's app is active)
    await db.query(
      `UPDATE messages SET delivered = true WHERE receiver_id IN (${receiverPlaceholders}) AND delivered = false`,
      effectiveReceiverIds
    );

    const messagesResult = await db.query(
      `SELECT COUNT(*) as count FROM messages WHERE receiver_id IN (${receiverPlaceholders}) AND read = false AND booking_id IS NOT NULL AND sender_id NOT IN (${receiverPlaceholders})`,
      effectiveReceiverIds
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

    // Get pending/new bookings count
    // Use mode param so admin-in-host-mode gets host-style counts
    const effectiveRole = (userRole === 'admin' && mode === 'host') ? 'host' : userRole;

    if (effectiveRole === 'admin') {
      // Admin sees all pending bookings
      const bookingsResult = await db.query(
        `SELECT COUNT(*) as count FROM bookings WHERE status IN ('pending', 'confirmed')`
      );
      counts.pendingBookings = parseInt(bookingsResult.rows[0]?.count || 0);
    } else if (effectiveRole === 'host') {
      // Host sees unseen bookings for their places
      const bookingsResult = await db.query(
        `SELECT COUNT(b.id) as count FROM bookings b
         JOIN places p ON b.place_id = p.id
         WHERE p.owner_id = $1 AND b.status IN ('pending', 'confirmed') AND (b.host_seen = false OR b.host_seen IS NULL)`,
        [userId]
      );
      counts.pendingBookings = parseInt(bookingsResult.rows[0]?.count || 0);
    } else {
      // User sees their own pending bookings
      const bookingsResult = await db.query(
        `SELECT COUNT(*) as count FROM bookings WHERE user_id = $1 AND status = 'pending'`,
        [userId]
      );
      counts.pendingBookings = parseInt(bookingsResult.rows[0]?.count || 0);
    }

    if (effectiveRole === 'host' || effectiveRole === 'admin') {

      // Host requests (place applications) - pending places awaiting approval from admin
      if (effectiveRole === 'admin') {
        const hostRequestsResult = await db.query(
          `SELECT COUNT(*) as count FROM places WHERE approval_status = 'pending' AND deleted_at IS NULL`
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
      } else if (effectiveRole === 'host') {
        // Host sees unseen status changes (approved/rejected) on their sites
        const hostAppsResult = await db.query(
          `SELECT COUNT(*) as count FROM places WHERE owner_id = $1 AND host_status_seen = false AND deleted_at IS NULL`,
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

/**
 * GET /notifications/unread-by-booking
 * Get unread message counts grouped by booking_id for the current user
 */
async function getUnreadByBooking(req, res, next) {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // For admin, also count messages sent to hosts of managed places
    let effectiveReceiverIds = [userId];
    if (userRole === 'admin') {
      const hostsResult = await db.query(
        `SELECT DISTINCT p.owner_id FROM places p WHERE p.owner_id IS NOT NULL AND p.owner_id != $1`,
        [userId]
      );
      effectiveReceiverIds.push(...hostsResult.rows.map(r => r.owner_id));
    }
    const receiverPlaceholders = effectiveReceiverIds.map((_, i) => `$${i + 1}`).join(', ');
    const result = await db.query(
      `SELECT booking_id, COUNT(*) as unread_count
       FROM messages
       WHERE receiver_id IN (${receiverPlaceholders}) AND read = false AND booking_id IS NOT NULL
       GROUP BY booking_id`,
      effectiveReceiverIds
    );

    const unreadByBooking = {};
    for (const row of result.rows) {
      unreadByBooking[row.booking_id] = parseInt(row.unread_count);
    }

    return res.json({ unreadByBooking });
  } catch (error) {
    logger.error('Error getting unread by booking', { error: error.message });
    return next(error);
  }
}

/**
 * POST /notifications/sites/mark-seen
 * Mark all site status notifications as seen for the current host
 */
async function markSitesSeen(req, res, next) {
  try {
    const userId = req.user.userId;

    await db.query(
      `UPDATE places SET host_status_seen = true WHERE owner_id = $1 AND host_status_seen = false`,
      [userId]
    );

    logger.info('Site notifications marked as seen', { userId });
    return res.json({ message: 'Sites marked as seen' });
  } catch (error) {
    logger.error('Error marking sites as seen', { error: error.message });
    return next(error);
  }
}

module.exports = {
  getNotificationCounts,
  getUnreadByBooking,
  markMessageAsRead,
  markAllMessagesFromSenderAsRead,
  markSitesSeen,
};
