const db = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_51SVJ2DCGmQVz0gpF9CcIAr4tsMN3LKFicySXcKQWB378Mi4BVrUI2UstMGxHzR8vomIV1EJ9fMLz7xiAkQDEqJzp00wfNviq5a');
const pushService = require('../services/pushNotificationService');

const BONUS_AMOUNT = 2500; // £25.00 in pence

// Generate a unique referral code for a host
const getOrCreateReferralCode = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    // Check if user already has a referral code
    const existing = await db.query(
      'SELECT referral_code FROM users WHERE id = $1',
      [userId]
    );

    if (existing.rows[0]?.referral_code) {
      return res.json({ referral_code: existing.rows[0].referral_code });
    }

    // Generate a unique random referral code
    const randomSuffix = require('crypto').randomBytes(4).toString('hex').toUpperCase(); // 8 random hex chars
    const code = `PP-${randomSuffix}`;

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
    const userId = req.user.userId || req.user.id;

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

// Mark a referral as completed and trigger automated payout
const completeReferral = async (hostEmail) => {
  try {
    // Find the pending referral
    const result = await db.query(
      `UPDATE referrals SET status = 'completed', bonus_paid_at = NOW()
       WHERE referred_email = $1 AND status = 'pending'
       RETURNING *`,
      [hostEmail]
    );
    if (!result.rows.length) return null;

    const referral = result.rows[0];
    console.log(`[REFERRAL] Referral completed for ${hostEmail}, referrer_id=${referral.referrer_id}`);

    // Look up referrer details
    const referrerRow = await db.query(
      'SELECT id, name, email, stripe_account_id FROM users WHERE id = $1',
      [referral.referrer_id]
    );
    const referrer = referrerRow.rows[0];
    if (!referrer) return referral;

    // Attempt Stripe transfer if referrer has a connected account
    if (referrer.stripe_account_id) {
      try {
        const transfer = await stripe.transfers.create({
          amount: BONUS_AMOUNT,
          currency: 'gbp',
          destination: referrer.stripe_account_id,
          description: `Referral bonus – ${hostEmail} first booking`,
        });

        await db.query(
          `UPDATE referrals SET stripe_transfer_id = $1 WHERE id = $2`,
          [transfer.id, referral.id]
        );

        console.log(`[REFERRAL] £25 transferred to ${referrer.email} (${transfer.id})`);

        // Notify referrer
        try {
          await pushService.sendToUser(referrer.id, '£25 Referral Bonus Paid!',
            `Your referral bonus has been sent to your account. Thanks for spreading the word!`,
            { type: 'referral_bonus', status: 'paid' });
        } catch (e) { /* ignore push errors */ }

      } catch (stripeErr) {
        console.error(`[REFERRAL] Stripe transfer failed for ${referrer.email}:`, stripeErr.message);

        // Mark as needing manual payout
        await db.query(
          `UPDATE referrals SET status = 'payout_pending' WHERE id = $1`,
          [referral.id]
        );

        // Notify referrer their bonus is earned but awaiting payout setup
        try {
          await pushService.sendToUser(referrer.id, '£25 Referral Bonus Earned!',
            `You've earned a £25 bonus! Set up your payout method in Settings to receive it.`,
            { type: 'referral_bonus', status: 'payout_pending' });
        } catch (e) { /* ignore */ }
      }
    } else {
      // No Stripe account — mark as payout_pending
      await db.query(
        `UPDATE referrals SET status = 'payout_pending' WHERE id = $1`,
        [referral.id]
      );

      // Notify referrer to set up payout
      try {
        await pushService.sendToUser(referrer.id, '£25 Referral Bonus Earned!',
          `You've earned a £25 bonus! Set up your payout method in Settings to receive it.`,
          { type: 'referral_bonus', status: 'payout_pending' });
      } catch (e) { /* ignore */ }
    }

    // Notify admins
    try {
      const admins = await db.query("SELECT id FROM users WHERE role = 'admin'");
      for (const admin of admins.rows) {
        await pushService.sendToUser(admin.id, 'Referral Bonus Triggered',
          `${referrer.name} earned a £25 referral bonus (referred ${hostEmail})`,
          { type: 'admin_referral', referral_id: String(referral.id) });
      }
    } catch (e) { /* ignore */ }

    return referral;
  } catch (err) {
    console.error('[REFERRAL] Error completing referral:', err.message);
    return null;
  }
};

// Admin: Get all referrals across all hosts
const getAllReferrals = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.id, r.referrer_id, r.referred_email, r.status, r.created_at, r.bonus_paid_at,
              referrer.name AS referrer_name, referrer.email AS referrer_email,
              referred.name AS referred_name, referred.role AS referred_role
       FROM referrals r
       JOIN users referrer ON referrer.id = r.referrer_id
       LEFT JOIN users referred ON referred.email = r.referred_email
       ORDER BY r.created_at DESC`
    );

    const pending = result.rows.filter(r => r.status === 'pending');
    const completed = result.rows.filter(r => r.status === 'completed');

    return res.json({
      total: result.rows.length,
      pending_count: pending.length,
      completed_count: completed.length,
      total_paid: completed.length * 25,
      referrals: result.rows,
    });
  } catch (err) {
    console.error('[REFERRAL] Admin get all error:', err.message);
    return res.status(500).json({ error: 'Failed to get referrals' });
  }
};

// Admin: Manually mark a referral as completed
const adminCompleteReferral = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE referrals SET status = 'completed', bonus_paid_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Referral not found or already completed' });
    }

    return res.json({ referral: result.rows[0], message: 'Referral marked as completed — £25 bonus due' });
  } catch (err) {
    console.error('[REFERRAL] Admin complete error:', err.message);
    return res.status(500).json({ error: 'Failed to complete referral' });
  }
};

// Create a Stripe Connect Express account for a host and return onboarding link
const createConnectAccount = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    // Check if host already has an account
    const userRow = await db.query('SELECT stripe_account_id, email, name FROM users WHERE id = $1', [userId]);
    const user = userRow.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    let accountId = user.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'GB',
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: { proper_place_user_id: String(userId) },
      });
      accountId = account.id;
      await db.query('UPDATE users SET stripe_account_id = $1 WHERE id = $2', [accountId, userId]);
    }

    // Create onboarding link
    const baseUrl = process.env.APP_URL || 'https://proper-place.co.uk';
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/stripe-connect/refresh`,
      return_url: `${baseUrl}/stripe-connect/complete`,
      type: 'account_onboarding',
    });

    return res.json({ url: accountLink.url, account_id: accountId });
  } catch (err) {
    console.error('[REFERRAL] Connect account error:', err.message);
    return res.status(500).json({ error: 'Failed to create payout account' });
  }
};

// Check Stripe Connect account status for a host
const getConnectStatus = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const userRow = await db.query('SELECT stripe_account_id FROM users WHERE id = $1', [userId]);
    const accountId = userRow.rows[0]?.stripe_account_id;

    if (!accountId) {
      return res.json({ connected: false, payouts_enabled: false });
    }

    const account = await stripe.accounts.retrieve(accountId);

    return res.json({
      connected: true,
      payouts_enabled: account.payouts_enabled,
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
    });
  } catch (err) {
    console.error('[REFERRAL] Connect status error:', err.message);
    return res.status(500).json({ error: 'Failed to check payout status' });
  }
};

// Retry payout for pending referrals (when host sets up Stripe Connect)
const retryPendingPayouts = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const userRow = await db.query('SELECT stripe_account_id FROM users WHERE id = $1', [userId]);
    const accountId = userRow.rows[0]?.stripe_account_id;

    if (!accountId) {
      return res.status(400).json({ error: 'Set up your payout account first' });
    }

    // Find referrals where this user is the referrer and payout is pending
    const pending = await db.query(
      `SELECT r.id, r.referred_email FROM referrals r
       WHERE r.referrer_id = $1 AND r.status = 'payout_pending'`,
      [userId]
    );

    if (!pending.rows.length) {
      return res.json({ message: 'No pending payouts', paid: 0 });
    }

    let paidCount = 0;
    for (const referral of pending.rows) {
      try {
        const transfer = await stripe.transfers.create({
          amount: BONUS_AMOUNT,
          currency: 'gbp',
          destination: accountId,
          description: `Referral bonus – ${referral.referred_email} first booking`,
        });

        await db.query(
          `UPDATE referrals SET status = 'completed', stripe_transfer_id = $1 WHERE id = $2`,
          [transfer.id, referral.id]
        );
        paidCount++;
      } catch (stripeErr) {
        console.error(`[REFERRAL] Retry transfer failed for referral ${referral.id}:`, stripeErr.message);
      }
    }

    return res.json({ message: `${paidCount} bonus(es) paid`, paid: paidCount });
  } catch (err) {
    console.error('[REFERRAL] Retry payouts error:', err.message);
    return res.status(500).json({ error: 'Failed to process pending payouts' });
  }
};

module.exports = {
  getOrCreateReferralCode,
  getReferralStats,
  recordReferral,
  completeReferral,
  getAllReferrals,
  adminCompleteReferral,
  createConnectAccount,
  getConnectStatus,
  retryPendingPayouts,
};
