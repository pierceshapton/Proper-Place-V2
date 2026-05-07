import express from 'express';
import { query } from '../db/database.js';

const router = express.Router();

/**
 * GET /config/features
 * Returns feature flags from app_settings table.
 * Toggle via SQL: UPDATE app_settings SET value = 'true' WHERE key = 'referral_enabled';
 */
router.get('/features', async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM app_settings');
    const flags = {};
    for (const row of result.rows) {
      flags[row.key] = row.value === 'true';
    }
    res.json(flags);
  } catch (err) {
    console.error('❌ /config/features error:', err.message);
    // Return safe defaults so the app degrades gracefully
    res.json({ referral_enabled: false });
  }
});

export default router;
