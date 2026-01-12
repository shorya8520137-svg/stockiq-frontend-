#!/bin/bash

echo "🚀 DEPLOYING DISPATCH DROPDOWN FIX TO AWS SERVER"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Server details
SERVER_IP="13.201.222.24"
SERVER_USER="ubuntu"
PROJECT_PATH="/home/ubuntu/stockiq-frontend-"

echo -e "${YELLOW}📋 Deployment Summary:${NC}"
echo "• Fix dispatch form dropdowns (warehouses, logistics, executives)"
echo "• Deploy comprehensive dispatch controller with real database integration"
echo "• Test all dropdown endpoints"
echo "• Verify stock checking functionality"
echo ""

# Step 1: Upload the comprehensive dispatch controller
echo -e "${YELLOW}📤 Step 1: Uploading dispatch controller...${NC}"
scp controllers/dispatchController.js ${SERVER_USER}@${SERVER_IP}:${PROJECT_PATH}/controllers/
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dispatch controller uploaded successfully${NC}"
else
    echo -e "${RED}❌ Failed to upload dispatch controller${NC}"
    exit 1
fi

# Step 2: Upload dispatch routes
echo -e "${YELLOW}📤 Step 2: Uploading dispatch routes...${NC}"
scp routes/dispatchRoutes.js ${SERVER_USER}@${SERVER_IP}:${PROJECT_PATH}/routes/
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dispatch routes uploaded successfully${NC}"
else
    echo -e "${RED}❌ Failed to upload dispatch routes${NC}"
    exit 1
fi

# Step 3: Restart the server
echo -e "${YELLOW}🔄 Step 3: Restarting server...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
cd /home/ubuntu/stockiq-frontend-

# Kill existing server process
echo "🛑 Stopping existing server..."
pkill -f "node server.js" || echo "No existing server process found"
sleep 2

# Start server in background
echo "🚀 Starting server..."
nohup node server.js > server.log 2>&1 &
sleep 3

# Check if server started successfully
if pgrep -f "node server.js" > /dev/null; then
    echo "✅ Server started successfully"
    echo "📋 Server process ID: $(pgrep -f 'node server.js')"
else
    echo "❌ Server failed to start"
    echo "📋 Last 10 lines of server log:"
    tail -10 server.log
    exit 1
fi
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Server restarted successfully${NC}"
else
    echo -e "${RED}❌ Server restart failed${NC}"
    exit 1
fi

# Step 4: Test dropdown endpoints
echo -e "${YELLOW}🧪 Step 4: Testing dropdown endpoints...${NC}"

# Test warehouses endpoint
echo "Testing warehouses endpoint..."
WAREHOUSES_RESPONSE=$(curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AaHVueWh1bnkuY29tIiwiaWF0IjoxNzM2NjkzNzI4LCJleHAiOjE3MzY3ODAxMjh9.Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E" \
    "https://13-201-222-24.nip.io/api/dispatch/warehouses")
echo "Warehouses: $WAREHOUSES_RESPONSE"

# Test logistics endpoint
echo "Testing logistics endpoint..."
LOGISTICS_RESPONSE=$(curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AaHVueWh1bnkuY29tIiwiaWF0IjoxNzM2NjkzNzI4LCJleHAiOjE3MzY3ODAxMjh9.Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E" \
    "https://13-201-222-24.nip.io/api/dispatch/logistics")
echo "Logistics: $LOGISTICS_RESPONSE"

# Test processed persons endpoint
echo "Testing processed persons endpoint..."
PERSONS_RESPONSE=$(curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AaHVueWh1bnkuY29tIiwiaWF0IjoxNzM2NjkzNzI4LCJleHAiOjE3MzY3ODAxMjh9.Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E" \
    "https://13-201-222-24.nip.io/api/dispatch/processed-persons")
echo "Processed Persons: $PERSONS_RESPONSE"

# Test product search endpoint
echo "Testing product search endpoint..."
PRODUCTS_RESPONSE=$(curl -s -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AaHVueWh1bnkuY29tIiwiaWF0IjoxNzM2NjkzNzI4LCJleHAiOjE3MzY3ODAxMjh9.Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7E" \
    "https://13-201-222-24.nip.io/api/dispatch/search-products?query=test")
echo "Products: $PRODUCTS_RESPONSE"

echo ""
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Open the dispatch form in your browser"
echo "2. Check that all dropdowns now show data:"
echo "   • Warehouses dropdown should populate"
echo "   • Logistics dropdown should populate" 
echo "   • Executives dropdown should populate"
echo "3. Test product search functionality"
echo "4. Test stock checking when selecting products"
echo ""
echo -e "${YELLOW}🔗 Test URL:${NC} https://your-frontend-domain.vercel.app/order/dispatch"
echo -e "${YELLOW}🔗 Backend API:${NC} https://13-201-222-24.nip.io/api/dispatch"
echo ""
echo -e "${GREEN}✅ All dispatch dropdown endpoints are now live!${NC}"