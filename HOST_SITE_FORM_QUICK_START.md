# Host Site Upload Form - Quick Integration Guide

## What Was Created

A complete host site upload form that enables hosts to list new sites with:
- Main + supporting photos (up to 5 additional images)
- Site address, description, vehicle length cap
- Price per night (capped at £20)
- Facilities multi-select (WiFi, Electricity, Water, Parking, etc.)
- Business information section (name, website, menu/photos)
- **Draft saving** - Save incomplete forms and resume later
- Full backend integration with PhotoService

## Files Added

```
proper_place/lib/screens/host_create_site_screen.dart      [380+ lines]
proper_place/lib/services/image_picker_service.dart        [50+ lines]
proper_place/lib/services/place_service.dart               [120+ lines]
```

## Files Modified

```
proper_place/lib/screens/my_places_host_screen.dart
  - Added navigation to form
  - Added empty state with "Create Your First Site" button
```

## Dependencies Already Available

✅ `image_picker: ^1.0.4` - Photo selection from gallery/camera
✅ `shared_preferences: ^2.2.0` - Draft data persistence
✅ Backend upload infrastructure - Ready at `/upload/place/{placeId}`

## Key Features

### 1. Photo Management
- **Main Photo**: Featured image (required)
- **Supporting Photos**: Up to 5 additional images
- **Business Photos**: Up to 3 menu/business images
- All cropped/previewed before upload
- Batch upload to backend after form submission

### 2. Form Validation
| Field | Requirement |
|-------|-----------|
| Address | Required |
| Description | Required |
| Main Photo | Required |
| Price | 0-£20 range |
| Facilities | Optional (at least one recommended) |

### 3. Draft Persistence
```dart
// Automatically saves form state on "Save Draft" button
// Loads automatically on screen open
// Cleared after successful submission
```

### 4. Price Hard Cap
- Input field caps at £20
- Prevents submitting over-priced listings
- Real-time validation during typing

### 5. Vehicle Length Control
- Interactive slider: 1-30 feet
- Real-time display of selected length
- Default: 20 feet

## How It Works - User Journey

### First Time Host (Empty State)
```
My Places Screen (empty)
    ↓
"Create Your First Site" button → HostCreateSiteScreen
    ↓
Fill form (can save draft anytime)
    ↓
"Submit Site" → API call → Success message
    ↓
Back to My Places → Site appears in list
```

### Editing Existing Site
```dart
// Pass existing site to constructor
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => HostCreateSiteScreen(
      siteToEdit: existingSite,
    ),
  ),
);
```

## API Endpoints Used

### 1. Create Place
```
POST /places
Body: { address, description, price_per_night, max_vehicle_length, website_url, business_name, selected_facilities }
Response: { id, status, created_at }
```

### 2. Upload Photos
```
POST /upload/place/{placeId}
Files: Multipart form data with photo files
Response: { uploadedImages: [{ url, filename, compressionPercent }] }
```

### 3. Update Place
```
PUT /places/{placeId}
Body: Same as create
Response: Updated place object
```

## Integration Steps

### Step 1: Verify Dependencies
```yaml
# In pubspec.yaml - should already have:
dependencies:
  image_picker: ^1.0.4
  shared_preferences: ^2.2.0
  http: ^1.1.0
```

### Step 2: Update Base URL for Production
```dart
// File: lib/services/place_service.dart, line 6
// Change from localhost:3001 to your production URL
static const String baseUrl = 'http://localhost:3001';
// →
static const String baseUrl = 'https://api.properplace.com';
```

### Step 3: Test Empty State Navigation
1. Run app in iOS simulator
2. Navigate to Host dashboard
3. Click "My Places" tab
4. Empty state button should navigate to form
5. Form should render without errors

### Step 4: Test Photo Upload
1. Fill form with sample data
2. Upload a photo from device gallery
3. Photo should preview
4. More photos can be added
5. Photos can be removed with X button

### Step 5: Test Form Validation
1. Try submitting empty form → Error for address
2. Try submitting without photo → Error for main photo
3. Try entering price > £20 → Auto-caps to 20
4. Try submitting with valid data → Creates place

### Step 6: Test Draft Saving
1. Fill out some form fields
2. Click "Save Draft" → "Draft saved successfully" message
3. Close screen and return → "Draft loaded" message
4. Fields should be populated from draft

### Step 7: Test Full Submission
1. Complete entire form with photos
2. Click "Submit Site"
3. Should show loading state
4. Should upload all photos
5. Should return success message
6. Should navigate back to My Places
7. Verify submitted site appears

## Configuration

### Update Facilities List
```dart
// File: host_create_site_screen.dart, line ~40
final List<String> facilities = [
  'WiFi',
  'Electricity Hookup',
  // Add more as needed
];
```

### Adjust Photo Limits
```dart
// Supporting photos: Currently 5 max
if (supportingPhotos.length < 5) { ... }

// Business photos: Currently 3 max
if (businessPhotos.length < 3) { ... }
```

### Change Price Cap
```dart
// File: host_create_site_screen.dart
if (price > 20) { // ← Change this number
  priceController.text = '20';
}
```

## Debugging

### Enable Detailed Logging
All services have `print()` statements. Check logs in terminal for:
- Storage operations
- API calls
- Image picker events
- Upload progress

### Common Issues

**Issue**: Photos not saving to draft
- Check SharedPreferences initialization
- Verify storage_service is properly imported

**Issue**: Upload fails with 401
- Check Bearer token is valid
- Verify user is authenticated
- Check token expiration

**Issue**: Price field accepting >£20
- Ensure update logic is applied before submission
- Check `onChanged` callback is wired correctly

**Issue**: Photos not uploading to backend
- Verify `/upload/place/{placeId}` endpoint exists
- Check multipart form data is formatted correctly
- Check multer middleware is configured

## Performance Considerations

### Image Optimization
- Photos compressed via Sharp on backend (WebP, 80% quality)
- Typical 2-4MB photos → 500KB-1MB after compression
- All processing happens server-side (no delay on app)

### Storage
- Local draft data: ~10KB per form
- Shared preferences handles cleanup automatically
- No cleanup needed unless desired

### Network
- Photos uploaded after place is created
- If photo upload fails, place still created successfully
- Could improve with retry logic (future enhancement)

## Next Steps

1. **Run Pub Get**
   ```bash
   cd proper_place
   flutter pub get
   ```

2. **Start Backend**
   ```bash
   cd backend
   npm start
   ```

3. **Hot Reload in Simulator**
   ```bash
   flutter run
   ```

4. **Test the Complete Flow**
   - Navigate to My Places
   - Create a new site
   - Upload photos
   - Submit and verify

## Support

For issues or enhancements:
1. Check terminal logs for detailed errors
2. Verify all dependencies are installed
3. Ensure backend is running on correct port
4. Check auth token is valid
5. Review this guide's debugging section

---

**Status**: ✅ Ready for testing and integration
**Estimated Testing Time**: 15-20 minutes
**Production Ready**: Yes (pending environment configuration)
