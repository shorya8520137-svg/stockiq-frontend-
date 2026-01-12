#!/bin/bash

echo "🚀 COMPLETE AWS SERVER FIX SCRIPT"
echo "=================================="

# Step 1: Kill all processes aggressively
echo "🛑 Step 1: Killing all Node.js processes..."
sudo pkill -9 -f node
sudo pkill -9 -f "server.js"
sudo fuser -k 5000/tcp 2>/dev/null
sleep 3

# Step 2: Clean up any remaining processes on port 5000
echo "🧹 Step 2: Cleaning up port 5000..."
sudo lsof -ti:5000 | xargs sudo kill -9 2>/dev/null
sudo netstat -tulpn | grep :5000 | awk '{print $7}' | cut -d'/' -f1 | xargs sudo kill -9 2>/dev/null
sleep 2

# Step 3: Verify port is free
echo "🔍 Step 3: Verifying port 5000 is free..."
if netstat -tulpn | grep :5000; then
    echo "❌ Port still in use! Manual intervention needed."
    echo "Run: sudo lsof -i :5000"
    exit 1
else
    echo "✅ Port 5000 is free"
fi

# Step 4: Pull latest changes
echo "📥 Step 4: Pulling latest changes from GitHub..."
git pull origin main

# Step 5: Install dependencies (if needed)
echo "📦 Step 5: Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Step 6: Start server in background
echo "🚀 Step 6: Starting server..."
nohup node server.js > server.log 2>&1 &
SERVER_PID=$!

# Step 7: Wait and verify
echo "⏳ Step 7: Waiting for server to start..."
sleep 5

# Check if server is running
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Server process is running (PID: $SERVER_PID)"
else
    echo "❌ Server process died. Check logs:"
    tail -20 server.log
    exit 1
fi

# Check if port is listening
if netstat -tulpn | grep :5000; then
    echo "✅ Server is listening on port 5000"
else
    echo "❌ Server not listening on port 5000. Check logs:"
    tail -20 server.log
    exit 1
fi

# Step 8: Test API
echo "🧪 Step 8: Testing API..."
sleep 2
if curl -s http://localhost:5000/api/test > /dev/null; then
    echo "✅ API is responding"
else
    echo "❌ API not responding"
fi

echo ""
echo "🎉 SERVER SUCCESSFULLY STARTED!"
echo "================================"
echo "📊 Server Status:"
ps aux | grep "node server.js" | grep -v grep
echo ""
echo "🔍 Port Status:"
netstat -tulpn | grep :5000
echo ""
echo "📋 Recent Logs:"
tail -10 server.log
echo ""
echo "🌐 Test your APIs at:"
echo "  - Health: http://your-server-ip:5000/"
echo "  - Test: http://your-server-ip:5000/api/test"
echo "  - Products: http://your-server-ip:5000/api/products"
echo ""
echo "📝 To view logs: tail -f server.log"
echo "📝 To stop server: sudo pkill -f 'node server.js'"