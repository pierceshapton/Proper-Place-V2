const db = require('../config/database');
const logger = require('../utils/logger');
const pushService = require('../services/pushNotificationService');

/**
 * GET /auto-messages/place/:placeId
 * Get auto-message templates for a place (host only)
 */
async function getTemplates(req, res, next) {
  try {
    const { placeId } = req.params;
    const userId = req.user.userId;

    // Verify the user owns this place
    const placeCheck = await db.query('SELECT owner_id FROM places WHERE id = $1', [placeId]);
    if (placeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }
    if (placeCheck.rows[0].owner_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await db.query(
      `SELECT * FROM auto_message_templates WHERE place_id = $1 ORDER BY trigger_type`,
      [placeId]
    );

    res.json({ templates: result.rows });
  } catch (error) {
    logger.error('Get auto-message templates error', { error: error.message });
    next(error);
  }
}

/**
 * PUT /auto-messages/place/:placeId
 * Save/update all auto-message templates for a place
 */
async function saveTemplates(req, res, next) {
  try {
    const { placeId } = req.params;
    const userId = req.user.userId;
    const { templates } = req.body;

    // Verify the user owns this place
    const placeCheck = await db.query('SELECT owner_id FROM places WHERE id = $1', [placeId]);
    if (placeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }
    if (placeCheck.rows[0].owner_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!Array.isArray(templates)) {
      return res.status(400).json({ error: 'templates must be an array' });
    }

    const validTriggers = ['on_booking', '24h_before_checkin', '1h_before_arrival', 'at_checkout'];

    // Upsert each template
    for (const t of templates) {
      if (!validTriggers.includes(t.trigger_type)) continue;

      await db.query(
        `INSERT INTO auto_message_templates (place_id, host_id, trigger_type, message_content, enabled)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (place_id, trigger_type)
         DO UPDATE SET message_content = $4, enabled = $5, updated_at = NOW()`,
        [placeId, userId, t.trigger_type, t.message_content || '', t.enabled !== false]
      );
    }

    const result = await db.query(
      `SELECT * FROM auto_message_templates WHERE place_id = $1 ORDER BY trigger_type`,
      [placeId]
    );

    res.json({ templates: result.rows });
  } catch (error) {
    logger.error('Save auto-message templates error', { error: error.message });
    next(error);
  }
}

/**
 * Send auto-message as a chat message from host to guest
 */
async function sendAutoMessage(hostId, guestId, bookingId, content) {
  try {
    const result = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content, booking_id, delivered, read, created_at)
       VALUES ($1, $2, $3, $4, false, false, NOW())
       RETURNING *`,
      [hostId, guestId, content, bookingId]
    );
    logger.info('Auto-message sent', { hostId, guestId, bookingId, trigger: 'auto' });

    // Send push notification
    const senderResult = await db.query('SELECT name FROM users WHERE id = $1', [hostId]);
    const senderName = senderResult.rows[0]?.name || 'Host';
    try {
      const tokens = await db.query(
        'SELECT push_token FROM push_tokens WHERE user_id = $1',
        [guestId]
      );
      if (tokens.rows.length > 0) {
        await pushService.sendPushNotification(
          tokens.rows.map(t => t.push_token),
          `Message from ${senderName}`,
          content.substring(0, 100)
        );
      }
    } catch (e) { /* ignore push errors */ }

    return result.rows[0];
  } catch (error) {
    logger.error('Send auto-message error', { error: error.message, hostId, guestId, bookingId });
  }
}

/**
 * Send "on_booking" auto-messages for a new booking
 */
async function sendOnBookingMessages(bookingId, placeId, guestId) {
  try {
    const templates = await db.query(
      `SELECT amt.*, p.owner_id as host_id
       FROM auto_message_templates amt
       JOIN places p ON amt.place_id = p.id
       WHERE amt.place_id = $1 AND amt.trigger_type = 'on_booking' AND amt.enabled = true
         AND amt.message_content IS NOT NULL AND amt.message_content != ''`,
      [placeId]
    );

    for (const t of templates.rows) {
      await sendAutoMessage(t.host_id, guestId, bookingId, t.message_content);
    }
  } catch (error) {
    logger.error('Send on_booking auto-messages error', { error: error.message });
  }
}

/**
 * Process scheduled auto-messages (called by interval timer)
 */
async function processScheduledMessages() {
  try {
    const now = new Date();

    // 1. 24h before check-in: find bookings where check_in is within 24-25 hours
    const upcomingBookings = await db.query(
      `SELECT b.id as booking_id, b.user_id as guest_id, b.place_id, b.check_in_date, 
              COALESCE(b.check_in_time, '12:00:00') as check_in_time,
              b.check_out_date, COALESCE(b.check_out_time, '12:00:00') as check_out_time,
              p.owner_id as host_id
       FROM bookings b
       JOIN places p ON b.place_id = p.id
       WHERE b.status = 'confirmed'
         AND b.id NOT IN (SELECT booking_id FROM auto_message_log WHERE trigger_type = '24h_before_checkin')
         AND (b.check_in_date::timestamp + COALESCE(b.check_in_time, '12:00:00')::interval) 
             BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours'`
    );

    for (const booking of upcomingBookings.rows) {
      const templates = await db.query(
        `SELECT * FROM auto_message_templates 
         WHERE place_id = $1 AND trigger_type = '24h_before_checkin' AND enabled = true
           AND message_content IS NOT NULL AND message_content != ''`,
        [booking.place_id]
      );
      for (const t of templates.rows) {
        await sendAutoMessage(booking.host_id, booking.guest_id, booking.booking_id, t.message_content);
        await db.query(
          `INSERT INTO auto_message_log (booking_id, trigger_type, sent_at) VALUES ($1, $2, NOW())`,
          [booking.booking_id, '24h_before_checkin']
        );
      }
    }

    // 2. 1h before arrival (check-in time): find bookings where check_in is within 0-2 hours
    const arrivingSoon = await db.query(
      `SELECT b.id as booking_id, b.user_id as guest_id, b.place_id,
              p.owner_id as host_id
       FROM bookings b
       JOIN places p ON b.place_id = p.id
       WHERE b.status = 'confirmed'
         AND b.id NOT IN (SELECT booking_id FROM auto_message_log WHERE trigger_type = '1h_before_arrival')
         AND (b.check_in_date::timestamp + COALESCE(b.check_in_time, '12:00:00')::interval)
             BETWEEN NOW() AND NOW() + INTERVAL '2 hours'`
    );

    for (const booking of arrivingSoon.rows) {
      const templates = await db.query(
        `SELECT * FROM auto_message_templates 
         WHERE place_id = $1 AND trigger_type = '1h_before_arrival' AND enabled = true
           AND message_content IS NOT NULL AND message_content != ''`,
        [booking.place_id]
      );
      for (const t of templates.rows) {
        await sendAutoMessage(booking.host_id, booking.guest_id, booking.booking_id, t.message_content);
        await db.query(
          `INSERT INTO auto_message_log (booking_id, trigger_type, sent_at) VALUES ($1, $2, NOW())`,
          [booking.booking_id, '1h_before_arrival']
        );
      }
    }

    // 3. At checkout: find bookings where checkout time has passed
    const checkingOut = await db.query(
      `SELECT b.id as booking_id, b.user_id as guest_id, b.place_id,
              p.owner_id as host_id
       FROM bookings b
       JOIN places p ON b.place_id = p.id
       WHERE b.status IN ('confirmed', 'Completed')
         AND b.id NOT IN (SELECT booking_id FROM auto_message_log WHERE trigger_type = 'at_checkout')
         AND (b.check_out_date::timestamp + COALESCE(b.check_out_time, '12:00:00')::interval)
             BETWEEN NOW() - INTERVAL '1 hour' AND NOW()`
    );

    for (const booking of checkingOut.rows) {
      const templates = await db.query(
        `SELECT * FROM auto_message_templates 
         WHERE place_id = $1 AND trigger_type = 'at_checkout' AND enabled = true
           AND message_content IS NOT NULL AND message_content != ''`,
        [booking.place_id]
      );
      for (const t of templates.rows) {
        await sendAutoMessage(booking.host_id, booking.guest_id, booking.booking_id, t.message_content);
        await db.query(
          `INSERT INTO auto_message_log (booking_id, trigger_type, sent_at) VALUES ($1, $2, NOW())`,
          [booking.booking_id, 'at_checkout']
        );
      }
    }
  } catch (error) {
    logger.error('Process scheduled auto-messages error', { error: error.message });
  }
}

module.exports = {
  getTemplates,
  saveTemplates,
  sendOnBookingMessages,
  processScheduledMessages,
};
