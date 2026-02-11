# Host Site Upload Form - Simulator Testing Script

**Duration**: ~45 minutes  
**Device**: iPhone 15 iOS Simulator  
**Prerequisites**: App running with hot reload, backend running on localhost:3001

---

## Pre-Testing Setup

### 1. Verify Backend is Running
```bash
# In a terminal window, check backend is on port 3001
curl http://localhost:3001/places -H "Authorization: Bearer test"
# Should get a response (not "Connection refused")
```

### 2. Verify App is Running
- Flutter app should be running in simulator
- You should see hot reload working (press `r` in terminal)
- App should show home screen

### 3. Login as Host
- If not already logged in as host, do that now
- Navigate to bottom tab → "My Places" (host mode)
- You should see the "My Places" screen with existing sites or empty state

---

## Test Suite

### SECTION 1: Form Rendering (5 mins)

#### Test 1.1: Open Form from Empty State
**Steps:**
1. If you have no sites, you should see "No Sites Listed Yet" with a button
2. Tap "Create Your First Site" button
3. Verify HostCreateSiteScreen loads

**Expected Results:**
- ✅ Form screen appears without errors
- ✅ App bar shows "← Add Your Site"
- ✅ Smooth navigation animation
- ✅ No black screens or loading spinner

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 1.2: Open Form from App Bar Button
**Steps:**
1. If you have sites listed, tap the "+ Add Site" button in the top-right
2. Verify form opens

**Expected Results:**
- ✅ Form opens from any state (with or without existing sites)
- ✅ Button is clearly visible and tappable
- ✅ Navigation is consistent

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 1.3: Verify All Form Sections Are Visible
**Steps:**
1. Form is open
2. Scroll to the top and take note of sections
3. Scroll to the bottom

**Expected Results:**
- ✅ Main Photo section visible
- ✅ Supporting Photos section visible
- ✅ Address field visible
- ✅ Description field visible
- ✅ Vehicle Length slider visible
- ✅ Price field visible
- ✅ Facilities section visible
- ✅ Business Info section (blue container) visible
- ✅ "Save Draft" and "Submit Site" buttons at bottom
- ✅ No fields cut off or overlapped
- ✅ Scrolling is smooth

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

### SECTION 2: Input Validation (10 mins)

#### Test 2.1: Empty Address Validation
**Steps:**
1. Form is open and empty
2. Leave "Site Address" blank
3. Scroll to bottom
4. Tap "Submit Site" button
5. Check for error message

**Expected Results:**
- ✅ "Please enter the site address" snackbar appears (red)
- ✅ Form stays on screen (doesn't navigate)
- ✅ Error message is readable and clear

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 2.2: Empty Description Validation
**Steps:**
1. Form is open
2. Enter address: "123 Beach Road, Cornwall"
3. Leave "Site Description" blank
4. Tap "Submit Site"

**Expected Results:**
- ✅ "Please enter a site description" snackbar appears
- ✅ Form stays open
- ✅ Address value is still there

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 2.3: Missing Photo Validation
**Steps:**
1. Form still open with address + description filled
2. Don't add any photo
3. Tap "Submit Site"

**Expected Results:**
- ✅ "Please upload a main photo" snackbar appears
- ✅ Form stays open
- ✅ Previous entries still there

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 2.4: Price Validation - Empty
**Steps:**
1. Fill address and description
2. Leave Price field empty
3. Add a photo (see Test 3.1 first if needed)
4. Tap "Submit Site"

**Expected Results:**
- ✅ "Please enter a valid price" snackbar appears
- ✅ Form stays open

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 2.5: Price Validation - Over £20
**Steps:**
1. Tap Price field
2. Type: "25"
3. Watch field in real-time

**Expected Results:**
- ✅ As you type "25", it auto-corrects to "20"
- ✅ Field shows "20" as max
- ✅ No snackbar needed (prevented at input level)

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 2.6: Price Validation - Valid
**Steps:**
1. Clear price field
2. Type: "15.50"
3. Try submit (if other validations pass)

**Expected Results:**
- ✅ Accepts decimal format
- ✅ Accepts £15.50
- ✅ Does not cap or modify it

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 2.7: Vehicle Length Slider
**Steps:**
1. Scroll to Vehicle Length section
2. Drag slider all the way left
3. Check label shows "1ft"
4. Drag slider to middle
5. Check label shows "15ft" or similar
6. Drag slider all the way right
7. Check label shows "30ft"

**Expected Results:**
- ✅ Slider moves smoothly
- ✅ Label updates in real-time
- ✅ Min is 1ft, max is 30ft
- ✅ Default was 20ft
- ✅ Slider is sensitive and responsive

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 2.8: Facilities Multi-Select
**Steps:**
1. Scroll to Facilities section
2. Tap "WiFi" chip
3. Verify it highlights (blue background, white text)
4. Tap "Parking" chip
5. Verify both are selected
6. Tap "WiFi" again to deselect
7. Verify only "Parking" is selected

**Expected Results:**
- ✅ Facilities are clickable
- ✅ Selected facilities show blue background + white text
- ✅ Unselected show outlined style
- ✅ Can toggle on/off
- ✅ Multiple selections work
- ✅ Can have 0 selected (optional field)

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

### SECTION 3: Photo Upload (10 mins)

#### Test 3.1: Add Main Photo
**Steps:**
1. Scroll to top, find "Main Site Photo" section
2. Tap the upload area (gray box with cloud icon + "Tap to upload photo")
3. A menu should appear with camera/gallery options
4. Select "Gallery"

**Expected Results:**
- ✅ Image picker dialog appears
- ✅ Options show "Camera" and "Gallery" buttons
- ✅ Gallery opens and shows device photos

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 3.2: Select Photo from Gallery
**Steps:**
1. From gallery, select any photo (landscape or portrait)
2. Confirm selection

**Expected Results:**
- ✅ Photo is displayed in the preview area (160px tall)
- ✅ Photo is full width of container
- ✅ Photo shows a small red circle with X in top-right corner
- ✅ Form goes back into view (photo selected)

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 3.3: Remove Main Photo
**Steps:**
1. Photo is displayed from Test 3.2
2. Tap the red X button in top-right corner

**Expected Results:**
- ✅ Photo disappears
- ✅ Upload area returns to empty state (gray box with cloud icon)
- ✅ Can tap again to add another photo

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 3.4: Add Supporting Photos (Up to 5)
**Steps:**
1. Scroll to "Supporting Photos" section
2. Tap the + button (add button)
3. Select "Gallery"
4. Pick photo #1
5. Tap + again, select photo #2
6. Repeat until you have 3 supporting photos

**Expected Results:**
- ✅ Photos appear as small thumbnails (100x100px) in grid
- ✅ Each has a small X button to remove
- ✅ Can add multiple photos
- ✅ Photos are arranged horizontally

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 3.5: Supporting Photos - Max 5 Limit
**Steps:**
1. You have 3 supporting photos
2. Tap + to add photo #4
3. Add it
4. Tap + to add photo #5
5. Add it
6. Tap + to try adding photo #6

**Expected Results:**
- ✅ Can add photos 4 and 5 successfully
- ✅ When trying to add 6th, error snackbar appears: "Maximum 5 supporting photos allowed"
- ✅ 6th photo is NOT added

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 3.6: Remove Supporting Photo
**Steps:**
1. You have 5 supporting photos
2. Tap X on one of the thumbnails (middle one)

**Expected Results:**
- ✅ Photo is removed from grid
- ✅ Now shows 4 photos
- ✅ Can add more now (limit is 5)

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 3.7: Business Photos (Max 3)
**Steps:**
1. Scroll down to "Business Information" section (blue container)
2. Under "Business Photos / Menu", tap + to add photo
3. Select from gallery
4. Add 2 more photos
5. Try to add 4th photo

**Expected Results:**
- ✅ Can add 3 business photos
- ✅ When trying to add 4th, error appears: "Maximum 3 business photos allowed"
- ✅ Only 3 photos remain

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

### SECTION 4: Draft Saving (8 mins)

#### Test 4.1: Save Incomplete Draft
**Steps:**
1. Form is open
2. Fill in:
   - Address: "123 Beautiful Lane, Devon"
   - Description: "Lovely countryside location with great views"
   - Price: "18"
   - Select 2 facilities (WiFi, Parking)
   - Add 1 main photo
3. Scroll to bottom
4. Tap "Save Draft" button
5. Check for confirmation message

**Expected Results:**
- ✅ "Draft saved successfully" snackbar appears
- ✅ "Save Draft" button briefly shows "Saving..."
- ✅ Snackbar disappears after 2-3 seconds

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 4.2: Navigate Away and Return
**Steps:**
1. After draft is saved, tap back arrow (← button) in app bar
2. Simulator goes back to My Places
3. Tap "+ Add Site" button again to return to form
4. Check if data is there

**Expected Results:**
- ✅ "Draft loaded" snackbar appears
- ✅ All fields are populated with what you saved:
  - Address shows "123 Beautiful Lane, Devon"
  - Description shows your text
  - Price shows "18"
  - Facilities show WiFi and Parking selected
  - Main photo is displayed
- ✅ NO photos visible (photos not stored in draft, only text data)

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 4.3: Update Draft
**Steps:**
1. Form loaded with draft data (from 4.2)
2. Change price from "18" to "12"
3. Select "Electricity Hookup" facility (in addition to existing ones)
4. Tap "Save Draft" again

**Expected Results:**
- ✅ "Draft saved successfully" message appears
- ✅ New data is stored
- ✅ Navigate away and back
- ✅ Price shows "12"
- ✅ All 3 facilities are selected (WiFi, Parking, Electricity Hookup)

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

### SECTION 5: Form Submission (8 mins)

#### Test 5.1: Complete Form and Submit
**Steps:**
1. Form loaded with draft (or start fresh)
2. Fill complete form:
   - Address: "456 Coastal View, Cornwall"
   - Description: "Beautiful beach location perfect for families"
   - Main Photo: Add 1 photo
   - Supporting Photos: Add 2-3 photos
   - Vehicle Length: Set to 25ft
   - Price: "16"
   - Facilities: Select 3-4 facilities
   - Business Name: "The Coastal Cafe"
   - Website: "https://www.example.com"
   - Business Photos: Add 2 photos
3. Scroll to bottom
4. Tap "Submit Site" button
5. Watch for submission progress

**Expected Results:**
- ✅ "Submit Site" button shows "Submitting..."
- ✅ Button is disabled during submission
- ✅ No freezing or spinner (background submission)
- ✅ After ~3-5 seconds, success snackbar appears
- ✅ Screen automatically navigates back to My Places
- ✅ "Draft saved successfully! 🎉" message (or similar)

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 5.2: Verify Site Created in My Places
**Steps:**
1. After submission, you're back on My Places
2. Look for your new site in the list

**Expected Results:**
- ✅ New site appears in the list
- ✅ Shows address: "456 Coastal View, Cornwall"
- ✅ Shows description you entered
- ✅ Shows correct price
- ✅ Site has Edit and Delete buttons
- ✅ Status shows as "Approved" or "Pending" (your test data)

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

### SECTION 6: Error Scenarios (4 mins)

#### Test 6.1: Network Error Handling (Optional - if backend stops)
**Steps:**
1. Stop the backend server
2. Try to submit a complete form
3. Watch for error handling

**Expected Results:**
- ✅ After 5-10 seconds, error snackbar appears
- ✅ Error message is clear (e.g., "Network error" or "Failed to create place")
- ✅ Form stays on screen (doesn't navigate)
- ✅ User can try again or edit form

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 6.2: Large Image Upload
**Steps:**
1. If possible, select a very large photo (> 5MB)
2. Try to upload it

**Expected Results:**
- ✅ Either rejects or compresses automatically
- ✅ Clear error if rejected: "File too large"
- ✅ Or silently compresses and works fine

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

### SECTION 7: Edge Cases & UX (4 mins)

#### Test 7.1: Long Text Values
**Steps:**
1. Address field: Enter very long address
2. Description: Enter 500+ character description
3. Business name: Enter long name

**Expected Results:**
- ✅ Text wraps properly
- ✅ Fields expand/scroll as needed
- ✅ No overflow or text cut off
- ✅ Form is still usable

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 7.2: Special Characters
**Steps:**
1. Address: "123 O'Brien's Lane, Dublin"
2. Description: "Great spot! Check us out @ the &..."
3. Business name: "Café Deluxe (Est. 2020)"

**Expected Results:**
- ✅ All special characters are accepted
- ✅ Apostrophes, @, &, parentheses, etc. work
- ✅ No encoding issues
- ✅ Data is saved correctly

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 7.3: Rapid Field Changes
**Steps:**
1. Price field: Tap it, type rapidly (256000...)
2. Watch in real-time

**Expected Results:**
- ✅ Auto-capping to 20 works instantly
- ✅ No lag or delay
- ✅ Field is responsive

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

#### Test 7.4: Back Button Behavior
**Steps:**
1. Form is partially filled with data
2. Tap back arrow (← Add Your Site)

**Expected Results:**
- ✅ Two options:
  - A) Navigation goes back without saving
  - B) Shows "Unsaved changes" dialog
- ✅ User doesn't accidentally lose data
- ✅ Can return to form or discard

**Status:** ☐ Pass / ☐ Fail
**Notes:** _______________

---

## Test Summary

### Counting Results
- **Total Tests**: 30
- **Passed**: ___
- **Failed**: ___
- **Blocked/Not Tested**: ___

### Critical Issues Found
1. ________________________
2. ________________________
3. ________________________

### Nice-to-Have Improvements
1. ________________________
2. ________________________

### Overall Assessment
- ☐ Ready for TestFlight
- ☐ Needs fixes before TestFlight
- ☐ Significant issues - needs redesign

---

## Notes for Developers

### If Tests Fail

**Photo Upload Not Working:**
- Check backend is running on localhost:3001
- Check `/backend/uploads/` directory exists
- Check image_picker package is initialized

**Draft Not Loading:**
- Check SharedPreferences is initialized in main.dart
- Check StorageService.getString() returns null safe

**Form Not Submitting:**
- Check backend POST /places endpoint exists
- Check auth token is valid
- Check CORS is enabled on backend

**Price Not Capping:**
- Check onChanged callback implementation
- Verify priceController.text = '20' logic is in place

---

## TestFlight Readiness Criteria

✅ **Ready for TestFlight when ALL of:**
- [ ] All Core validation tests pass (Section 2)
- [ ] All photo upload tests pass (Section 3)
- [ ] Draft save/load works (Section 4)
- [ ] Form submission completes (Section 5)
- [ ] No crashes or black screens
- [ ] No console errors in terminal
- [ ] Navigations are smooth (no stuttering)

❌ **NOT ready if:**
- [ ] Any validation fails
- [ ] Photos don't upload
- [ ] App crashes
- [ ] Submission hangs or fails

---

**Tester Name**: ________________  
**Date**: ________________  
**Device**: iPhone 15 iOS Simulator  
**App Version**: ________
