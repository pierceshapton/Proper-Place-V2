# 🚀 Fix Railway Build - Dashboard Configuration

Your GitHub authentication is preventing the push, but we don't need it! Railway's dashboard lets us configure everything.

## Step 1: Go to Railway Dashboard

1. Open: https://railway.app/dashboard
2. Click on your **Proper-Place-V2** project
3. Click on the **Backend** service

## Step 2: Configure Build Settings

In the backend service settings:

1. Click **"Settings"** tab
2. Scroll to **"Build"** section
3. Set these values:

   **Build Command:**
   ```
   cd backend && npm install
   ```

   **Start Command:**
   ```
   node src/server.js
   ```

   **Root Directory:** (if available)
   ```
   backend
   ```

4. Click **Save**

## Step 3: Set Environment Variables

Click **"Variables"** tab and add:

```
NODE_ENV=production
PORT=3001
JWT_SECRET=your-random-secure-key-32-chars-minimum
JWT_REFRESH_SECRET=your-random-secure-key-32-chars-minimum
CORS_ORIGIN=https://your-app-domain.com
LOG_LEVEL=info
```

**How to generate random keys:**
```bash
openssl rand -base64 32
```

## Step 4: Add PostgreSQL Service

1. In your project, click **"+ Add Service"**
2. Select **"PostgreSQL"**
3. Railway auto-adds **DATABASE_URL** environment variable
4. Done!

## Step 5: Redeploy

1. Click **"Deployments"** tab
2. Find your latest deployment
3. Click the **"3 dots"** menu
4. Select **"Redeploy"**
5. Wait 2-3 minutes...

## If It Still Fails

Check the **"Build Logs"** tab in Railway:
1. Click on the deployment
2. Scroll to **"Build Logs"**
3. Look for error messages
4. Common issues:
   - `npm install` fails → Missing dependency
   - `ENOENT: no such file` → Wrong path
   - `Port already in use` → Railway assigns its own port

## Getting Your Live URL

1. After successful deploy, click your **Backend** service
2. Scroll down to **"Public Domain"**
3. Copy the URL (looks like `https://proper-place-prod-xxx.up.railway.app`)
4. This is your 24/7 backend! 🎉

## Update Flutter App

Edit: `proper_place/lib/config/app_config.dart`

```dart
static const String base44BackendUrl = String.fromEnvironment(
  'BASE44_BACKEND_URL',
  defaultValue: 'https://YOUR-RAILWAY-URL-HERE.up.railway.app',
);
```

Then rebuild:
```bash
cd proper_place
flutter clean
flutter pub get
flutter run
```

## Test It Works

```bash
# Replace with your Railway URL
curl https://YOUR-RAILWAY-URL-HERE.up.railway.app/health

# Should see: {"status":"ok","timestamp":"2026-02-11T..."}
```

---

## Still Having Issues?

Check these in Railway dashboard:

1. **Build logs show errors?**
   - Check package.json syntax
   - Verify src/server.js exists
   - Check dependencies are listed

2. **PostgreSQL not connecting?**
   - Verify DATABASE_URL is set
   - Check DB service is running (should have green checkmark)

3. **Port issues?**
   - Let Railway assign the port
   - Check .env has `PORT=process.env.PORT || 3001`

4. **CORS errors in Flutter app?**
   - Set CORS_ORIGIN to exact app domain
   - Restart backend after changing

---

**Do this now:**

1. Go to Railway dashboard
2. Click your backend service
3. Go to Settings
4. Update Build/Start commands as above
5. Go to Variables
6. Add the environment variables
7. Click Deployments → Redeploy
8. Wait for it to finish
9. Copy your live URL
10. Update Flutter app
11. Test! ✅
