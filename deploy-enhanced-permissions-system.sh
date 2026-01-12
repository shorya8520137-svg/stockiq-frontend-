#!/bin/bash

echo "🚀 DEPLOYING ENHANCED PERMISSIONS SYSTEM"
echo "========================================"

# SSH into the server and deploy the enhanced permissions system
ssh -i ~/.ssh/ec2-python-ssh.pem ubuntu@13.201.222.24 << 'EOF'
echo "✅ Connected to AWS server successfully!"
echo ""

# Navigate to the correct project directory
cd /home/ubuntu/stockiq-frontend- || {
    echo "❌ Project directory not found. Checking available directories..."
    ls -la /home/ubuntu/
    exit 1
}

echo "📁 Current directory: $(pwd)"
echo "📋 Current files:"
ls -la

echo ""
echo "🔄 Pulling latest changes from GitHub..."
git pull origin main

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Checking if enhanced permissions files exist..."
if [ -f "routes/enhancedPermissionsRoutes.js" ]; then
    echo "✅ Enhanced permissions routes file exists"
else
    echo "❌ Enhanced permissions routes file missing"
    echo "📋 Available route files:"
    ls -la routes/
fi

if [ -f "controllers/enhancedPermissionsController.js" ]; then
    echo "✅ Enhanced permissions controller file exists"
else
    echo "❌ Enhanced permissions controller file missing"
    echo "📋 Available controller files:"
    ls -la controllers/
fi

if [ -f "middleware/permissionMiddleware.js" ]; then
    echo "✅ Permission middleware file exists"
else
    echo "❌ Permission middleware file missing"
    echo "📋 Available middleware files:"
    ls -la middleware/
fi

echo ""
echo "🛑 Stopping existing server..."
sudo pkill -f "node server.js" || echo "No existing server process found"

echo ""
echo "🚀 Starting server with enhanced permissions..."
nohup node server.js > server.log 2>&1 &

echo "⏳ Waiting for server to start..."
sleep 5

echo ""
echo "📊 Server status:"
if pgrep -f "node server.js" > /dev/null; then
    echo "✅ Server is running"
    echo "📋 Process info:"
    ps aux | grep "node server.js" | grep -v grep
else
    echo "❌ Server failed to start"
    echo "📋 Server logs:"
    tail -20 server.log
fi

echo ""
echo "🔍 Testing enhanced permissions endpoint..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/enhanced-permissions/test || echo "Endpoint test failed"

echo ""
echo "🎉 Deployment completed!"

EOF

echo ""
echo "📋 Deployment script completed!"
echo "🔍 Test the enhanced permissions system:"
echo "   https://13-201-222-24.nip.io/api/enhanced-permissions/test"