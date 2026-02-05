# Quick Start — Proper Place Backend

## 🚀 Get Running in 5 Minutes

### Option 1: Docker (Easiest)

```bash
# Navigate to backend
cd /Users/PierceShaton/Desktop/Proper_Place_app/backend

# Start everything (PostgreSQL + Node.js)
docker-compose up -d

# Check logs
docker-compose logs -f backend

# Server runs at: http://localhost:3001
# API: http://localhost:3001/health
```

**Database automatically created and migrated!**

### Option 2: Local Setup

```bash
cd /Users/PierceShaton/Desktop/Proper_Place_app/backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update .env with your PostgreSQL URL:
# DATABASE_URL=postgresql://user:password@localhost:5432/proper_place_db

# Create database (macOS/Linux)
createdb proper_place_db

# Run migrations
npm run migrate

# Start dev server
npm run dev

# Server runs at: http://localhost:3001
```

## 📱 Connect Your Apps

### Flutter App
```bash
cd /Users/PierceShaton/Desktop/Proper_Place_app/proper_place

flutter run -d iPhone \
  --dart-define=BASE44_APP_ID=unused \
  --dart-define=BASE44_BACKEND_URL=http://localhost:3001
```

Update [lib/api/base44_client.dart](lib/api/base44_client.dart) to point to `/auth` instead of `/base44/auth` if needed.

### React Web App
Update [src/lib/app-params.js](../Proper_Place_Base44_Version_1/src/lib/app-params.js):
```javascript
serverUrl: 'http://localhost:3001',
appId: 'your-app-id-unused',
```

## 🧪 Test the API

### 1. Sign Up
```bash
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

Response:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": { "id": 1, "email": "test@example.com", "name": "Test User", "role": "user" }
}
```

### 2. Log In
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Get Current User
```bash
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Create Place
```bash
curl -X POST http://localhost:3001/places \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "My Camper Site",
    "address": "123 Main St",
    "city": "London",
    "country": "UK",
    "latitude": 51.5074,
    "longitude": -0.1278,
    "price_per_night": 25,
    "capacity": 2
  }'
```

### 5. Get All Places
```bash
curl -X GET "http://localhost:3001/places?limit=10&page=1"
```

## 📚 API Endpoints

| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| POST | `/auth/signup` | ❌ | Register new user |
| POST | `/auth/login` | ❌ | Login user |
| GET | `/auth/me` | ✅ | Current user profile |
| POST | `/auth/refresh` | ❌ | Refresh token |
| GET | `/places` | ❌ | List places |
| POST | `/places` | ✅ | Create place |
| GET | `/bookings` | ✅ | List user bookings |
| POST | `/bookings` | ✅ | Create booking |
| GET | `/admin/dashboard` | ✅ Admin | Analytics |
| PATCH | `/admin/places/:id/approve` | ✅ Admin | Approve place |

## 🗄️ Database

PostgreSQL tables created automatically:
- `users` — User accounts
- `places` — Landlord properties
- `pubs` — Parking locations
- `bookings` — Reservations
- `reviews` — User ratings
- `messages` — Chat
- `refresh_tokens` — Token management
- `admin_logs` — Audit trail

**Data persists in Docker volumes**. Remove with:
```bash
docker-compose down -v
```

## 🛑 Stop Server

```bash
docker-compose down

# Or (local):
npm stop
```

## 📊 Environment Variables

Copy `.env.example` to `.env` and update:

```bash
PORT=3001
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key-min-32-chars
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

## 🐛 Debugging

### Check server logs
```bash
docker-compose logs -f backend
```

### Access PostgreSQL directly
```bash
# Via Docker
docker exec -it proper_place_db psql -U postgres -d proper_place_db

# List tables
\dt

# Query users
SELECT * FROM users;
```

### Rebuild Docker image
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## ✅ Checklist

- [ ] Docker Compose running (`docker-compose up -d`)
- [ ] Backend responds at `http://localhost:3001/health`
- [ ] Sign up works and returns `access_token`
- [ ] Flutter app points to `http://localhost:3001`
- [ ] Flutter login screen works
- [ ] React app points to `http://localhost:3001`
- [ ] React signup/login works

## 🚢 Deploy to Production

### Heroku
```bash
heroku create proper-place-backend
heroku addons:create heroku-postgresql:standard-0
git push heroku main
```

### AWS/DigitalOcean/Render
- Build Docker image: `docker build -t proper-place-backend .`
- Push to registry
- Set environment variables
- Deploy container

See README.md for full deployment guide.

## 💡 Next Steps

1. ✅ Backend running
2. ✅ Flutter app configured
3. ✅ React app configured
4. [ ] Test complete auth flow
5. [ ] Add places via app
6. [ ] Create bookings
7. [ ] Add reviews
8. [ ] Test admin approvals

---

**Questions?** Check README.md or examine controllers in `src/controllers/`.
