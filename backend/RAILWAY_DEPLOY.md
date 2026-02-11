# Quick Deploy to Railway (5 Minutes)

## Why Railway?
- ✅ Free ($5 starter credits)
- ✅ No cold starts (instant loading)
- ✅ PostgreSQL included & free
- ✅ One-click deployment from GitHub
- ✅ Automatic HTTPS
- ✅ Built-in monitoring

## Step 1: Create Railway Account

1. Go to https://railway.app
2. Click "Sign Up"
3. Choose "GitHub" (easiest)
4. Authorize Railway to access your GitHub account
5. Done! ✅

## Step 2: Deploy Your Backend

1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Find your `Proper-Place-V2` repository
4. Select it
5. Railway auto-detects your `backend` folder
6. Click **"Deploy"**
7. Wait 2-3 minutes while it builds...

## Step 3: Add PostgreSQL Database

1. In your Railway project, click **"+ Add Service"**
2. Select **"PostgreSQL"**
3. Railway automatically:
   - Creates a database
   - Sets DATABASE_URL environment variable
   - Configures connection

## Step 4: Set Environment Variables

In Railway dashboard for your backend service:

1. Click **"Variables"** tab
2. Copy values from your `.env` file:

```
NODE_ENV=production
JWT_SECRET=your-secret-key-here (use strong key!)
JWT_REFRESH_SECRET=your-refresh-key-here
CORS_ORIGIN=https://your-flutter-app-domain.com
```

**Important**: 
- Generate NEW secure keys for production (don't reuse development keys)
- DATABASE_URL is auto-set by PostgreSQL service
- Save variables

## Step 5: Get Your Live Backend URL

1. In Railway, click your backend service
2. Scroll down to **"Public Domain"**
3. Copy the URL (looks like: `https://proper-place-prod-xxx.up.railway.app`)
4. This is your 24/7 backend! 🎉

## Step 6: Update Your Flutter App

Now point your app to the live backend:

**Option A: Edit Code**

File: `lib/config/app_config.dart`

```dart
static const String base44BackendUrl = String.fromEnvironment(
  'BASE44_BACKEND_URL',
  defaultValue: 'https://your-railway-domain.up.railway.app',  // Change this!
);
```

**Option B: Use .env File**

File: `.env` (in root or `proper_place/` folder)

```
BASE44_BACKEND_URL=https://your-railway-domain.up.railway.app
```

Then rebuild:
```bash
cd proper_place
flutter clean
flutter pub get
flutter run
```

## Step 7: Test It Works

```bash
# Replace with your Railway URL
curl https://your-railway-domain.up.railway.app/health

# Should see:
# {"status":"ok","timestamp":"2026-02-11T..."}
```

Or in your Flutter app - it should connect without errors!

## Monitoring Your Backend

### In Railway Dashboard
- **Logs** tab: See what your server is doing
- **Metrics** tab: Memory, CPU, response times
- **Deployments** tab: View deployment history

### From Terminal
```bash
# Check health
curl https://your-railway-domain.up.railway.app/health

# View logs (if you have Railway CLI installed)
railway logs
```

## Update Backend Code

When you push new code to GitHub:

1. Railway automatically detects the push
2. Rebuilds your backend
3. Deploys new version (~2-3 minutes)
4. Zero downtime! (your live backend keeps running)

Just commit and push:
```bash
git add .
git commit -m "Update backend"
git push origin main
```

And Railway handles the rest!

## Cost Breakdown (Free!)

- **Compute**: $5/month free credit
- **PostgreSQL**: Free up to limit
- **Total**: FREE for development/small apps

If you exceed free tier:
- Railway bills monthly
- You can set spending limits
- Or upgrade anytime

## Troubleshooting

### "Build failed"
- Check Railway build logs
- Ensure `package.json` exists in backend folder
- Verify no syntax errors in code

### "Database connection error"
- Confirm PostgreSQL service is running
- Check that DATABASE_URL is set in variables
- Restart the service

### "Can't connect from Flutter app"
- Confirm your backend URL in app_config.dart
- Check CORS_ORIGIN includes your app domain
- Test with curl first

### "Server offline"
- Check Azure status: https://railway.app/status
- Restart service in Railway dashboard
- Check error logs

## What's Happening Now?

✅ Your backend is deployed to Railway  
✅ Running on their servers (not your Mac)  
✅ Always online 24/7/365  
✅ Auto-restarts on crash  
✅ Automatic updates when you push code  
✅ Database included and backed up  

## Summary

**Before** (Your Mac):
- ❌ Server only runs if Mac is on
- ❌ Manual restart if crashes
- ❌ Can't access from anywhere

**Now** (Railway Cloud):
- ✅ Server always online
- ✅ Auto-restart on crash
- ✅ HTTPS everywhere
- ✅ Free & monitored
- ✅ Scales automatically
- ✅ Professional 24/7 hosting

**Your backend is now production-ready!** 🚀

Need help? Check Railway docs: https://docs.railway.app/
