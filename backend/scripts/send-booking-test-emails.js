#!/usr/bin/env node
/**
 * One-shot script to send sample booking emails to a test address.
 * Usage: node scripts/send-booking-test-emails.js [email]
 * Defaults to pierce.shapton@nookparcelbox.com
 * Loads env from ../.env (or process env if running under DO).
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const {
  sendHostNewBookingEmail,
  sendGuestBookingSubmittedEmail,
  sendGuestBookingConfirmedEmail,
  sendGuestBookingRejectedEmail,
  sendBookingCancelledEmail,
  transporter,
} = require('../src/utils/email');

const TO = process.argv[2] || 'pierce.shapton@nookparcelbox.com';

const sampleBooking = {
  id: 9999,
  booking_ref: 'PP-260701-TEST',
  place_name: 'The Old Barn (sample)',
  check_in_date: '2026-08-14',
  check_out_date: '2026-08-16',
  nights: 2,
  total_price: 45.00,
  van_registration: 'AB12 CDE',
  contact_phone: '+44 7700 900123',
};

(async () => {
  try {
    console.log(`Sending 5 sample booking emails to ${TO}…\n`);

    console.log('1/5  Host — new booking request');
    await sendHostNewBookingEmail({
      hostEmail: TO,
      hostName: 'Sample Host',
      guestName: 'Alex Guest',
      booking: sampleBooking,
    });

    console.log('2/5  Guest — request submitted');
    await sendGuestBookingSubmittedEmail({
      guestEmail: TO,
      guestName: 'Alex Guest',
      booking: sampleBooking,
    });

    console.log('3/5  Guest — booking confirmed');
    await sendGuestBookingConfirmedEmail({
      guestEmail: TO,
      guestName: 'Alex Guest',
      booking: sampleBooking,
    });

    console.log('4/5  Guest — booking rejected');
    await sendGuestBookingRejectedEmail({
      guestEmail: TO,
      guestName: 'Alex Guest',
      booking: sampleBooking,
    });

    console.log('5/5  Both — booking cancelled (guest copy, with refund)');
    await sendBookingCancelledEmail({
      recipientEmail: TO,
      recipientName: 'Alex Guest',
      recipientRole: 'guest',
      cancelledBy: 'host',
      booking: sampleBooking,
      refundIssued: true,
    });

    console.log('\nAll sent. Check the inbox.');
    transporter.close();
  } catch (err) {
    console.error('Send failed:', err.message);
    process.exit(1);
  }
})();
