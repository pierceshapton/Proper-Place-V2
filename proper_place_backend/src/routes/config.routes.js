import express from 'express';
import { query } from '../db/database.js';

const router = express.Router();

/**
 * GET /config/features
 * Returns feature flags and numeric settings from app_settings table.
 * Toggle via SQL: UPDATE app_settings SET value = 'true' WHERE key = 'referral_enabled';
 * Numeric via SQL: UPDATE app_settings SET value = '10' WHERE key = 'min_price_per_night';
 */
router.get('/features', async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM app_settings');
    const flags = {};
    for (const row of result.rows) {
      const num = Number(row.value);
      if (!isNaN(num) && row.value.trim() !== '') {
        flags[row.key] = num;
      } else if (row.value === 'true') {
        flags[row.key] = true;
      } else if (row.value === 'false') {
        flags[row.key] = false;
      } else {
        flags[row.key] = row.value;
      }
    }
    res.json(flags);
  } catch (err) {
    console.error('❌ /config/features error:', err.message);
    // Return safe defaults so the app degrades gracefully
    res.json({ referral_enabled: false, min_price_per_night: 5 });
  }
});

export default router;
