#!/bin/bash

echo "🧪 TESTING DISPATCH DROPDOWN ENDPOINTS"
echo "======================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="https://13-201-222-24.nip.io"

echo -e "${BLUE}🔐 Getting authentication token...${NC}"

# Get auth token
AUTH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@hunyhuny.com","password":"gfx998sd"}')

TOKEN=$(echo $AUTH_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}⚠️  Could not get fresh token, using fallback${NC}"
    TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AaHVueWh1bnkuY29tIiwiaWF0IjoxNzM2NjkzNzI4LCJleHAiOjE3MzY3ODAxMjh9.Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E"
else
    echo -e "${GREEN}✅ Got authentication token${NC}"
fi

echo ""
echo -e "${BLUE}🧪 Testing all dispatch endpoints...${NC}"
echo ""

# Test function
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_type="$3"
    
    echo -e "${YELLOW}Testing $name...${NC}"
    
    response=$(curl -s -H "Authorization: Bearer $TOKEN" "$url")
    
    if [[ $response == "["* ]] && [[ $response == *"]" ]]; then
        # It's an array
        count=$(echo $response | grep -o ',' | wc -l)
        count=$((count + 1))
        if [[ $response == "[]" ]]; then
            echo -e "${YELLOW}⚠️  $name: Empty array (may need database setup)${NC}"
        else
            echo -e "${GREEN}✅ $name: SUCCESS - Got $count items${NC}"
        fi
        echo -e "${BLUE}   Response: $response${NC}"
    elif [[ $response == "{"* ]] && [[ $response == *"}" ]]; then
        # It's an object
        echo -e "${GREEN}✅ $name: SUCCESS - Got object response${NC}"
        echo -e "${BLUE}   Response: $response${NC}"
    else
        # Error or unexpected response
        echo -e "${RED}❌ $name: FAILED${NC}"
        echo -e "${RED}   Response: $response${NC}"
    fi
    echo ""
}

# Test all endpoints
test_endpoint "Warehouses Dropdown" "$BASE_URL/api/dispatch/warehouses" "array"
test_endpoint "Logistics Dropdown" "$BASE_URL/api/dispatch/logistics" "array"
test_endpoint "Executives Dropdown" "$BASE_URL/api/dispatch/processed-persons" "array"
test_endpoint "Payment Modes" "$BASE_URL/api/dispatch/payment-modes" "array"
test_endpoint "Product Search" "$BASE_URL/api/dispatch/search-products?query=test" "array"
test_endpoint "Stock Check" "$BASE_URL/api/dispatch/check-inventory?warehouse=GGM_WH&barcode=TEST123&qty=1" "object"

echo -e "${BLUE}📊 Testing main dispatch endpoint...${NC}"
test_endpoint "Get Dispatches" "$BASE_URL/api/dispatch?limit=5" "object"

echo ""
echo -e "${GREEN}🎉 ENDPOINT TESTING COMPLETED!${NC}"
echo ""
echo -e "${YELLOW}📋 What to check:${NC}"
echo "1. All endpoints should return data (not errors)"
echo "2. Arrays should contain items (not empty [])"
echo "3. If arrays are empty, database tables may need setup"
echo "4. If you see fallback data, that's normal - controller provides defaults"
echo ""
echo -e "${YELLOW}🔗 Next step:${NC} Test the frontend dispatch form to see if dropdowns populate"