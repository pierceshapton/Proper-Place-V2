# Proper Place Backend API

A production-ready Node.js/Express backend for the Proper Place vanlife booking platform. Built to scale for 1000s of concurrent users.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone and setup**
```bash
cd proper_place_backend
npm install
cp .env.example .env
```

2. **Configure environment variables** (edit `.env`)
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=proper_place
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Server
PORT=3001
NODE_ENV=development

# JWT (generate a strong secret in production)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

3. **Create PostgreSQL database**
```bash
createdb proper_place
```

4. **Run migrations**
```bash
npm run migrate
```

5. **Start development server**
```bash
npm run dev
```

Server should be running at `http://localhost:3001`

## 📚 API Endpoints

### Authentication

**POST /auth/signup** - Register new user
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securePassword123",
  "confirmPassword": "securePassword123"
}
```

Response:
```json
{
  "message": "User created successfully",
  "access_token": "eyJhbGc...",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "normal_user"
}
```

**POST /auth/login** - Login user
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

Response: Same as signup

**GET /auth/user/:userId** - Get user info
```bash
curl -X GET http://localhost:3001/auth/user/550e8400-e29b-41d4-a716-446655440000
```

**GET /health** - Health check
```bash
curl http://localhost:3001/health
```

## 🏗️ Architecture

```
src/
├── index.js              # Main server entry point
├── config.js             # Configuration from env variables
├── db/
│   ├── database.js       # Database connection pool
│   └── migrate.js        # Schema migrations
├── services/
│   └── auth.service.js   # Authentication business logic
├── middleware/
│   └── validation.js     # Input validation
└── routes/
    └── auth.routes.js    # API endpoints
```

## 🔐 Security Features

- ✅ Password hashing with bcryptjs (10 salt rounds)
- ✅ JWT token authentication
- ✅ CORS protection
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Helmet.js for HTTP security headers
- ✅ Input validation
- ✅ SQL connection pooling (20 max connections)

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'normal_user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Indices for performance:
- `idx_users_email` - Fast email lookups
- `idx_users_user_id` - Fast user ID lookups

## 🚀 Deployment

### Deploy to Railway.app (Recommended)

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial backend setup"
git remote add origin https://github.com/yourusername/proper-place-backend
git push -u origin main
```

2. **Create Railway project**
   - Go to https://railway.app
   - Connect GitHub repository
   - Add PostgreSQL plugin
   - Set environment variables

3. **Deploy**
   - Railway automatically deploys on push
   - Get production URL

### Environment Variables for Production

```
NODE_ENV=production
JWT_SECRET=generate-strong-random-string-here
DB_HOST=your-railway-postgres-host
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=your-password
CORS_ORIGIN=https://your-app-domain.com
RATE_LIMIT_MAX_REQUESTS=1000
```

## 📈 Scaling for 1000s of Users

This backend is built to scale:

✅ **Database Connection Pooling** - 20 concurrent connections
✅ **Rate Limiting** - Prevents abuse
✅ **Stateless Design** - Can run multiple instances
✅ **Index Optimization** - Fast queries
✅ **UUID User IDs** - Distributed system compatible
✅ **JWT Tokens** - No session storage required

### Horizontal Scaling
You can run multiple instances behind a load balancer:
- Railway auto-scales your instances
- Or use Docker + Kubernetes for full control

## 🔧 Development

### Run in development mode with auto-reload
```bash
npm run dev
```

### Check database
```bash
psql -U postgres -d proper_place
\dt  # List tables
```

## 📝 Future Enhancements

- [ ] Email verification on signup
- [ ] Password reset functionality
- [ ] Two-factor authentication
- [ ] User profile endpoints
- [ ] Host mode endpoints
- [ ] Admin dashboard endpoints
- [ ] Booking management API
- [ ] Payment processing

## 📄 License

MIT
