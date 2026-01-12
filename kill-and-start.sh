#!/bin/bash

echo "🔍 Finding all node processes..."
ps aux | grep node | grep -v grep

echo "🔪 Killing all node processes..."
pkill -f node
sleep 2

echo "🔍 Checking if port 5000 is free..."
netstat -tulpn | grep :5000

echo "🚀 Starting server..."
PORT=5000 node server.js