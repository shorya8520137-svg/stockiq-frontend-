#!/bin/bash

echo "🔥 FIXING SERVER - COPY PASTE AND RUN"
echo "====================================="

# Kill everything brutally
echo "💀 Killing all processes..."
sudo pkill -9 -f node 2>/dev/null
sudo pkill -9 -f server.js 2>/dev/null
sudo fuser -k 5000/tcp 2>/dev/null
sudo lsof -ti:5000 | xargs sudo kill -9 2>/dev/null

# Wait
sleep 3

# Kill specific PIDs if still running
echo "🔪 Killing specific processes..."
sudo kill -9 308178 2>/dev/null
sudo kill -9 $(sudo lsof -ti:5000) 2>/dev/null

# Final cleanup
sleep 2
sudo netstat -tulpn | grep :5000 | awk '{print $7}' | cut -d'/' -f1 | xargs sudo kill -9 2>/dev/null

# Check if port is free
echo "🔍 Checking port..."
if netstat -tulpn | grep :5000; then
    echo "❌ Port still busy - trying harder..."
    sudo ss -tulpn | grep :5000 | awk '{print $6}' | cut -d',' -f2 | cut -d'=' -f2 | xargs sudo kill -9 2>/dev/null
    sleep 2
fi

# Start server
echo "🚀 Starting server..."
nohup node server.js > server.log 2>&1 &

# Wait and check
sleep 5

echo "✅ DONE! Checking status..."
if ps aux | grep "node server.js" | grep -v grep; then
    echo "✅ Server is running!"
else
    echo "❌ Server failed to start"
fi

if netstat -tulpn | grep :5000; then
    echo "✅ Port 5000 is listening!"
else
    echo "❌ Port not listening"
fi

echo "📋 Recent logs:"
tail -10 server.log 2>/dev/null || echo "No logs yet"

echo ""
echo "🎉 SCRIPT COMPLETE!"
echo "If server is running, your APIs should work now!"