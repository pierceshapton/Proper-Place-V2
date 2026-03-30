const db = require('../config/database');

// Generate a unique referral code for a host
const getOrCreateReferralCode = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user already has a referral code
    const existing = await db.query(
      'SELECT referral_code FROM users WHERE id = $1',
      [userId]
    );

    if (existing.rows[0]?.referral_code) {
      return res.json({ referral_code: existing.rows[0].referral_code });
    }

    // Generate a unique code: PP-<first4ofName>-<userId>
    const userRow = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
    const name = (userRow.rows[0]?.name || 'HOST').replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 4);
    const code = `PP-${name}-${userId}`;

    await db.query(
      'UPDATE users SET referral_code = $1 WHERE id = $2',
      [code, userId]
    );

    return res.json({ referral_code: code });
  } catch (err) {
    console.error('[REFERRAL] Error generating code:', err.message);
    return res.status(500).json({ error: 'Failed to generate referral code' });
  }
};

// Get referral stats for the current host
const getReferralStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT r.id, r.referred_email, r.status, r.created_at, r.bonus_paid_at,
              u.name AS referred_name
       FROM referrals r
       LEFT JOIN users u ON u.email = r.referred_email
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    const stats = {
      total_referrals: result.rows.length,
      pending: result.rows.filter(r => r.status === 'pending').length,
      completed: result.rows.filter(r => r.status === 'completed').length,
      total_earned: result.rows.filter(r => r.status === 'completed').length * 25,
      referrals: result.rows,
    };

    return res.json(stats);
  } catch (err) {
    console.error('[REFERRAL] Error getting stats:', err.message);
    return res.status(500).json({ error: 'Failed to get referral stats' });
  }
};

// Record a referral when a new host signs up with a referral code
const recordReferral = async (referrerCode, referredEmail) => {
  try {
    // Find the referrer by code
    const referrer = await db.query(
      'SELECT id FROM users WHERE referral_code = $1',
      [referrerCode]
    );

    if (!referrer.rows.length) return null;

    // Check for duplicate
    const existing = await db.query(
      'SELECT id FROM referrals WHERE referrer_id = $1 AND referred_email = $2',
      [referrer.rows[0].id, referredEmail]
    );
    if (existing.rows.length) return existing.rows[0];

    const result = await db.query(
      `INSERT INTO referrals (referrer_id, referred_email, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [referrer.rows[0].id, referredEmail]
    );

    return result.rows[0];
  } catch (err) {
    console.error('[REFERRAL] Error recording referral:', err.message);
    return null;
  }
};

// Mark a referral as completed (called when referred host gets first booking)
const completeReferral = async (hostEmail) => {
  try {
    const result = await db.query(
      `UPDATE referrals SET status = 'completed', bonus_paid_at = NOW()
       WHERE referred_email = $1 AND status = 'pending'
       RETURNING *`,
      [hostEmail]
    );
    if (result.rows.length) {
      console.log(`[REFERRAL] Referral completed for ${hostEmail}`);
    }
    return result.rows[0] || null;
  } catch (err) {
    console.error('[REFERRAL] Error completing referral:', err.message);
    return null;
  }
};

module.exports = {
  getOrCreateReferralCode,
  getReferralStats,
  recordReferral,
  completeReferral,
};
