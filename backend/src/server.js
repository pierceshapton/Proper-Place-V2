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
      
      // Migration 1: Create core tables
      const migration1 = `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          avatar_url VARCHAR(500),
          bio TEXT,
          phone_number VARCHAR(20),
          vehicle_registration VARCHAR(20),
          vehicle_length DECIMAL(5,2),
          vehicle_height DECIMAL(5,2),
          vehicle_width DECIMAL(5,2),
          dark_mode BOOLEAN DEFAULT false,
          offline_mode BOOLEAN DEFAULT false,
          role VARCHAR(50) DEFAULT 'user',
          verified BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS places (
          id SERIAL PRIMARY KEY,
          owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          address VARCHAR(255) NOT NULL,
          city VARCHAR(100) NOT NULL,
          country VARCHAR(100) NOT NULL,
          postal_code VARCHAR(20),
          latitude DECIMAL(10,8) NOT NULL,
          longitude DECIMAL(11,8) NOT NULL,
          price_per_night DECIMAL(10,2),
          capacity INTEGER,
          amenities TEXT[],
          image_urls TEXT[],
          approval_status VARCHAR(50) DEFAULT 'pending',
          featured BOOLEAN DEFAULT false,
          rating DECIMAL(3,2),
          review_count INTEGER DEFAULT 0,
          place_type VARCHAR(50) DEFAULT 'private_land',
          opening_hours VARCHAR(100),
          kitchen_hours VARCHAR(100),
          food_menu_description TEXT,
          serves_food BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS pubs (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          address VARCHAR(255) NOT NULL,
          city VARCHAR(100) NOT NULL,
          country VARCHAR(100) NOT NULL,
          postal_code VARCHAR(20),
          latitude DECIMAL(10,8) NOT NULL,
          longitude DECIMAL(11,8) NOT NULL,
          price_per_night DECIMAL(10,2),
          capacity INTEGER,
          facilities TEXT[],
          image_urls TEXT[],
          rating DECIMAL(3,2),
          review_count INTEGER DEFAULT 0,
          open_now BOOLEAN,
          hours_open VARCHAR(100),
          phone VARCHAR(20),
          website VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS bookings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          place_id INTEGER REFERENCES places(id) ON DELETE SET NULL,
          pub_id INTEGER REFERENCES pubs(id) ON DELETE SET NULL,
          check_in_date DATE NOT NULL,
          check_out_date DATE NOT NULL,
          number_of_nights INTEGER NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          van_registration VARCHAR(20),
          contact_phone VARCHAR(20),
          special_requests TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CHECK (check_out_date > check_in_date)
        );

        CREATE TABLE IF NOT EXISTS reviews (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          place_id INTEGER REFERENCES places(id) ON DELETE CASCADE,
          pub_id INTEGER REFERENCES pubs(id) ON DELETE CASCADE,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          title VARCHAR(255),
          comment TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
          content TEXT NOT NULL,
          attachment_url VARCHAR(500),
          read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS admin_logs (
          id SERIAL PRIMARY KEY,
          admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(255) NOT NULL,
          entity_type VARCHAR(100),
          entity_id INTEGER,
          details TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(500) NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          revoked BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_places_owner_id ON places(owner_id);
        CREATE INDEX IF NOT EXISTS idx_places_approval_status ON places(approval_status);
        CREATE INDEX IF NOT EXISTS idx_places_location ON places(latitude, longitude);
        CREATE INDEX IF NOT EXISTS idx_pubs_location ON pubs(latitude, longitude);
        CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
        CREATE INDEX IF NOT EXISTS idx_bookings_place_id ON bookings(place_id);
        CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
        CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
        CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
        CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);
      `;

      // Migration 2: Create contacts table
      const migration2 = `
        CREATE TABLE IF NOT EXISTS contacts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          user_email VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          subject VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          urgency_score INTEGER DEFAULT 0,
          status VARCHAR(50) DEFAULT 'new',
          admin_notes TEXT,
          responded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          responded_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

      try {
        console.log('[SERVER] Running migration 1: core tables...');
        await db.query(migration1);
        console.log('[SERVER] ✅ Migration 1 completed');
      } catch (err) {
        console.error('[SERVER] Migration 1 error:', err.message);
      }

      try {
        console.log('[SERVER] Running migration 2: contacts table...');
        await db.query(migration2);
        console.log('[SERVER] ✅ Migration 2 completed');
      } catch (err) {
        console.error('[SERVER] Migration 2 error:', err.message);
      }

      // Migration 3: Add pub-specific fields to places table (for existing databases)
      const migration3 = `
        ALTER TABLE places ADD COLUMN IF NOT EXISTS place_type VARCHAR(50) DEFAULT 'private_land';
        ALTER TABLE places ADD COLUMN IF NOT EXISTS opening_hours VARCHAR(100);
        ALTER TABLE places ADD COLUMN IF NOT EXISTS kitchen_hours VARCHAR(100);
        ALTER TABLE places ADD COLUMN IF NOT EXISTS food_menu_description TEXT;
        ALTER TABLE places ADD COLUMN IF NOT EXISTS serves_food BOOLEAN DEFAULT false;
        ALTER TABLE places ADD COLUMN IF NOT EXISTS business_description TEXT;
      `;

      try {
        console.log('[SERVER] Running migration 3: pub fields...');
        await db.query(migration3);
        console.log('[SERVER] ✅ Migration 3 completed');
      } catch (err) {
        console.error('[SERVER] Migration 3 error:', err.message);
      }

      console.log('[SERVER] ✅ All migrations completed');
    } else {
      console.log('[SERVER] ✅ Database schema already exists');
      
      // Still run migration 3 for existing databases to add any missing columns
      const migration3 = `
        ALTER TABLE places ADD COLUMN IF NOT EXISTS place_type VARCHAR(50) DEFAULT 'private_land';
        ALTER TABLE places ADD COLUMN IF NOT EXISTS opening_hours VARCHAR(100);
        ALTER TABLE places ADD COLUMN IF NOT EXISTS kitchen_hours VARCHAR(100);
        ALTER TABLE places ADD COLUMN IF NOT EXISTS food_menu_description TEXT;
        ALTER TABLE places ADD COLUMN IF NOT EXISTS serves_food BOOLEAN DEFAULT false;
        ALTER TABLE places ADD COLUMN IF NOT EXISTS business_description TEXT;
      `;

      try {
        console.log('[SERVER] Running migration 3: ensuring all columns exist...');
        await db.query(migration3);
        console.log('[SERVER] ✅ Migration 3 completed');
      } catch (err) {
        console.error('[SERVER] Migration 3 error:', err.message);
      }
    }

    // Always try to seed admin user if it doesn't exist
    try {
      const { hashPassword } = require('./utils/hash'); // Use same bcryptjs as auth controller
      const adminEmail = 'admin@properplace.com';
      const adminPassword = 'AdminPass123!';
      const passwordHash = await hashPassword(adminPassword);
      console.log('[SERVER] Admin password hash:', passwordHash.substring(0, 50) + '...');
      
      // Check if admin user exists
      const adminCheck = await db.query(
        'SELECT id, password_hash FROM users WHERE email = $1',
        [adminEmail]
      );
      
      console.log('[SERVER] Admin user query result:', adminCheck.rows.length > 0 ? 'EXISTS' : 'NOT_FOUND');
      
      if (adminCheck.rows.length === 0) {
        console.log('[SERVER] Seeding default admin user...');
        const insertResult = await db.query(
          'INSERT INTO users (email, password_hash, name, role, verified) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [adminEmail, passwordHash, 'Admin', 'admin', true]
        );
        console.log('[SERVER] ✅ Admin user created with ID:', insertResult.rows[0].id);
      } else {
        // Admin user exists - ensure it has correct password hash
        console.log('[SERVER] Updating admin user password...');
        console.log('[SERVER] Current hash:', adminCheck.rows[0].password_hash.substring(0, 50) + '...');
        console.log('[SERVER] New hash:', passwordHash.substring(0, 50) + '...');
        
        const updateResult = await db.query(
          'UPDATE users SET password_hash = $1, name = $2, role = $3, verified = $4 WHERE email = $5 RETURNING id',
          [passwordHash, 'Admin', 'admin', true, adminEmail]
        );
        console.log('[SERVER] ✅ Admin user password updated:', updateResult.rows.length > 0 ? 'SUCCESS' : 'FAILED');
      }
    } catch (err) {
      console.error('[SERVER] Admin user check/seeding error:', err.message);
      console.error('[SERVER] Admin error stack:', err.stack);
    }

    // Seed test regular user for testing
    try {
      const { hashPassword } = require('./utils/hash');
      const testUserEmail = 'testuser@properplace.com';
      const testUserPassword = 'TestUser123!';
      const testUserHash = await hashPassword(testUserPassword);
      
      const testUserCheck = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [testUserEmail]
      );
      
      if (testUserCheck.rows.length === 0) {
        await db.query(
          'INSERT INTO users (email, password_hash, name, role, verified) VALUES ($1, $2, $3, $4, $5)',
          [testUserEmail, testUserHash, 'Test User', 'user', true]
        );
        console.log('[SERVER] ✅ Test user created:', testUserEmail);
      }
    } catch (err) {
      console.error('[SERVER] Test user seeding error:', err.message);
    }

    // Seed test messages for admin chat testing
    try {
      console.log('[SERVER] Seeding test messages for admin chat...');
      
      // Get or create test host user
      let testHostId;
      const testHostEmail = 'testhost@properplace.com';
      const testHostCheck = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [testHostEmail]
      );
      
      if (testHostCheck.rows.length === 0) {
        const { hashPassword } = require('./utils/hash');
        const testHostPassword = await hashPassword('TestHost123!');
        const createHostResult = await db.query(
          'INSERT INTO users (email, password_hash, name, role, verified) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [testHostEmail, testHostPassword, 'Test Host', 'host', true]
        );
        testHostId = createHostResult.rows[0].id;
        console.log('[SERVER] Created test host user with ID:', testHostId);
      } else {
        testHostId = testHostCheck.rows[0].id;
      }
      
      // Get admin user ID
      const adminCheck = await db.query(
        'SELECT id FROM users WHERE email = $1',
        ['admin@properplace.com']
      );
      
      if (adminCheck.rows.length > 0) {
        const adminUserId = adminCheck.rows[0].id;
        
        // Check if test messages already exist
        const existingMessages = await db.query(
          `SELECT COUNT(*) FROM messages 
           WHERE (sender_id = $1 AND receiver_id = $2) 
              OR (sender_id = $2 AND receiver_id = $1)`,
          [testHostId, adminUserId]
        );
        
        if (parseInt(existingMessages.rows[0].count) === 0) {
          // Insert test messages
          await db.query(
            `INSERT INTO messages (sender_id, receiver_id, content, read, created_at)
             VALUES 
               ($1, $2, 'Hi admin, when will my listing be approved?', false, NOW() - INTERVAL '2 hours'),
               ($1, $2, 'I have some questions about pricing for my listing', false, NOW() - INTERVAL '1 hour')
            `,
            [testHostId, adminUserId]
          );
          console.log('[SERVER] ✅ Test messages seeded for admin chat');
        }
      }
    } catch (err) {
      console.error('[SERVER] Test message seeding error:', err.message);
    }
  } catch (error) {
    console.error('[SERVER] Database initialization error:', error.message);
    console.error('[SERVER] ⚠️ Continuing anyway - tables might already exist');
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
