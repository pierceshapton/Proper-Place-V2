# Proper Place — Pre-Release Test Plan

**Version:** 2.2.0  
**Estimated Duration:** 2 days  
**Tester:** Pierce Shapton  
**Platforms:** iOS (TestFlight), Android (Internal Testing), Website (proper-place.co.uk)  
**Backend:** https://octopus-app-lxh2t.ondigitalocean.app  

---

## How to Use This Document

- Work through each section in order (Day 1 → Day 2)
- Mark each test: ✅ Pass | ❌ Fail | ⚠️ Partial | ⏭️ Skipped
- Note any bugs in the **Notes** column
- Tests marked 🔴 are **blockers** (must pass before release)
- Tests marked 🟡 are **important** (should pass, not critical)
- Tests marked 🟢 are **nice-to-have** (cosmetic/polish)

---

# DAY 1 — Core User Flows & Payments

---

## 1. AUTHENTICATION (App)

### 1.1 Fresh Install & Welcome
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 1.1.1 | App opens to Welcome Screen with background image and branding | 🟡 | | |
| 1.1.2 | "Login" button navigates to Login Screen | 🔴 | | |
| 1.1.3 | "Sign Up" button navigates to Signup Screen | 🔴 | | |
| 1.1.4 | App branding/logo displays correctly (no broken images) | 🟡 | | |

### 1.2 Sign Up
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 1.2.1 | Enter valid name, email, password, confirm password | 🔴 | | |
| 1.2.2 | Vehicle registration field accepts valid UK plates (e.g. AB12 CDE) | 🟡 | | |
| 1.2.3 | Vehicle dimension sliders work (height/width/length) and save | 🟡 | | |
| 1.2.4 | Password mismatch shows warning message | 🔴 | | |
| 1.2.5 | Password visibility toggle (show/hide) works on both fields | 🟢 | | |
| 1.2.6 | Weak password (less than 6 chars) shows error | 🔴 | | |
| 1.2.7 | Duplicate email shows appropriate error | 🔴 | | |
| 1.2.8 | Empty required fields show validation errors | 🔴 | | |
| 1.2.9 | Successful signup navigates to Email Verification Screen | 🔴 | | |
| 1.2.10 | Rate limiting: 6th signup attempt within an hour is blocked | 🟡 | | |

### 1.3 Email Verification
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 1.3.1 | Email Verification Screen displays with correct email address | 🔴 | | |
| 1.3.2 | Verification email arrives in inbox (check spam) | 🔴 | | ⚠️ Known issue: production SMTP may not be working yet |
| 1.3.3 | Clicking verification link in email marks user as verified | 🔴 | | |
| 1.3.4 | App auto-detects verification (polls every 5s) and proceeds to home | 🔴 | | |
| 1.3.5 | "Resend" button sends a new verification email | 🟡 | | |
| 1.3.6 | Back button returns to Welcome Screen | 🟡 | | |
| 1.3.7 | Logging in with unverified account shows verification screen | 🔴 | | |

### 1.4 Login
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 1.4.1 | Valid email + password logs in successfully | 🔴 | | |
| 1.4.2 | Invalid password shows error message | 🔴 | | |
| 1.4.3 | Non-existent email shows error (shouldn't reveal if account exists) | 🔴 | | |
| 1.4.4 | "Remember Me" checkbox persists login across app restart | 🟡 | | |
| 1.4.5 | Password visibility toggle works | 🟢 | | |
| 1.4.6 | Rate limiting: 6th login attempt within 15 mins is blocked | 🟡 | | |

### 1.5 Forgot Password
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 1.5.1 | "Forgot Password" link from login screen works | 🔴 | | |
| 1.5.2 | Entering valid email shows success message | 🔴 | | |
| 1.5.3 | Reset email arrives with valid link | 🔴 | | ⚠️ Depends on SMTP fix |
| 1.5.4 | Reset link opens password reset form | 🔴 | | |
| 1.5.5 | Setting new password works and allows login | 🔴 | | |
| 1.5.6 | Entering non-existent email still shows success (no info leak) | 🟡 | | |

### 1.6 Session Management
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 1.6.1 | Token auto-refreshes (stay logged in for 30+ mins without action) | 🔴 | | |
| 1.6.2 | Logout clears session and returns to Welcome Screen | 🔴 | | |
| 1.6.3 | After logout, pressing back doesn't return to authenticated screens | 🟡 | | |
| 1.6.4 | Force-closing and reopening app maintains session (if Remember Me) | 🟡 | | |

---

## 2. MAP & BROWSING (App)

### 2.1 Map Display
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 2.1.1 | Map loads with Google Maps tiles | 🔴 | | |
| 2.1.2 | Current location button works (if permissions granted) | 🟡 | | |
| 2.1.3 | Custom "P" pin markers appear when zoomed in (zoom 11+) | 🔴 | | |
| 2.1.4 | Markers disappear when zoomed out too far | 🟢 | | |
| 2.1.5 | Pin tip points at the exact location (not offset) | 🟡 | | |
| 2.1.6 | Map type toggle works (satellite/standard) | 🟢 | | |
| 2.1.7 | Map remembers last position between sessions | 🟢 | | |

### 2.2 Place Discovery
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 2.2.1 | Tapping a marker shows place preview card | 🔴 | | |
| 2.2.2 | Place preview shows: name, price, image thumbnail | 🔴 | | |
| 2.2.3 | Tapping preview navigates to Place Detail Screen | 🔴 | | |
| 2.2.4 | Facility filter buttons appear and are functional | 🟡 | | |
| 2.2.5 | Filtering by facility updates visible markers | 🟡 | | |
| 2.2.6 | Search functionality finds places by name/location | 🟡 | | |
| 2.2.7 | Vehicle size filter toggle filters out places too small for your van | 🟡 | | |

### 2.3 Route Planning
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 2.3.1 | Route planning (start/destination) draws a route on map | 🟡 | | |
| 2.3.2 | Search radius circle displays around destination | 🟢 | | |

### 2.4 Offline Maps
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 2.4.1 | Offline regions screen lists all 16 UK regions | 🟡 | | |
| 2.4.2 | Downloading a region shows progress indicator | 🟡 | | |
| 2.4.3 | Downloaded region data persists when offline | 🟡 | | |
| 2.4.4 | Cache size displays correctly | 🟢 | | |

---

## 3. PLACE DETAIL (App)

| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 3.1 | Place Detail Screen loads with all information | 🔴 | | |
| 3.2 | Image carousel swipes between photos | 🔴 | | |
| 3.3 | Place name, description, address display correctly | 🔴 | | |
| 3.4 | Price per night displays correctly (£) | 🔴 | | |
| 3.5 | Amenities list shows correct icons | 🟡 | | |
| 3.6 | Reviews section shows existing reviews with star ratings | 🟡 | | |
| 3.7 | Average rating calculates correctly | 🟡 | | |
| 3.8 | Review photos display in reviews | 🟢 | | |
| 3.9 | Availability calendar shows booked dates in green | 🔴 | | |
| 3.10 | Vehicle fit warning appears if van is too large for the place | 🟡 | | |
| 3.11 | Business description, food menu, access route show if available | 🟢 | | |
| 3.12 | Host info (name) displays | 🟡 | | |
| 3.13 | "Add to Favourites" heart icon works | 🟡 | | |
| 3.14 | Place is marked as favourite and appears in Favourites screen | 🟡 | | |

---

## 4. BOOKING FLOW & PAYMENTS (App) 🔴🔴🔴

### 4.1 Creating a Booking
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 4.1.1 | "Book Now" button opens booking calendar | 🔴 | | |
| 4.1.2 | Select check-in date on calendar (orange highlight) | 🔴 | | |
| 4.1.3 | Select check-out date (range highlighted) | 🔴 | | |
| 4.1.4 | Cannot select dates that are already booked (green) | 🔴 | | |
| 4.1.5 | Cannot select past dates | 🔴 | | |
| 4.1.6 | Check-in/check-out times can be adjusted | 🟡 | | |
| 4.1.7 | Early arrival fee (£5/hr before standard time) calculates | 🟡 | | |
| 4.1.8 | Late departure fee (£5/hr after standard time) calculates | 🟡 | | |
| 4.1.9 | Total price displays correctly (nights × price + any fees) | 🔴 | | |
| 4.1.10 | Van registration is pre-filled from profile or can be entered | 🟡 | | |
| 4.1.11 | UK number plate validation works (rejects invalid formats) | 🟡 | | |
| 4.1.12 | Capacity check: booking rejected if place is full for those dates | 🔴 | | |

### 4.2 Stripe Payment (USE TEST CARDS)
**Test Cards:**
- Success: `4242 4242 4242 4242` (any future exp, any CVC)
- Declined: `4000 0000 0000 0002`
- Auth Required: `4000 0025 0000 3155`

| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 4.2.1 | Stripe payment sheet appears after confirming booking details | 🔴 | | |
| 4.2.2 | Successful payment with test card 4242... creates booking | 🔴 | | |
| 4.2.3 | Booking status shows as "Pending" (awaiting host approval) | 🔴 | | |
| 4.2.4 | Declined card (4000...0002) shows appropriate error message | 🔴 | | |
| 4.2.5 | 3D Secure card (4000...3155) shows authentication challenge | 🟡 | | |
| 4.2.6 | Payment amount matches displayed total | 🔴 | | |
| 4.2.7 | Funds are **held** (not captured) — check Stripe Dashboard | 🔴 | | |
| 4.2.8 | Booking confirmation screen displays after successful payment | 🔴 | | |
| 4.2.9 | Booking reference number generated (PP-YYMMDD-XXXX format) | 🟡 | | |

### 4.3 Booking Management (Guest)
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 4.3.1 | New booking appears in "My Bookings" screen | 🔴 | | |
| 4.3.2 | Booking tabs filter correctly (All/Pending/Confirmed/Completed) | 🟡 | | |
| 4.3.3 | Calendar view toggle shows bookings on calendar | 🟡 | | |
| 4.3.4 | Search within bookings works | 🟢 | | |
| 4.3.5 | Tapping a booking opens Booking Detail Screen | 🔴 | | |
| 4.3.6 | Booking detail shows: dates, place, status, total paid | 🔴 | | |
| 4.3.7 | "Get Directions" button opens Waze/Maps | 🟡 | | |
| 4.3.8 | "Chat with Host" button opens messaging | 🔴 | | |
| 4.3.9 | Cancel booking releases the payment hold | 🔴 | | |
| 4.3.10 | Cancelled booking status updates correctly | 🔴 | | |

---

## 5. MESSAGING SYSTEM (App)

### 5.1 Guest → Host Chat
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 5.1.1 | Opening chat from booking shows conversation | 🔴 | | |
| 5.1.2 | Sending a text message works | 🔴 | | |
| 5.1.3 | Messages appear in correct order (newest at bottom) | 🔴 | | |
| 5.1.4 | Message polling (3s) picks up new messages from host | 🔴 | | |
| 5.1.5 | Unread message badge shows on Bookings/Messages tab | 🔴 | | |
| 5.1.6 | Badge count clears when conversation is opened | 🟡 | | |
| 5.1.7 | All Chats screen lists all conversations | 🔴 | | |
| 5.1.8 | Swipe actions: mark unread, delete work | 🟢 | | |

### 5.2 Chat Lifecycle
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 5.2.1 | Chat is "open" during active booking | 🟡 | | |
| 5.2.2 | Chat shows "closing soon" near end of stay | 🟡 | | |
| 5.2.3 | Chat closes after booking completion | 🟡 | | |
| 5.2.4 | "Request Reopen" button available on closed chats | 🟡 | | |
| 5.2.5 | Host can approve/deny reopen request | 🟡 | | |

### 5.3 Response Time
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 5.3.1 | Host response time label displays (e.g. "Usually responds within 1 hour") | 🟢 | | |

---

## 6. REVIEWS (App)

| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 6.1 | After a completed booking, "Leave Review" option appears | 🔴 | | |
| 6.2 | Star rating selector works (1-5 stars) | 🔴 | | |
| 6.3 | Text comment field accepts input | 🔴 | | |
| 6.4 | Photo upload (up to 5 photos) works | 🟡 | | |
| 6.5 | EXIF metadata stripped from photos (privacy) | 🟡 | | Test by uploading photo with location data, check if stripped |
| 6.6 | Submitting review succeeds | 🔴 | | |
| 6.7 | Review appears on the place's detail page | 🔴 | | |
| 6.8 | Average rating updates after new review | 🟡 | | |

---

## 7. FAVOURITES (App)

| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 7.1 | Adding a place to favourites from detail screen works | 🟡 | | |
| 7.2 | Favourites tab shows all saved places | 🟡 | | |
| 7.3 | Removing a favourite updates the list | 🟡 | | |
| 7.4 | Favourite heart markers appear on map | 🟢 | | |
| 7.5 | Search/filter within favourites works | 🟢 | | |

---

# DAY 2 — Host, Admin, Website & Edge Cases

---

## 8. HOST APPLICATION & ONBOARDING (App)

### 8.1 Become a Host
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 8.1.1 | "Become a Host" option in More menu visible for regular users | 🔴 | | |
| 8.1.2 | Host application form loads with all fields | 🔴 | | |
| 8.1.3 | Contact name, email, phone fields work | 🔴 | | |
| 8.1.4 | Business description field works | 🟡 | | |
| 8.1.5 | Address field uses Google Places autocomplete | 🔴 | | |
| 8.1.6 | Business type selector works (pub, farm, etc.) | 🟡 | | |
| 8.1.7 | Number of van spaces field works | 🟡 | | |
| 8.1.8 | Referral code field works (optional) | 🟢 | | |
| 8.1.9 | GPS location auto-populates from address | 🟡 | | |
| 8.1.10 | Submitting application shows success message | 🔴 | | |

### 8.2 Host Contract
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 8.2.1 | After application approval, Host Contract screen appears | 🔴 | | |
| 8.2.2 | Contract text is readable and scrollable | 🔴 | | |
| 8.2.3 | Must scroll to bottom before "Accept" becomes enabled | 🔴 | | |
| 8.2.4 | Accepting contract records acceptance (IP, timestamp) | 🔴 | | |
| 8.2.5 | After contract, Stripe Payout Setup screen appears | 🔴 | | |

### 8.3 Stripe Connect (Host Payouts)
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 8.3.1 | Stripe Connect onboarding opens external browser | 🔴 | | |
| 8.3.2 | Completing Stripe onboarding returns to app | 🔴 | | |
| 8.3.3 | App verifies Stripe Connect status on return | 🔴 | | |
| 8.3.4 | If onboarding incomplete, shows "Complete Setup" option | 🟡 | | |
| 8.3.5 | Payout status visible on Host Dashboard | 🟡 | | |

---

## 9. HOST SITE MANAGEMENT (App)

### 9.1 Create a Site
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 9.1.1 | "Create Site" button available in Host mode | 🔴 | | |
| 9.1.2 | All form fields work: name, address, description | 🔴 | | |
| 9.1.3 | Access route description field works | 🟡 | | |
| 9.1.4 | Price per night field (numeric input) works | 🔴 | | |
| 9.1.5 | Website URL field works | 🟢 | | |
| 9.1.6 | Business name and description fields work | 🟡 | | |
| 9.1.7 | Food menu description field works | 🟢 | | |
| 9.1.8 | Main photo upload works | 🔴 | | |
| 9.1.9 | Supporting photos upload (multiple) works | 🟡 | | |
| 9.1.10 | Business photos upload works | 🟢 | | |
| 9.1.11 | Vehicle dimension limits (height/width/length) with metric/imperial toggle | 🟡 | | |
| 9.1.12 | Number of van spaces field works | 🔴 | | |
| 9.1.13 | Google Maps pin placement for exact location | 🔴 | | |
| 9.1.14 | Saving site shows success and site appears in "My Sites" | 🔴 | | |
| 9.1.15 | New site status is "Pending" (awaiting admin approval) | 🔴 | | |

### 9.2 Edit a Site
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 9.2.1 | Tapping a site opens it for editing | 🔴 | | |
| 9.2.2 | All fields are pre-populated with existing data | 🔴 | | |
| 9.2.3 | Changes save correctly | 🔴 | | |
| 9.2.4 | Adding/removing photos works | 🟡 | | |

### 9.3 My Sites List
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 9.3.1 | Sites list shows all host's sites | 🔴 | | |
| 9.3.2 | Status badges display correctly (Drafting/Pending/Approved/Rejected) | 🔴 | | |
| 9.3.3 | Only approved sites appear on the public map | 🔴 | | |
| 9.3.4 | Mark site as unavailable toggles it off the map | 🟡 | | |
| 9.3.5 | Mark site as available restores it | 🟡 | | |

---

## 10. HOST BOOKING MANAGEMENT (App)

| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 10.1 | Host sees incoming bookings in Host Bookings screen | 🔴 | | |
| 10.2 | Booking shows guest info, dates, van details | 🔴 | | |
| 10.3 | "Approve" button captures the held payment | 🔴 | | Check Stripe Dashboard |
| 10.4 | After approval, booking status changes to "Confirmed" | 🔴 | | |
| 10.5 | "Reject" button cancels the payment hold | 🔴 | | Check Stripe Dashboard |
| 10.6 | After rejection, booking status changes to "Rejected" | 🔴 | | |
| 10.7 | Calendar view shows bookings on dates | 🟡 | | |
| 10.8 | Filter tabs work (Confirmed/Pending/Completed/All) | 🟡 | | |
| 10.9 | Unread message badges appear per booking | 🟡 | | |
| 10.10 | 15% platform fee deducted from host payout (check Stripe) | 🔴 | | |

---

## 11. HOST DASHBOARD & FEATURES (App)

| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 11.1 | Dashboard shows: unread messages, total bookings, revenue | 🔴 | | |
| 11.2 | Pending payments count is accurate | 🟡 | | |
| 11.3 | Average length of stay calculates | 🟢 | | |
| 11.4 | Recent conversations list is clickable | 🟡 | | |
| 11.5 | Recent bookings list is clickable | 🟡 | | |

### 11.1 Auto-Messages
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 11.1.1 | Auto-message config screen accessible per place | 🟡 | | |
| 11.1.2 | Can set message for "On Booking" trigger | 🟡 | | |
| 11.1.3 | Can set message for "24h Before Check-in" trigger | 🟡 | | |
| 11.1.4 | Can set message for "1h Before Arrival" trigger | 🟡 | | |
| 11.1.5 | Can set message for "At Checkout" trigger | 🟡 | | |
| 11.1.6 | Auto-message actually sends at the correct trigger time | 🟡 | | Hard to test — check DB or wait |

### 11.2 Host Reviews
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 11.2.1 | Host Reviews screen shows all reviews across all places | 🟡 | | |
| 11.2.2 | Filter by star rating works | 🟢 | | |
| 11.2.3 | Review photos display correctly | 🟢 | | |

### 11.3 Host Chat
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 11.3.1 | Host chat screen lists all guest conversations | 🔴 | | |
| 11.3.2 | Open/closed sections display correctly | 🟡 | | |
| 11.3.3 | Sending messages to guests works | 🔴 | | |
| 11.3.4 | Reopen request handling works (approve/deny) | 🟡 | | |

### 11.4 Guest Rating
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 11.4.1 | Host can rate a guest after completed booking | 🟡 | | |
| 11.4.2 | Guest rating is stored and retrievable | 🟡 | | |

---

## 12. ADMIN PANEL (App)

**Login as admin:** `admin@properplace.com` / `AdminPass123!`

### 12.1 Admin Dashboard
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 12.1.1 | Admin Dashboard loads with quick-action cards | 🔴 | | |
| 12.1.2 | Booking search works | 🟡 | | |

### 12.2 Place Approvals
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 12.2.1 | Pending/Approved/Rejected tabs show correct counts | 🔴 | | |
| 12.2.2 | Tapping a pending place shows full detail with images | 🔴 | | |
| 12.2.3 | Host info displayed (total sites, join date, contract status) | 🟡 | | |
| 12.2.4 | Google Maps preview shows place location | 🟡 | | |
| 12.2.5 | "Approve" button approves and place appears on map | 🔴 | | |
| 12.2.6 | "Reject" button rejects with reason | 🔴 | | |
| 12.2.7 | "Remove" button removes an approved place | 🟡 | | |

### 12.3 Admin Host Requests (All Bookings)
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 12.3.1 | All platform bookings are visible | 🔴 | | |
| 12.3.2 | Filter by status works (All/Pending/Confirmed/Completed/Cancelled) | 🟡 | | |

### 12.4 Admin Chat
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 12.4.1 | Admin can view all conversations | 🟡 | | |
| 12.4.2 | Admin can send messages | 🟡 | | |

### 12.5 Admin Contact Messages
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 12.5.1 | Contact submissions appear with status (new/read/responded/closed) | 🔴 | | |
| 12.5.2 | Filter by status works | 🟡 | | |
| 12.5.3 | Filter by category (hosts/users) works | 🟡 | | |
| 12.5.4 | Can update contact status | 🟡 | | |

---

## 13. PROFILE & SETTINGS (App)

| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 13.1 | Profile screen shows current name, email, phone, bio | 🔴 | | |
| 13.2 | Editing name saves correctly | 🔴 | | |
| 13.3 | Editing phone number saves correctly | 🟡 | | |
| 13.4 | Editing bio saves correctly | 🟢 | | |
| 13.5 | Vehicle registration can be updated | 🟡 | | |
| 13.6 | Vehicle dimensions screen works (ft/m toggle, sliders) | 🟡 | | |
| 13.7 | "Contact Us" form accessible and submits | 🟡 | | |
| 13.8 | T&C and Privacy links open correctly | 🟡 | | |
| 13.9 | Logout works from More menu | 🔴 | | |

---

## 14. PUSH NOTIFICATIONS (App)

| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 14.1 | App requests notification permission on first launch | 🟡 | | |
| 14.2 | Device token registered with backend | 🟡 | | |
| 14.3 | Push notification received for new booking (as host) | 🟡 | | |
| 14.4 | Push notification received for new message | 🟡 | | |
| 14.5 | Tapping notification opens relevant screen | 🟡 | | |
| 14.6 | Badge counts update on bottom nav bar | 🔴 | | |
| 14.7 | Device token unregistered on logout | 🟢 | | |

---

## 15. WEBSITE TESTING (proper-place.co.uk)

### 15.1 Public Pages
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 15.1.1 | Homepage loads with hero, featured places, how-it-works | 🔴 | | |
| 15.1.2 | Navigation bar links all work | 🔴 | | |
| 15.1.3 | Footer links all work | 🟡 | | |
| 15.1.4 | Cookie consent banner appears and works (Accept/Essential Only) | 🔴 | | |
| 15.1.5 | `/browse` — Google Maps loads with place markers | 🔴 | | |
| 15.1.6 | `/browse` — Clicking marker shows place card | 🔴 | | |
| 15.1.7 | `/place/[id]` — Place detail page loads with images, amenities, reviews | 🔴 | | |
| 15.1.8 | `/about` — About page loads | 🟡 | | |
| 15.1.9 | `/how-it-works` — Page loads with steps for guests and hosts | 🟡 | | |
| 15.1.10 | `/download` — App download page with store buttons | 🟡 | | |
| 15.1.11 | `/contact` — Contact form submits successfully | 🔴 | | |
| 15.1.12 | `/privacy` — Privacy policy loads | 🔴 | | |
| 15.1.13 | `/terms` — Terms of service loads | 🔴 | | |
| 15.1.14 | `/cookies` — Cookie policy loads | 🟡 | | |
| 15.1.15 | `/scan` — QR code landing page loads | 🟢 | | |
| 15.1.16 | `/become-host` — Host recruitment page loads | 🟡 | | |
| 15.1.17 | `/host-signup` — Host lead form submits | 🟡 | | |
| 15.1.18 | `/qr-codes` — QR code generator works, PNG download works | 🟢 | | |

### 15.2 Website Auth
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 15.2.1 | `/auth/signup` — Registration works with all fields | 🔴 | | |
| 15.2.2 | Referral code field on signup works | 🟡 | | |
| 15.2.3 | `/auth/login` — Login works | 🔴 | | |
| 15.2.4 | Forgot password flow works from login page | 🔴 | | |
| 15.2.5 | Token auto-refresh works (stay logged in) | 🟡 | | |

### 15.3 Website Booking Flow
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 15.3.1 | `/place/[id]/book` — Booking form loads | 🔴 | | |
| 15.3.2 | Date picker works with unavailable dates blocked | 🔴 | | |
| 15.3.3 | Vehicle registration and phone fields work | 🟡 | | |
| 15.3.4 | Vehicle dimensions can be entered | 🟡 | | |
| 15.3.5 | Price calculation displays correctly | 🔴 | | |
| 15.3.6 | Stripe payment works (test card) | 🔴 | | |
| 15.3.7 | Booking success confirmation shows | 🔴 | | |

### 15.4 Website Dashboard
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 15.4.1 | `/dashboard` — Overview loads with role-based content | 🔴 | | |
| 15.4.2 | `/dashboard/bookings` — Guest bookings list with filters | 🔴 | | |
| 15.4.3 | `/dashboard/bookings/[id]` — Booking detail, cancel, review | 🔴 | | |
| 15.4.4 | `/dashboard/messages` — Conversations list | 🔴 | | |
| 15.4.5 | `/dashboard/messages/[userId]` — Chat works with polling | 🔴 | | |
| 15.4.6 | `/dashboard/profile` — Profile, Vehicle, Security tabs | 🟡 | | |
| 15.4.7 | `/dashboard/referrals` — Referral code, stats, share | 🟡 | | |
| 15.4.8 | `/dashboard/places` — Host places list (if host) | 🟡 | | |
| 15.4.9 | `/dashboard/places/new` — Create place form | 🟡 | | |
| 15.4.10 | `/dashboard/host/bookings` — Host booking management | 🟡 | | |
| 15.4.11 | `/dashboard/host/auto-messages` — Auto-message config | 🟡 | | |

### 15.5 Website Admin (Login as admin)
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 15.5.1 | `/dashboard/admin` — Admin stats display | 🔴 | | |
| 15.5.2 | `/dashboard/admin/users` — User management, role changes | 🟡 | | |
| 15.5.3 | `/dashboard/admin/places` — Place approvals | 🔴 | | |
| 15.5.4 | `/dashboard/admin/bookings` — All bookings search | 🟡 | | |
| 15.5.5 | `/dashboard/admin/contacts` — Support ticket management | 🟡 | | |

### 15.6 Mobile Responsiveness
| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 15.6.1 | Homepage looks correct on mobile (Chrome DevTools toggle) | 🔴 | | |
| 15.6.2 | Navigation hamburger menu works on mobile | 🔴 | | |
| 15.6.3 | Browse map is usable on mobile | 🟡 | | |
| 15.6.4 | Booking form works on mobile | 🔴 | | |
| 15.6.5 | Dashboard sidebar collapses on mobile | 🟡 | | |

---

## 16. END-TO-END FLOW TEST 🔴🔴🔴

**This is the most important test. Run through the complete lifecycle.**

### Test Account Setup
- **Guest account:** Create fresh account (e.g. `testguest@yourpersonalemail.com`)
- **Host account:** Use existing host or promote guest via admin
- **Admin account:** `admin@properplace.com` / `AdminPass123!`

### Flow
| # | Step | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 16.1 | Create new guest account (app) | 🔴 | | |
| 16.2 | Verify email | 🔴 | | |
| 16.3 | Set vehicle dimensions | 🟡 | | |
| 16.4 | Browse map and find a place | 🔴 | | |
| 16.5 | View place detail, check amenities and reviews | 🔴 | | |
| 16.6 | Add place to favourites | 🟡 | | |
| 16.7 | Start booking: select dates | 🔴 | | |
| 16.8 | Complete Stripe payment (test card 4242...) | 🔴 | | |
| 16.9 | Verify booking appears as "Pending" | 🔴 | | |
| 16.10 | Send message to host via booking chat | 🔴 | | |
| 16.11 | **Switch to host account** | 🔴 | | |
| 16.12 | Host sees pending booking in dashboard | 🔴 | | |
| 16.13 | Host sees guest message | 🔴 | | |
| 16.14 | Host replies to message | 🔴 | | |
| 16.15 | Host approves booking | 🔴 | | |
| 16.16 | Verify Stripe: payment captured, 15% fee taken | 🔴 | | Check Stripe Dashboard |
| 16.17 | **Switch to guest account** | 🔴 | | |
| 16.18 | Guest sees booking status changed to "Confirmed" | 🔴 | | |
| 16.19 | Guest sees host's reply message | 🔴 | | |
| 16.20 | Guest gets directions via Waze/Maps | 🟡 | | |
| 16.21 | After stay: guest leaves a review (stars + text + photo) | 🔴 | | |
| 16.22 | **Switch to host account** | | | |
| 16.23 | Host sees the review | 🔴 | | |
| 16.24 | Host rates the guest | 🟡 | | |
| 16.25 | **Switch to admin account** | | | |
| 16.26 | Admin sees the booking in "All Bookings" | 🔴 | | |
| 16.27 | Admin sees the review | 🟡 | | |

### Rejection Flow
| # | Step | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 16.28 | Guest makes another booking (same or different place) | 🔴 | | |
| 16.29 | Host rejects it | 🔴 | | |
| 16.30 | Guest sees status "Rejected" | 🔴 | | |
| 16.31 | Verify Stripe: payment hold released/refunded | 🔴 | | Check Stripe Dashboard |

### Cancellation Flow
| # | Step | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 16.32 | Guest makes a booking and pays | 🔴 | | |
| 16.33 | Guest cancels the booking | 🔴 | | |
| 16.34 | Verify Stripe: payment hold released | 🔴 | | |
| 16.35 | Booking shows as "Cancelled" | 🔴 | | |

---

## 17. HOST SITE SUBMISSION → APPROVAL FLOW

| # | Step | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 17.1 | Host creates a new site with all details + photos | 🔴 | | |
| 17.2 | Site shows as "Pending" in host's My Sites | 🔴 | | |
| 17.3 | **Login as admin** | | | |
| 17.4 | Site appears in admin Place Approvals → Pending tab | 🔴 | | |
| 17.5 | Admin reviews all details (images, host info, map) | 🔴 | | |
| 17.6 | Admin approves the site | 🔴 | | |
| 17.7 | **Login as host** — site now shows "Approved" | 🔴 | | |
| 17.8 | **Login as guest** — site now appears on map | 🔴 | | |
| 17.9 | Admin rejects a different site with reason | 🟡 | | |
| 17.10 | Host sees "Rejected" status | 🟡 | | |

---

## 18. STRIPE FINANCIAL VERIFICATION 🔴

**Check these in https://dashboard.stripe.com/test/...**

| # | Check | Priority | Result | Notes |
|---|-------|----------|--------|-------|
| 18.1 | PaymentIntent created with `capture_method: manual` | 🔴 | | |
| 18.2 | On host approval: PaymentIntent status = `succeeded` | 🔴 | | |
| 18.3 | On host approval: Charge captured | 🔴 | | |
| 18.4 | 15% application fee deducted | 🔴 | | |
| 18.5 | On host rejection: PaymentIntent cancelled, no charge | 🔴 | | |
| 18.6 | On guest cancel: Payment hold released | 🔴 | | |
| 18.7 | Host Stripe Connect account shows correct balance | 🔴 | | |
| 18.8 | Webhook events received (check Stripe webhook logs) | 🟡 | | |
| 18.9 | Expired authorizations auto-cancel (runs hourly) | 🟡 | | |

---

## 19. CONTACT & SUPPORT

| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 19.1 | App: Contact Us form (More → Contact Us) submits | 🟡 | | |
| 19.2 | App: Category dropdown works (General/Technical/Complaint/Suggestion/Other) | 🟡 | | |
| 19.3 | Website: `/contact` form submits | 🟡 | | |
| 19.4 | Admin sees contact messages in Admin Contact Messages | 🟡 | | |
| 19.5 | Admin can change status (new → read → responded → closed) | 🟡 | | |

---

## 20. REFERRAL SYSTEM

| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 20.1 | User can view their referral code | 🟡 | | |
| 20.2 | Referral code can be copied/shared | 🟡 | | |
| 20.3 | Signing up with a referral code creates a referral record | 🟡 | | |
| 20.4 | Referral stats display correctly | 🟡 | | |
| 20.5 | Website: `/dashboard/referrals` shows stats + code | 🟡 | | |

---

## 21. EDGE CASES & ERROR HANDLING

| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 21.1 | No internet: app shows offline mode / graceful error | 🟡 | | |
| 21.2 | Slow internet: loading spinners appear | 🟡 | | |
| 21.3 | Back button behaviour on all screens (no crashes) | 🟡 | | |
| 21.4 | Rotate device: layout doesn't break | 🟢 | | |
| 21.5 | Very long text in fields (e.g. 1000-char description) | 🟢 | | |
| 21.6 | Special characters in name/description (é, ñ, emoji) | 🟢 | | |
| 21.7 | Double-tap "Book" button doesn't create duplicate booking | 🔴 | | |
| 21.8 | Double-tap "Pay" doesn't charge twice | 🔴 | | |
| 21.9 | Expired token mid-session: auto-refresh or re-login prompt | 🔴 | | |
| 21.10 | Booking for a place that becomes full between page load and submit | 🟡 | | |
| 21.11 | Kill app during payment flow — check no orphan payment intents | 🟡 | | |
| 21.12 | Rate limiting: verify blocked after too many password reset attempts | 🟡 | | |

---

## 22. VISUAL & UX POLISH

| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 22.1 | App cream colour (#ECE8DB) consistent across all screens | 🟢 | | |
| 22.2 | App blue colour (#7BA7D8) consistent for buttons/accents | 🟢 | | |
| 22.3 | All images load (no broken image placeholders) | 🟡 | | |
| 22.4 | Loading states show spinners (not blank screens) | 🟡 | | |
| 22.5 | Error messages are user-friendly (not raw errors) | 🟡 | | |
| 22.6 | Empty states show helpful messages ("No bookings yet") | 🟡 | | |
| 22.7 | Keyboard doesn't cover input fields | 🟡 | | |
| 22.8 | Scroll works properly on all long screens | 🟡 | | |
| 22.9 | Bottom nav bar icons and labels correct | 🟡 | | |
| 22.10 | App icon and splash screen display correctly | 🟡 | | |

---

## 23. SECURITY CHECKS

| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 23.1 | Accessing someone else's booking returns error (not data) | 🔴 | | |
| 23.2 | Non-admin accessing admin endpoints returns 403 | 🔴 | | |
| 23.3 | Non-host accessing host endpoints returns error | 🔴 | | |
| 23.4 | Expired reset password link doesn't work | 🔴 | | |
| 23.5 | Can't approve own place (if somehow host = admin) | 🟡 | | |
| 23.6 | Review photos strip GPS/EXIF metadata | 🟡 | | |
| 23.7 | Password change requires correct current password | 🔴 | | |
| 23.8 | HTTPS only on all endpoints | 🔴 | | |
| 23.9 | Tokens stored securely (Keychain/Keystore, not plain text) | 🔴 | | |

---

## 24. PERFORMANCE

| # | Test | Priority | Result | Notes |
|---|------|----------|--------|-------|
| 24.1 | App cold start time < 5 seconds | 🟡 | | |
| 24.2 | Map panning/zooming is smooth | 🟡 | | |
| 24.3 | Image gallery scrolling is smooth | 🟡 | | |
| 24.4 | Chat messages don't cause memory leak (leave open 5+ mins) | 🟡 | | |
| 24.5 | Website pages load < 3 seconds on 4G | 🟡 | | |
| 24.6 | No console errors on website (check Chrome DevTools) | 🟡 | | |

---

## BUG TRACKER

Use this table to log any bugs found during testing.

| # | Date | Section | Severity | Description | Steps to Reproduce | Status |
|---|------|---------|----------|-------------|-------------------|--------|
| B1 | | | | | | |
| B2 | | | | | | |
| B3 | | | | | | |
| B4 | | | | | | |
| B5 | | | | | | |
| B6 | | | | | | |
| B7 | | | | | | |
| B8 | | | | | | |
| B9 | | | | | | |
| B10 | | | | | | |

---

## KNOWN ISSUES (Pre-Existing)

| Issue | Status | Impact |
|-------|--------|--------|
| Production SMTP emails (verification, password reset) failing from DigitalOcean IPs — Google Workspace relay propagation pending | Waiting | Cannot test email verification/password reset on production |
| `relation "host_applications" does not exist` error in production logs | Unresolved | May affect host application form |

---

## SIGN-OFF

| | Name | Date | Signature |
|---|------|------|-----------|
| Tester | | | |
| Developer | | | |
| Release Approved | | | |

**Total Tests:** ~230  
**Blockers (🔴):** ~85  
**Important (🟡):** ~100  
**Nice-to-have (🟢):** ~45  
