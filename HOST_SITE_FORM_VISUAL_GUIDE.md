# Host Site Upload Form - Visual Structure

## Form Layout Reference

```
┌─────────────────────────────────────────────────────────────┐
│  ← Add Your Site                                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  MAIN SITE PHOTO                                            │
│  This will be the main image shown to guests               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │           📸 Tap to upload photo                   │   │
│  │                                                     │   │
│  │  (or shows photo preview if selected)              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  SUPPORTING PHOTOS                                          │
│  Add additional photos of your site (max 5)               │
│                                                              │
│  [IMG1]  [IMG2]  [IMG3]  [+]                                │
│  [IMG4]  [IMG5]                                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  Site Address *                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Enter full address                                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Site Description *                                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Describe your site, location, amenities...          │  │
│  │                                                       │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Maximum Vehicle Length                                     │
│  ◄────●────────────────────────► 20ft                       │
│  1ft                           30ft                         │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Price Per Night (£) *                                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Available Facilities                                       │
│                                                              │
│  [WiFi]  [Electricity Hookup]  [Water Supply]              │
│  [Waste Disposal]  [Parking]  [Lighting]                    │
│  [Security]  [Restaurant/Pub]                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  BUSINESS INFORMATION                           [Container] │
│                                                              │
│  Business Trading Name                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                               │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Website Link                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Business Photos / Menu                                     │
│  Add menu or business photos (max 3)                       │
│                                                              │
│  [IMG1]  [IMG2]  [IMG3]  [+]                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  [Save Draft]              [Submit Site]                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Form Field Details

### Text Input Fields

#### Site Address
- **Type**: Multiline TextField (2 lines)
- **Required**: Yes (*)
- **Placeholder**: "Enter full address"
- **Validation**: Non-empty on submit
- **Example**: "SA3 1AE, Reynoldston, Swansea, Wales, United Kingdom"

#### Site Description
- **Type**: Multiline TextField (4 lines)
- **Required**: Yes (*)
- **Placeholder**: "Describe your site, location, amenities..."
- **Validation**: Non-empty on submit
- **Length**: Suggested 50-500 characters
- **Example**: "Beautiful coastal location with modern facilities, perfect for caravans and campervans. Well-maintained parking area with electricity and water hookups..."

#### Price Per Night
- **Type**: Number input
- **Required**: Yes (*)
- **Range**: 0 - £20 (hard capped)
- **Decimal**: Yes (supports £15.50, etc.)
- **Input Validation**: Auto-trims to 20 if user enters higher
- **Example**: "15.50"

#### Business Name
- **Type**: Text input (single line)
- **Required**: No
- **Placeholder**: "E.g., The Old Barn Pub"
- **Example**: "The Riverside Cafe"

#### Website / Contact Link
- **Type**: Text input (single line)
- **Required**: No
- **Placeholder**: "E.g., https://www.example.com"
- **Note**: Accepts any URL format (validation done by user)
- **Example**: "https://www.theoldpub.co.uk"

### Photo Upload Fields

#### Main Site Photo
- **Type**: Image picker + preview
- **Required**: Yes (for new sites)
- **Items**: 1 image
- **Display**: Full-width preview (160px height)
- **Actions**: Tap to add, X button to remove
- **Formats**: JPEG, PNG (backend converts to WebP)
- **Size Limit**: 5MB per file

#### Supporting Photos
- **Type**: Multi-image picker grid
- **Required**: No
- **Items**: Max 5 images
- **Display**: Horizontal wrap, 100x100px thumbnails
- **Actions**: Tap + to add, X to remove individual
- **Auto-suggest**: Max reached message if 5 images already selected

#### Business Photos / Menu
- **Type**: Multi-image picker grid (compact)
- **Required**: No
- **Items**: Max 3 images
- **Display**: Horizontal wrap, 100x100px thumbnails
- **Actions**: Tap + to add, X to remove
- **Use Case**: Restaurant menus, pub photos, shop images

### Slider Controls

#### Maximum Vehicle Length
- **Type**: Slider with labels
- **Range**: 1 - 30 feet
- **Default**: 20 feet
- **Display**: Real-time label showing current value ("20ft")
- **Increment**: 1 foot (29 divisions)
- **Interaction**: Smooth drag, immediate feedback

### Multi-Select (Facilities)

#### Facilities Chips
- **Type**: FilterChip buttons
- **Options**: 8 fixed options:
  1. WiFi
  2. Electricity Hookup
  3. Water Supply
  4. Waste Disposal
  5. Parking
  6. Lighting
  7. Security
  8. Restaurant/Pub
- **Selection**: Tap to toggle (multiple allowed)
- **Visual**: Non-selected = outlined, Selected = blue background + white text
- **Required**: Optional (none required)
- **Stored as**: List of selected names

---

## Form Submit Data Structure

When user submits, the following data is sent to backend:

```json
{
  "address": "SA3 1AE, Reynoldston, Swansea, Wales",
  "description": "Beautiful coastal location with modern facilities...",
  "price_per_night": 15.50,
  "max_vehicle_length": 25,
  "website_url": "https://www.example.com",
  "business_name": "The Old Barn Pub",
  "selected_facilities": ["WiFi", "Parking", "Electricity Hookup"],
  "photos": {
    "main": "[File object]",
    "supporting": "[File[], max 5]",
    "business": "[File[], max 3]"
  }
}
```

---

## Draft Data Structure

When user saves draft locally:

```json
{
  "address": "SA3 1AE, Reynoldston, Swansea, Wales",
  "description": "Beautiful coastal location...",
  "price_per_night": 15.50,
  "max_vehicle_length": 25,
  "website_url": "https://www.example.com",
  "business_name": "The Old Barn Pub",
  "selected_facilities": ["WiFi", "Parking", "Electricity Hookup"]
}
```

**Note**: Photos are NOT stored in draft (too large). User must re-select before submitting.

---

## Button States

### Save Draft Button
```
Default:     [Save Draft]       (OutlinedButton, blue)
Saving:      [Saving...]        (disabled)
After Save:  [Save Draft]       (normal, with snackbar confirmation)
```

### Submit Site Button
```
Default:     [Submit Site]      (ElevatedButton, blue background)
Submitting:  [Submitting...]    (disabled)
After OK:    ← Returns to My Places (auto-navigates)
After Error: [Submit Site]      (normal, with error snackbar)
```

---

## Validation Flow

```
User taps "Submit Site"
    ↓
Check Address filled? → NO → Show error "Please enter the site address"
Check Description filled? → NO → Show error "Please enter a site description"
Check Main Photo selected? → NO → Show error "Please upload a main photo"
Check Price valid? → NO → Show error "Please enter a valid price"
Check Price ≤ 20? → NO → Show error "Price cannot exceed £20"
    ↓
ALL VALID → Proceed to backend
```

---

## User Experience Flows

### Complete Happy Path (5-7 minutes)
```
1. Tap My Places tab (0:00)
2. See empty state (0:05)
3. Tap "Create Your First Site" button (0:10)
4. HostCreateSiteScreen loads (0:15)
5. Tap to add main photo (0:20)
6. Select photo from gallery (0:45)
7. Photo previews (0:50)
8. Enter address (1:05)
9. Enter description (1:45)
10. Adjust vehicle length slider (2:00)
11. Enter price £15.50 (2:05)
12. Select 3 facilities (2:15)
13. Enter business name (2:20)
14. Enter website (2:25)
15. Add 2 business photos (3:00)
16. Tap "Submit Site" (3:05)
17. Photos upload (3:30)
18. Success message (3:35)
19. Return to My Places (3:40)
20. Site appears in list (3:45)
```

### Draft Save Path
```
1. Fill form partially (address + description)
2. Tap "Save Draft"
3. See "Draft saved successfully"
4. Close app/screen
5. Return to My Places
6. Tap "Create Your First Site" again
7. Form loads with previous data pre-filled
8. Continue + complete
```

### Error Recovery
```
1. Try to submit without photo
2. See error "Please upload a main photo"
3. Tap "Cancel" on error snackbar
4. Tap to add photo section
5. Upload photo
6. Try submit again
7. Success
```

---

## Responsive Design Notes

### Phone Viewport (375px - 430px)
- Form fully scrollable
- All fields stack vertically
- Single column layout
- Buttons at bottom, sticky when scrolled
- Touch targets 48-56px minimum

### Tablet Viewport (600px+)
- Same single column (mobile-first design)
- Wider text inputs (better for landscape)
- Same form flow

### Landscape Mode
- Form scrolls horizontally if needed
- Buttons visible at bottom
- No layout breaking

---

## Color Scheme

```
Text Fields:
  Border: #E2E8F0 (light gray)
  Disabled: transparent
  Focus: Blue outline

Buttons:
  Primary (Submit): #3B82F6 (blue) on white
  Secondary (Draft): outline #3B82F6 on white
  Text: white on blue, blue on white

Facilities:
  Unselected: white background, gray border
  Selected: #3B82F6 background, white text

Containers:
  Business Info: #F0F4F8 background, light blue tint
  
Status Messages:
  Error: Red snackbar
  Success: Green snackbar
  Info: Gray snackbar
```

---

## Accessibility Notes

- All form fields have labels
- Required fields marked with *
- Error messages clear and actionable
- Touch targets > 48px
- Semantic widgets (TextField, Button, Slider)
- Consider adding alt text for photos (future)

---

**Last Updated**: February 2024
**Version**: 1.0 (Release Ready)
