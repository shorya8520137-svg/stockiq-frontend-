#!/bin/bash

echo "🧪 TESTING ALL SERVER APIs"
echo "=========================="

SERVER_URL="http://localhost:5000"

# Test 1: Health Check
echo "1️⃣ Testing Health Check..."
if curl -s "$SERVER_URL/" | grep -q "OK"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
fi

# Test 2: API Test Endpoint
echo "2️⃣ Testing API endpoint..."
if curl -s "$SERVER_URL/api/test" | grep -q "Test endpoint working"; then
    echo "✅ API test endpoint passed"
else
    echo "❌ API test endpoint failed"
fi

# Test 3: Products API (without auth)
echo "3️⃣ Testing Products API..."
PRODUCTS_RESPONSE=$(curl -s "$SERVER_URL/api/products")
if echo "$PRODUCTS_RESPONSE" | grep -q "products\|success\|error"; then
    echo "✅ Products API responding"
    echo "Response: $PRODUCTS_RESPONSE"
else
    echo "❌ Products API not responding"
fi

# Test 4: Inventory API
echo "4️⃣ Testing Inventory API..."
INVENTORY_RESPONSE=$(curl -s "$SERVER_URL/api/inventory")
if echo "$INVENTORY_RESPONSE" | grep -q "inventory\|success\|error"; then
    echo "✅ Inventory API responding"
    echo "Response: $INVENTORY_RESPONSE"
else
    echo "❌ Inventory API not responding"
fi

# Test 5: Dispatch API
echo "5️⃣ Testing Dispatch API..."
DISPATCH_RESPONSE=$(curl -s "$SERVER_URL/api/dispatch/warehouses")
if echo "$DISPATCH_RESPONSE" | grep -q "warehouses\|success\|error"; then
    echo "✅ Dispatch API responding"
    echo "Response: $DISPATCH_RESPONSE"
else
    echo "❌ Dispatch API not responding"
fi

echo ""
echo "🎯 SUMMARY:"
echo "==========="
echo "✅ All APIs tested"
echo "📝 Check responses above for any errors"
echo "🔗 Your server is running at: $SERVER_URL"