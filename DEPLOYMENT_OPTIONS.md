# 🚀 Proper Place Backend - Deployment Guide

Your backend needs to run 24/7 online. Here are your options:

## 📊 Choose Your Deployment Option

### Option 1: Railway (RECOMMENDED - Easiest) ⭐

**~5 minutes to deploy | Free | Zero cold starts**

Best for: Quick deployment, testing, small/medium apps

✅ **Pros:**
- Simplest setup (connect GitHub, done)
- No cold starts (instant API responses)
- PostgreSQL included & free
- Automatic HTTPS & domain
- $5/month free credits (plenty for development)
- Auto-deploy on push to GitHub

❌ **Cons:**
- Premium features cost money
- Limited to 512MB RAM on free tier

📖 **Setup Guide:** [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)

**Quick Start:**
```bash
# 1. Go to https://railway.app
# 2. Sign up with GitHub
# 3. Create new project
# 4. Select your GitHub repo
# 5. Add PostgreSQL service
# 6. Set environment variables
# 7. Deploy!
```

---

### Option 2: Render (Alternative) ⭐

**~5 minutes to deploy | Free | 15-min cold starts**

Best for: Learning, testing, side projects

✅ **Pros:**
- Easy setup like Railway
- Generous free tier
- PostgreSQL free

❌ **Cons:**
- 15-minute cold starts (slow first request)
- Slower than Railway

**Quick Start:**
```bash
# 1. Go to https://render.com
# 2. Click "New" → "Web Service"
# 3. Connect GitHub
# 4. Deploy!
```

---

### Option 3: Fly.io (Advanced) ⭐

**~10 minutes | Free starter | No cold starts**

Best for: Developers wanting more control, global deployment

✅ **Pros:**
- No cold starts (instant)
- Global edge locations
- Docker-native
- Good free tier

❌ **Cons:**
- CLI-based (less visual)
- Requires some DevOps knowledge

**Quick Start:**
```bash
brew install flyctl
flyctl auth signup
cd backend
flyctl launch
# Follow prompts, answer 'yes' to PostgreSQL
```

---

### Option 4: AWS / DigitalOcean (Professional)

**30+ minutes | Paid | Full control**

Best for: Production apps, custom scaling, enterprise

✅ **Pros:**
- Ultimate flexibility
- Professional monitoring
- Custom configurations
- Scales to any size

❌ **Cons:**
- Complex setup
- Costs money (even small)
- Requires DevOps knowledge

**Not recommended for now** - Start with Railway, upgrade later if needed.

---

## 🎯 My Recommendation

### For Today: Use Railway

1. **Why?** Easiest, fastest, free
2. **How?** Follow [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) (5 min setup)
3. **Result:** Live 24/7 backend in ~3 minutes

### If You Want More Control: Use Fly.io

1. **Why?** Better performance, Docker-native
2. **How?** Install `flyctl`, run `flyctl launch`
3. **Result:** Live with no cold starts

### For Production Later: Migrate to AWS/DigitalOcean

1. **Why?** Better for scaling, custom needs
2. **When?** After you have real users
3. **How?** Services like Docker, Kubernetes

---

## 🔄 Deployment Checklist

Before deploying anywhere:

- [ ] `.env.production` configured with production secrets
- [ ] JWT_SECRET changed (strong & random)
- [ ] CORS_ORIGIN set to your app's domain
- [ ] DATABASE_URL or DB credentials ready
- [ ] Docker builds locally: `docker-compose build`
- [ ] Dockerfile is optimized
- [ ] Health check endpoint at `/health` works

**Check all?** You're ready to deploy!

---

## 🚀 Quick Start by Platform

### Railway (Recommended)

```bash
# 1. Visit https://railway.app
# 2. Sign in with GitHub
# 3. New Project → GitHub repo
# 4. Add PostgreSQL service
# 5. Set vars from .env.production
# 6. Deploy!
# 7. Copy your live URL
# 8. Update Flutter app: lib/config/app_config.dart
```

### Render

```bash
# 1. Visit https://render.com
# 2. New Web Service → GitHub
# 3. Build: npm install
# 4. Start: npm start
# 5. Add PostgreSQL database
# 6. Set environment variables
# 7. Deploy!
```

### Fly.io

```bash
brew install flyctl
flyctl auth signup
cd backend
flyctl launch
# Answer yes to PostgreSQL
# Set environment variables
# Deploy!
```

---

## 📝 After Deployment

### 1. Get Your Live Backend URL
- Railway: Blue "Public Domain" button
- Render: Copy from settings
- Fly.io: `flyctl info`

### 2. Update Your Flutter App

Edit `lib/config/app_config.dart`:

```dart
static const String base44BackendUrl = String.fromEnvironment(
  'BASE44_BACKEND_URL',
  defaultValue: 'https://your-live-backend-url.here',  // ← Change this!
);
```

Or use `.env` file:

```
BASE44_BACKEND_URL=https://your-live-backend-url.here
```

### 3. Rebuild & Test Flutter App

```bash
cd proper_place
flutter clean
flutter pub get
flutter run -d "00008130-00080989263A001C"  # Your iPhone
```

### 4. Verify Connection

Your app should:
- ✅ Load without connection errors
- ✅ Fetch places from API
- ✅ Login/signup work
- ✅ No "localhost" errors

---

## 📊 Monitoring Your Live Backend

### Railway Dashboard
- Logs in real-time
- Metrics (CPU, Memory, Response time)
- Deployment history
- Service status

### Terminal (if CLI installed)
```bash
# For Railway
railway logs

# For Fly.io
flyctl logs

# Generic health check (any platform)
curl https://your-backend-url/health
```

---

## 💰 Cost Summary

| Platform | Free | Notes |
|----------|------|-------|
| Railway | $5/month credits | Plenty for dev/small apps |
| Render | Free tier | 15-min cold starts on free |
| Fly.io | $3/month | No cold starts |
| AWS | Pay as you go | ~$1-10/month for tiny app |
| DigitalOcean | $5/month minimum | Cheapest paid option |

**Recommendation:** Start with Railway's free tier. Upgrade only if you exceed limits.

---

## 🔑 Environment Variables You Need

```
NODE_ENV=production              # Must be "production"
PORT=3001                        # Usually 3001
DATABASE_URL=...                # Auto-set by PostgreSQL service
JWT_SECRET=...                  # Strong random key, min 32 chars
JWT_REFRESH_SECRET=...          # Strong random key, min 32 chars
CORS_ORIGIN=https://yourdomain  # Your Flutter app domain
```

**Generate Strong Keys:**
```bash
# On macOS/Linux:
openssl rand -base64 32
```

---

## ✅ Verification Steps

After deploying, verify everything works:

```bash
# 1. Health check
curl https://your-backend-url/health
# Should return: {"status":"ok","timestamp":"..."}

# 2. Login endpoint exists
curl -X POST https://your-backend-url/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# 3. Places endpoint
curl https://your-backend-url/places

# 4. In Flutter app
# - Load app
# - Should connect without errors
# - Should fetch data from live backend
```

---

## 🆘 Troubleshooting

### "Build Failed" Error
1. Check you've added `node_modules` to `.gitignore`
2. Verify `package.json` is in backend folder
3. Check for syntax errors in code
4. Look at build logs in deployment dashboard

### "Database Connection Failed"
1. Ensure PostgreSQL service is added
2. Check DATABASE_URL is set
3. Verify DB credentials match
4. Try restarting the database

### "CORS Error" in Flutter App
1. Check CORS_ORIGIN variable is set
2. Match your app's domain exactly
3. Include `https://` not `http://`
4. Restart backend after changing

### "Port Not Working"
1. Cloud platforms assign their own port
2. Use the provided public URL
3. Don't force port 3001
4. Check health endpoint works

---

## 🎓 Learning Resources

- **Railway Docs:** https://docs.railway.app/
- **Render Docs:** https://render.com/docs/
- **Fly.io Docs:** https://fly.io/docs/
- **Docker Docs:** https://docs.docker.com/

---

## 🎯 Next Steps

1. **Choose platform** (I recommend Railway)
2. **Follow setup guide** for your platform
3. **Deploy backend** (~5-10 minutes)
4. **Get live URL** from dashboard
5. **Update Flutter app** with new URL
6. **Test connection** from app
7. **Celebrate!** 🎉 You have a 24/7 backend!

---

## 📋 Files in This Guide

- **RAILWAY_DEPLOY.md** - Step-by-step Railway setup (recommended)
- **.env.production** - Production environment template
- **docker-compose.yml** - Production-ready Docker config
- **Dockerfile** - Production-optimized app container

---

**Your backend will now be ALWAYS ONLINE, regardless of your Mac status!** 🚀
