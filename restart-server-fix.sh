#!/bin/bash

echo "🔄 Restarting server to fix 502 errors..."

# Kill any existing node processes
echo "🛑 Stopping existing server processes..."
pkill -f "node server.js" || true
pkill -f "server.js" || true

# Wait a moment
sleep 2

# Start the server
echo "🚀 Starting server..."
nohup node server.js > server.log 2>&1 &

# Get the process ID
SERVER_PID=$!
echo "✅ Server started with PID: $SERVER_PID"

# Wait a moment and check if it's running
sleep 3
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Server is running successfully"
    echo "📋 Server log:"
    tail -n 10 server.log
else
    echo "❌ Server failed to start"
    echo "📋 Error log:"
    cat server.log
fi