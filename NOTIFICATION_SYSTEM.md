# Notification System Documentation

## Overview
The app now has a comprehensive notification system that displays red badges showing unseen items (messages, bookings, applications) across different tabs.

## Features
- Red notification badges on navigation tabs
- Automatic refresh every 30 seconds
- Manual refresh when app regains focus
- Support for multiple notification types:
  - Unread messages
  - Pending bookings (for hosts)
  - Pending host applications (for admins)
  - Pending place approvals (for admins)
  - Pending site submissions (for hosts)

## Backend API Endpoints

### GET `/notifications/counts`
Returns notification counts for the current user.

**Response:**
```json
{
  "unreadMessages": 5,
  "pendingBookings": 2,
  "hostRequests": 0,
  "pendingApprovals": 3,
  "siteSubmissions": 1,
  "pendingHostApplications": 0
}
```

### PATCH `/notifications/messages/:messageId/read`
Mark a specific message as read.

**Request:**
```
PATCH /notifications/messages/123/read
Authorization: Bearer <token>
```

### PATCH `/notifications/messages/read-all`
Mark all messages from a specific sender as read.

**Request:**
```
PATCH /notifications/messages/read-all
Authorization: Bearer <token>
Content-Type: application/json

{
  "senderId": 5
}
```

## Frontend Integration

### 1. Using NotificationService directly
```dart
import 'package:proper_place/services/notification_service.dart';

final notificationService = NotificationService();
final counts = await notificationService.getNotificationCounts();
await notificationService.markMessageAsRead(messageId);
```

### 2. Using NotificationManager (Recommended)
```dart
import 'package:proper_place/services/notification_manager.dart';

// Manually refresh
await NotificationManager().refresh();

// Mark messages as read
await NotificationManager().markMessageAsRead(messageId);
await NotificationManager().markAllMessagesFromSenderAsRead(senderId);
```

### 3. Badge Integration in Navigation
The home_screen.dart automatically:
- Loads notification counts on init
- Refreshes every 30 seconds
- Shows red badges on tabs based on user role:
  - **Admin mode:**
    - Tab 1 (Requests): Shows pending host applications
    - Tab 2 (Approvals): Shows pending place approvals
    - Tab 3 (Chat): Shows unread messages
  - **Host mode:**
    - Tab 1 (Sites): Shows pending site submissions
    - Tab 2 (Bookings): Shows pending bookings
    - Tab 3 (Chat): Shows unread messages
  - **User mode:**
    - Tab 1 (Bookings): Shows pending bookings for user

## Integration Checklist

### For Chat Screens
When opening a conversation, call:
```dart
// Mark all messages in conversation as read
await NotificationManager().markAllMessagesFromSenderAsRead(senderId);
```

### For Booking Screens
- No special integration needed - badges automatically update based on booking status

### For Admin Screens
- No special integration needed - badges automatically show pending items

### For Custom Implementations
To integrate notifications in a new screen:
1. Import the necessary services
2. Load counts in initState
3. Call refresh() when relevant data changes
4. Update UI based on notification counts

## Testing the System

### Manual Testing Steps
1. Open the app and log in
2. Send a message to another user
3. Switch to another account and check for message badge
4. Mark messages as read and verify badge disappears
5. Create a booking and verify badge appears

### API Testing
```bash
# Get current user's notification counts
TOKEN="your_token_here"
curl -s http://localhost:3001/notifications/counts \
  -H "Authorization: Bearer $TOKEN" | jq .

# Mark a message as read
curl -s -X PATCH http://localhost:3001/notifications/messages/1/read \
  -H "Authorization: Bearer $TOKEN"

# Mark all messages from sender as read
curl -s -X PATCH http://localhost:3001/notifications/messages/read-all \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"senderId": 5}'
```

## Technical Details

### Database Schema
- Uses existing `messages` table with `read` boolean field
- Places table `approval_status` for site submissions
- Bookings table `status` for pending bookings

### Performance
- 30-second refresh interval balances freshness with performance
- Counts are cached in state and not fetched on every tab change
- API calls are lightweight (just counting queries)

### Future Enhancements
1. WebSocket integration for real-time notifications
2. Local notification alerts when new items arrive
3. Notification history/log
4. Notification preferences (which types to show)
5. Bulk mark-as-read for bookings and applications

## Environment Variables
No additional environment variables needed. The system uses existing API configuration.

## Troubleshooting

### Badges not showing
- Verify notifications endpoint is accessible
- Check that user is authenticated (valid token)
- Check browser network tab for 401 responses

### Badges not updating
- Restart the app to force a refresh
- Check that the backend is handling PUT/PATCH requests correctly
- Verify database has `read` column in messages table

### Performance issues
- Increase the refresh interval in home_screen.dart (change from 30 seconds)
- Implement pagination if notification counts are expensive queries
- Add database indexes on `receiver_id` and `read` fields
