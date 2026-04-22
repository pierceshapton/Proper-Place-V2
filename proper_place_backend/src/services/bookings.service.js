import { query } from '../db/database.js';
import Stripe from 'stripe';

export class BookingsService {
  // Get all bookings for a specific place
  static async getBookingsByPlaceId(placeId) {
    try {
      const result = await query(
        `SELECT 
          booking_id,
          place_id,
          guest_id,
          check_in,
          check_out,
          total_price,
          payment_intent_id,
          status,
          created_at
         FROM bookings 
         WHERE place_id = $1 AND status = 'confirmed'
         ORDER BY check_in ASC`,
        [placeId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw new Error('Failed to fetch bookings');
    }
  }

  // Get all bookings for a guest
  static async getBookingsByGuestId(guestId) {
    try {
      const result = await query(
        `SELECT 
          booking_i          booking_i          bookingst_id,
          check_in,
          check_out,
          total_price,
          payment_intent_id,
          status,
          created_at
         FROM bookings 
         WHERE guest_id = $1
         ORDER BY check_in DESC`,
        [guestId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching guest bookings:', error);
      throw new Error('Failed to fetch bookings');
    }
  }

  // Create a new booking
  static async createBooking(placeId, guestId, checkIn, checkOut, totalPrice, paymentIntentId, connectedAccountId) {
    try {
      // Validate dates
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      
      if (checkInDate >= checkOutDate) {
        throw new Error('Check-out date must be after check-in date');
      }

      // Check for conflicting bookings
      const conflictResult = await query(
        `SELECT COUNT(*) as count FROM bookings 
         WHERE place_id = $1 
         AND status = 'confirmed'
         AND check_in < $3 
         AND check_out > $2`,
        [placeId, checkIn, checkOut]
      );

      if (parseInt(conflictResult.rows[0].count) > 0) {
        throw new Error('Selected dates have conflicting bookings');
      }

      // Create booking
      const result = await query(
        `INSERT INTO bookings (place_id, guest_id, check_in, check_out, total_price, payment_intent_id, connected_account_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed')
         RETURNING booking_id, place_id, guest_id, check_in, check_out, total_price, payment_intent_id, connected_account_id, status, created_at`,
        [placeId, guestId, checkIn, checkOut, totalPrice, paymentIntentId ?? null, connectedAccountId ?? null]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  // Get single booking details
  static async getBookingById(bookingId) {
    try {
      const result = await query(
        `SELECT * FROM bookings WHERE booking_id = $1`,
        [bookingId]
      );

      if (result.rows.length === 0) {
        throw new Error('Booking not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error fetching booking:', error);
      throw error;
    }
  }

  // Cancel a booking and process refund
  static async cancelBooking(bookingId) {
    try {
      // Get booking details
      const bookingResult = await query(
        `SELECT * FROM bookings WHERE booking_id = $1`,
        [bookingId]
      );

      if (bookingResult.rows.length === 0) {
        throw new Error('Booking not found');
      }

      const booking = bookingResult.rows[0];

      // If booking has a payment intent, process refund
      let refundResult = null;
      if (booking.payment_intent_id) {
        try {
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
          refundResult = await stripe.refunds.create({
            payment_intent: booking.payment_intent_id,
          });
          console.log('Refund processed:', refundResult.id);
        } catch (refundError) {
          console.error('Error processing refund:', refundError);
          throw new Error(`Failed to process refund: ${refundError.message}`);
        }
      }

      // Update booking status to cancelled
      const result = await query(
        `UPDATE bookings 
         SET status = 'cancelled', refund_status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE booking_id = $1
         RETURNING *`,
        [bookingId, refundResult ? 'completed' : 'pending']
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }

  // Get available dates for a place
  static async getAvailableDates(placeId, startDate, endDate) {
    try {
      // Get the place's capacity first
      const placeResult = await query(
        `SELECT capacity FROM places WHERE place_id = $1`,
        [placeId]
      );

      if (placeResult.rows.length === 0) {
        throw new Error('Place not found');
      }

      const capacity = placeResult.rows[0].capacity;

      // Get all bookings within the date range
      const bookingsResult = await query(
        `SELECT check_in, check_out FROM bookings 
         WHERE place_id = $1 
         AND status = 'confirmed'
         AND check_in < $3
         AND check_out > $2`,
        [placeId, startDate, endDate]
      );

      // Calculate booked spaces per date
      const bookedSpaces = {};
      for (const booking of bookingsResult.rows) {
        const checkIn = new Date(booking.check_in);
        const checkOut = new Date(booking.check_out);
        
        for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
          const dateKey = d.toISOString().split('T')[0];
          bookedSpaces[dateKey] = (bookedSpaces[dateKey] || 0) + 1;
        }
      }

      return {
        capacity,
        bookedSpaces,
      };
    } catch (error) {
      console.error('Error getting available dates:', error);
      throw error;
    }
  }

  // Complete a booking: capture the held payment and mark as completed.
  // Safe to call multiple times — if payment is already captured, it skips the
  // Stripe call and just ensures the DB status is correct.
  static async completeBooking(bookingId) {
    try {
      const bookingResult = await query(
        `SELECT * FROM bookings WHERE booking_id = $1`,
        [bookingId]
      );

      if (bookingResult.rows.length === 0) {
        throw new Error('Booking not found');
      }

      const booking = bookingResult.rows[0];

      if (booking.status === 'cancelled') {
        throw new Error('Cannot complete a cancelled booking');
      }

      // Capture payment if not already done
      if (booking.payment_intent_id && !booking.payment_captured) {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        try {
          const captureOptions = booking.connected_account_id
            ? { stripeAccount: booking.connected_account_id }
            : {};
          await stripe.paymentIntents.capture(
            booking.payment_intent_id,
            {},
            captureOptions
          );
          console.log(`✅ Payment captured for booking ${bookingId}`);
        } catch (captureError) {
          // If already captured Stripe returns 'already_captured' error — treat as success
          if (captureError?.code !== 'charge_already_captured') {
            console.error('Stripe capture error:', captureError.message);
            throw new Error(`Payment capture failed: ${captureError.message}`);
          }
        }
      }

      const result = await query(
        `UPDATE bookings
         SET status = 'completed', payment_captured = true, updated_at = CURRENT_TIMESTAMP
         WHERE booking_id = $1
         RETURNING *`,
        [bookingId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error completing booking:', error);
      throw error;
    }
  }
}
