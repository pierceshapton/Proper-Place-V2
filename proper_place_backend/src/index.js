import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { testConnection } from './db/database.js';
import { runMigrations } from './db/migrate.js';
import authRoutes from './routes/auth.routes.js';
import placesRoutes from './routes/places.routes.js';
import bookingsRoutes from './routes/bookings.routes.js';
import paymentsRoutes from './routes/payments.routes.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS setup
const corsOptions = {
  origin: Array.isArray(config.corsOrigin)
    ? config.corsOrigin
    : config.corsOrigin.split(','),
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});
app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/places', placesRoutes);
app.use('/bookings', bookingsRoutes);
app.use('/payments', paymentsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Endpoint not found',
    path: req.path,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(config.isDevelopment && { stack: err.stack }),
  });
});

// Initialize server
async function initialize() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Run migrations
    await runMigrations();

    // Start server
    app.listen(config.port, () => {
      console.log(`
🚀 Proper Place Backend Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 Server running at: http://localhost:${config.port}
🌍 Environment: ${config.nodeEnv}
📡 Database: ${config.db.database}@${config.db.host}:${config.db.port}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Available endpoints:
  POST   /auth/signup     - Register new user
  POST   /auth/login      - Login user
  GET    /auth/user/:id   - Get user info
  GET    /health          - Health check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });
  } catch (error) {
    console.error('❌ Failed to initialize server:', error.message);
    process.exit(1);
  }
}

// Start the application
initialize();
