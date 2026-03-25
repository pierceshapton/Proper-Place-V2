// Load environment variables from the appropriate .env file
// Use override: true in production to ensure .env.production values take precedence
// over any platform-set environment variables
const path = require('path');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ 
  path: path.resolve(__dirname, '..', envFile),
  override: true  // Force override of platform environment variables
});

// SECURITY: Database URL must be set via environment variable
// Set DATABASE_URL in DigitalOcean App Platform environment variables
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.length < 20) {
  console.error('[SERVER] ❌ CRITICAL: DATABASE_URL environment variable not set!');
  console.error('[SERVER] Please set DATABASE_URL in your environment variables.');
  // In production, fail fast if DB URL is not configured
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
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
const autoMessagesRoutes = require('./routes/autoMessages');
const pushService = require('./services/pushNotificationService');

// User controller for user endpoints
const userController = require('./controllers/userController');

// Rate limiting middleware
const { apiLimiter } = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for DigitalOcean/load balancer (required for rate limiting and secure cookies)
app.set('trust proxy', 1);

// HTTPS enforcement middleware (for production)
app.use((req, res, next) => {
  // Check if behind a proxy (DigitalOcean, Heroku, etc.)
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  
  if (process.env.NODE_ENV === 'production' && !isSecure && req.path !== '/health') {
    // Redirect HTTP to HTTPS
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// Apply API-wide rate limiting
app.use(apiLimiter);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests from localhost on any port (for development)
    if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      // Allowed production origins
      const defaultAllowed = [
        'https://proper-place.co.uk',
        'https://www.proper-place.co.uk',
        'http://proper-place.co.uk',
        'http://www.proper-place.co.uk'
      ];
      const envOrigins = (process.env.CORS_ORIGIN || '').split(',').filter(o => o);
      const allowedOrigins = [...defaultAllowed, ...envOrigins];
      
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded images as static files
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
app.use('/auto-messages', autoMessagesRoutes);

// User routes
app.get('/users/:id', userController.getUserProfile);
app.patch('/users/:id', authMiddleware, userController.updateProfile);
app.delete('/users/:id', authMiddleware, userController.deleteAccount);
app.get('/users/:id/export', authMiddleware, userController.exportUserData); // GDPR Article 20

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
          delivered BOOLEAN DEFAULT false,
          read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Add delivered column if missing (for existing databases)
        DO $$ BEGIN
          ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered BOOLEAN DEFAULT false;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;

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
        ALTER TABLE places ADD COLUMN IF NOT EXISTS access_route_description TEXT;
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
        ALTER TABLE places ADD COLUMN IF NOT EXISTS access_route_description TEXT;
      `;

      try {
        console.log('[SERVER] Running migration 3: ensuring all columns exist...');
        await db.query(migration3);
        console.log('[SERVER] ✅ Migration 3 completed');
      } catch (err) {
        console.error('[SERVER] Migration 3 error:', err.message);
      }
    }

    // Always run migration 4 to ensure business_image_urls column exists (for existing databases)
    const migration4 = `
      ALTER TABLE places ADD COLUMN IF NOT EXISTS business_image_urls TEXT[];
    `;

    try {
      console.log('[SERVER] Running migration 4: business_image_urls column...');
      await db.query(migration4);
      console.log('[SERVER] ✅ Migration 4 completed');
    } catch (err) {
      console.error('[SERVER] Migration 4 error:', err.message);
    }

    // Always run migration 8 to create unavailable_periods table (for managing site unavailability)
    const migration8 = `
      CREATE TABLE IF NOT EXISTS unavailable_periods (
        id SERIAL PRIMARY KEY,
        place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE,
        reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_unavailable_periods_place_id ON unavailable_periods(place_id);
      CREATE INDEX IF NOT EXISTS idx_unavailable_periods_dates ON unavailable_periods(start_date, end_date);
    `;

    try {
      console.log('[SERVER] Running migration 8: unavailable_periods table...');
      await db.query(migration8);
      console.log('[SERVER] ✅ Migration 8 completed');
    } catch (err) {
      console.error('[SERVER] Migration 8 error:', err.message);
    }

    // Always run migration 9 to add status field to places table
    try {
      console.log('[SERVER] Running migration 9: place status field...');
      // Add status column without CHECK constraint first (PostgreSQL limitation)
      await db.query(`
        ALTER TABLE places
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'available'
      `);
      // Create index
      await db.query(`CREATE INDEX IF NOT EXISTS idx_places_status ON places(status)`);
      // Update any NULL values to 'available'
      await db.query(`UPDATE places SET status = 'available' WHERE status IS NULL`);
      console.log('[SERVER] ✅ Migration 9 completed');
    } catch (err) {
      console.error('[SERVER] Migration 9 error:', err.message);
    }

    // Migration 10: Add delivered column to messages table
    try {
      console.log('[SERVER] Running migration 10: messages delivered column...');
      await db.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered BOOLEAN DEFAULT false`);
      console.log('[SERVER] ✅ Migration 10 completed');
    } catch (err) {
      console.error('[SERVER] Migration 10 error:', err.message);
    }

    // Migration 11: Add rejection_reason column to places table
    try {
      console.log('[SERVER] Running migration 11: places rejection_reason column...');
      await db.query(`ALTER TABLE places ADD COLUMN IF NOT EXISTS rejection_reason TEXT`);
      console.log('[SERVER] ✅ Migration 11 completed');
    } catch (err) {
      console.error('[SERVER] Migration 11 error:', err.message);
    }

    // Migration 12: Create device_tokens table for push notifications
    try {
      console.log('[SERVER] Running migration 12: device_tokens table...');
      await db.query(`
        CREATE TABLE IF NOT EXISTS device_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT NOT NULL,
          platform VARCHAR(20) DEFAULT 'ios',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, token)
        )
      `);
      console.log('[SERVER] ✅ Migration 12 completed');
    } catch (err) {
      console.error('[SERVER] Migration 12 error:', err.message);
    }

    // Migration 13: Add host_seen column to bookings table
    try {
      console.log('[SERVER] Running migration 13: bookings host_seen column...');
      await db.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS host_seen BOOLEAN DEFAULT true`);
      console.log('[SERVER] ✅ Migration 13 completed');
    } catch (err) {
      console.error('[SERVER] Migration 13 error:', err.message);
    }

    // Migration 14: Create chat_reopen_requests table
    try {
      console.log('[SERVER] Running migration 14: chat_reopen_requests table...');
      await db.query(`
        CREATE TABLE IF NOT EXISTS chat_reopen_requests (
          id SERIAL PRIMARY KEY,
          booking_id INTEGER NOT NULL REFERENCES bookings(id),
          requester_id INTEGER NOT NULL REFERENCES users(id),
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW(),
          responded_at TIMESTAMP
        )
      `);
      console.log('[SERVER] ✅ Migration 14 completed');
    } catch (err) {
      console.error('[SERVER] Migration 14 error:', err.message);
    }

    // Migration 15: Add host_status_seen column to places table
    try {
      console.log('[SERVER] Running migration 15: places host_status_seen column...');
      await db.query(`ALTER TABLE places ADD COLUMN IF NOT EXISTS host_status_seen BOOLEAN DEFAULT true`);
      console.log('[SERVER] ✅ Migration 15 completed');
    } catch (err) {
      console.error('[SERVER] Migration 15 error:', err.message);
    }

    // Migration 16: Add previous_approved_data column to places table (for tracking changes to approved sites)
    try {
      console.log('[SERVER] Running migration 16: places previous_approved_data column...');
      await db.query(`ALTER TABLE places ADD COLUMN IF NOT EXISTS previous_approved_data JSONB`);
      console.log('[SERVER] ✅ Migration 16 completed');
    } catch (err) {
      console.error('[SERVER] Migration 16 error:', err.message);
    }

    // Migration 17: Create auto_message_templates and auto_message_log tables
    try {
      console.log('[SERVER] Running migration 17: auto_message_templates + auto_message_log tables...');
      await db.query(`
        CREATE TABLE IF NOT EXISTS auto_message_templates (
          id SERIAL PRIMARY KEY,
          place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
          host_id INTEGER NOT NULL REFERENCES users(id),
          trigger_type VARCHAR(50) NOT NULL,
          message_content TEXT NOT NULL DEFAULT '',
          enabled BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(place_id, trigger_type)
        );
        CREATE TABLE IF NOT EXISTS auto_message_log (
          id SERIAL PRIMARY KEY,
          booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
          trigger_type VARCHAR(50) NOT NULL,
          sent_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(booking_id, trigger_type)
        );
      `);
      console.log('[SERVER] ✅ Migration 17 completed');
    } catch (err) {
      console.error('[SERVER] Migration 17 error:', err.message);
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
    pushService.initialize();

    // Start auto-message scheduler (runs every 15 minutes)
    const autoMessageController = require('./controllers/autoMessageController');
    setInterval(() => {
      autoMessageController.processScheduledMessages();
    }, 15 * 60 * 1000);
    // Run once on startup after a short delay
    setTimeout(() => autoMessageController.processScheduledMessages(), 30000);
    console.log('[SERVER] Auto-message scheduler started (every 15 min)');

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
