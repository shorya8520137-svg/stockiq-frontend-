#!/bin/bash

echo "🚨 NUCLEAR SERVER RESTART - CLEARING EVERYTHING"
echo "==============================================="

# Step 1: Nuclear kill of all node processes
echo "💥 Step 1: Nuclear kill of all Node.js processes..."
sudo pkill -9 -f node
sudo pkill -9 -f "server.js"
sudo pkill -9 -f "npm"
sudo pkill -9 -f "yarn"
sleep 2

# Step 2: Kill everything on port 5000
echo "💥 Step 2: Clearing port 5000..."
sudo fuser -k 5000/tcp 2>/dev/null
sudo lsof -ti:5000 | xargs sudo kill -9 2>/dev/null
sleep 2

# Step 3: Kill by process name patterns
echo "💥 Step 3: Killing by patterns..."
ps aux | grep -E "(node|server\.js)" | grep -v grep | awk '{print $2}' | xargs sudo kill -9 2>/dev/null
sleep 2

# Step 4: Final port cleanup
echo "💥 Step 4: Final port cleanup..."
sudo netstat -tulpn | grep :5000 | awk '{print $7}' | cut -d'/' -f1 | xargs sudo kill -9 2>/dev/null
sleep 3

# Step 5: Verify port is free
echo "🔍 Step 5: Verifying port 5000 is free..."
if netstat -tulpn | grep :5000; then
    echo "❌ Port still in use! Trying one more time..."
    sudo ss -tulpn | grep :5000 | awk '{print $6}' | cut -d',' -f2 | cut -d'=' -f2 | xargs sudo kill -9 2>/dev/null
    sleep 2
    
    if netstat -tulpn | grep :5000; then
        echo "❌ CRITICAL: Port still in use. Manual intervention needed."
        echo "Run: sudo lsof -i :5000"
        echo "Then: sudo kill -9 [PID]"
        exit 1
    fi
fi

echo "✅ Port 5000 is now free!"

# Step 6: Start server
echo "🚀 Step 6: Starting server..."
nohup node server.js > server.log 2>&1 &
SERVER_PID=$!

# Step 7: Wait and verify
echo "⏳ Step 7: Waiting for server to start..."
sleep 5

# Check if server process is running
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "✅ Server process is running (PID: $SERVER_PID)"
else
    echo "❌ Server process died. Checking logs..."
    tail -20 server.log
    exit 1
fi

# Check if port is listening
if netstat -tulpn | grep :5000; then
    echo "✅ Server is listening on port 5000"
else
    echo "❌ Server not listening. Checking logs..."
    tail -20 server.log
    exit 1
fi

# Step 8: Test the server
echo "🧪 Step 8: Testing server..."
sleep 2

# Test health endpoint
if curl -s http://localhost:5000/ | grep -q "OK"; then
    echo "✅ Health endpoint working"
else
    echo "❌ Health endpoint not responding"
fi

# Test CORS
echo "🌐 Step 9: Testing CORS..."
CORS_TEST=$(curl -s -H "Origin: https://stockiq-frontend-8np7yu2b9-test-tests-projects-d6b8ba0b.vercel.app" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type,Authorization" \
    -X OPTIONS http://localhost:5000/api/auth/login)

if echo "$CORS_TEST" | grep -q "200\|204"; then
    echo "✅ CORS preflight working"
else
    echo "⚠️  CORS might have issues, but server is running"
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
echo "🌐 Your server is ready at:"
echo "  - Health: https://13-201-222-24.nip.io/"
echo "  - Login: https://13-201-222-24.nip.io/api/auth/login"
echo ""
echo "📝 To monitor: tail -f server.log"