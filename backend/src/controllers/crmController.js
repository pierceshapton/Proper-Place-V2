const db = require('../config/database');
const logger = require('../utils/logger');
const nodemailer = require('nodemailer');

// ─── LEADS ──────────────────────────────────────────────────────────

/**
 * GET /crm/leads
 * List leads with filtering, search, pagination
 */
async function getLeads(req, res, next) {
  try {
    const {
      pipeline_stage,
      priority,
      search,
      sort = 'created_at',
      order = 'DESC',
      limit = 50,
      offset = 0,
    } = req.query;

    const conditions = [];
    const params = [];

    if (pipeline_stage) {
      params.push(pipeline_stage);
      conditions.push(`hl.pipeline_stage = $${params.length}`);
    }
    if (priority) {
      params.push(priority);
      conditions.push(`hl.priority = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(`(hl.business_name ILIKE $${idx} OR hl.first_name ILIKE $${idx} OR hl.last_name ILIKE $${idx} OR hl.email ILIKE $${idx} OR hl.location ILIKE $${idx})`);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const allowedSorts = ['created_at', 'updated_at', 'business_name', 'priority', 'pipeline_stage', 'next_follow_up', 'google_rating'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

    params.push(parseInt(limit));
    const limitIdx = params.length;
    params.push(parseInt(offset));
    const offsetIdx = params.length;

    const query = `
      SELECT hl.*,
        (SELECT COUNT(*) FROM crm_activities ca WHERE ca.lead_id = hl.id) as activity_count,
        (SELECT COUNT(*) FROM crm_tasks ct WHERE ct.lead_id = hl.id AND ct.status = 'pending') as pending_tasks,
        (SELECT MAX(ca.created_at) FROM crm_activities ca WHERE ca.lead_id = hl.id) as last_activity_at
      FROM host_leads hl
      ${where}
      ORDER BY hl.${sortCol} ${sortOrder}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const result = await db.query(query, params);

    const countParams = params.slice(0, -2);
    const countQuery = `SELECT COUNT(*) FROM host_leads hl ${where}`;
    const countResult = await db.query(countQuery, countParams);

    res.json({
      leads: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    logger.error('CRM getLeads error', { error: error.message });
    next(error);
  }
}

/**
 * GET /crm/leads/:id
 * Single lead with full details
 */
async function getLead(req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM host_leads WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json({ lead: result.rows[0] });
  } catch (error) {
    logger.error('CRM getLead error', { error: error.message });
    next(error);
  }
}

/**
 * POST /crm/leads
 * Create a new lead manually
 */
async function createLead(req, res, next) {
  try {
    const {
      first_name, last_name, email, phone, business_name, location,
      website, property_type, parking_spaces, parking_type,
      ownership_type, pipeline_stage, priority, notes, tags,
      latitude, longitude, google_place_id, google_rating, google_reviews_count,
    } = req.body;

    if (!business_name && !first_name) {
      return res.status(400).json({ error: 'Business name or contact name required' });
    }

    const result = await db.query(
      `INSERT INTO host_leads (
        first_name, last_name, email, phone, business_name, location,
        website, property_type, parking_spaces, parking_type,
        ownership_type, pipeline_stage, priority, admin_notes, tags,
        latitude, longitude, google_place_id, google_rating, google_reviews_count,
        source, assigned_to
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING *`,
      [
        first_name || '', last_name || '', email || '', phone || '',
        business_name || null, location || null, website || null,
        property_type || null, parking_spaces || null, parking_type || null,
        ownership_type || null, pipeline_stage || 'new', priority || 'medium',
        notes || null, tags || null, latitude || null, longitude || null,
        google_place_id || null, google_rating || null, google_reviews_count || null,
        'crm_manual', req.user.userId,
      ]
    );

    // Log activity
    await db.query(
      `INSERT INTO crm_activities (lead_id, activity_type, title, created_by)
       VALUES ($1, 'lead_created', 'Lead created manually', $2)`,
      [result.rows[0].id, req.user.userId]
    );

    res.status(201).json({ lead: result.rows[0] });
  } catch (error) {
    logger.error('CRM createLead error', { error: error.message });
    next(error);
  }
}

/**
 * PATCH /crm/leads/:id
 * Update a lead
 */
async function updateLead(req, res, next) {
  try {
    const { id } = req.params;
    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'business_name', 'location',
      'website', 'property_type', 'parking_spaces', 'parking_type',
      'ownership_type', 'pipeline_stage', 'priority', 'admin_notes', 'tags',
      'latitude', 'longitude', 'estimated_value', 'next_follow_up',
      'last_contact_date', 'satellite_image_url',
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        values.push(req.body[field]);
        updates.push(`${field} = $${values.length}`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(new Date().toISOString());
    updates.push(`updated_at = $${values.length}`);
    values.push(id);

    const result = await db.query(
      `UPDATE host_leads SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Log if pipeline stage changed
    if (req.body.pipeline_stage) {
      await db.query(
        `INSERT INTO crm_activities (lead_id, activity_type, title, description, created_by)
         VALUES ($1, 'stage_change', 'Pipeline stage changed', $2, $3)`,
        [id, `Changed to: ${req.body.pipeline_stage}`, req.user.userId]
      );
    }

    res.json({ lead: result.rows[0] });
  } catch (error) {
    logger.error('CRM updateLead error', { error: error.message });
    next(error);
  }
}

/**
 * DELETE /crm/leads/:id
 */
async function deleteLead(req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM host_leads WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('CRM deleteLead error', { error: error.message });
    next(error);
  }
}

/**
 * GET /crm/leads/pipeline/summary
 * Counts per pipeline stage
 */
async function getPipelineSummary(req, res, next) {
  try {
    const result = await db.query(`
      SELECT
        pipeline_stage,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE priority = 'hot') as hot,
        COUNT(*) FILTER (WHERE priority = 'warm') as warm,
        COUNT(*) FILTER (WHERE priority = 'medium') as medium,
        COUNT(*) FILTER (WHERE priority = 'cold') as cold
      FROM host_leads
      GROUP BY pipeline_stage
      ORDER BY
        CASE pipeline_stage
          WHEN 'new' THEN 1
          WHEN 'contacted' THEN 2
          WHEN 'assessing' THEN 3
          WHEN 'negotiating' THEN 4
          WHEN 'converted' THEN 5
          WHEN 'lost' THEN 6
          ELSE 7
        END
    `);
    res.json({ stages: result.rows });
  } catch (error) {
    logger.error('CRM getPipelineSummary error', { error: error.message });
    next(error);
  }
}

// ─── ACTIVITIES ─────────────────────────────────────────────────────

/**
 * GET /crm/leads/:id/activities
 */
async function getActivities(req, res, next) {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const result = await db.query(
      `SELECT ca.*, u.name as created_by_name
       FROM crm_activities ca
       LEFT JOIN users u ON ca.created_by = u.id
       WHERE ca.lead_id = $1
       ORDER BY ca.created_at DESC
       LIMIT $2 OFFSET $3`,
      [id, parseInt(limit), parseInt(offset)]
    );
    res.json({ activities: result.rows });
  } catch (error) {
    logger.error('CRM getActivities error', { error: error.message });
    next(error);
  }
}

/**
 * POST /crm/leads/:id/activities
 */
async function createActivity(req, res, next) {
  try {
    const { id } = req.params;
    const { activity_type, title, description, metadata } = req.body;

    if (!activity_type || !title) {
      return res.status(400).json({ error: 'activity_type and title required' });
    }

    const result = await db.query(
      `INSERT INTO crm_activities (lead_id, activity_type, title, description, metadata, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, activity_type, title, description || null, metadata || '{}', req.user.userId]
    );

    // Update last_contact_date if it's a contact-type activity
    const contactTypes = ['call', 'email', 'meeting', 'site_visit'];
    if (contactTypes.includes(activity_type)) {
      await db.query('UPDATE host_leads SET last_contact_date = NOW(), updated_at = NOW() WHERE id = $1', [id]);
    }

    res.status(201).json({ activity: result.rows[0] });
  } catch (error) {
    logger.error('CRM createActivity error', { error: error.message });
    next(error);
  }
}

// ─── TASKS ──────────────────────────────────────────────────────────

/**
 * GET /crm/tasks
 * All tasks (optionally filtered by lead)
 */
async function getTasks(req, res, next) {
  try {
    const { lead_id, status, limit = 50, offset = 0 } = req.query;
    const conditions = [];
    const params = [];

    if (lead_id) {
      params.push(lead_id);
      conditions.push(`ct.lead_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`ct.status = $${params.length}`);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(parseInt(limit));
    const lIdx = params.length;
    params.push(parseInt(offset));
    const oIdx = params.length;

    const result = await db.query(
      `SELECT ct.*, hl.business_name, hl.first_name, hl.last_name
       FROM crm_tasks ct
       LEFT JOIN host_leads hl ON ct.lead_id = hl.id
       ${where}
       ORDER BY
         CASE ct.status WHEN 'pending' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
         ct.due_date ASC NULLS LAST
       LIMIT $${lIdx} OFFSET $${oIdx}`,
      params
    );

    res.json({ tasks: result.rows });
  } catch (error) {
    logger.error('CRM getTasks error', { error: error.message });
    next(error);
  }
}

/**
 * POST /crm/tasks
 */
async function createTask(req, res, next) {
  try {
    const { lead_id, title, description, due_date, priority } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }

    const result = await db.query(
      `INSERT INTO crm_tasks (lead_id, title, description, due_date, priority, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING *`,
      [lead_id || null, title, description || null, due_date || null, priority || 'medium', req.user.userId]
    );

    // Log activity on lead if linked
    if (lead_id) {
      await db.query(
        `INSERT INTO crm_activities (lead_id, activity_type, title, created_by)
         VALUES ($1, 'task_created', $2, $3)`,
        [lead_id, `Task: ${title}`, req.user.userId]
      );
    }

    res.status(201).json({ task: result.rows[0] });
  } catch (error) {
    logger.error('CRM createTask error', { error: error.message });
    next(error);
  }
}

/**
 * PATCH /crm/tasks/:id
 */
async function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, due_date, priority, status } = req.body;
    const updates = [];
    const values = [];

    if (title !== undefined) { values.push(title); updates.push(`title = $${values.length}`); }
    if (description !== undefined) { values.push(description); updates.push(`description = $${values.length}`); }
    if (due_date !== undefined) { values.push(due_date); updates.push(`due_date = $${values.length}`); }
    if (priority !== undefined) { values.push(priority); updates.push(`priority = $${values.length}`); }
    if (status !== undefined) {
      values.push(status);
      updates.push(`status = $${values.length}`);
      if (status === 'completed') {
        values.push(new Date().toISOString());
        updates.push(`completed_at = $${values.length}`);
      }
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(new Date().toISOString());
    updates.push(`updated_at = $${values.length}`);
    values.push(id);

    const result = await db.query(
      `UPDATE crm_tasks SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ task: result.rows[0] });
  } catch (error) {
    logger.error('CRM updateTask error', { error: error.message });
    next(error);
  }
}

/**
 * DELETE /crm/tasks/:id
 */
async function deleteTask(req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM crm_tasks WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  } catch (error) {
    logger.error('CRM deleteTask error', { error: error.message });
    next(error);
  }
}

// ─── SITE VISITS ────────────────────────────────────────────────────

/**
 * GET /crm/leads/:id/site-visits
 */
async function getSiteVisits(req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT sv.*, u.name as created_by_name
       FROM crm_site_visits sv
       LEFT JOIN users u ON sv.created_by = u.id
       WHERE sv.lead_id = $1
       ORDER BY sv.visit_date DESC`,
      [id]
    );
    res.json({ visits: result.rows });
  } catch (error) {
    logger.error('CRM getSiteVisits error', { error: error.message });
    next(error);
  }
}

/**
 * POST /crm/leads/:id/site-visits
 */
async function createSiteVisit(req, res, next) {
  try {
    const { id } = req.params;
    const {
      visit_date, contact_name, contact_role, car_park_surface, car_park_spaces,
      motorhome_access, level_ground, electric_hookup, water_access,
      ownership_type, owner_reaction, objections, follow_up_agreed,
      follow_up_date, photos, verdict, verdict_reason, notes,
    } = req.body;

    const result = await db.query(
      `INSERT INTO crm_site_visits (
        lead_id, visit_date, contact_name, contact_role, car_park_surface,
        car_park_spaces, motorhome_access, level_ground, electric_hookup,
        water_access, ownership_type, owner_reaction, objections,
        follow_up_agreed, follow_up_date, photos, verdict, verdict_reason,
        notes, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *`,
      [
        id, visit_date || new Date().toISOString(), contact_name || null,
        contact_role || null, car_park_surface || null, car_park_spaces || null,
        motorhome_access || null, level_ground ?? null, electric_hookup || null,
        water_access ?? null, ownership_type || null, owner_reaction || null,
        objections || null, follow_up_agreed ?? null, follow_up_date || null,
        photos || null, verdict || null, verdict_reason || null, notes || null,
        req.user.userId,
      ]
    );

    // Log activity
    await db.query(
      `INSERT INTO crm_activities (lead_id, activity_type, title, description, created_by)
       VALUES ($1, 'site_visit', 'Site visit completed', $2, $3)`,
      [id, `Verdict: ${verdict || 'pending'}`, req.user.userId]
    );

    // Update lead pipeline stage
    if (verdict === 'convert') {
      await db.query(`UPDATE host_leads SET pipeline_stage = 'converted', updated_at = NOW() WHERE id = $1`, [id]);
    } else if (verdict === 'promising') {
      await db.query(`UPDATE host_leads SET pipeline_stage = 'negotiating', updated_at = NOW() WHERE id = $1`, [id]);
    }

    res.status(201).json({ visit: result.rows[0] });
  } catch (error) {
    logger.error('CRM createSiteVisit error', { error: error.message });
    next(error);
  }
}

// ─── EMAIL TEMPLATES ────────────────────────────────────────────────

/**
 * GET /crm/emails/templates
 */
async function getEmailTemplates(req, res, next) {
  try {
    const result = await db.query('SELECT * FROM crm_email_templates ORDER BY created_at DESC');
    res.json({ templates: result.rows });
  } catch (error) {
    logger.error('CRM getEmailTemplates error', { error: error.message });
    next(error);
  }
}

/**
 * POST /crm/emails/templates
 */
async function createEmailTemplate(req, res, next) {
  try {
    const { name, subject, body, template_type, variables } = req.body;
    if (!name || !subject || !body) {
      return res.status(400).json({ error: 'name, subject and body required' });
    }
    const result = await db.query(
      `INSERT INTO crm_email_templates (name, subject, body, template_type, variables, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, subject, body, template_type || 'outreach', JSON.stringify(variables || []), req.user.userId]
    );
    res.status(201).json({ template: result.rows[0] });
  } catch (error) {
    logger.error('CRM createEmailTemplate error', { error: error.message });
    next(error);
  }
}

/**
 * PATCH /crm/emails/templates/:id
 */
async function updateEmailTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const { name, subject, body, template_type, variables, is_active } = req.body;
    const updates = [];
    const values = [];

    if (name !== undefined) { values.push(name); updates.push(`name = $${values.length}`); }
    if (subject !== undefined) { values.push(subject); updates.push(`subject = $${values.length}`); }
    if (body !== undefined) { values.push(body); updates.push(`body = $${values.length}`); }
    if (template_type !== undefined) { values.push(template_type); updates.push(`template_type = $${values.length}`); }
    if (variables !== undefined) { values.push(JSON.stringify(variables)); updates.push(`variables = $${values.length}`); }
    if (is_active !== undefined) { values.push(is_active); updates.push(`is_active = $${values.length}`); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(new Date().toISOString());
    updates.push(`updated_at = $${values.length}`);
    values.push(id);

    const result = await db.query(
      `UPDATE crm_email_templates SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    res.json({ template: result.rows[0] });
  } catch (error) {
    logger.error('CRM updateEmailTemplate error', { error: error.message });
    next(error);
  }
}

/**
 * DELETE /crm/emails/templates/:id
 */
async function deleteEmailTemplate(req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM crm_email_templates WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    res.json({ success: true });
  } catch (error) {
    logger.error('CRM deleteEmailTemplate error', { error: error.message });
    next(error);
  }
}

// ─── SEND EMAIL ─────────────────────────────────────────────────────

/**
 * POST /crm/leads/:id/send-email
 * Send a one-off email to a lead
 */
async function sendEmail(req, res, next) {
  try {
    const { id } = req.params;
    const { subject, body, template_id } = req.body;

    // Get lead
    const leadResult = await db.query('SELECT * FROM host_leads WHERE id = $1', [id]);
    if (leadResult.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    const lead = leadResult.rows[0];

    if (!lead.email) return res.status(400).json({ error: 'Lead has no email address' });
    if (!subject || !body) return res.status(400).json({ error: 'subject and body required' });

    // Interpolate variables
    const interpolated = interpolateTemplate(body, lead);
    const interpolatedSubject = interpolateTemplate(subject, lead);

    await sendCrmLeadEmail(lead.email, interpolatedSubject, interpolated);

    // Log to email log
    await db.query(
      `INSERT INTO crm_email_log (lead_id, template_id, subject, body, to_email, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'sent', $6)`,
      [id, template_id || null, interpolatedSubject, interpolated, lead.email, req.user.userId]
    );

    // Log activity
    await db.query(
      `INSERT INTO crm_activities (lead_id, activity_type, title, description, created_by)
       VALUES ($1, 'email', 'Email sent', $2, $3)`,
      [id, `Subject: ${interpolatedSubject}`, req.user.userId]
    );

    // Update contact date
    await db.query('UPDATE host_leads SET last_contact_date = NOW(), updated_at = NOW() WHERE id = $1', [id]);

    res.json({ success: true, message: 'Email sent' });
  } catch (error) {
    logger.error('CRM sendEmail error', { error: error.message });
    next(error);
  }
}

// ─── STATS ──────────────────────────────────────────────────────────

/**
 * GET /crm/stats
 */
async function getStats(req, res, next) {
  try {
    const pipeline = await db.query(`
      SELECT pipeline_stage, COUNT(*) as count
      FROM host_leads GROUP BY pipeline_stage
    `);

    const totals = await db.query(`
      SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE pipeline_stage = 'converted') as converted,
        COUNT(*) FILTER (WHERE pipeline_stage = 'lost') as lost,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_this_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_this_month,
        COUNT(*) FILTER (WHERE priority = 'hot') as hot_leads
      FROM host_leads
    `);

    const overdueTasks = await db.query(`
      SELECT COUNT(*) as count FROM crm_tasks
      WHERE status = 'pending' AND due_date < NOW()
    `);

    const upcomingTasks = await db.query(`
      SELECT COUNT(*) as count FROM crm_tasks
      WHERE status = 'pending' AND due_date BETWEEN NOW() AND NOW() + INTERVAL '3 days'
    `);

    const recentActivities = await db.query(`
      SELECT ca.*, hl.business_name, hl.first_name, hl.last_name, u.name as created_by_name
      FROM crm_activities ca
      LEFT JOIN host_leads hl ON ca.lead_id = hl.id
      LEFT JOIN users u ON ca.created_by = u.id
      ORDER BY ca.created_at DESC LIMIT 10
    `);

    const emailsSent = await db.query(`
      SELECT COUNT(*) as count FROM crm_email_log
      WHERE sent_at >= NOW() - INTERVAL '30 days'
    `);

    const conversionRate = totals.rows[0].total_leads > 0
      ? ((parseInt(totals.rows[0].converted) / parseInt(totals.rows[0].total_leads)) * 100).toFixed(1)
      : '0.0';

    res.json({
      pipeline: pipeline.rows,
      totals: { ...totals.rows[0], conversion_rate: conversionRate },
      overdue_tasks: parseInt(overdueTasks.rows[0].count),
      upcoming_tasks: parseInt(upcomingTasks.rows[0].count),
      emails_sent_30d: parseInt(emailsSent.rows[0].count),
      recent_activities: recentActivities.rows,
    });
  } catch (error) {
    logger.error('CRM getStats error', { error: error.message });
    next(error);
  }
}

// ─── EMAIL LOG ──────────────────────────────────────────────────────

/**
 * GET /crm/leads/:id/emails
 */
async function getEmailLog(req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT el.*, et.name as template_name
       FROM crm_email_log el
       LEFT JOIN crm_email_templates et ON el.template_id = et.id
       WHERE el.lead_id = $1
       ORDER BY el.sent_at DESC`,
      [id]
    );
    res.json({ emails: result.rows });
  } catch (error) {
    logger.error('CRM getEmailLog error', { error: error.message });
    next(error);
  }
}

// ─── SEQUENCES ──────────────────────────────────────────────────────

/**
 * GET /crm/emails/sequences
 */
async function getSequences(req, res, next) {
  try {
    const result = await db.query(`
      SELECT es.*,
        (SELECT COUNT(*) FROM crm_email_sequence_steps WHERE sequence_id = es.id) as step_count,
        (SELECT COUNT(*) FROM crm_lead_sequences WHERE sequence_id = es.id AND status = 'active') as active_leads
      FROM crm_email_sequences es
      ORDER BY es.created_at DESC
    `);
    res.json({ sequences: result.rows });
  } catch (error) {
    logger.error('CRM getSequences error', { error: error.message });
    next(error);
  }
}

/**
 * POST /crm/emails/sequences
 */
async function createSequence(req, res, next) {
  try {
    const { name, description, steps } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const result = await db.query(
      `INSERT INTO crm_email_sequences (name, description, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [name, description || null, req.user.userId]
    );

    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        await db.query(
          `INSERT INTO crm_email_sequence_steps (sequence_id, step_order, template_id, delay_days, stop_on_reply)
           VALUES ($1, $2, $3, $4, $5)`,
          [result.rows[0].id, step.step_order, step.template_id, step.delay_days || 0, step.stop_on_reply !== false]
        );
      }
    }

    res.status(201).json({ sequence: result.rows[0] });
  } catch (error) {
    logger.error('CRM createSequence error', { error: error.message });
    next(error);
  }
}

// ─── SETTINGS ───────────────────────────────────────────────────────

/**
 * GET /crm/settings
 */
async function getSettings(req, res, next) {
  try {
    const result = await db.query('SELECT * FROM crm_settings');
    const settings = result.rows.map(r => ({
      key: r.key,
      value: typeof r.value === 'string' ? r.value : JSON.stringify(r.value),
    }));
    res.json({ settings });
  } catch (error) {
    logger.error('CRM getSettings error', { error: error.message });
    next(error);
  }
}

/**
 * GET /crm/automation-status
 * Returns effective automation status including server kill-switch.
 */
async function getAutomationStatus(req, res, next) {
  try {
    const settings = await getSettingsMap();

    const serverEnabled = String(process.env.CRM_DISCOVERY_AUTO_EMAIL_ENABLED || '').toLowerCase() === 'true';
    const settingEnabled = parseBoolSetting(settings.discovery_auto_email_enabled, false);
    const gateReady = parseBoolSetting(settings.discovery_auto_mode_ready, false);
    const threshold = parseIntSetting(settings.auto_mode_threshold, 85);
    const minFitScore = parseIntSetting(settings.discovery_auto_email_min_fit_score, 85);
    const dailyLimit = parseIntSetting(settings.discovery_auto_email_daily_limit, 20);

    const effectiveEnabled = serverEnabled && settingEnabled && gateReady;

    res.json({
      server_kill_switch_enabled: serverEnabled,
      setting_enabled: settingEnabled,
      gate_ready: gateReady,
      effective_enabled: effectiveEnabled,
      threshold,
      min_fit_score: minFitScore,
      daily_limit: dailyLimit,
    });
  } catch (error) {
    logger.error('CRM getAutomationStatus error', { error: error.message });
    next(error);
  }
}

/**
 * PATCH /crm/settings
 */
async function updateSettings(req, res, next) {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings object required' });
    }

    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        `INSERT INTO crm_settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, JSON.stringify(value)]
      );
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('CRM updateSettings error', { error: error.message });
    next(error);
  }
}

// ─── STAGES ─────────────────────────────────────────────────────────

async function getStages(req, res, next) {
  try {
    const r = await db.query('SELECT * FROM crm_stages ORDER BY sort_order, id');
    res.json({ stages: r.rows });
  } catch (e) { next(e); }
}

async function createStage(req, res, next) {
  try {
    const { name, color = 'blue', is_won = false, is_lost = false } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
    // Generate a unique slug from name
    const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'stage';
    let slug = base;
    let attempt = 1;
    while (true) {
      const existing = await db.query('SELECT id FROM crm_stages WHERE slug = $1', [slug]);
      if (existing.rows.length === 0) break;
      slug = `${base}_${++attempt}`;
    }
    const maxR = await db.query('SELECT COALESCE(MAX(sort_order), 0) AS max FROM crm_stages');
    const sortOrder = parseInt(maxR.rows[0].max) + 1;
    const r = await db.query(
      'INSERT INTO crm_stages (slug, name, color, sort_order, is_won, is_lost) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [slug, name.trim(), color, sortOrder, !!is_won, !!is_lost]
    );
    res.status(201).json({ stage: r.rows[0] });
  } catch (e) { next(e); }
}

async function updateStage(req, res, next) {
  try {
    const { id } = req.params;
    const { name, color, is_won, is_lost, sort_order } = req.body;
    const cols = []; const vals = [];
    if (name !== undefined)       { vals.push(name.trim());  cols.push(`name = $${vals.length}`); }
    if (color !== undefined)      { vals.push(color);        cols.push(`color = $${vals.length}`); }
    if (is_won !== undefined)     { vals.push(!!is_won);     cols.push(`is_won = $${vals.length}`); }
    if (is_lost !== undefined)    { vals.push(!!is_lost);    cols.push(`is_lost = $${vals.length}`); }
    if (sort_order !== undefined) { vals.push(sort_order);   cols.push(`sort_order = $${vals.length}`); }
    if (cols.length === 0) return res.status(400).json({ error: 'nothing to update' });
    cols.push(`updated_at = NOW()`);
    vals.push(id);
    const r = await db.query(
      `UPDATE crm_stages SET ${cols.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Stage not found' });
    res.json({ stage: r.rows[0] });
  } catch (e) { next(e); }
}

async function deleteStage(req, res, next) {
  try {
    const { id } = req.params;
    const stage = await db.query('SELECT slug FROM crm_stages WHERE id = $1', [id]);
    if (!stage.rows.length) return res.status(404).json({ error: 'Stage not found' });
    const slug = stage.rows[0].slug;
    const count = await db.query('SELECT COUNT(*) FROM host_leads WHERE pipeline_stage = $1', [slug]);
    if (parseInt(count.rows[0].count) > 0) {
      return res.status(409).json({ error: `Cannot delete — ${count.rows[0].count} lead(s) in this stage. Move them first.` });
    }
    await db.query('DELETE FROM crm_stages WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (e) { next(e); }
}

async function reorderStages(req, res, next) {
  try {
    const { order } = req.body; // [{ id, sort_order }]
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' });
    for (const { id, sort_order } of order) {
      await db.query('UPDATE crm_stages SET sort_order = $1 WHERE id = $2', [sort_order, id]);
    }
    res.json({ success: true });
  } catch (e) { next(e); }
}

// ─── CUSTOM FIELDS ───────────────────────────────────────────────────

async function getCustomFields(req, res, next) {
  try {
    const r = await db.query('SELECT * FROM crm_custom_fields ORDER BY sort_order, id');
    res.json({ fields: r.rows });
  } catch (e) { next(e); }
}

async function createCustomField(req, res, next) {
  try {
    const { name, field_type = 'text', options = [], show_in_table = true } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
    const maxR = await db.query('SELECT COALESCE(MAX(sort_order), 0) AS max FROM crm_custom_fields');
    const sortOrder = parseInt(maxR.rows[0].max) + 1;
    const r = await db.query(
      'INSERT INTO crm_custom_fields (name, field_type, options, sort_order, show_in_table) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name.trim(), field_type, JSON.stringify(options), sortOrder, !!show_in_table]
    );
    res.status(201).json({ field: r.rows[0] });
  } catch (e) { next(e); }
}

async function updateCustomField(req, res, next) {
  try {
    const { id } = req.params;
    const { name, options, show_in_table, sort_order } = req.body;
    const cols = []; const vals = [];
    if (name !== undefined)         { vals.push(name.trim());           cols.push(`name = $${vals.length}`); }
    if (options !== undefined)      { vals.push(JSON.stringify(options)); cols.push(`options = $${vals.length}`); }
    if (show_in_table !== undefined){ vals.push(!!show_in_table);        cols.push(`show_in_table = $${vals.length}`); }
    if (sort_order !== undefined)   { vals.push(sort_order);             cols.push(`sort_order = $${vals.length}`); }
    if (cols.length === 0) return res.status(400).json({ error: 'nothing to update' });
    vals.push(id);
    const r = await db.query(
      `UPDATE crm_custom_fields SET ${cols.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Field not found' });
    res.json({ field: r.rows[0] });
  } catch (e) { next(e); }
}

async function deleteCustomField(req, res, next) {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM crm_custom_fields WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (e) { next(e); }
}

async function getCustomValues(req, res, next) {
  try {
    const { id } = req.params;
    const r = await db.query('SELECT field_id, value FROM crm_custom_values WHERE lead_id = $1', [id]);
    const values = {};
    r.rows.forEach(row => { values[row.field_id] = row.value; });
    res.json({ values });
  } catch (e) { next(e); }
}

async function setCustomValues(req, res, next) {
  try {
    const { id } = req.params;
    const { values } = req.body;
    if (!values || typeof values !== 'object') return res.status(400).json({ error: 'values object required' });
    for (const [field_id, value] of Object.entries(values)) {
      if (value === null || value === '') {
        await db.query('DELETE FROM crm_custom_values WHERE lead_id = $1 AND field_id = $2', [id, field_id]);
      } else {
        await db.query(
          `INSERT INTO crm_custom_values (lead_id, field_id, value) VALUES ($1,$2,$3)
           ON CONFLICT (lead_id, field_id) DO UPDATE SET value = $3`,
          [id, field_id, String(value)]
        );
      }
    }
    res.json({ success: true });
  } catch (e) { next(e); }
}

// ─── HELPERS ────────────────────────────────────────────────────────

function interpolateTemplate(template, lead) {
  return template
    .replace(/\{\{first_name\}\}/g, lead.first_name || '')
    .replace(/\{\{last_name\}\}/g, lead.last_name || '')
    .replace(/\{\{business_name\}\}/g, lead.business_name || '')
    .replace(/\{\{location\}\}/g, lead.location || '')
    .replace(/\{\{email\}\}/g, lead.email || '')
    .replace(/\{\{phone\}\}/g, lead.phone || '')
    .replace(/\{\{property_type\}\}/g, lead.property_type || '')
    .replace(/\{\{google_rating\}\}/g, lead.google_rating || '')
    .replace(/\{\{google_reviews_count\}\}/g, lead.google_reviews_count || '');
}

function wrapEmailHtml(body) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
      ${body}
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px;" />
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 12px; color: #888; line-height: 1.6;">
        <tr>
          <td>
            <p style="margin: 0 0 8px;"><strong style="color: #555;">Pierce Shapton</strong><br/>A Proper Place Limited</p>
            <p style="margin: 0 0 8px;">
              <a href="https://www.proper-place.co.uk" style="color: #10b981; text-decoration: none;">proper-place.co.uk</a> · 
              <a href="mailto:pierce.shapton@proper-place.co.uk" style="color: #10b981; text-decoration: none;">pierce.shapton@proper-place.co.uk</a>
            </p>
            <p style="margin: 0; font-size: 11px; color: #aaa;">
              London, England · Registered in England &amp; Wales<br/>
              If you no longer wish to receive these emails, please <a href="mailto:pierce.shapton@proper-place.co.uk?subject=Unsubscribe" style="color: #aaa;">let us know</a>.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

// ─── Google Places Enrichment ────────────────────────────────────────

const axios = require('axios');

const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyBqXtdl4q7VW4PEbK2dKsdouT1d_35WTy0';

async function enrichFromGoogle(name, lat, lng) {
  try {
    // Step 1: Text search (prefer nearby if we have coords)
    let placeId = null;
    if (lat && lng) {
      const nearby = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
        params: { location: `${lat},${lng}`, radius: 100, keyword: name, key: GMAPS_KEY },
        timeout: 5000,
      });
      if (nearby.data.results?.length > 0) placeId = nearby.data.results[0].place_id;
    }
    if (!placeId) {
      const text = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
        params: { query: name, key: GMAPS_KEY },
        timeout: 5000,
      });
      if (text.data.results?.length > 0) placeId = text.data.results[0].place_id;
    }
    if (!placeId) return null;

    // Step 2: Get details
    const details = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        fields: 'name,formatted_phone_number,website,rating,user_ratings_total,formatted_address,geometry',
        key: GMAPS_KEY,
      },
      timeout: 5000,
    });
    const p = details.data.result;
    if (!p) return null;

    return {
      google_place_id: placeId,
      phone: p.formatted_phone_number || null,
      website: p.website || null,
      google_rating: p.rating || null,
      google_reviews_count: p.user_ratings_total || null,
      location: p.formatted_address || null,
      latitude: p.geometry?.location?.lat || null,
      longitude: p.geometry?.location?.lng || null,
    };
  } catch (err) {
    logger.warn('Google Places enrichment failed', { name, error: err.message });
    return null;
  }
}

/**
 * POST /crm/leads/:id/enrich
 * Enrich an existing lead with Google Places data
 */
async function enrichLead(req, res, next) {
  try {
    const { id } = req.params;
    const leadRes = await db.query('SELECT * FROM host_leads WHERE id = $1', [id]);
    if (!leadRes.rows.length) return res.status(404).json({ error: 'Lead not found' });
    const lead = leadRes.rows[0];

    const enriched = await enrichFromGoogle(
      lead.business_name || `${lead.first_name} ${lead.last_name}`.trim(),
      lead.latitude,
      lead.longitude
    );
    if (!enriched) return res.status(422).json({ error: 'Could not find this business on Google Places' });

    const updates = [];
    const values = [];
    const fields = ['phone', 'website', 'google_place_id', 'google_rating', 'google_reviews_count', 'location', 'latitude', 'longitude'];
    for (const f of fields) {
      if (enriched[f] !== null && enriched[f] !== undefined) {
        values.push(enriched[f]);
        updates.push(`${f} = $${values.length}`);
      }
    }
    if (!updates.length) return res.status(422).json({ error: 'No new data found' });

    values.push(id);
    const updated = await db.query(`UPDATE host_leads SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`, values);

    await db.query(
      `INSERT INTO crm_activities (lead_id, activity_type, title, description, created_by) VALUES ($1, 'note', 'Enriched from Google Places', $2, $3)`,
      [id, `Rating: ${enriched.google_rating || '–'} (${enriched.google_reviews_count || 0} reviews). Website: ${enriched.website || 'none'}`, req.user.userId]
    );

    res.json({ lead: updated.rows[0], enriched });
  } catch (error) {
    logger.error('enrichLead error', { error: error.message });
    next(error);
  }
}

/**
 * POST /crm/leads/import
 * Bulk import leads (e.g. from KML), optionally enriching each via Google Places
 */
async function importLeads(req, res, next) {
  try {
    const { places, enrich = false, pipeline_stage = 'new', priority = 'medium' } = req.body;
    if (!Array.isArray(places) || places.length === 0) {
      return res.status(400).json({ error: 'places array required' });
    }
    if (places.length > 200) {
      return res.status(400).json({ error: 'Max 200 places per import' });
    }

    const results = [];
    let enrichedCount = 0;

    for (const place of places) {
      const {
        name,
        description,
        lat,
        lng,
        address,
        fit_score,
        parking_confidence,
        access_score,
        campervan_priority,
      } = place;
      if (!name) continue;

      let data = {
        business_name: name,
        location: address || null,
        latitude: lat || null,
        longitude: lng || null,
        pipeline_stage,
        priority,
        source: 'kml_import',
        discovery_fit_score: fit_score || null,
        discovery_parking_confidence: parking_confidence || null,
        discovery_access_score: access_score || null,
        discovery_campervan_priority: campervan_priority || null,
        discovery_last_analyzed_at: fit_score ? new Date().toISOString() : null,
      };

      if (enrich) {
        const enriched = await enrichFromGoogle(name, lat, lng);
        if (enriched) {
          enrichedCount++;
          data = {
            ...data,
            phone: enriched.phone,
            website: enriched.website,
            google_place_id: enriched.google_place_id,
            google_rating: enriched.google_rating,
            google_reviews_count: enriched.google_reviews_count,
            location: enriched.location || data.location,
            latitude: enriched.latitude || data.latitude,
            longitude: enriched.longitude || data.longitude,
          };
        }
      }

      try {
        const r = await db.query(
          `INSERT INTO host_leads (
            business_name, location, latitude, longitude, phone, website,
            google_place_id, google_rating, google_reviews_count,
            pipeline_stage, priority, admin_notes, source, assigned_to,
            discovery_fit_score, discovery_parking_confidence, discovery_access_score,
            discovery_campervan_priority, discovery_last_analyzed_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
          ON CONFLICT DO NOTHING
          RETURNING id`,
          [
            data.business_name, data.location, data.latitude, data.longitude,
            data.phone || null, data.website || null,
            data.google_place_id || null, data.google_rating || null, data.google_reviews_count || null,
            data.pipeline_stage, data.priority,
            description || null, data.source, req.user.userId,
            data.discovery_fit_score, data.discovery_parking_confidence, data.discovery_access_score,
            data.discovery_campervan_priority, data.discovery_last_analyzed_at,
          ]
        );
        if (r.rows.length > 0) {
          results.push({ name, id: r.rows[0].id, status: 'created' });
          await db.query(
            `INSERT INTO crm_activities (lead_id, activity_type, title, created_by) VALUES ($1, 'lead_created', 'Imported from KML', $2)`,
            [r.rows[0].id, req.user.userId]
          );
        } else {
          results.push({ name, status: 'skipped' });
        }
      } catch (e) {
        results.push({ name, status: 'error', error: e.message });
      }
    }

    const created = results.filter(r => r.status === 'created').length;
    res.json({ created, enriched: enrichedCount, total: places.length, results });
  } catch (error) {
    logger.error('importLeads error', { error: error.message });
    next(error);
  }
}

async function processDiscoveryAutoEmails() {
  try {
    // Hard kill switch: remains deactivated unless explicitly turned on in server env.
    if (String(process.env.CRM_DISCOVERY_AUTO_EMAIL_ENABLED || '').toLowerCase() !== 'true') {
      return;
    }

    const settings = await getSettingsMap();
    const autoEnabled = parseBoolSetting(settings.discovery_auto_email_enabled, false);
    const gateReady = parseBoolSetting(settings.discovery_auto_mode_ready, false);
    const minFitScore = parseIntSetting(settings.discovery_auto_email_min_fit_score, 85);
    const dailyLimit = parseIntSetting(settings.discovery_auto_email_daily_limit, 20);

    if (!autoEnabled || !gateReady || dailyLimit <= 0) {
      return;
    }

    const sentTodayRes = await db.query(
      `SELECT COUNT(*) AS count
       FROM crm_email_log
       WHERE status = 'sent'
         AND sent_at >= date_trunc('day', NOW())
         AND sent_at < date_trunc('day', NOW()) + interval '1 day'
         AND (subject ILIKE '%proper place%' OR subject ILIKE '%campervan%' OR subject ILIKE '%motorhome%')`
    );
    const sentToday = parseInt(sentTodayRes.rows[0].count, 10) || 0;
    const remaining = Math.max(0, dailyLimit - sentToday);
    if (remaining <= 0) return;

    const leadsRes = await db.query(
      `SELECT hl.*
       FROM host_leads hl
       WHERE hl.email IS NOT NULL
         AND hl.email <> ''
         AND hl.pipeline_stage = 'new'
         AND COALESCE(hl.discovery_fit_score, 0) >= $1
         AND COALESCE(hl.discovery_campervan_priority, 0) >= 40
         AND NOT EXISTS (
           SELECT 1 FROM crm_email_log cel
           WHERE cel.lead_id = hl.id
             AND cel.status = 'sent'
             AND cel.sent_at >= NOW() - interval '60 days'
         )
       ORDER BY COALESCE(hl.discovery_campervan_priority, 0) DESC,
                COALESCE(hl.discovery_fit_score, 0) DESC,
                hl.created_at ASC
       LIMIT $2`,
      [minFitScore, remaining]
    );

    if (!leadsRes.rows.length) return;

    const templateRes = await db.query(
      `SELECT * FROM crm_email_templates
       WHERE is_active = true
         AND template_type = 'outreach'
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (!templateRes.rows.length) {
      logger.warn('Discovery auto-email skipped: no active outreach template');
      return;
    }

    const template = templateRes.rows[0];

    for (const lead of leadsRes.rows) {
      const subject = interpolateTemplate(template.subject || 'Partnership with {{business_name}}', lead);
      const body = interpolateTemplate(template.body || defaultOutreachBody(), lead);

      try {
        await sendCrmLeadEmail(lead.email, subject, body);

        await db.query(
          `INSERT INTO crm_email_log (lead_id, template_id, subject, body, to_email, status, created_by)
           VALUES ($1, $2, $3, $4, $5, 'sent', NULL)`,
          [lead.id, template.id, subject, body, lead.email]
        );

        await db.query(
          `INSERT INTO crm_activities (lead_id, activity_type, title, description, created_by)
           VALUES ($1, 'email', 'Auto outreach sent', $2, NULL)`,
          [lead.id, `Auto outreach gate approved. Fit: ${lead.discovery_fit_score || 0}, Campervan: ${lead.discovery_campervan_priority || 0}`]
        );

        await db.query(
          `UPDATE host_leads
           SET last_contact_date = NOW(), updated_at = NOW(), pipeline_stage = 'contacted'
           WHERE id = $1`,
          [lead.id]
        );
      } catch (err) {
        logger.warn('Discovery auto-email send failed', { leadId: lead.id, error: err.message });
      }
    }
  } catch (error) {
    logger.error('processDiscoveryAutoEmails error', { error: error.message });
  }
}

/**
 * POST /crm/discovery/auto-find/run
 * Manual trigger for AI site finding without email sending.
 */
async function runDiscoveryAutoFind(req, res, next) {
  try {
    const result = await processDiscoveryAutoFind({ manual: true, requestedBy: req.user?.userId || null });
    res.json(result);
  } catch (error) {
    logger.error('runDiscoveryAutoFind error', { error: error.message });
    next(error);
  }
}

async function processDiscoveryAutoFind(options = {}) {
  const { manual = false, requestedBy = null } = options;

  try {
    const serverEnabled = String(process.env.CRM_DISCOVERY_AUTO_FIND_ENABLED || 'true').toLowerCase() === 'true';
    if (!manual && !serverEnabled) {
      return { success: true, skipped: true, reason: 'server_kill_switch_off' };
    }

    const settings = await getSettingsMap();
    const settingEnabled = parseBoolSetting(settings.discovery_auto_find_enabled, false);
    if (!manual && !settingEnabled) {
      return { success: true, skipped: true, reason: 'setting_disabled' };
    }

    const region = String(settings.discovery_auto_find_region || 'South West England').trim();
    const keywords = String(
      settings.discovery_auto_find_keywords ||
      'pub with parking, country inn, farm shop, vineyard, rural hotel'
    )
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 8);

    const minFitScore = parseIntSetting(settings.discovery_auto_find_min_fit_score, 72);
    const dailyLimit = parseIntSetting(settings.discovery_auto_find_daily_limit, 25);

    if (!region || keywords.length === 0 || dailyLimit <= 0) {
      return { success: true, skipped: true, reason: 'invalid_configuration' };
    }

    const createdTodayRes = await db.query(
      `SELECT COUNT(*) AS count
       FROM discovery_review_queue
       WHERE source = 'discovery_auto_find'
         AND created_at >= date_trunc('day', NOW())
         AND created_at < date_trunc('day', NOW()) + interval '1 day'`
    );

    const createdToday = parseInt(createdTodayRes.rows[0].count, 10) || 0;
    const remaining = Math.max(0, dailyLimit - createdToday);
    if (remaining <= 0) {
      return { success: true, skipped: true, reason: 'daily_limit_reached', created_today: createdToday };
    }

    const profileRes = await db.query(
      `SELECT
         COALESCE(AVG(google_rating), 4.2) AS avg_rating,
         COALESCE(AVG(NULLIF(google_reviews_count, 0)), 140) AS avg_reviews
       FROM host_leads
       WHERE google_rating IS NOT NULL
         AND pipeline_stage IN ('converted', 'negotiating')`
    );

    const targetProfile = {
      avgRating: Number(profileRes.rows[0].avg_rating) || 4.2,
      avgReviews: Number(profileRes.rows[0].avg_reviews) || 140,
    };

    const allCandidates = [];
    for (const keyword of keywords) {
      const rows = await searchGooglePlacesText(keyword, region);
      allCandidates.push(...rows);
    }

    const deduped = new Map();
    allCandidates.forEach(item => {
      const key = item.google_place_id || `${item.business_name}|${item.location}`.toLowerCase();
      if (!deduped.has(key)) deduped.set(key, item);
    });

    const scored = Array.from(deduped.values())
      .map(item => {
        const signals = scoreAutoDiscoveryCandidate(item, targetProfile);
        return { ...item, ...signals };
      })
      .filter(item => item.discovery_fit_score >= minFitScore)
      .sort((a, b) => b.discovery_fit_score - a.discovery_fit_score)
      .slice(0, Math.max(remaining * 3, 30));

    // Also filter against stored rejection memory before queuing
    const rawRejected = settings.discovery_rejected_sites_v1 || '[]';
    let rejectedMemory = [];
    try { rejectedMemory = JSON.parse(rawRejected); if (!Array.isArray(rejectedMemory)) rejectedMemory = []; } catch { rejectedMemory = []; }
    const rejectedKeys = new Set(rejectedMemory.map(r => r.id || ''));

    // Also skip place_ids already in the queue (pending) or recently in host_leads
    const pendingRes = await db.query(`SELECT google_place_id FROM discovery_review_queue WHERE status = 'pending' AND google_place_id IS NOT NULL`);
    const pendingPlaceIds = new Set(pendingRes.rows.map(r => r.google_place_id));
    const existingRes = await db.query(`SELECT google_place_id FROM host_leads WHERE google_place_id IS NOT NULL`);
    const existingPlaceIds = new Set(existingRes.rows.map(r => r.google_place_id));

    let queued = 0;
    const queuedItems = [];

    for (const item of scored) {
      if (queued >= remaining) break;

      const placeKey = item.google_place_id || null;
      if (placeKey && (pendingPlaceIds.has(placeKey) || existingPlaceIds.has(placeKey))) continue;
      const rejectionKey = placeKey || `${item.business_name}|${item.location}`.toLowerCase();
      if (rejectedKeys.has(rejectionKey)) continue;

      const result = await db.query(
        `INSERT INTO discovery_review_queue (
          business_name, location, latitude, longitude, website,
          google_place_id, google_rating, google_reviews_count,
          admin_notes, source,
          discovery_fit_score, discovery_parking_confidence, discovery_access_score,
          discovery_campervan_priority
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING id, business_name`,
        [
          item.business_name,
          item.location || null,
          item.latitude,
          item.longitude,
          item.website || null,
          item.google_place_id || null,
          item.google_rating || null,
          item.google_reviews_count || null,
          `Auto-found from ${region}. Keywords: ${keywords.join(', ')}`,
          'discovery_auto_find',
          item.discovery_fit_score,
          item.discovery_parking_confidence,
          item.discovery_access_score,
          item.discovery_campervan_priority,
        ]
      );

      if (result.rows.length > 0) {
        queued += 1;
        queuedItems.push({ id: result.rows[0].id, name: result.rows[0].business_name });
      }
    }

    return {
      success: true,
      skipped: false,
      queued,
      considered: scored.length,
      remaining_capacity: Math.max(0, remaining - queued),
      queued_items: queuedItems,
      mode: manual ? 'manual' : 'scheduled',
      email_sent: 0,
    };
  } catch (error) {
    logger.error('processDiscoveryAutoFind error', { error: error.message });
    if (manual) throw error;
    return { success: false, skipped: true, reason: 'error', error: error.message };
  }
}

async function searchGooglePlacesText(keyword, region) {
  const response = await axios.post(
    'https://places.googleapis.com/v1/places:searchText',
    {
      textQuery: `${keyword} in ${region}`,
      maxResultCount: 20,
      languageCode: 'en-GB',
    },
    {
      timeout: 8000,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GMAPS_KEY,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.rating',
          'places.userRatingCount',
          'places.websiteUri',
          'places.primaryType',
          'places.types',
          'places.parkingOptions',
          'places.accessibilityOptions',
        ].join(','),
      },
    }
  );

  const places = Array.isArray(response.data?.places) ? response.data.places : [];

  return places.map(place => ({
    business_name: place.displayName?.text || 'Unnamed Site',
    location: place.formattedAddress || '',
    latitude: typeof place.location?.latitude === 'number' ? place.location.latitude : null,
    longitude: typeof place.location?.longitude === 'number' ? place.location.longitude : null,
    google_place_id: place.id || null,
    google_rating: typeof place.rating === 'number' ? place.rating : null,
    google_reviews_count: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    website: place.websiteUri || null,
    primary_type: place.primaryType || null,
    types: Array.isArray(place.types) ? place.types : [],
    parking_options: place.parkingOptions || null,
    accessibility_options: place.accessibilityOptions || null,
  }));
}

function scoreAutoDiscoveryCandidate(candidate, profile) {
  const rating = typeof candidate.google_rating === 'number' ? candidate.google_rating : null;
  const reviews = typeof candidate.google_reviews_count === 'number' ? candidate.google_reviews_count : null;
  const types = Array.isArray(candidate.types) ? candidate.types.map(t => String(t).toLowerCase()) : [];

  let score = 45;

  if (rating !== null) {
    const ratingDelta = Math.abs(rating - profile.avgRating);
    score += Math.max(0, 25 - ratingDelta * 10);
  }

  if (reviews !== null) {
    const target = Math.max(20, profile.avgReviews);
    const ratio = Math.min(reviews / target, 2);
    score += Math.round(ratio * 10);
  }

  const typeBoost = types.some(type => /pub|bar|inn|hotel|farm|vineyard/.test(type)) ? 10 : 0;
  score += typeBoost;

  const parkingOptions = candidate.parking_options || {};
  const accessibilityOptions = candidate.accessibility_options || {};

  let parkingConfidence = 45;
  if (parkingOptions.freeParkingLot || parkingOptions.freeStreetParking) parkingConfidence += 30;
  if (parkingOptions.paidParkingLot || parkingOptions.paidStreetParking) parkingConfidence += 15;
  if (parkingOptions.valetParking) parkingConfidence -= 10;

  let accessScore = 50;
  if (accessibilityOptions.wheelchairAccessibleParking) accessScore += 20;
  if (accessibilityOptions.wheelchairAccessibleEntrance) accessScore += 15;

  const campervanPriority = Math.round((parkingConfidence * 0.55) + (accessScore * 0.45));
  score += Math.round((campervanPriority - 50) * 0.25);

  return {
    discovery_fit_score: clampInt(score, 0, 100),
    discovery_parking_confidence: clampInt(parkingConfidence, 0, 100),
    discovery_access_score: clampInt(accessScore, 0, 100),
    discovery_campervan_priority: clampInt(campervanPriority, 0, 100),
  };
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

async function getDiscoveryReviewQueue(req, res, next) {
  try {
    const result = await db.query(
      `SELECT * FROM discovery_review_queue WHERE status = 'pending' ORDER BY discovery_fit_score DESC, created_at DESC LIMIT 100`
    );
    res.json({ queue: result.rows });
  } catch (error) {
    logger.error('getDiscoveryReviewQueue error', { error: error.message });
    next(error);
  }
}

async function replaceDiscoveryQueue(req, res, next) {
  try {
    const candidates = req.body.candidates;
    if (!Array.isArray(candidates)) {
      return res.status(400).json({ error: 'candidates must be an array' });
    }

    // Delete only pending items — leave approved/rejected (pipeline & memory) intact
    await db.query(`DELETE FROM discovery_review_queue WHERE status = 'pending'`);

    // Get existing host_leads place IDs so we don't re-queue already-imported sites
    const existingRes = await db.query(`SELECT google_place_id FROM host_leads WHERE google_place_id IS NOT NULL`);
    const existingPlaceIds = new Set(existingRes.rows.map(r => r.google_place_id));

    // Get rejection memory
    const settings = await getSettingsMap();
    const rawRejected = settings.discovery_rejected_sites_v1 || '[]';
    let rejectedMemory = [];
    try { rejectedMemory = JSON.parse(rawRejected); if (!Array.isArray(rejectedMemory)) rejectedMemory = []; } catch { rejectedMemory = []; }
    const rejectedKeys = new Set(rejectedMemory.map(r => r.id || ''));

    let queued = 0;
    for (const item of candidates.slice(0, 100)) {
      const placeId = item.google_place_id || item.id || null;
      if (placeId && existingPlaceIds.has(placeId)) continue;
      const rejKey = placeId || `${item.name}|${item.address || ''}`.toLowerCase();
      if (rejectedKeys.has(rejKey)) continue;

      await db.query(
        `INSERT INTO discovery_review_queue (
          business_name, location, latitude, longitude, website,
          google_place_id, google_rating, google_reviews_count,
          admin_notes, source,
          discovery_fit_score, discovery_parking_confidence,
          discovery_access_score, discovery_campervan_priority
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          item.name || 'Unknown',
          item.address || null,
          item.latitude ?? null,
          item.longitude ?? null,
          item.website || null,
          placeId,
          item.rating ?? null,
          item.reviews ?? null,
          item.summary || null,
          'discovery_manual_identify',
          Math.round(item.score ?? 0),
          Math.round(item.siteAnalysis?.parkingConfidence ?? 0),
          Math.round(item.siteAnalysis?.accessScore ?? 0),
          Math.round(item.siteAnalysis?.campervanPriority ?? 0),
        ]
      );
      queued += 1;
    }

    res.json({ success: true, queued, replaced: true });
  } catch (error) {
    logger.error('replaceDiscoveryQueue error', { error: error.message });
    next(error);
  }
}

async function submitDiscoveryQueueReview(req, res, next) {
  try {
    const { id } = req.params;
    const numStars = parseInt(String(req.body.stars), 10);
    const reviewNotes = typeof req.body.notes === 'string' ? req.body.notes.trim().slice(0, 2000) : null;
    if (!Number.isFinite(numStars) || numStars < 1 || numStars > 5) {
      return res.status(400).json({ error: 'stars must be 1-5' });
    }

    const itemRes = await db.query(
      `SELECT * FROM discovery_review_queue WHERE id = $1 AND status = 'pending'`,
      [id]
    );
    if (itemRes.rows.length === 0) {
      return res.status(404).json({ error: 'Queue item not found or already reviewed' });
    }
    const item = itemRes.rows[0];

    let leadId = null;

    if (numStars >= 4) {
      const stagesRes = await db.query(`SELECT slug FROM crm_stages ORDER BY sort_order, id ASC LIMIT 1`);
      const firstStageSlug = stagesRes.rows.length > 0 ? stagesRes.rows[0].slug : 'new';

      const leadResult = await db.query(
        `INSERT INTO host_leads (
          business_name, location, latitude, longitude, website,
          google_place_id, google_rating, google_reviews_count,
          pipeline_stage, priority, admin_notes, source,
          discovery_fit_score, discovery_parking_confidence, discovery_access_score,
          discovery_campervan_priority, discovery_last_analyzed_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
        ON CONFLICT DO NOTHING
        RETURNING id`,
        [
          item.business_name,
          item.location,
          item.latitude,
          item.longitude,
          item.website,
          item.google_place_id,
          item.google_rating,
          item.google_reviews_count,
          firstStageSlug,
          'medium',
          item.admin_notes,
          'discovery_auto_find',
          item.discovery_fit_score,
          item.discovery_parking_confidence,
          item.discovery_access_score,
          item.discovery_campervan_priority,
        ]
      );
      if (leadResult.rows.length > 0) leadId = leadResult.rows[0].id;
    } else {
      // Save to rejection memory
      const settings = await getSettingsMap();
      const rawRejected = settings.discovery_rejected_sites_v1 || '[]';
      let rejected = [];
      try { rejected = JSON.parse(rawRejected); if (!Array.isArray(rejected)) rejected = []; } catch { rejected = []; }

      const key = item.google_place_id || `${item.business_name}|${item.location || ''}`.toLowerCase();
      rejected = rejected.filter(r => (r.id || '') !== key);
      rejected.push({ id: key, name: item.business_name, address: item.location || '', stars: numStars, createdAt: new Date().toISOString() });
      if (rejected.length > 1000) rejected = rejected.slice(-1000);

      await db.query(
        `INSERT INTO crm_settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        ['discovery_rejected_sites_v1', JSON.stringify(rejected)]
      );
    }

    await db.query(
      `UPDATE discovery_review_queue SET status = $1, reviewed_at = NOW(), review_notes = $3 WHERE id = $2`,
      [numStars >= 4 ? 'approved' : 'rejected', id, reviewNotes]
    );

    res.json({ success: true, action: numStars >= 4 ? 'imported' : 'rejected', lead_id: leadId });
  } catch (error) {
    logger.error('submitDiscoveryQueueReview error', { error: error.message });
    next(error);
  }
}

async function sendCrmLeadEmail(to, subject, body) {
  const crmReplyTo = process.env.CRM_FROM_EMAIL || 'pierce.shapton@proper-place.co.uk';
  const crmFromName = process.env.CRM_FROM_NAME || 'Pierce at Proper Place';
  const smtpUser = process.env.SMTP_USER;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    requireTLS: true,
    auth: { user: smtpUser, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"${crmFromName}" <${smtpUser}>`,
    replyTo: crmReplyTo,
    to,
    subject,
    html: wrapEmailHtml(body),
  });
}

async function getSettingsMap() {
  const response = await db.query('SELECT key, value FROM crm_settings');
  const map = {};
  response.rows.forEach(row => {
    map[row.key] = row.value;
  });
  return map;
}

function parseBoolSetting(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return fallback;
}

function parseIntSetting(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function defaultOutreachBody() {
  return 'Hi {{first_name}},<br/><br/>I came across {{business_name}} and thought it might be a strong fit for overnight motorhome stays with Proper Place. We help venues generate extra revenue from existing parking and open space with responsible guests.<br/><br/>Would you be open to a quick chat to see if this could work for you?<br/><br/>Best,<br/>Pierce';
}

module.exports = {
  getLeads, getLead, createLead, updateLead, deleteLead, getPipelineSummary,
  getActivities, createActivity,
  getTasks, createTask, updateTask, deleteTask,
  getSiteVisits, createSiteVisit,
  getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate,
  sendEmail, getEmailLog,
  getSequences, createSequence,
  getStats,
  getAutomationStatus,
  getSettings, updateSettings,
  // Stages
  getStages, createStage, updateStage, deleteStage, reorderStages,
  // Custom Fields
  getCustomFields, createCustomField, updateCustomField, deleteCustomField,
  // Custom Values per lead
  getCustomValues, setCustomValues,
  // Import & Enrich
  importLeads, enrichLead,
  runDiscoveryAutoFind,
  processDiscoveryAutoFind,
  getDiscoveryReviewQueue,
  replaceDiscoveryQueue,
  submitDiscoveryQueueReview,
  processDiscoveryAutoEmails,
};
