const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /cms/content  (public)
 * GET /crm/content  (admin - same handler, used from CRM editor)
 * Returns all CMS content as a flat { key: value } map plus full rows for the editor.
 */
async function getContent(req, res, next) {
  try {
    const result = await db.query(
      'SELECT key, value, label, type, page, section, sort_order FROM cms_content ORDER BY page, sort_order, key'
    );
    const content = {};
    result.rows.forEach(row => { content[row.key] = row.value; });
    res.json({ content, rows: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /crm/content  (admin only)
 * Body: { updates: [{ key: string, value: string }] }
 * Updates multiple content values in one request.
 */
async function updateContent(req, res, next) {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'updates array is required' });
    }

    let updated = 0;
    for (const item of updates) {
      const key = String(item.key || '').trim();
      const value = String(item.value ?? '');
      if (!key) continue;
      const r = await db.query(
        'UPDATE cms_content SET value = $1, updated_at = NOW() WHERE key = $2',
        [value, key]
      );
      if (r.rowCount > 0) updated++;
    }

    logger.info(`[CMS] ${updated} content keys updated by admin ${req.user?.id}`);
    res.json({ success: true, updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { getContent, updateContent };
