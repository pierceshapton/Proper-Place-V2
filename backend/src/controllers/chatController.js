const db = require('../config/database');
const logger = require('../utils/logger');
const pushService = require('../services/pushNotificationService');

/**
 * For admin users acting as host, resolve the actual host_id from a booking.
 * Returns the host_id if user is admin and the booking exists, otherwise returns the user's own id.
 */
async function _resolveEffectiveUserId(userId, userRole, bookingId) {
  if (userRole === 'admin' && bookingId) {
    const result = await db.query(
      `SELECT p.owner_id as host_id FROM bookings b
       JOIN places p ON b.place_id = p.id
       WHERE b.id = $1`,
      [bookingId]
    );
    if (result.rows.length > 0 && result.rows[0].host_id) {
      return result.rows[0].host_id;
    }
  }
  return userId;
}

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

/**
 * GET /conversations
 * Get all conversations for the current user with latest message and unread count
 */
async function getConversations(req, res, next) {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    console.log('[ChatController] Getting conversations for userId:', userId, 'role:', userRole);

    // For admin users, also include conversations from places they manage
    let effectiveUserIds = [userId];
    if (userRole === 'admin') {
      const hostsResult = await db.query(
        `SELECT DISTINCT p.owner_id FROM places p WHERE p.owner_id IS NOT NULL`
      );
      const hostIds = hostsResult.rows.map(r => r.owner_id).filter(id => id !== userId);
      effectiveUserIds = [...effectiveUserIds, ...hostIds];
    }

    // Build query for all effective user IDs
    const placeholders = effectiveUserIds.map((_, i) => `$${i + 1}`).join(', ');

    // Auto-mark self-messages as read (messages where both sender and receiver are effective user IDs)
    // These conversations are hidden from the list, so the user can never open them to mark as read
    await db.query(
      `UPDATE messages SET read = true
       WHERE sender_id IN (${placeholders}) AND receiver_id IN (${placeholders}) AND read = false`,
      effectiveUserIds
    );

    const result = await db.query(
      `WITH conversation_partners AS (
        SELECT DISTINCT 
          CASE WHEN sender_id IN (${placeholders}) THEN receiver_id ELSE sender_id END as partner_id,
          CASE WHEN sender_id IN (${placeholders}) THEN sender_id ELSE 
            CASE WHEN receiver_id IN (${placeholders}) THEN receiver_id END
          END as effective_user_id
        FROM messages
        WHERE sender_id IN (${placeholders}) OR receiver_id IN (${placeholders})
      ),
      latest_messages AS (
        SELECT DISTINCT ON (
          CASE WHEN m.sender_id IN (${placeholders}) THEN m.receiver_id ELSE m.sender_id END
        )
          m.id as message_id,
          m.content,
          m.created_at,
          m.read,
          m.sender_id,
          m.receiver_id,
          m.booking_id,
          CASE WHEN m.sender_id IN (${placeholders}) THEN m.receiver_id ELSE m.sender_id END as partner_id
        FROM messages m
        WHERE m.sender_id IN (${placeholders}) OR m.receiver_id IN (${placeholders})
        ORDER BY 
          CASE WHEN m.sender_id IN (${placeholders}) THEN m.receiver_id ELSE m.sender_id END,
          m.created_at DESC
      ),
      unread_counts AS (
        SELECT 
          sender_id as partner_id,
          COUNT(*) as unread_count
        FROM messages
        WHERE receiver_id IN (${placeholders}) AND read = false AND sender_id NOT IN (${placeholders})
        GROUP BY sender_id
      )
      SELECT 
        lm.message_id,
        lm.content as last_message,
        lm.created_at as last_message_at,
        lm.read as last_message_read,
        lm.sender_id as last_message_sender_id,
        lm.booking_id,
        lm.partner_id,
        u.id as partner_user_id,
        u.name as partner_name,
        u.email as partner_email,
        u.role as partner_role,
        COALESCE(uc.unread_count, 0) as unread_count,
        b.id as booking_id_ref,
        p.name as place_name
      FROM latest_messages lm
      JOIN users u ON u.id = lm.partner_id
      LEFT JOIN unread_counts uc ON uc.partner_id = lm.partner_id
      LEFT JOIN bookings b ON b.id = lm.booking_id
      LEFT JOIN places p ON p.id = b.place_id
      WHERE lm.partner_id NOT IN (${placeholders})
      ORDER BY lm.created_at DESC`,
      effectiveUserIds
    );

    console.log('[ChatController] Found ' + result.rows.length + ' conversations for userId:', userId);

    const conversations = result.rows.map(row => ({
      partnerId: row.partner_user_id,
      partnerName: row.partner_name,
      partnerEmail: row.partner_email,
      partnerRole: row.partner_role,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at,
      lastMessageSenderId: row.last_message_sender_id,
      lastMessageRead: row.last_message_read,
      unreadCount: parseInt(row.unread_count),
      bookingId: row.booking_id_ref,
      placeName: row.place_name,
    }));

    return res.json({ conversations });
  } catch (error) {
    console.error('[ChatController] Error fetching conversations:', error.message);
    console.error('[ChatController] Error details:', error);
    logger.error('Error fetching conversations', { error: error.message });
    return next(error);
  }
}

/**
 * GET /conversations/:otherUserId/messages
 * Get all messages between current user and another user
 */
async function getMessages(req, res, next) {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const otherUserId = parseInt(req.params.otherUserId);

    // For admin users, include all host IDs as effective user IDs
    let effectiveUserIds = [userId];
    if (userRole === 'admin') {
      const hostsResult = await db.query(
        `SELECT DISTINCT p.owner_id FROM places p WHERE p.owner_id IS NOT NULL`
      );
      const hostIds = hostsResult.rows.map(r => r.owner_id).filter(id => id !== userId);
      effectiveUserIds = [...effectiveUserIds, ...hostIds];
    }

    const placeholders = effectiveUserIds.map((_, i) => `$${i + 1}`).join(', ');
    const otherParam = `$${effectiveUserIds.length + 1}`;
    const params = [...effectiveUserIds, otherUserId];

    // Mark incoming messages as delivered when fetching
    await db.query(
      `UPDATE messages SET delivered = true
       WHERE sender_id = ${otherParam} AND receiver_id IN (${placeholders}) AND delivered = false`,
      params
    );

    const result = await db.query(
      `SELECT 
        m.id,
        m.sender_id,
        m.receiver_id,
        m.content,
        m.attachment_url,
        m.delivered,
        m.read,
        m.created_at,
        m.booking_id,
        u.name as sender_name,
        u.email as sender_email
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE (m.sender_id IN (${placeholders}) AND m.receiver_id = ${otherParam})
         OR (m.sender_id = ${otherParam} AND m.receiver_id IN (${placeholders}))
      ORDER BY m.created_at ASC`,
      params
    );

    return res.json({ messages: result.rows });
  } catch (error) {
    logger.error('Error fetching messages', { error: error.message });
    return next(error);
  }
}

/**
 * POST /messages
 * Send a new message
 * Enforces 72-hour post-checkout chat window for completed bookings
 */
async function sendMessage(req, res, next) {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { receiverId, receiver_id, content, bookingId, booking_id, attachmentUrl } = req.body;
    const actualReceiverId = receiverId || receiver_id;
    const actualBookingId = bookingId || booking_id;

    if (!actualReceiverId || !content) {
      return res.status(400).json({ error: 'receiverId and content are required' });
    }

    // Resolve effective user: admin sends as the booking's host
    const effectiveSenderId = await _resolveEffectiveUserId(userId, userRole, actualBookingId);

    // Enforce 72-hour chat window for completed bookings (admins bypass)
    if (actualBookingId && userRole !== 'admin') {
      const bookingResult = await db.query(
        `SELECT b.status, b.check_out_date, b.check_out_time, p.owner_id as host_id
         FROM bookings b
         LEFT JOIN places p ON b.place_id = p.id
         WHERE b.id = $1`,
        [actualBookingId]
      );
      const booking = bookingResult.rows[0];
      if (booking) {
        const status = (booking.status || '').toLowerCase();
        if (status === 'completed' && booking.check_out_date) {
          const rawTime = booking.check_out_time || '12:00:00';
          const checkOutTime = rawTime.length <= 5 ? rawTime + ':00' : rawTime;
          const checkOutDateTime = new Date(`${booking.check_out_date.toISOString().split('T')[0]}T${checkOutTime}`);
          const hoursSinceCheckout = (Date.now() - checkOutDateTime.getTime()) / (1000 * 60 * 60);

          if (hoursSinceCheckout > 72) {
            // Check if chat has been reopened (and reopen window hasn't expired)
            const reopenResult = await db.query(
              `SELECT id, responded_at FROM chat_reopen_requests WHERE booking_id = $1 AND status = 'approved' ORDER BY responded_at DESC LIMIT 1`,
              [actualBookingId]
            );
            const reopenReq = reopenResult.rows[0];
            if (!reopenReq) {
              return res.status(403).json({ error: 'Chat closed', message: 'The chat window for this booking has closed (72 hours after checkout). Request to reopen to continue messaging.' });
            }
            // Enforce 24-hour reopen window
            const hoursSinceReopen = (Date.now() - new Date(reopenReq.responded_at).getTime()) / (1000 * 60 * 60);
            if (hoursSinceReopen > 24) {
              return res.status(403).json({ error: 'Chat closed', message: 'The reopened chat window has expired (24 hours). Request to reopen again to continue messaging.' });
            }
          }
        }
      }
    }

    const result = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content, booking_id, attachment_url, delivered, read, created_at)
       VALUES ($1, $2, $3, $4, $5, false, false, NOW())
       RETURNING *`,
      [effectiveSenderId, actualReceiverId, content, actualBookingId || null, attachmentUrl || null]
    );

    const message = result.rows[0];

    // Get sender info (use effective sender, not admin)
    const senderResult = await db.query(
      'SELECT name, email FROM users WHERE id = $1',
      [effectiveSenderId]
    );

    // Send push notification to receiver (fire-and-forget)
    _notifyNewMessageAsync(actualReceiverId, senderResult.rows[0]?.name || 'Someone', content);

    return res.status(201).json({
      message: {
        ...message,
        sender_name: senderResult.rows[0]?.name,
        sender_email: senderResult.rows[0]?.email,
      }
    });
  } catch (error) {
    logger.error('Error sending message', { error: error.message });
    return next(error);
  }
}

/**
 * Send push notification for new message (fire-and-forget, after response).
 */
function _notifyNewMessageAsync(receiverId, senderName, content) {
  setImmediate(() => {
    pushService.notifyNewMessage(receiverId, senderName, content).catch(() => {});
  });
}

/**
 * PUT /conversations/:otherUserId/read
 * Mark all messages from a user as read
 */
async function markConversationAsRead(req, res, next) {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const otherUserId = parseInt(req.params.otherUserId);

    // For admin, resolve all effective user IDs (admin acts as all hosts)
    let effectiveReceiverIds = [userId];
    if (userRole === 'admin') {
      const hostsResult = await db.query(
        `SELECT DISTINCT p.owner_id FROM places p WHERE p.owner_id IS NOT NULL`
      );
      const hostIds = hostsResult.rows.map(r => r.owner_id).filter(id => id !== userId);
      effectiveReceiverIds = [userId, ...hostIds];
    }

    const placeholders = effectiveReceiverIds.map((_, i) => `$${i + 2}`).join(', ');
    const result = await db.query(
      `UPDATE messages 
       SET read = true
       WHERE sender_id = $1 AND receiver_id IN (${placeholders}) AND read = false
       RETURNING id`,
      [otherUserId, ...effectiveReceiverIds]
    );

    logger.info('Conversation marked as read', {
      userId,
      otherUserId,
      messagesMarked: result.rows.length,
    });

    return res.json({
      message: 'Conversation marked as read',
      messagesMarked: result.rows.length,
    });
  } catch (error) {
    logger.error('Error marking conversation as read', { error: error.message });
    return next(error);
  }
}

/**
 * PUT /bookings/:bookingId/read
 * Mark all messages in a booking as read for the current user
 */
async function markBookingAsRead(req, res, next) {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const bookingId = parseInt(req.params.bookingId);

    if (!bookingId || isNaN(bookingId)) {
      return res.status(400).json({ error: 'Valid bookingId is required' });
    }

    // Resolve effective user: admin acts as the booking's host
    const effectiveUserId = await _resolveEffectiveUserId(userId, userRole, bookingId);

    const result = await db.query(
      `UPDATE messages 
       SET read = true
       WHERE booking_id = $1 AND receiver_id = $2 AND read = false
       RETURNING id`,
      [bookingId, effectiveUserId]
    );

    logger.info('Booking messages marked as read', {
      userId,
      bookingId,
      messagesMarked: result.rows.length,
    });

    return res.json({
      message: 'Booking messages marked as read',
      messagesMarked: result.rows.length,
    });
  } catch (error) {
    logger.error('Error marking booking as read', { error: error.message });
    return next(error);
  }
}

/**
 * DELETE /messages/clear-all
 * Clear all old messages (admin only, for fresh start)
 */
async function clearAllMessages(req, res, next) {
  try {
    const result = await db.query('DELETE FROM messages RETURNING id');
    
    logger.info('All messages cleared', { count: result.rows.length });
    return res.json({
      message: 'All messages cleared',
      deletedCount: result.rows.length,
    });
  } catch (error) {
    logger.error('Error clearing messages', { error: error.message });
    return next(error);
  }
}

/**
 * GET /bookings/:bookingId/messages
 * Get all messages for a specific booking
 */
async function getMessagesByBooking(req, res, next) {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const bookingId = parseInt(req.params.bookingId);

    if (!bookingId || isNaN(bookingId)) {
      return res.status(400).json({ error: 'Valid bookingId is required' });
    }

    // Resolve effective user: admin acts as the booking's host
    const effectiveUserId = await _resolveEffectiveUserId(userId, userRole, bookingId);

    // Mark incoming messages as delivered when fetching
    await db.query(
      `UPDATE messages SET delivered = true
       WHERE booking_id = $1 AND receiver_id = $2 AND delivered = false`,
      [bookingId, effectiveUserId]
    );

    const result = await db.query(
      `SELECT 
        m.id,
        m.sender_id,
        m.receiver_id,
        m.content,
        m.attachment_url,
        m.delivered,
        m.read,
        m.created_at,
        m.booking_id,
        u.name as sender_name,
        u.email as sender_email
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.booking_id = $1
        AND (m.sender_id = $2 OR m.receiver_id = $2)
      ORDER BY m.created_at ASC`,
      [bookingId, effectiveUserId]
    );

    return res.json({ messages: result.rows });
  } catch (error) {
    logger.error('Error fetching messages by booking', { error: error.message });
    return next(error);
  }
}

/**
 * PUT /conversations/:otherUserId/delivered
 * Mark all messages from a user as delivered
 */
async function markMessagesAsDelivered(req, res, next) {
  try {
    const userId = req.user.userId;
    const otherUserId = parseInt(req.params.otherUserId);

    const result = await db.query(
      `UPDATE messages
       SET delivered = true
       WHERE sender_id = $1 AND receiver_id = $2 AND delivered = false
       RETURNING id`,
      [otherUserId, userId]
    );

    return res.json({
      message: 'Messages marked as delivered',
      messagesMarked: result.rows.length,
    });
  } catch (error) {
    logger.error('Error marking messages as delivered', { error: error.message });
    return next(error);
  }
}

/**
 * GET /response-time/:hostId
 * Calculate a host's typical response time based on their reply patterns
 */
async function getResponseTime(req, res, next) {
  try {
    const hostId = parseInt(req.params.hostId);
    if (!hostId) {
      return res.status(400).json({ error: 'Invalid host ID' });
    }

    // Find pairs: user message → next host reply in the same booking
    // Calculate the median response time from the last 50 reply pairs
    const result = await db.query(
      `WITH reply_pairs AS (
        SELECT
          m1.created_at AS user_msg_time,
          (
            SELECT MIN(m2.created_at)
            FROM messages m2
            WHERE m2.sender_id = $1
              AND m2.booking_id = m1.booking_id
              AND m2.created_at > m1.created_at
          ) AS host_reply_time
        FROM messages m1
        WHERE m1.receiver_id = $1
          AND m1.booking_id IS NOT NULL
        ORDER BY m1.created_at DESC
        LIMIT 50
      )
      SELECT
        EXTRACT(EPOCH FROM percentile_cont(0.5) WITHIN GROUP (ORDER BY host_reply_time - user_msg_time)) AS median_seconds,
        COUNT(*) AS sample_size
      FROM reply_pairs
      WHERE host_reply_time IS NOT NULL`,
      [hostId]
    );

    const row = result.rows[0];
    const medianSeconds = row?.median_seconds ? parseFloat(row.median_seconds) : null;
    const sampleSize = parseInt(row?.sample_size || 0);

    let label = null;
    if (sampleSize < 3 || medianSeconds === null) {
      label = null; // Not enough data
    } else if (medianSeconds < 300) {
      label = 'within a few minutes';
    } else if (medianSeconds < 3600) {
      label = 'within an hour';
    } else if (medianSeconds < 14400) {
      label = 'within a few hours';
    } else if (medianSeconds < 86400) {
      label = 'within a day';
    } else {
      label = 'within a few days';
    }

    return res.json({
      hostId,
      medianSeconds: medianSeconds ? Math.round(medianSeconds) : null,
      sampleSize,
      label,
    });
  } catch (error) {
    logger.error('Error getting response time', { error: error.message });
    return next(error);
  }
}

/**
 * GET /bookings/:bookingId/status
 * Get chat status for a booking (open, closing soon, closed, reopened)
 */
async function getChatStatus(req, res, next) {
  try {
    const bookingId = parseInt(req.params.bookingId);
    if (!bookingId) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    const bookingResult = await db.query(
      `SELECT b.status, b.check_out_date, b.check_out_time
       FROM bookings b WHERE b.id = $1`,
      [bookingId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];
    const status = (booking.status || '').toLowerCase();

    // Not completed — chat is fully open
    if (status !== 'completed') {
      return res.json({ chatStatus: 'open', hoursRemaining: null, reopenRequestId: null, reopenStatus: null });
    }

    const rawTime = booking.check_out_time || '12:00:00';
    const checkOutTime = rawTime.length <= 5 ? rawTime + ':00' : rawTime;
    const checkOutDateTime = new Date(`${booking.check_out_date.toISOString().split('T')[0]}T${checkOutTime}`);
    const hoursSinceCheckout = (Date.now() - checkOutDateTime.getTime()) / (1000 * 60 * 60);

    if (hoursSinceCheckout <= 72) {
      const hoursRemaining = Math.max(0, Math.ceil(72 - hoursSinceCheckout));
      return res.json({ chatStatus: 'closing_soon', hoursRemaining, reopenRequestId: null, reopenStatus: null });
    }

    // Past 72 hours — check for reopen requests
    const reopenResult = await db.query(
      `SELECT id, status, requester_id, responded_at FROM chat_reopen_requests
       WHERE booking_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [bookingId]
    );

    const reopenReq = reopenResult.rows[0];
    if (reopenReq && reopenReq.status === 'approved') {
      // Check if the 24-hour reopen window has expired
      const reopenedAt = new Date(reopenReq.responded_at);
      const hoursSinceReopen = (Date.now() - reopenedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceReopen <= 24) {
        const hoursRemaining = Math.max(0, Math.ceil(24 - hoursSinceReopen));
        return res.json({ chatStatus: 'reopened', hoursRemaining, reopenRequestId: reopenReq.id, reopenStatus: 'approved', reopenedAt: reopenedAt.toISOString() });
      }
      // Reopen window expired — treat as closed
    }

    return res.json({
      chatStatus: 'closed',
      hoursRemaining: null,
      reopenRequestId: reopenReq?.id || null,
      reopenStatus: reopenReq?.status || null,
      reopenRequesterId: reopenReq?.requester_id || null,
      reopenedAt: (reopenReq && reopenReq.status === 'approved' && reopenReq.responded_at) ? new Date(reopenReq.responded_at).toISOString() : null,
    });
  } catch (error) {
    logger.error('Error getting chat status', { error: error.message });
    return next(error);
  }
}

/**
 * POST /bookings/:bookingId/reopen
 * Request to reopen chat for a completed booking (past 72hrs)
 */
async function requestChatReopen(req, res, next) {
  try {
    const userId = req.user.userId;
    const bookingId = parseInt(req.params.bookingId);

    if (!bookingId) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    // Check if there's already a pending request
    const existing = await db.query(
      `SELECT id, status FROM chat_reopen_requests
       WHERE booking_id = $1 AND status = 'pending'`,
      [bookingId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A reopen request is already pending for this booking' });
    }

    const result = await db.query(
      `INSERT INTO chat_reopen_requests (booking_id, requester_id, status, created_at)
       VALUES ($1, $2, 'pending', NOW())
       RETURNING *`,
      [bookingId, userId]
    );

    return res.status(201).json({ reopenRequest: result.rows[0] });
  } catch (error) {
    logger.error('Error requesting chat reopen', { error: error.message });
    return next(error);
  }
}

/**
 * PUT /reopen/:requestId/respond
 * Accept or decline a chat reopen request
 */
async function respondChatReopen(req, res, next) {
  try {
    const requestId = parseInt(req.params.requestId);
    const { accept } = req.body;

    if (typeof accept !== 'boolean') {
      return res.status(400).json({ error: 'accept (boolean) is required' });
    }

    const newStatus = accept ? 'approved' : 'declined';

    const result = await db.query(
      `UPDATE chat_reopen_requests
       SET status = $1, responded_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newStatus, requestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reopen request not found' });
    }

    return res.json({ reopenRequest: result.rows[0] });
  } catch (error) {
    logger.error('Error responding to chat reopen', { error: error.message });
    return next(error);
  }
}

module.exports = {
  deleteContact,
  markContactAsUnread,
  markContactAsRead,
  deleteMessage,
  getConversations,
  getMessages,
  getMessagesByBooking,
  sendMessage,
  markConversationAsRead,
  markBookingAsRead,
  markMessagesAsDelivered,
  clearAllMessages,
  getResponseTime,
  requestChatReopen,
  respondChatReopen,
  getChatStatus,
};
