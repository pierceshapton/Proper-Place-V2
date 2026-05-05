const db = require('../config/database');
const logger = require('../utils/logger');

async function listExternalCalendars(req, res, next) {
  try {
    const placeId = req.params.id;
    const userId = req.user.userId;

    // Verify ownership or admin
    const placeRes = await db.query('SELECT owner_id FROM places WHERE id = $1', [placeId]);
    if (placeRes.rows.length === 0) return res.status(404).json({ error: 'place_not_found' });
    const ownerId = placeRes.rows[0].owner_id;
    if (ownerId !== userId && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

    const result = await db.query('SELECT id, url, label, last_synced, enabled, created_at FROM external_calendars WHERE place_id = $1 ORDER BY id DESC', [placeId]);
    res.json({ calendars: result.rows });
  } catch (err) { next(err); }
}

async function createExternalCalendar(req, res, next) {
  try {
    const placeId = req.params.id;
    const userId = req.user.userId;
    const { url, label } = req.validatedBody || req.body;
    if (!url) return res.status(400).json({ error: 'missing_field', message: 'url is required' });

    const placeRes = await db.query('SELECT owner_id FROM places WHERE id = $1', [placeId]);
    if (placeRes.rows.length === 0) return res.status(404).json({ error: 'place_not_found' });
    const ownerId = placeRes.rows[0].owner_id;
    if (ownerId !== userId && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

    const insert = await db.query(
      `INSERT INTO external_calendars (place_id, url, label, enabled, created_at)
       VALUES ($1, $2, $3, true, NOW()) RETURNING id, url, label, last_synced, enabled, created_at`,
      [placeId, url, label || null]
    );

    res.status(201).json({ calendar: insert.rows[0] });
  } catch (err) { next(err); }
}

async function deleteExternalCalendar(req, res, next) {
  try {
    const calId = req.params.id;
    const userId = req.user.userId;

    // Ensure calendar exists and belongs to a place owned by user
    const result = await db.query(`
      SELECT ec.id, ec.place_id, p.owner_id
      FROM external_calendars ec
      JOIN places p ON p.id = ec.place_id
      WHERE ec.id = $1
    `, [calId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'not_found' });
    const row = result.rows[0];
    if (row.owner_id !== userId && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

    await db.query('DELETE FROM external_calendars WHERE id = $1', [calId]);
    // Also delete associated blocked dates
    await db.query('DELETE FROM external_blocked_dates WHERE external_calendar_id = $1', [calId]);

    res.json({ message: 'deleted' });
  } catch (err) { next(err); }
}

module.exports = {
  listExternalCalendars,
  createExternalCalendar,
  deleteExternalCalendar,
};
