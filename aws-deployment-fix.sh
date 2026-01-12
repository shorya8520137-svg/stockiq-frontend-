#!/bin/bash

echo "🚀 AWS Server Deployment Fix Script"
echo "===================================="

# Step 1: Handle the merge conflict
echo "1️⃣ Resolving merge conflict..."
git stash
echo "✅ Local changes stashed"

# Step 2: Pull the latest changes
echo "2️⃣ Pulling latest changes from GitHub..."
git pull origin main
echo "✅ Latest changes pulled"

# Step 3: Stop existing server processes
echo "3️⃣ Stopping existing server processes..."
pkill -f "node server.js" || echo "No existing server process found"
pkill -f "server.js" || echo "No server.js process found"
sleep 2
echo "✅ Server processes stopped"

# Step 4: Start the server with the new fixes
echo "4️⃣ Starting server with fixes..."
nohup node server.js > server.log 2>&1 &
SERVER_PID=$!
echo "✅ Server started with PID: $SERVER_PID"

# Step 5: Wait and check if server is running
echo "5️⃣ Checking server status..."
sleep 5

if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Server is running successfully!"
    echo "📋 Recent server logs:"
    tail -n 15 server.log
else
    echo "❌ Server failed to start"
    echo "📋 Error logs:"
    cat server.log
    exit 1
fi

# Step 6: Test the server
echo "6️⃣ Testing server endpoints..."
sleep 2

# Test basic connectivity
echo "Testing basic connectivity..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/ || echo "Local test failed"

echo ""
echo "🎉 Deployment complete!"
echo "📡 Server should now be accessible at: https://13-201-222-24.nip.io"
echo "🧪 Run this to test: node check-backend-status.js"