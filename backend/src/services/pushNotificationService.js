const db = require('../config/database');
const logger = require('../utils/logger');

let admin = null;
let isInitialized = false;

/**
 * Initialize Firebase Admin SDK for sending push notifications.
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON env var (JSON string) or
 * GOOGLE_APPLICATION_CREDENTIALS env var (path to service account file).
 */
function initialize() {
  try {
    const firebaseAdmin = require('firebase-admin');

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount),
      });
      admin = firebaseAdmin;
      isInitialized = true;
      logger.info('Firebase Admin SDK initialized from env JSON');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.applicationDefault(),
      });
      admin = firebaseAdmin;
      isInitialized = true;
      logger.info('Firebase Admin SDK initialized from credentials file');
    } else {
      logger.warn('Firebase Admin SDK not configured - push notifications disabled. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.');
    }
  } catch (err) {
    logger.warn('Firebase Admin SDK initialization failed - push notifications disabled:', err.message);
  }
}

/**
 * Register or update a device token for a user.
 */
async function registerDeviceToken(userId, token, platform = 'ios') {
  try {
    await db.query(
      `INSERT INTO device_tokens (user_id, token, platform, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, token) DO UPDATE SET updated_at = NOW(), platform = $3`,
      [userId, token, platform]
    );
    logger.info('Device token registered', { userId, platform });
  } catch (err) {
    logger.error('Error registering device token', { error: err.message, userId });
  }
}

/**
 * Remove a device token (on logout).
 */
async function removeDeviceToken(userId, token) {
  try {
    await db.query(
      'DELETE FROM device_tokens WHERE user_id = $1 AND token = $2',
      [userId, token]
    );
  } catch (err) {
    logger.error('Error removing device token', { error: err.message });
  }
}

/**
 * Get all device tokens for a user.
 */
async function getDeviceTokens(userId) {
  try {
    const result = await db.query(
      'SELECT token, platform FROM device_tokens WHERE user_id = $1',
      [userId]
    );
    return result.rows;
  } catch (err) {
    logger.error('Error getting device tokens', { error: err.message });
    return [];
  }
}

/**
 * Send a push notification to a specific user.
 */
async function sendToUser(userId, title, body, data = {}) {
  if (!isInitialized) return;

  try {
    const tokens = await getDeviceTokens(userId);
    if (tokens.length === 0) return;

    const tokenStrings = tokens.map(t => t.token);

    const message = {
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // Send to each token
    const results = await Promise.allSettled(
      tokenStrings.map(token =>
        admin.messaging().send({ ...message, token })
      )
    );

    // Clean up invalid tokens
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected') {
        const errorCode = results[i].reason?.code;
        if (
          errorCode === 'messaging/registration-token-not-registered' ||
          errorCode === 'messaging/invalid-registration-token'
        ) {
          await db.query('DELETE FROM device_tokens WHERE token = $1', [tokenStrings[i]]);
          logger.info('Removed invalid device token', { token: tokenStrings[i].substring(0, 20) + '...' });
        }
      }
    }

    const sent = results.filter(r => r.status === 'fulfilled').length;
    logger.info('Push notification sent', { userId, title, sent, total: tokenStrings.length });
  } catch (err) {
    logger.error('Error sending push notification', { error: err.message, userId });
  }
}

/**
 * Notify host about a new booking.
 */
async function notifyNewBooking(hostId, guestName, placeName, bookingId) {
  await sendToUser(hostId, 'New Booking Request', `${guestName} booked ${placeName}`, {
    type: 'new_booking',
    bookingId: String(bookingId),
  });
}

/**
 * Notify guest about booking status change.
 */
async function notifyBookingUpdate(userId, placeName, newStatus) {
  const statusMap = {
    confirmed: 'confirmed',
    cancelled: 'cancelled',
    Completed: 'completed',
  };
  const statusText = statusMap[newStatus] || newStatus;
  await sendToUser(userId, 'Booking Update', `Your booking at ${placeName} has been ${statusText}`, {
    type: 'booking_update',
    status: newStatus,
  });
}

/**
 * Notify user about a new message.
 */
async function notifyNewMessage(receiverId, senderName, messagePreview) {
  const preview = messagePreview.length > 100 ? messagePreview.substring(0, 97) + '...' : messagePreview;
  await sendToUser(receiverId, `Message from ${senderName}`, preview, {
    type: 'new_message',
  });
}

/**
 * Notify host about place approval/rejection.
 */
async function notifyPlaceReview(hostId, placeName, approved, reason) {
  const title = approved ? 'Site Approved!' : 'Site Rejected';
  const body = approved
    ? `Your site "${placeName}" has been approved and is now live!`
    : `Your site "${placeName}" was not approved${reason ? ': ' + reason : ''}`;
  await sendToUser(hostId, title, body, {
    type: 'place_review',
    approved: String(approved),
  });
}

/**
 * Notify admins about a new place submission.
 */
async function notifyAdminsNewPlace(placeName, hostName) {
  try {
    const admins = await db.query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins.rows) {
      await sendToUser(admin.id, 'New Site Submission', `${hostName} submitted "${placeName}" for review`, {
        type: 'new_place_submission',
      });
    }
  } catch (err) {
    logger.error('Error notifying admins', { error: err.message });
  }
}

module.exports = {
  initialize,
  registerDeviceToken,
  removeDeviceToken,
  sendToUser,
  notifyNewBooking,
  notifyBookingUpdate,
  notifyNewMessage,
  notifyPlaceReview,
  notifyAdminsNewPlace,
};
