# API & Testing Guide - Proper Place

Comprehensive testing strategy for all phases of development. This ensures **every feature is tested before deployment**.

## 🎯 Testing Strategy

```
New Feature Development Workflow:
1. Write backend endpoint
2. Test with Postman ← Manual API testing
3. Unit tests pass ← Backend logic verification
4. Flutter API tests pass ← Flutter integration test
5. Manual Flutter app test ← End-to-end validation
6. Merge to main
7. Deploy
```

---

## 📦 Phase 1: Authentication (Current)

### ✅ Tests Included

**Postman Collection** - `Postman_Collection.json`
- ✅ Health check
- ✅ Sign up (valid)
- ✅ Sign up (duplicate email)
- ✅ Sign up (invalid email)
- ✅ Sign up (weak password)
- ✅ Login (valid)
- ✅ Login (invalid password)
- ✅ Login (user not found)
- ✅ Get user info

**Backend Unit Tests** - `src/services/__tests__/auth.service.test.js`
- ✅ Password hashing
- ✅ Password verification
- ✅ JWT token generation
- ✅ JWT token verification
- ✅ User registration
- ✅ User login
- ✅ Get user

**Flutter Tests** - `test/services/api_service_test.dart`
- ✅ Login success flow
- ✅ Login error handling
- ✅ Signup success flow
- ✅ Signup error handling
- ✅ Exception properties

---

## 🚀 How to Run Tests

### 1. Backend Unit Tests

**Setup:**
```bash
cd proper_place_backend
npm install --save-dev jest @babel/preset-env babel-jest
```

**Update package.json:**
```json
{
  "scripts": {
    "test": "jest --coverage",
    "test:watch": "jest --watch"
  }
}
```

**Run tests:**
```bash
npm test
```

**Expected output:**
```
PASS  src/services/__tests__/auth.service.test.js
  AuthService Tests
    Password Hashing
      ✓ should hash password with bcryptjs
      ✓ should verify correct password
      ✓ should reject incorrect password
    JWT Token Generation
      ✓ should generate valid JWT token
      ✓ should verify valid token
      ✓ should reject invalid token
    Registration
      ✓ should throw error if email already exists
      ✓ should create new user with hashed password
    Login
      ✓ should throw error if user not found
      ✓ should throw error if password incorrect
      ✓ should return token on successful login
    Get User
      ✓ should return user if found
      ✓ should return null if user not found

Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
```

---

### 2. Postman API Tests

**Setup:**
1. Download Postman: https://www.postman.com/downloads/
2. Import collection: `File → Import → Postman_Collection.json`
3. Set variables:
   - `base_url`: `http://localhost:3001`

**Before running tests:**
```bash
# Start backend
cd proper_place_backend
npm run dev

# In another terminal, seed test data
node src/scripts/seed-test-data.js
```

**Run collection:**
1. Open Postman collection
2. Click "Run" button
3. Select all tests
4. Click "Run Proper Place API Tests"

**Expected output:**
```
✓ Health Check (1/1 passed)
✓ Sign Up - Valid (1/1 passed)
✓ Sign Up - Duplicate Email (1/1 passed)
✓ Sign Up - Invalid Email (1/1 passed)
✓ Sign Up - Password Too Short (1/1 passed)
✓ Login - Valid Credentials (1/1 passed)
✓ Login - Invalid Password (1/1 passed)
✓ Login - User Not Found (1/1 passed)
✓ Get User Info (1/1 passed)

All tests passed! (9/9)
```

---

### 3. Flutter Tests

**Setup:**
```bash
cd proper_place
flutter pub add dev:mockito
```

**Run tests:**
```bash
flutter test test/services/api_service_test.dart
```

**Expected output:**
```
00:00 +8: ApiService Tests Login should return user data on successful login
00:01 +9: ApiService Tests Login should throw ApiException on invalid credentials
00:01 +10: ApiService Tests Signup should create user with valid input
00:01 +11: ApiService Tests Signup should reject duplicate email
00:01 +12: ApiService Tests Signup should reject weak password
00:01 +13: ApiService Tests Error Handling ApiException should have correct properties
00:01 +14: ApiService Tests Error Handling Should detect network errors
00:01 +15: ApiService Tests Error Handling Should detect authorization errors
00:01 +16: ApiService Tests Error Handling Should detect conflict errors

All tests passed! (8/8)
```

---

### 4. Manual End-to-End Test

**Setup backend:**
```bash
cd proper_place_backend
npm run dev
```

**Seed test users:**
```bash
# In another terminal
node src/scripts/seed-test-data.js
```

**Test in Flutter app:**
```bash
flutter run
```

**Manual test flow:**

```
✓ Open app → Welcome screen
✓ Click "Sign Up"
✓ Fill in: 
  - Name: "Test User"
  - Email: "test@example.com"
  - Password: "TestPassword123"
✓ Click "Sign Up" → Should see dashboard
✓ Go to "More" → Click "Logout"
✓ Should return to Welcome
✓ Click "Log In"
✓ Use credentials from seeded test user
✓ Should see dashboard
✓ Verify user email shows correctly
```

---

## 🔄 Test Data Management

### Seeded Test Users

Run this to create test users:
```bash
node src/scripts/seed-test-data.js
```

**Created users:**
| Email | Password | Role |
|-------|----------|------|
| normaluser@test.com | TestPassword123 | normal_user |
| hostuser@test.com | TestPassword123 | host |
| admin@test.com | TestPassword123 | admin |
| john.doe@test.com | TestPassword123 | normal_user |
| jane.smith@test.com | TestPassword123 | host |

---

## 📋 Testing Checklist - Before Each Deployment

### Backend Tests
- [ ] `npm test` - All unit tests pass
- [ ] `npm run dev` - Server starts without errors
- [ ] Database connection logs show ✅

### API Tests
- [ ] Postman collection runs with 0 failures
- [ ] Health check returns 200
- [ ] All auth endpoints return correct status codes
- [ ] Error messages are meaningful

### Flutter Tests
- [ ] `flutter test` - All tests pass
- [ ] `flutter run` - App starts
- [ ] Sign up works end-to-end
- [ ] Login works end-to-end
- [ ] Logout works
- [ ] Tokens stored/retrieved correctly

### Manual Testing
- [ ] Create new account
- [ ] Login with new account
- [ ] Logout and login again
- [ ] Test with seeded test users
- [ ] Verify error messages appear correctly

---

## 🚀 Phase 2+ Testing

When adding new features (host mode, bookings, etc.):

**1. Add backend endpoint** → `src/routes/*.routes.js`
**2. Write unit tests** → `src/services/__tests__/*`
**3. Add Postman tests** → `Postman_Collection.json`
**4. Update Flutter API service** → `lib/services/api_service.dart`
**5. Write Flutter tests** → `test/services/*_test.dart`
**6. Add to seeded test data** → `src/scripts/seed-test-data.js`
**7. Manual testing** → `flutter run`
**8. Deploy only after ✅ all tests pass**

---

## 📊 Coverage Goals

| Phase | Backend Coverage | Flutter Coverage | Manual Tests |
|-------|------------------|------------------|--------------|
| Auth (Phase 1) | 90%+ | 85%+ | 100% |
| Bookings (Phase 2) | 90%+ | 85%+ | 100% |
| Payments (Phase 3) | 95%+ | 90%+ | 100% |

---

## 🔧 Troubleshooting Tests

### Postman tests fail
```
✓ Check backend is running: curl http://localhost:3001/health
✓ Check base_url variable is set
✓ Check database is populated: npm run migrate
✓ Try seeding test data: node src/scripts/seed-test-data.js
```

### Unit tests fail
```
✓ Ensure all dependencies installed: npm install
✓ Check bcryptjs works: npm test -- --verbose
✓ Check database mocks: jest --detectOpenHandles
```

### Flutter tests fail
```
✓ Clear pub cache: flutter pub cache clean
✓ Reinstall dependencies: flutter pub get
✓ Run with verbose: flutter test -v
```

---

## ✅ Confidence Metrics

Before deploying to production, verify:

```
✓ Unit test coverage: 90%+
✓ API tests passing: 100%
✓ Flutter tests passing: 100%
✓ Manual testing: 100%
✓ No console errors: true
✓ No database errors: true
✓ Response times < 1s: true
✓ All error cases handled: true
```

---

## 📖 Documentation

- **Backend API**: `README.md`
- **Deployment**: `DEPLOYMENT_GUIDE.md`
- **Setup**: `BACKEND_SETUP.md`
- **This guide**: `API_TESTING_GUIDE.md`

---

## 🎯 Next Steps

1. ✅ Run backend unit tests: `npm test`
2. ✅ Import Postman collection
3. ✅ Run Postman tests
4. ✅ Run Flutter tests: `flutter test`
5. ✅ Manual end-to-end test: `flutter run`
6. ✅ Verify all ✅ before proceeding to Phase 2

You're ready! 🚀
