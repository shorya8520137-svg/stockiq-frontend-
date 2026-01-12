# AWS Server Deployment Commands

## 🚨 Quick Fix for Merge Conflict

Run these commands on your AWS server to resolve the merge conflict and deploy the fixes:

```bash
# 1. Stash local changes to resolve conflict
git stash

# 2. Pull latest changes
git pull origin main

# 3. Stop existing server
pkill -f "node server.js"

# 4. Start new server with fixes
nohup node server.js > server.log 2>&1 &

# 5. Check if server started successfully
sleep 3
ps aux | grep "node server.js"

# 6. View server logs
tail -f server.log
```

## 🔍 Alternative: Use the Deployment Script

Or simply run the automated script:

```bash
# Make it executable
chmod +x aws-deployment-fix.sh

# Run the deployment script
./aws-deployment-fix.sh
```

## 🧪 Test After Deployment

```bash
# Test the backend status
node check-backend-status.js

# Test direct server access
curl http://localhost:5000/api/test

# Test login endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hunyhuny.com","password":"gfx998sd"}'
```

## 🔧 If Server Still Fails

If the server still doesn't start, check these:

```bash
# Check for syntax errors
node -c server.js

# Check database connection
node test-db-connection-simple.js

# Check minimal server
node test-server-minimal.js

# View detailed logs
cat server.log
```

## 🎯 Expected Results

After successful deployment:
- ✅ Server starts without crashes
- ✅ No more 502 Bad Gateway errors
- ✅ Login works with admin@hunyhuny.com / gfx998sd
- ✅ All API endpoints respond properly
- ✅ Frontend loads data correctly

## 🆘 Emergency Fallback

If all else fails, run the minimal server temporarily:

```bash
# Stop everything
pkill -f node

# Start minimal server (no database)
nohup node test-server-minimal.js > minimal-server.log 2>&1 &
```

This will at least get the server responding while we debug further issues.