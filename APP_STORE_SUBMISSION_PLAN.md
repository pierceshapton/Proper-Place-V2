# App Store Submission Action Plan

**Status**: Ready for Build & Submission  
**Updated**: April 20, 2026  
**Next Task**: Build TestFlight Release for iOS

---

## ✅ COMPLETED ITEMS

- [x] App configured and tested on simulator
- [x] Screenshots captured (6.7" & 6.5" formats) 
- [x] Backend API deployed and operational
- [x] Stripe payments configured (test mode)
- [x] Database ready (PostgreSQL on DigitalOcean)
- [x] App store content prepared (see APP_STORE_LISTING.md)
- [x] Android AAB built and signed (61MB)

---

## ⏳ PENDING ITEMS - iOS (Apple App Store)

### 1. Set Up App Store Connect (ASC)
**Timeline**: ~15-30 mins  
**Steps**:
1. Go to https://appstoreconnect.apple.com
2. Log in with Apple ID (pierce.shapton@gmail.com)
3. Create new app:
   - Name: "Proper Place"
   - Bundle ID: `com.properplacev2.ios`
   - SKU: `properplace-2026-v1`
   - Platform: iOS
4. Fill in app information:
   - Category: Travel
   - Subcategory: Travel

### 2. Build TestFlight Release
**Timeline**: ~20-30 mins  
**Steps**:
```bash
cd /Users/pierceshaptonproperplace/Proper-Place-V2/proper_place

# Clean build
flutter clean

# Build iOS app
flutter build ios --release

# Archive with Xcode (automated)
cd ios
xcodebuild -workspace Runner.xcworkspace \
  -scheme Runner \
  -configuration Release \
  -derivedDataPath build \
  -allowProvisioningUpdates \
  archive -archivePath build/Runner.xcarchive

# Export IPA
xcodebuild -exportArchive \
  -archivePath build/Runner.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath build/ipa
```

### 3. Upload to TestFlight
**Timeline**: ~5-10 mins  
**Steps**:
1. In Xcode or App Store Connect:
   - Upload the .ipa file
   - Wait for processing (~15 min)
2. Configure TestFlight:
   - Add internal testers (your email)
   - Add external testers if needed
   - Write test notes

### 4. Complete App Store Listing
**Timeline**: ~30-45 mins  
**In App Store Connect**:
- [ ] App preview and screenshots (upload 6.7" and 6.5")
- [ ] App description (use APP_STORE_LISTING.md)
- [ ] Keywords (use provided list)
- [ ] Support URL: https://proper-place.co.uk/support
- [ ] Privacy Policy: https://proper-place.co.uk/privacy
- [ ] Keywords & categorization
- [ ] Rating questionnaire
- [ ] Version release notes

### 5. Submit for Review
**Timeline**: ~5 mins  
**Steps**:
1. Review all information one final time
2. Click "Submit for Review"
3. Apple review typically takes 24-48 hours
4. You'll receive email when approved or rejected

**Note**: First iOS app review may take up to 48 hours

---

## ⏳ PENDING ITEMS - Android (Google Play Store)

### 1. Complete Google Play Verification
**Status**: PENDING (waiting for Google)  
**Timeline**: 24-72 hours  
**Action**: Check email for verification link

### 2. Create App in Google Play Console
**Timeline**: ~15-20 mins (after verification)  
**Steps**:
1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in:
   - App name: "Proper Place"
   - Default language: English
   - App category: Travel
   - Appropriate for all ages: Yes

### 3. Upload Android Build
**Timeline**: ~10-15 mins  
**Steps**:
1. Navigate to Internal Testing track
2. Upload AAB file: `proper_place/build/app/outputs/bundle/release/app-release.aab`
3. Wait for validation (~5 mins)
4. Configure internal testers:
   - Add email addresses
   - Share tester link
5. After testing → Move to Closed Testing → Open Testing

### 4. Complete Play Store Listing
**Timeline**: ~45-60 mins  
**In Google Play Console**:
- [ ] App title & subtitle
- [ ] Short description: Use from APP_STORE_LISTING.md
- [ ] Full description: Use from APP_STORE_LISTING.md
- [ ] Screenshots (upload 5-8 in 1080x1920 format)
- [ ] Feature graphic (1024x500)
- [ ] Icon (512x512)
- [ ] Category: Travel & Local
- [ ] Contact details
- [ ] Privacy policy
- [ ] Content rating (Age rating questionnaire)
- [ ] Target audience

### 5. Final Checks Before Launch
**Timeline**: ~20 mins  
**Must complete**:
- [ ] App icon uploaded
- [ ] Feature graphics uploaded
- [ ] Screenshots uploaded
- [ ] Store listing complete
- [ ] Privacy policy reviewed
- [ ] Content rating questionnaire completed
- [ ] Country availability set
- [ ] Pricing set (Free)
- [ ] In-app purchases configured (if any)

### 6. Submit for Review
**Timeline**: ~5 mins  
**Steps**:
1. Go to Release management → Production
2. Review all content
3. Click "Create new release"
4. Select build (AAB)
5. Add release notes
6. Submit for review
**Timeline**: Typically 2-3 hours for Google Play approval (faster than Apple)

---

## Build Commands Reference

### iOS Build & Archive
```bash
cd proper_place

# Clean
flutter clean

# Get dependencies
flutter pub get

# Build release
flutter build ios --release

# Build and upload to TestFlight (using Xcode)
cd ios
xcodebuild -workspace Runner.xcworkspace \
  -scheme Runner \
  -configuration Release \
  -derivedDataPath build \
  -archivePath build/Runner.xcarchive \
  archive

xcodebuild -exportArchive \
  -archivePath build/Runner.xcarchive \
  -exportOptionsPlist ../ExportOptions.plist \
  -exportPath build/ipa
```

### Android Build (Already Done ✓)
```bash
cd proper_place

# Build AAB (app bundle)
flutter build appbundle --release

# Output location:
# proper_place/build/app/outputs/bundle/release/app-release.aab
```

---

## App Credentials & Test Accounts

### iOS
- **Bundle ID**: `com.properplacev2.ios`
- **Team ID**: (Link from Apple Developer account)
- **Provisioning Profile**: iOS Team Provisioning Profile (auto)

### Android  
- **App ID**: `com.properplace.app`
- **Keystore**: `proper_place/android/app/upload-keystore.jks`
- **Keystore Password**: Albacore1!
- **Key Alias**: upload
- **Key Password**: Albacore1!

### Test Account
- **Email**: pierce.shapton@gmail.com
- **Password**: Albacore1!
- **For testing**: Use on TestFlight (iOS) & Internal Testing (Android)

---

## Timeline Summary

| Step | Platform | Timeline |
|------|----------|----------|
| Build TestFlight Release | iOS | 20-30 min |
| Upload to TestFlight | iOS | 5-10 min |
| Internal Testing | iOS | 1+ hours |
| Complete ASC Listing | iOS | 30-45 min |
| Submit for Review | iOS | 5 min |
| Apple Review | iOS | 24-48 hours |
| Google Verification | Android | ⏳ Pending |
| Upload to Play Console | Android | 10-15 min |
| Complete Play Listing | Android | 45-60 min |
| Submit for Review | Android | 5 min |
| Google Review | Android | 2-3 hours |
| **Total Timeline** | **Both** | **2-4 days** |

---

## Important Notes

⚠️ **iOS**:
- TestFlight internal testing can start immediately
- External testing requires Apple review of invite
- First app review may be longer (48+ hours)

⚠️ **Android**:
- Waiting for Google verification (check email)
- Once verified, can proceed with Play Console setup
- Google Play typically faster (~2-3 hours)

✅ **Both**:
- Update backend API URL in apps before production build
- Currently using: https://octopus-app-lxh2t.ondigitalocean.app
- Verify all links in descriptions are correct
- Test payment flow before submission

---

## Rollback / Troubleshooting

**If build fails**:
```bash
# Clean everything
flutter clean
rm -rf ios/Pods ios/Podfile.lock
flutter pub get

# Try again
flutter build ios --release
```

**If upload fails**:
- Check Apple ID permissions
- Verify certificate/provisioning profile
- Try uploading to TestFlight via Xcode (more reliable)

**If review rejected**:
- Read feedback carefully
- Make corrections (usually app stability or privacy issues)
- Resubmit (takes 1-2 hours for next review)

---

## Next Steps

→ **Immediate** (Today): Build TestFlight release  
→ **Next 2 hours**: Upload to TestFlight & configure listing  
→ **Next 24 hours**: Complete ASC listing & submit for review  
→ **Parallelize**: Start Android setup (after Google verification)  
→ **Once Android verified**: Apply same process to Play Store
