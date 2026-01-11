#!/bin/bash

echo "🚀 Complete fix for frontend data display issues"
echo "================================================"

# 1. Check and create user accounts
echo "1️⃣ Checking user accounts and data..."
node fix-frontend-data-issues.js

# 2. Temporarily remove authentication (optional)
echo ""
echo "2️⃣ Do you want to temporarily remove authentication to test data display? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    node remove-auth-temporarily.js
    echo "⚠️ Authentication temporarily removed for testing"
fi

# 3. Restart server
echo ""
echo "3️⃣ Restarting server..."
if command -v pm2 &> /dev/null; then
    pm2 restart all
    echo "✅ Server restarted with PM2"
else
    echo "⚠️ PM2 not found. Please restart your server manually:"
    echo "   Kill current process and run: node server.js"
fi

echo ""
echo "🎉 Fix completed!"
echo ""
echo "📋 Test steps:"
echo "1. Open your frontend application"
echo "2. Login with: admin@test.com / admin123"
echo "3. Check inventory section for data"
echo "4. If data appears, restore authentication:"
echo "   cp routes/searchRoutes.js.backup routes/searchRoutes.js"
echo "   pm2 restart all"
echo ""
echo "🔍 If still no data, check browser console for errors"