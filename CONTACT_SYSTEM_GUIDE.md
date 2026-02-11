# Contact Us & User Messages Admin System

## Overview
Users can now submit contact messages which admins can view, prioritize, and respond to.

## User Flow

### 1. Users Submit Contact Messages
- **Where**: More tab → Help & Support section → "Send Us a Message" button
- **What they provide**:
  - Category (General, Technical Issue, Complaint, Suggestion, Other)
  - Subject
  - Message
- **Where it goes**: `/contacts/submit` backend endpoint
- **Response**: Success confirmation with "We'll respond within 24 hours"

### 2. Backend Processing

#### Contact Form Submission (`POST /contacts/submit`)
```
Request body:
{
  userId: number
  userEmail: string
  category: string
  subject: string
  message: string
}

Response:
{
  success: true
  message: "Your message has been received. We'll respond within 24 hours."
  contactId: number
  urgencyScore: number (0-100)
}
```

#### Urgency Score Algorithm
The system auto-calculates urgency (0-100) based on keywords:
- **Critical** (80+): Words like "urgent", "emergency", "broken", "payment failed"
- **High** (60-79): "Complaint", "unhappy", "poor", "issue", "problem"
- **Medium** (40-59): "Suggestion", "bug", "payment", "General category"
- **Low** (0-39): "Other", generic messages

## Admin Interface

### New Tab: "User Messages"
Located in the admin bottom navigation (5th tab with mail icon) between "Host Chat" and "More"

### Features

#### 1. Message List View
- **Sorting**: Automatically sorted by urgency score (highest first)
- **Categories**: Filter by status
  - **New** (default): Unread messages
  - **Read**: Seen but not responded to
  - **Responded**: Admin has replied
  - **Closed**: Issue resolved
  
- **Card Display Shows**:
  - User avatar
  - Subject line
  - Message preview (2 lines)
  - User name
  - Urgency badge (color-coded)
  - Time elapsed ("5m ago", "2h ago", etc.)

#### 2. Message Details View
**Click any message card to expand:**

- **User Information**:
  - Full name
  - Email address
  - Phone number
  - Vehicle registration (if provided)
  
- **Message Content**:
  - Category
  - Subject
  - Full message text
  - Urgency score (0-100)
  - Creation timestamp
  
- **Admin Actions**:
  - Add/edit admin notes
  - Change status (Read → Responded → Closed)
  - Notes are saved and visible next time message is viewed

### Usage Example

**Admin workflow:**
1. See "5 new" badge on User Messages tab
2. Tap tab to see sorted list - highest urgency first
3. See red "Critical" message at top from user reporting payment issue
4. Click the message to open details
5. Read user details (name, email, phone)
6. See the full complaint message
7. Type admin notes: "Issued refund, explaining $50 processing fee"
8. Click "RESPONDED" button to mark as responded
9. Sheet closes automatically

## Database Schema

### Contacts Table
```sql
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY
  user_id INTEGER (FK to users)
  user_email VARCHAR(255)
  category VARCHAR(100)
  subject VARCHAR(255)
  message TEXT
  urgency_score INTEGER (0-100)
  status VARCHAR(50) -- 'new', 'read', 'responded', 'closed'
  admin_notes TEXT
  responded_by INTEGER (FK to users - which admin)
  responded_at TIMESTAMP
  created_at TIMESTAMP
  updated_at TIMESTAMP
)
```

## Backend API Endpoints

### Public Endpoint
```
POST /contacts/submit
- No authentication required
- Accepts contact form data from users
- Returns urgency score
```

### Admin Endpoints (require auth + admin role)
```
GET /contacts?status=new&limit=50
- Retrieve all messages filtered by status
- Sorted by urgency_score DESC
- Returns: { contacts: [...], total: number, limit, offset }

GET /contacts/:id
- Get single message with all user details
- Automatically marks 'new' messages as 'read'
- Returns full contact + user info

PATCH /contacts/:id
- Update message status and/or admin notes
- Body: { status: string, adminNotes: string }
- Sets responded_by = current admin, responded_at = now if status='responded'
- Returns: { success: true, contact: {...} }

GET /contacts/stats/summary
- Dashboard statistics
- Returns: { new_count, read_count, responded_count, closed_count, avg_urgency, max_urgency }
```

## Files Modified

### Backend
- **Migration**: `/backend/src/migrations/002_contacts_table.sql` - Creates contacts table
- **Controller**: `/backend/src/controllers/contactController.js` - Handles all contact logic
- **Routes**: `/backend/src/routes/contacts.js` - API endpoints
- **Server**: `/backend/src/server.js` - Routes registration
- **Migration Runner**: `/backend/src/migrations/run.js` - Updated to run all migrations

### Flutter Frontend
- **Contact Form**: `/proper_place/lib/screens/contact_us_form_screen.dart` - Now POSTs to backend
- **Admin Messages Screen**: `/proper_place/lib/screens/admin_contact_messages_screen.dart` - NEW
- **Home Screen**: `/proper_place/lib/screens/home_screen.dart` - Added navigation
- **More Tab**: `/proper_place/lib/screens/more_user_screen.dart` - Already has Contact Us button

## Next Steps

1. **Optional**: Implement email notifications to admin when critical/high urgency messages arrive
2. **Optional**: Add bulk actions (mark all as read, bulk close, etc.)
3. **Optional**: Create FAQs screen and link from Contact Us
4. **Future**: Implement actual email/SMS replies to users, not just admin notes
5. **Analytics**: Add contact message metrics to admin dashboard

## Testing Checklist

- [ ] User can submit contact form from More tab
- [ ] Message appears in admin's "User Messages" tab with correct urgency
- [ ] Admin can click message and see all user details
- [ ] Admin can add notes and change status
- [ ] Status changes are persisted
- [ ] Messages sorted by urgency (highest first)
- [ ] Filter by status tabs work correctly
- [ ] Time display shows elapsed time (5m ago, etc.)
- [ ] User details appear correctly (name, email, phone)
