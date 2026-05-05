const ical = require('node-ical');
const db = require('../config/database');
const logger = require('../utils/logger');

async function syncAllEnabledCalendars() {
  const res = await db.query('SELECT id, place_id, url FROM external_calendars WHERE enabled = true');
  for (const cal of res.rows) {
    try {
      await syncCalendarById(cal.id, cal.url, cal.place_id);
    } catch (err) {
      logger.error('External calendar sync failed', { calendarId: cal.id, error: err.message });
    }
  }
}

async function syncCalendarById(id, url, placeId) {
  const items = await ical.fromURL(url, {});

  // Remove old entries for this external calendar
  await db.query('DELETE FROM external_blocked_dates WHERE external_calendar_id = $1', [id]);

  const insertText = `INSERT INTO external_blocked_dates (place_id, external_calendar_id, start_date, end_date, source, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())`;

  for (const k of Object.keys(items)) {
    const ev = items[k];
    if (ev.type !== 'VEVENT') continue;
    // node-ical gives JS Date objects
    const start = ev.start ? ev.start.toISOString().split('T')[0] : null;
    const end = ev.end ? ev.end.toISOString().split('T')[0] : start;
    if (!start || !end) continue;
    await db.query(insertText, [placeId, id, start, end, 'external_ical']);
  }

  await db.query('UPDATE external_calendars SET last_synced = NOW() WHERE id = $1', [id]);
  logger.info('Synced external calendar', { id, placeId, url });
}

module.exports = {
  syncAllEnabledCalendars,
  syncCalendarById,
};
