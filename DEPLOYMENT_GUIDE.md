# Deployment Guide: Proper Place App

Complete guide to deploy the Proper Place Flutter app + backend for production use.

## 📋 Prerequisites

- GitHub account (for storing code)
- Railway.app account (free tier available) OR Render.com account
- Flutter SDK installed locally
- PostgreSQL database (Railway provides this)

## 🚀 Step 1: Deploy Backend to Railway

### 1.1 Prepare Backend for Deployment

```bash
# In proper_place_backend directory
git init
git add .
git commit -m "Initial backend setup"
git remote add origin https://github.com/YOUR_USERNAME/proper-place-backend
git push -u origin main
```

### 1.2 Create Railway Project

1. Go to https://railway.app
2. Click "Create New Project"
3. Select "Deploy from GitHub"
4. Connect your GitHub account
5. Select `proper-place-backend` repository
6. Choose `Node.js` environment (if prompted)

### 1.3 Add PostgreSQL Database

1. In Railway dashboard, click "Add Service"
2. Select "PostgreSQL"
3. This automatically creates a Postgres instance

### 1.4 Configure Environment Variables

In Railway dashboard, go to **Variables** and set:

```
NODE_ENV=production
JWT_SECRET=your-very-secure-random-string-here-min-32-chars
CORS_ORIGIN=https://your-app-domain.com
RATE_LIMIT_MAX_REQUESTS=1000
```

Railway automatically provides:
- `DATABASE_URL` (connection string)

### 1.5 Get Your Backend URL

1. In Railway, click on your Node service
2. Find the **Public Domain** (e.g., `proper-place-backend-prod.up.railway.app`)
3. Copy this URL - you'll need it for the Flutter app

## 📱 Step 2: Configure Flutter App

### 2.1 Update AppConfig

Edit `lib/config/app_config.dart`:

```dart
class AppConfig {
  static const String base44AppId = String.fromEnvironment(
    'BASE44_APP_ID',
    defaultValue: 'proper-place-prod',
  );

  static const String base44BackendUrl = String.fromEnvironment(
    'BASE44_BACKEND_URL',
    defaultValue: 'https://proper-place-backend-prod.up.railway.app', // Your Railway URL
  );

  static void printConfig() {
    print('=== App Config ===');
    print('App ID: $base44AppId');
    print('Backend URL: $base44BackendUrl');
  }
}
```

### 2.2 Build Release APK (Android)

```bash
cd proper_place
flutter clean
flutter pub get
flutter build apk --release
```

Output: `build/app/outputs/flutter-app.apk`

### 2.3 Build Release iOS (macOS only)

```bash
flutter build ios --release
```

### 2.4 Build for Web

```bash
flutter build web --release
```

## ☁️ Step 3: Deploy Frontend

### Option A: Firebase Hosting (Recommended for Web)

```bash
npm install -g firebase-tools
firebase login
firebase init
firebase deploy
```

### Option B: Deploy to App Stores

**Android (Google Play Store):**
- Create Google Play Developer account ($25 one-time)
- Build signed APK
- Submit for review

**iOS (Apple App Store):**
- Create Apple Developer account ($99/year)
- Build signed IPA
- Submit for review

## 🔄 Step 4: Verify Everything Works

### 4.1 Test Backend API

```bash
# Get your Railway backend URL
BACKEND_URL="https://your-railway-url.up.railway.app"

# Test signup
curl -X POST $BACKEND_URL/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "password": "TestPassword123",
    "confirmPassword": "TestPassword123"
  }'

# Test login
curl -X POST $BACKEND_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

### 4.2 Test Flutter App

1. Update backend URL in `AppConfig`
2. Run app: `flutter run`
3. Test sign up flow
4. Test login flow
5. Verify data saved correctly

## 🔒 Security Checklist

- [ ] JWT_SECRET is strong (32+ random characters)
- [ ] CORS_ORIGIN matches your app domain
- [ ] Database backups are enabled (Railway auto-backups)
- [ ] HTTPS enforced on all endpoints
- [ ] Rate limiting enabled
- [ ] No API keys in code (use environment variables)
- [ ] Password hashing enabled (bcryptjs - already done)
- [ ] SQL injection protection (pg prepared statements - already done)

## 📊 Monitoring & Logs

### Railway Logs

1. Go to Railway dashboard
2. Click your Node service
3. View real-time logs
4. Check for errors

### PostgreSQL Monitoring

1. Go to Railway Postgres service
2. View connection stats
3. Monitor query performance

## 🆘 Troubleshooting

### Backend won't start
```
Check logs in Railway dashboard
Verify DATABASE_URL is set
Ensure migrations ran successfully
```

### App can't connect to backend
```
Verify backend URL in AppConfig
Check CORS settings
Ensure backend is running
Test with curl command above
```

### Database errors
```
Connect to Railway Postgres
Check if users table exists
Run migrations manually if needed
```

### JWT token invalid
```
Verify JWT_SECRET is consistent
Check token expiry time
Ensure token stored correctly in Flutter
```

## 📈 Scaling for 1000s of Users

Your backend is ready to scale! Railway handles:

✅ Automatic horizontal scaling
✅ Load balancing
✅ Database replication
✅ Automatic backups
✅ 99.9% uptime SLA

To scale further:
1. Monitor CPU/memory in Railway dashboard
2. Upgrade plan if needed
3. Add caching (Redis)
4. Implement CDN for static assets

## 📞 Support Resources

- Railway: https://docs.railway.app
- Flutter: https://flutter.dev/docs
- PostgreSQL: https://www.postgresql.org/docs
- Node.js: https://nodejs.org/docs

## 🎉 You're Live!

Your Proper Place app is now running on production infrastructure ready for thousands of users!

Share your backend URL with your Flutter developers:
```
Backend: https://your-railway-url.up.railway.app
```

Happy deploying! 🚀
