require('dotenv').config();
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/places', placesRoutes);
app.use('/pubs', pubsRoutes);
app.use('/bookings', authMiddleware, bookingsRoutes);
app.use('/reviews', reviewsRoutes);
app.use('/admin', adminRoutes);

// User routes
app.get('/users/:id', userController.getUserProfile);
app.patch('/users/:id', authMiddleware, userController.updateProfile);
app.delete('/users/:id', authMiddleware, userController.deleteAccount);

// 404 handler
app.use(notFoundHandler);

// Error handler (last middleware)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
