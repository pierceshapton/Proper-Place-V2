# Deploy Backend to Cloud (24/7 Online)

Your Mac cannot be a 24/7 server. Here are the best options:

## Quick Comparison

| Platform | Cost | Ease | Docker | Cold Starts |
|----------|------|------|--------|-------------|
| **Railway** ⭐ | Free starter | Very Easy | ✅ | None |
| **Render** ⭐ | Free tier | Very Easy | ✅ | ~30s |
| **Fly.io** | Free starter | Medium | ✅ | None |
| **Heroku** | Paid only | Easy | ✅ | None |
| **AWS** | Pay as you go | Complex | ✅ | None |
| **DigitalOcean** | $5+/month | Medium | ✅ | None |

## Recommended: Railway (Easiest)

### Why Railway?
- ✅ **Completely free starter plan** with good limits
- ✅ **Instant deployments** from GitHub
- ✅ **Zero cold starts** (unlike Render)
- ✅ **Docker support** (your code ready to go)
- ✅ **PostgreSQL included** (free)
- ✅ **Always online** even if your Mac is off
- ✅ **Simple dashboard** to monitor server

### Step-by-Step Setup

#### 1. Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub (easiest)
3. Authorize Railway to access GitHub

#### 2. Create New Project
1. Click "Create New Project"
2. Select "Deploy from GitHub repo"
3. Select your `proper-place` repository
4. Choose the `backend` folder (or repo root)

#### 3. Configure Environment Variables
In Railway Dashboard:
1. Go to Variables tab
2. Add these variables from your `.env`:
```
NODE_ENV=production
PORT=3001
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=https://your-frontend-domain.com
DB_HOST=postgres
DB_PORT=5432
DB_USER=proper_user
DB_PASSWORD=your-secure-password
DB_NAME=proper_place
```

#### 4. Add PostgreSQL Database
1. Click "Add Service"
2. Select "PostgreSQL"
3. Railway automatically sets `DATABASE_URL`
4. Your app connects automatically

#### 5. Deploy!
1. Select deployment branch (usually `main`)
2. Click "Deploy"
3. Wait ~2-3 minutes for build
4. Your backend is **LIVE** at generated URL

#### 6. Get Your Live Backend URL
In Railway Dashboard:
1. Click your backend service
2. Copy the "Public Domain" URL
3. This is your permanent 24/7 backend URL

### Update Your Flutter App

Update your backend URL in the app:

**In `lib/config/app_config.dart`:**
```dart
static const String base44BackendUrl = String.fromEnvironment(
  'BASE44_BACKEND_URL',
  defaultValue: 'https://your-railway-domain.up.railway.app',  // Update this!
);
```

Or via .env file:
```
BASE44_BACKEND_URL=https://your-railway-domain.up.railway.app
```

Then rebuild:
```bash
flutter clean && flutter pub get
flutter run
```

---

## Alternative: Render (Free Tier)

Similar to Railway but with 15-minute cold starts on free tier.

### Step-by-Step
1. Go to https://render.com
2. Click "New" → "Web Service"
3. Connect GitHub repository
4. Configure:
   - **Name**: proper-place-backend
   - **Runtime**: Node
   - **Build command**: `npm install`
   - **Start command**: `npm start`
   - **Environment**: Select "Free" (limited but free)

5. Add environment variables (same as Railway)
6. Create PostgreSQL database (free option available)
7. Deploy

---

## Alternative: Fly.io (Good for Docker)

Excellent for Docker deployments with global edge locations.

### Step-by-Step
1. Install Fly CLI: `brew install flyctl`
2. Sign up: `flyctl auth signup`
3. Create app: `flyctl launch` (in backend folder)
4. Follow prompts to deploy
5. Add PostgreSQL when prompted

Your backend runs globally with automatic restarts.

---

## What Gets You 24/7 Online?

| Requirement | Railway | Render | Fly.io | AWS |
|-------------|---------|--------|--------|-----|
| Always online | ✅ | ✅ | ✅ | ✅ |
| Auto restart | ✅ | ✅ | ✅ | ✅ |
| Free tier | ✅ Limited | ✅ Limited | ✅ Limited | ❌ |
| No cold starts | ✅ | ❌ 15min | ✅ | ✅ |
| PostgreSQL included | ✅ Free | ✅ Free | ❌ Extra | ❌ Extra |
| Easiest setup | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐ |

---

## After Deployment

### Test Your Backend
```bash
# Replace with your Railway/Render URL
curl https://your-backend-url.up.railway.app/health

# Should return:
# {"status":"ok","timestamp":"2026-02-11T10:00:00Z"}
```

### Update Frontend URL
Your Flutter app needs to know the new backend URL:

**Option 1: Update code**
- Edit `lib/config/app_config.dart`
- Change backend URL to your cloud domain
- Rebuild app

**Option 2: Use .env**
- Create `.env` file with new URL
- Flutter loads it automatically

### Monitor Your Backend
Each platform has a dashboard:
- **Railway**: Real-time logs, resource usage, deployments
- **Render**: Similar dashboard with logs and metrics
- **Fly.io**: CLI monitoring with `flyctl status`

---

## Troubleshooting Deployment

### "Build failed"
- Check logs in platform dashboard
- Ensure `package.json` is in backend folder
- Verify all dependencies listed

### "Database connection error"
- Confirm DATABASE_URL is set
- Check DB credentials match
- Run migrations manually if needed

### "Port 3001 not working"
- Platforms assign their own port
- Check .env for PORT variable
- Health check should still work at `/health`

---

## My Recommendation

1. **Today**: Use Railway (easiest, free)
2. **Later**: Move to AWS/DigitalOcean if you need more features
3. **Backend URL**: Save the generated URL
4. **Update App**: Point Flutter app to new URL
5. **Test**: Verify app still connects
6. **Done**: Your backend is 24/7!

---

## Free Tier Limits

**Railway**:
- $5/month free credits
- Enough for small-medium apps
- PostgreSQL included

**Render**:
- Free tier available
- 15-minute cold starts
- Good for testing

**Fly.io**:
- $3/month free
- No cold starts
- Generous limits

---

## Next Steps

1. Choose a platform (I recommend Railway)
2. Create account and connect GitHub
3. Deploy your backend
4. Get live URL
5. Update Flutter app with new URL
6. Test connection from app
7. Monitor dashboard occasionally

Your backend will now be **ALWAYS ONLINE** regardless of your Mac status! 🎉
