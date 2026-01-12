#!/bin/bash

echo "🛑 Stopping all Node.js processes..."
sudo pkill -9 -f node
sudo fuser -k 5000/tcp 2>/dev/null
sleep 3

echo "🧹 Cleaning up..."
sudo lsof -ti:5000 | xargs sudo kill -9 2>/dev/null
sleep 2

echo "✅ Port status:"
if netstat -tulpn | grep :5000; then
    echo "❌ Port still in use, trying harder..."
    sudo netstat -tulpn | grep :5000 | awk '{print $7}' | cut -d'/' -f1 | xargs sudo kill -9
    sleep 2
else
    echo "✅ Port 5000 is free"
fi

echo "🚀 Starting server in background..."
nohup node server.js > server.log 2>&1 &

echo "⏳ Waiting for server to start..."
sleep 5

echo "📊 Server status:"
if ps aux | grep "node server.js" | grep -v grep; then
    echo "✅ Server is running"
else
    echo "❌ Server failed to start"
fi

echo "🔍 Port check:"
if netstat -tulpn | grep :5000; then
    echo "✅ Server listening on port 5000"
else
    echo "❌ Server not listening on port 5000"
fi

echo "📋 Recent server logs:"
tail -15 server.log 2>/dev/null || echo "No logs available yet"