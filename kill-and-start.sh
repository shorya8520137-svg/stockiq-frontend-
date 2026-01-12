#!/bin/bash

echo "🔍 Finding all node processes..."
ps aux | grep node | grep -v grep

echo "🔪 Killing all node processes (force)..."b
sudo pkill -9 -f node
sleep 3

echo "� Khilling any process using port 5000..."
sudo fuser -k 5000/tcp 2>/dev/null || echo "No process found on port 5000"
sleep 2

echo "🔪 Additional cleanup - kill by port..."
sudo lsof -ti:5000 | xargs sudo kill -9 2>/dev/null || echo "No additional processes found"
sleep 2

echo "🔍 Final check - port 5000 status..."
netstat -tulpn | grep :5000 || echo "✅ Port 5000 is free"

echo "🧹 Clearing any remaining zombie processes..."
sudo pkill -9 -f "server.js"
sleep 1

echo "🚀 Starting server..."
nohup node server.js > server.log 2>&1 &
sleep 3

echo "📊 Server status:"
ps aux | grep "node server.js" | grep -v grep || echo "❌ Server not running"

echo "🔍 Port check:"
netstat -tulpn | grep :5000 || echo "❌ Port 5000 not listening"

echo "📋 Server log (last 10 lines):"
tail -10 server.log 2>/dev/null || echo "No log file yet"