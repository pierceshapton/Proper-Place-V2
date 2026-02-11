# 🚀 Deploy to DigitalOcean App Platform (30 minutes)

## Step 1: Create DigitalOcean Account

1. I opened https://cloud.digitalocean.com/ for you
2. Click **"Sign Up"**
3. Create account (use GitHub to sign up - fastest)
4. Authorize DigitalOcean to access your GitHub

## Step 2: Create New App

1. Click **"Apps"** in left sidebar
2. Click **"Create Apps"**
3. Select **"GitHub"**
4. Authorize DigitalOcean with GitHub
5. Select repository: **Proper-Place-V2**
6. Click **"Next"**

## Step 3: Configure Backend Service

1. DigitalOcean detects services - you'll see options
2. Look for Node.js detection in the `backend/` folder
3. If not detected automatically, configure manually:

   **Builder**: Dockerfile
   
   **Source Directory**: `backend`
   
   **Build Command**: (leave default or use)
   ```
   npm install
   ```
   
   **Run Command**:
   ```
   node src/server.js
   ```

4. Click **"Next"**

## Step 4: Add PostgreSQL Database

1. Click **"Create Resources"** or **"Add Database"**
2. Select **"PostgreSQL"**
3. Choose tier (dev is free $15/month or included in app credits)
4. DigitalOcean auto-sets DATABASE_URL
5. Click confirm

## Step 5: Set Environment Variables

Click **"Edit Plan"** or **"Environment"** tab:

```
NODE_ENV=production
PORT=8080
JWT_SECRET=generate-random-key-here
JWT_REFRESH_SECRET=generate-another-key-here
CORS_ORIGIN=https://your-app-domain.com
LOG_LEVEL=info
```

**Generate random keys** (in terminal):
```bash
openssl rand -base64 32
```

## Step 6: Configure App Name & Region

- **App Name**: proper-place-backend
- **Region**: Choose closest to your users (US East for North America)
- Click **"Next"**

## Step 7: Review & Deploy

1. Review all settings
2. Click **"Create Resources"**
3. DigitalOcean starts building (2-5 minutes)
4. Watch the build logs

## Step 8: Get Your Live URL

Once deployed:
1. Click your app name
2. Go to **"Components"** tab
3. Find your backend service
4. Copy the **Live App Domain** URL
5. This is your 24/7 backend! 🎉

URL looks like: `https://proper-place-backend-xxx.ondigitalocean.app`

## Step 9: Update Flutter App

Edit: `proper_place/lib/config/app_config.dart`

```dart
static const String base44BackendUrl = String.fromEnvironment(
  'BASE44_BACKEND_URL',
  defaultValue: 'https://proper-place-backend-xxx.ondigitalocean.app',  // Your URL
);
```

Then rebuild:
```bash
cd proper_place
flutter clean
flutter pub get
flutter run
```

## Step 10: Test It

```bash
# Replace with your DigitalOcean URL
curl https://proper-place-backend-xxx.ondigitalocean.app/health

# Should see: {"status":"ok","timestamp":"2026-02-11T..."}
```

✅ Done! Your backend is live 24/7!

---

## Troubleshooting

### "Build Failed"
- Check build logs in DigitalOcean dashboard
- Ensure `backend/package.json` exists
- Verify `backend/src/server.js` exists

### "Database Connection Error"
- Confirm PostgreSQL service added
- Check DATABASE_URL is set in environment
- Wait 30 seconds for DB to initialize

### "Can't connect from Flutter app"
- Verify backend URL in `app_config.dart`
- Check CORS_ORIGIN is correct
- Test with curl first

### "Port issues"
- DigitalOcean assigns port 8080 (not 3001)
- Update if needed in environment variables
- Code should use `process.env.PORT || 3001`

---

## Cost Breakdown

- **Base App**: $5-15/month (depends on tier)
- **PostgreSQL Database**: Included in app credits or $15/month
- **Total**: ~$15-20/month for thousands of users

Free credits often cover first 2-3 months!

---

## Monitor Your Backend

In DigitalOcean dashboard:
- **Logs** → See what's happening
- **Metrics** → CPU, Memory, Network
- **Uptime** → See availability
- **Alerts** → Get notified if down

---

## What's Happening Now?

✅ Backend running 24/7 on DigitalOcean (not your Mac)
✅ Auto-restarts if it crashes
✅ PostgreSQL database included
✅ HTTPS by default
✅ Professional hosting ($15-20/month)
✅ Scales to thousands of users easily
✅ Ready for production!

---

## Next Steps

1. Create DigitalOcean account (if needed)
2. Follow steps 1-7 above
3. Copy your live URL
4. Update Flutter app
5. Rebuild Flutter app
6. Test connection
7. Celebrate! 🎉

**Start now**: https://cloud.digitalocean.com/
