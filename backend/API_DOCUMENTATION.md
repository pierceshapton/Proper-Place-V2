# Proper Place API Documentation

## Base URL
```
http://localhost:3001
```

## Authentication
Most endpoints require a JWT token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

Tokens are obtained from signup/login endpoints and stored in localStorage by the client.

---

## Endpoints

### Authentication (`/auth`)

#### POST `/auth/signup`
Create a new user account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (201):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "created_at": "2026-01-22T00:00:00Z"
  }
}
```

**Errors:**
- 400: Email already exists
- 400: Invalid email format
- 400: Password too weak

---

#### POST `/auth/login`
Login with email and password.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Errors:**
- 401: Invalid credentials
- 404: User not found

---

#### GET `/auth/me`
Get current authenticated user info.

**Headers:** Required Bearer token

**Response (200):**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "created_at": "2026-01-22T00:00:00Z"
}
```

**Errors:**
- 401: Unauthorized (invalid or missing token)

---

### Places (`/places`)

#### GET `/places`
Get all places (public, no auth required).

**Query Parameters:**
- `limit` (optional): Number of results (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `search` (optional): Search by name or description

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Mountain View Lodge",
      "description": "Scenic mountain retreat",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "image_url": "https://...",
      "rating": 4.5,
      "review_count": 12,
      "price_per_night": 150
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0
}
```

---

#### GET `/places/:id`
Get a specific place by ID.

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Mountain View Lodge",
  "description": "Scenic mountain retreat",
  "amenities": ["WiFi", "Pool", "Parking"],
  "latitude": 40.7128,
  "longitude": -74.0060,
  "image_url": "https://...",
  "rating": 4.5,
  "review_count": 12,
  "price_per_night": 150,
  "owner_id": "uuid",
  "created_at": "2026-01-22T00:00:00Z"
}
```

**Errors:**
- 404: Place not found

---

#### POST `/places`
Create a new place (admin only).

**Headers:** Required Bearer token + Admin role

**Request:**
```json
{
  "name": "Mountain View Lodge",
  "description": "Scenic mountain retreat",
  "amenities": ["WiFi", "Pool", "Parking"],
  "latitude": 40.7128,
  "longitude": -74.0060,
  "image_url": "https://...",
  "price_per_night": 150
}
```

**Response (201):** Place object

---

### Bookings (`/bookings`)

#### GET `/bookings`
Get user's bookings (requires auth).

**Headers:** Required Bearer token

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "place_id": "uuid",
      "place_name": "Mountain View Lodge",
      "check_in": "2026-02-01",
      "check_out": "2026-02-05",
      "total_price": 600,
      "status": "confirmed",
      "created_at": "2026-01-22T00:00:00Z"
    }
  ]
}
```

---

#### POST `/bookings`
Create a new booking (requires auth).

**Headers:** Required Bearer token

**Request:**
```json
{
  "place_id": "uuid",
  "check_in": "2026-02-01",
  "check_out": "2026-02-05",
  "guests": 2
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "place_id": "uuid",
  "check_in": "2026-02-01",
  "check_out": "2026-02-05",
  "total_price": 600,
  "status": "pending",
  "created_at": "2026-01-22T00:00:00Z"
}
```

**Errors:**
- 400: Invalid dates
- 400: Place not available
- 409: Date conflict with existing booking

---

#### GET `/bookings/:id`
Get a specific booking (requires auth).

**Headers:** Required Bearer token

**Response (200):** Booking object

---

#### PATCH `/bookings/:id`
Update booking status (requires auth).

**Request:**
```json
{
  "status": "confirmed"
}
```

**Response (200):** Updated booking object

---

### Reviews (`/reviews`)

#### GET `/reviews`
Get reviews for a place.

**Query Parameters:**
- `place_id` (required): UUID of the place
- `limit` (optional): Number of results (default: 20)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "place_id": "uuid",
      "user_id": "uuid",
      "user_name": "John Doe",
      "rating": 5,
      "comment": "Amazing place!",
      "created_at": "2026-01-22T00:00:00Z"
    }
  ]
}
```

---

#### POST `/reviews`
Create a review (requires auth).

**Headers:** Required Bearer token

**Request:**
```json
{
  "place_id": "uuid",
  "rating": 5,
  "comment": "Amazing place with great service!"
}
```

**Response (201):** Review object

**Errors:**
- 400: Rating must be 1-5
- 400: Must have booked this place to review
- 409: Already reviewed this place

---

### Pubs (`/pubs`)

#### GET `/pubs`
Get all pubs (public).

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Local Tavern",
      "description": "Friendly neighborhood pub",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "image_url": "https://...",
      "rating": 4.2
    }
  ]
}
```

---

### Admin (`/admin`)

#### GET `/admin/stats`
Get admin dashboard statistics (admin only).

**Headers:** Required Bearer token + Admin role

**Response (200):**
```json
{
  "total_users": 150,
  "total_bookings": 320,
  "total_revenue": 45000,
  "average_rating": 4.3,
  "active_places": 45
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2026-01-22T00:00:00Z"
}
```

**Common HTTP Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Server Error

---

## Testing

### Create Test User
```bash
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test User",
    "email":"test@example.com",
    "password":"TestPassword123!"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"TestPassword123!"
  }'
```

### Get Current User
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/auth/me
```

### Get All Places
```bash
curl http://localhost:3001/places
```

---

## Database Schema

### Users Table
- id (UUID primary key)
- name (string)
- email (string, unique)
- password_hash (string)
- role (enum: user, admin, host)
- created_at (timestamp)
- updated_at (timestamp)

### Places Table
- id (UUID primary key)
- owner_id (UUID, foreign key to users)
- name (string)
- description (text)
- amenities (JSON array)
- latitude (decimal)
- longitude (decimal)
- image_url (string)
- price_per_night (decimal)
- created_at (timestamp)
- updated_at (timestamp)

### Bookings Table
- id (UUID primary key)
- user_id (UUID, foreign key to users)
- place_id (UUID, foreign key to places)
- check_in (date)
- check_out (date)
- guests (integer)
- total_price (decimal)
- status (enum: pending, confirmed, cancelled)
- created_at (timestamp)
- updated_at (timestamp)

### Reviews Table
- id (UUID primary key)
- user_id (UUID, foreign key to users)
- place_id (UUID, foreign key to places)
- booking_id (UUID, foreign key to bookings)
- rating (integer 1-5)
- comment (text)
- created_at (timestamp)
- updated_at (timestamp)

---

## Environment Variables

```
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/proper_place
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=7d
```

---

## Development Notes

- All timestamps are in UTC
- IDs are UUIDs
- Pagination defaults to 20 items per page
- CORS is enabled for localhost development
- Rate limiting may be added in production
