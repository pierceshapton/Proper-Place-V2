// Load environment variables from .env file (for local development)
require('dotenv').config();

// CRITICAL FIX: Ensure DATABASE_URL is set correctly
// This handles DigitalOcean environment where .env files don't work
const DIGITALOCEAN_DB_URL = 'postgresql://doadmin:AVNS_h5gAks_XqiZhRqSOX1T@db-postgresql-lon1-38562-properplace-do-user-33237375-0.g.db.ondigitalocean.com:25060/defaultdb?sslmode=require';

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('base') || process.env.DATABASE_URL.length < 20) {
  console.log('[SERVER] ⚠️ DATABASE_URL invalid or missing, using DigitalOcean default...');
  console.log('[SERVER] Old URL:', process.env.DATABASE_URL || 'NOT SET');
  process.env.DATABASE_URL = DIGITALOCEAN_DB_URL;
  console.log('[SERVER] ✅ DATABASE_URL set to DigitalOcean managed database');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { authMiddleware, adminMiddleware } = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/auth');
const placesRoutes = require('./routes/places');
const pubsRoutes = require('./routes/pubs');
const bookingsRoutes = require('./routes/bookings');
const reviewsRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');
const paymentsRoutes = require('./routes/payments');
const contactsRoutes = require('./routes/contacts');
const notificationsRoutes = require('./routes/notifications');
const chatRoutes = require('./routes/chat');
const uploadRoutes = require('./routes/upload');

// User controller for user endpoints
const userController = require('./controllers/userController');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests from localhost on any port (for development)
    if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      // In production, restrict to specific origins
      const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve uploaded images as static files
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/places', placesRoutes);
app.use('/pubs', pubsRoutes);
app.use('/bookings', authMiddleware, bookingsRoutes);
app.use('/payments', authMiddleware, paymentsRoutes);
app.use('/reviews', reviewsRoutes);
app.use('/contacts', contactsRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/chat', chatRoutes);
app.use('/admin', adminRoutes);
app.use('/upload', uploadRoutes);

// User routes
app.get('/users/:id', userController.getUserProfile);
app.patch('/users/:id', authMiddleware, userController.updateProfile);
app.delete('/users/:id', authMiddleware, userController.deleteAccount);

// 404 handler
app.use(notFoundHandler);

// Error handler (last middleware)
app.use(errorHandler);

// Auto-migration: Check if tables exist, if not run migrations
async function initializeDatabase() {
  try {
    const db = require('./config/database');
    console.log('[SERVER] Checking if database schema exists...');
    
    const result = await db.query(
      "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'users')"
    );
    
    const tableExists = result.rows[0].exists;
    
    if (!tableExists) {
      console.log('[SERVER] ⚠️ Database schema not found. Running migrations...');
      const fs = require('fs');
      const migrationFiles = ['001_init.sql', '002_contacts_table.sql'];
      
      for (const file of migrationFiles) {
        const migrationFile = require('path').join(__dirname, './migrations', file);
        if (fs.existsSync(migrationFile)) {
          const sql = fs.readFileSync(migrationFile, 'utf8');
          console.log(`[SERVER] Running migration: ${file}...`);
          await db.query(sql);
          console.log(`[SERVER] ✅ ${file} completed`);
        }
      }
      console.log('[SERVER] ✅ All migrations completed');
    } else {
      console.log('[SERVER] ✅ Database schema already exists');
    }
  } catch (error) {
    console.error('[SERVER] Database initialization error:', error.message);
    console.error('[SERVER] ⚠️ Continuing anyway - tables might already exist or will be created');
  }
}

// Start server
async function start() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
