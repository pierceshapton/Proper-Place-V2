# Quick Reference - Backend Server Management

## 🚀 Start Server (One-time)

```bash
cd backend
npm run start:pm2
```

That's it! Your server is now managed by PM2 and will:
- ✅ Auto-restart if it crashes
- ✅ Auto-restart if it uses too much memory
- ✅ Keep running even if you close the terminal
- ✅ Keep running automatically after your Mac restarts

## 📊 Check Status Anytime

```bash
npm run status
```

Shows:
- Is server running? ✅ online / ❌ errored
- Memory usage
- CPU usage
- Number of restarts

## 🔍 View Logs

```bash
npm run logs
```

See real-time logs of what your server is doing.

## 🔄 Restart Server

```bash
npm run restart
```

Gracefully restarts - closes current connections cleanly, then starts fresh.

## 🏥 Health Check

```bash
npm run health
```

Quick check - if you see `"status":"ok"`, server is healthy!

## 🛑 Stop Server (if needed)

```bash
npm run stop
```

## 📋 Common Scenarios

**Server crashed, how do I know?**
- Run `npm run status` - if it shows "online", it auto-restarted successfully!

**My app keeps losing connection**
- Run `npm run status` to check
- Run `npm run health` for quick health check
- Check logs: `npm run logs`

**Server crashes more than 10 times per hour**
- PM2 gives up (restart loop protection)
- Check logs: `npm run logs`
- Fix the issue, then: `npm run restart`

**I want server to start automatically when my Mac boots**
- Run: `npm run pm2:setup`
- That's it! It will auto-start next time

## 🔧 Advanced Commands

```bash
pm2 monit                    # Real-time monitoring dashboard
pm2 save                     # Save process list
pm2 logs error              # View only errors
pm2 delete all              # Stop everything (careful!)
```

## 📂 Log Files

Logs are automatically saved in:
- `backend/logs/out.log` - Normal output
- `backend/logs/error.log` - Errors only

View error log:
```bash
npm run logs:error
```

## 🐳 Production Deployment (Docker)

For production, use Docker instead:

```bash
docker-compose up -d
```

This is more reliable for server environments.

## ⚠️ Troubleshooting

**"Port 3001 already in use"**
```bash
lsof -i :3001
# Kill the process: kill -9 <PID>
npm run start:pm2
```

**"PM2 not found"**
```bash
npm install -g pm2
npm run start:pm2
```

**Server won't start**
1. Check logs: `npm run logs`
2. Check dependencies: `npm install`
3. Check .env file exists in backend/

## 🎯 Bottom Line

- **Development**: Use `npm run start:pm2`
- **Production**: Use Docker
- **Keep running**: PM2 handles restarts automatically
- **Your app**: Will always have a working backend!
