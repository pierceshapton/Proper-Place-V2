const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const crm = require('../controllers/crmController');

// All CRM routes require auth + admin
router.use(authMiddleware);
router.use(adminMiddleware);

// ─── Stats ──────────────────────────
router.get('/stats', crm.getStats);

// ─── Settings ───────────────────────
router.get('/settings', crm.getSettings);
router.patch('/settings', crm.updateSettings);

// ─── Pipeline ───────────────────────
router.get('/leads/pipeline/summary', crm.getPipelineSummary);

// ─── Leads ──────────────────────────
router.get('/leads', crm.getLeads);
router.post('/leads', crm.createLead);
router.get('/leads/:id', crm.getLead);
router.patch('/leads/:id', crm.updateLead);
router.delete('/leads/:id', crm.deleteLead);

// ─── Activities ─────────────────────
router.get('/leads/:id/activities', crm.getActivities);
router.post('/leads/:id/activities', crm.createActivity);

// ─── Site Visits ────────────────────
router.get('/leads/:id/site-visits', crm.getSiteVisits);
router.post('/leads/:id/site-visits', crm.createSiteVisit);

// ─── Email per lead ─────────────────
router.post('/leads/:id/send-email', crm.sendEmail);
router.get('/leads/:id/emails', crm.getEmailLog);

// ─── Tasks ──────────────────────────
router.get('/tasks', crm.getTasks);
router.post('/tasks', crm.createTask);
router.patch('/tasks/:id', crm.updateTask);
router.delete('/tasks/:id', crm.deleteTask);

// ─── Email Templates ────────────────
router.get('/emails/templates', crm.getEmailTemplates);
router.post('/emails/templates', crm.createEmailTemplate);
router.patch('/emails/templates/:id', crm.updateEmailTemplate);
router.delete('/emails/templates/:id', crm.deleteEmailTemplate);

// ─── Sequences ──────────────────────
router.get('/emails/sequences', crm.getSequences);
router.post('/emails/sequences', crm.createSequence);

// ─── Migration (one-time) ───────────
router.post('/run-migration', async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const pool = require('../config/database');
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../migrations/016_crm_tables.sql'), 'utf8');
    await pool.query(sql);
    res.json({ success: true, message: 'CRM migration completed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
