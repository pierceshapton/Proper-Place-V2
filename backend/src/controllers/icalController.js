const db = require('../config/database');
const { default: ical } = require('ical-generator');

async function exportPlaceCalendar(req, res, next) {
  try {
    const { placeId } = req.params;

    // Fetch confirmed bookings for the place
    const result = await db.query(
      `SELECT check_in_date, check_out_date
       FROM bookings
       WHERE place_id = $1
         AND status IN ('confirmed', 'Completed', 'completed')
       ORDER BY check_in_date ASC`,
      [placeId]
    );

    const cal = ical({ name: `Proper Place - Place ${placeId} bookings` });

    for (const b of result.rows) {
      const start = new Date(b.check_in_date);
      const end = new Date(b.check_out_date);
      cal.createEvent({
        start,
        end,
        summary: 'Booked',
        description: 'This date range is booked on Proper Place',
        uid: `place-${placeId}-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}`,
      });
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="place-${placeId}.ics"`);
    res.send(cal.toString());
  } catch (err) {
    next(err);
  }
}

module.exports = {
  exportPlaceCalendar,
};
