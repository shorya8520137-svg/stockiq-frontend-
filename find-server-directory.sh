#!/bin/bash

echo "🔍 FINDING SERVER DIRECTORY"
echo "==========================="

# SSH into the server and find the correct project directory
ssh -i ~/.ssh/ec2-python-ssh.pem ubuntu@13.201.222.24 << 'EOF'
echo "✅ Connected to AWS server successfully!"
echo ""

echo "📁 Checking for Node.js server processes..."
ps aux | grep "node" | grep -v grep

echo ""
echo "🔍 Looking for server.js files..."
find /home/ubuntu -name "server.js" -type f 2>/dev/null

echo ""
echo "📋 Checking directories with package.json..."
find /home/ubuntu -name "package.json" -type f 2>/dev/null | head -5

echo ""
echo "🔍 Checking for inventory/stockiq related directories..."
ls -la /home/ubuntu/ | grep -E "(inventory|stockiq|backend|frontend)"

echo ""
echo "📊 Checking which process is listening on port 5000..."
sudo netstat -tlnp | grep :5000 || echo "No process listening on port 5000"

echo ""
echo "🔍 Checking PM2 processes..."
pm2 list || echo "PM2 not running or no processes"

EOF

echo ""
echo "📋 Server directory search completed!"