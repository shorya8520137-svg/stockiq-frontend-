#!/bin/bash

# Test login functionality with curl

API_BASE="https://13-201-222-24.nip.io/api"

echo "🧪 Testing login functionality..."
echo ""

echo "🏥 Testing health endpoint..."
curl -s -w "Status: %{http_code}\n" "$API_BASE/health"
echo ""

echo "📤 Testing login endpoint..."
curl -s -w "Status: %{http_code}\n" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hunyhuny.com","password":"gfx998sd"}' \
  "$API_BASE/auth/login"
echo ""

echo "🏁 Test completed"