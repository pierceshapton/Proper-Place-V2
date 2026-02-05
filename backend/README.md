# Proper Place Backend

Node.js + Express + PostgreSQL REST API backend for Proper Place app.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database URL and secrets

# Create database
createdb proper_place_db

# Run migrations
npm run migrate

# Seed sample data (optional)
npm run seed

# Start development server
npm run dev
```

Server runs on `http://localhost:3001` (configurable via `PORT` env var).

## API Documentation

### Authentication

**POST /auth/signup**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```
Returns: `{ access_token, refresh_token, user }`

**POST /auth/login**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
Returns: `{ access_token, refresh_token, user }`

**GET /auth/me**
Headers: `Authorization: Bearer {token}`
Returns: `{ user }`

**POST /auth/refresh**
```json
{
  "refresh_token": "token..."
}
```
Returns: `{ access_token }`

### Users

**GET /users/:id** — Get user profile
**PATCH /users/:id** — Update profile
**DELETE /users/:id** — Delete account

### Places

**GET /places** — List all places (with filters, pagination)
**GET /places/:id** — Get place details
**POST /places** — Create new place (auth required)
**PATCH /places/:id** — Update place (owner only)
**DELETE /places/:id** — Delete place (owner only)

### Pubs

**GET /pubs** — List pubs
**GET /pubs/:id** — Get pub details
**POST /pubs** — Create pub (admin)
**PATCH /pubs/:id** — Update pub (admin)
**DELETE /pubs/:id** — Delete pub (admin)

### Bookings

**GET /bookings** — List user's bookings
**GET /bookings/:id** — Get booking details
**POST /bookings** — Create booking
**PATCH /bookings/:id** — Update booking status
**DELETE /bookings/:id** — Cancel booking

### Reviews

**GET /places/:id/reviews** — Get reviews for place
**POST /places/:id/reviews** — Create review
**PATCH /reviews/:id** — Update review (author only)
**DELETE /reviews/:id** — Delete review (author only)

### Admin

**GET /admin/dashboard** — Analytics dashboard
**GET /admin/places** — Moderate places
**PATCH /admin/places/:id/approve** — Approve place
**PATCH /admin/places/:id/reject** — Reject place
**GET /admin/users** — Manage users

## Database Schema

Tables:
- `users` — User accounts, profile, settings
- `places` — Landlord properties
- `pubs` — Parking/stopover locations
- `bookings` — User bookings
- `reviews` — User reviews
- `messages` — Chat messages
- `admin_logs` — Admin action logs

## Environment Variables

```
PORT=3001
NODE_ENV=development

DATABASE_URL=postgresql://user:password@localhost:5432/proper_place_db

JWT_SECRET=your-super-secret-key-min-32-chars
JWT_REFRESH_SECRET=refresh-secret-key
JWT_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d

CORS_ORIGIN=http://localhost:3000,http://localhost:5173

LOG_LEVEL=debug
```

## Docker

```bash
# Build image
docker build -t proper-place-backend .

# Run with Docker Compose (includes PostgreSQL)
docker-compose up -d

# Access: http://localhost:3001
```

## Project Structure

```
src/
├── server.js              # Express app entry
├── config/
│   └── database.js        # PostgreSQL connection
├── middleware/
│   ├── auth.js            # JWT verification
│   ├── errorHandler.js    # Error handling
│   └── validation.js      # Request validation
├── routes/
│   ├── auth.js            # Authentication endpoints
│   ├── users.js           # User endpoints
│   ├── places.js          # Place endpoints
│   ├── pubs.js            # Pub endpoints
│   ├── bookings.js        # Booking endpoints
│   ├── reviews.js         # Review endpoints
│   ├── messages.js        # Message endpoints
│   └── admin.js           # Admin endpoints
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── placeController.js
│   ├── pubController.js
│   ├── bookingController.js
│   ├── reviewController.js
│   └── adminController.js
├── models/
│   └── db.js              # Database query helpers
├── utils/
│   ├── jwt.js             # Token helpers
│   ├── hash.js            # Password hashing
│   ├── validation.js      # Input validation schemas
│   └── logger.js          # Logging
├── migrations/
│   ├── 001_init.sql       # Schema
│   └── run.js             # Migration runner
└── seeds/
    └── seed.js            # Sample data
```

## Testing

```bash
npm test
```

## Deployment

### Heroku
```bash
git push heroku main
```

### AWS/DigitalOcean
```bash
docker build -t app .
docker push your-registry/app
```

### Environment Setup
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET` (32+ random chars)
- Use PostgreSQL managed service (RDS, DigitalOcean, Heroku Postgres)
- Enable HTTPS
- Set CORS_ORIGIN to production domain

## Development

```bash
# Install dependencies
npm install

# Start dev server (auto-reload)
npm run dev

# Check for linting issues
npm run lint

# Run tests
npm test
```

## License

MIT
