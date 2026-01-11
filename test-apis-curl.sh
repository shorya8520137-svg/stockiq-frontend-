#!/bin/bash

# API Testing Script using curl
# Update the BASE_URL to match your server

BASE_URL="http://localhost:5000"
API_BASE="${BASE_URL}/api"

echo "🧪 Testing APIs with curl"
echo "========================"
echo "Base URL: $API_BASE"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test an endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="$4"
    local auth_header="$5"
    
    echo -e "${BLUE}📋 Testing: $name${NC}"
    echo "   URL: $url"
    echo "   Method: $method"
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        if [ -n "$auth_header" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                -H "Content-Type: application/json" \
                -H "$auth_header" \
                -d "$data" "$url")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                -H "Content-Type: application/json" \
                -d "$data" "$url")
        fi
    else
        if [ -n "$auth_header" ]; then
            response=$(curl -s -w "\n%{http_code}" -H "$auth_header" "$url")
        else
            response=$(curl -s -w "\n%{http_code}" "$url")
        fi
    fi
    
    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n1)
    # Extract response body (all but last line)
    response_body=$(echo "$response" | head -n -1)
    
    echo "   Status: $status_code"
    
    if [ "$status_code" = "200" ] || [ "$status_code" = "201" ]; then
        echo -e "   ${GREEN}✅ Success${NC}"
        # Try to pretty print JSON if it's valid
        if echo "$response_body" | jq . >/dev/null 2>&1; then
            echo "   Response (first 3 lines):"
            echo "$response_body" | jq . | head -3 | sed 's/^/      /'
            if [ $(echo "$response_body" | jq '. | length' 2>/dev/null || echo "0") -gt 0 ]; then
                echo -e "      ${GREEN}📊 Data found!${NC}"
            fi
        else
            echo "   Response: $response_body" | head -c 200
        fi
    elif [ "$status_code" = "401" ]; then
        echo -e "   ${YELLOW}🔒 Unauthorized - Auth required${NC}"
    elif [ "$status_code" = "404" ]; then
        echo -e "   ${RED}❌ Not Found${NC}"
    else
        echo -e "   ${RED}❌ Error${NC}"
        echo "   Response: $response_body"
    fi
    
    echo ""
}

# Test authentication first
echo -e "${BLUE}🔐 Testing Authentication${NC}"
echo "=========================="

login_response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com","password":"admin123"}' \
    "$API_BASE/auth/login")

login_status=$(echo "$login_response" | tail -n1)
login_body=$(echo "$login_response" | head -n -1)

echo "Login Status: $login_status"

if [ "$login_status" = "200" ]; then
    echo -e "${GREEN}✅ Login successful!${NC}"
    # Extract token using jq if available
    if command -v jq >/dev/null 2>&1; then
        TOKEN=$(echo "$login_body" | jq -r '.token // empty')
        if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
            AUTH_HEADER="Authorization: Bearer $TOKEN"
            echo "🎫 Token obtained"
        else
            echo -e "${YELLOW}⚠️ No token in response${NC}"
            AUTH_HEADER=""
        fi
    else
        echo -e "${YELLOW}⚠️ jq not available - cannot extract token${NC}"
        AUTH_HEADER=""
    fi
else
    echo -e "${RED}❌ Login failed${NC}"
    echo "Response: $login_body"
    AUTH_HEADER=""
fi

echo ""

# Test inventory endpoints
echo -e "${BLUE}📦 Testing Inventory APIs${NC}"
echo "========================="

test_endpoint "Get All Inventory" "$API_BASE/inventory?limit=5"
test_endpoint "Get Inventory by Warehouse" "$API_BASE/inventory?warehouse=GGM_WH&limit=3"
test_endpoint "Get Inventory (Legacy)" "$API_BASE/inventory/by-warehouse?warehouse=GGM_WH"

echo ""

# Test products endpoints
echo -e "${BLUE}🛍️ Testing Products APIs${NC}"
echo "========================="

test_endpoint "Get All Products" "$API_BASE/products?limit=5"
test_endpoint "Get Product Categories" "$API_BASE/products/categories/all"
test_endpoint "Get Warehouses" "$API_BASE/products/warehouses"
test_endpoint "Search by Barcode" "$API_BASE/products/search/TEST001"

echo ""

# Test search endpoints (require auth)
echo -e "${BLUE}🔍 Testing Search APIs${NC}"
echo "======================"

test_endpoint "Get Popular Searches" "$API_BASE/search/popular?limit=5" "GET" "" "$AUTH_HEADER"
test_endpoint "Get Search Suggestions" "$API_BASE/search/suggestions?query=test&limit=3" "GET" "" "$AUTH_HEADER"

echo ""

# Test data creation
echo -e "${BLUE}🏗️ Testing Data Creation${NC}"
echo "========================="

product_data='{"name":"API Test Product","category":"Test","barcode":"TEST_'$(date +%s)'","price":29.99}'
test_endpoint "Create Product" "$API_BASE/products" "POST" "$product_data"

echo ""

# Summary
echo -e "${BLUE}📊 Test Summary${NC}"
echo "==============="
echo "🌐 Server URL: $BASE_URL"
echo "🔐 Auth Token: $([ -n "$TOKEN" ] && echo "Available" || echo "Not available")"
echo ""
echo "💡 Next Steps:"
echo "1. Check which APIs returned data successfully"
echo "2. If no data, run: node fix-frontend-data-issues.js"
echo "3. Update frontend API URLs to match your server"
echo "4. Check browser console for CORS errors"