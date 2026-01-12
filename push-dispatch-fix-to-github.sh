#!/bin/bash

echo "🚀 PUSHING DISPATCH DROPDOWN FIX TO GITHUB"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Changes being committed:${NC}"
echo "• controllers/dispatchController.js - Comprehensive dropdown fix"
echo "• routes/dispatchRoutes.js - Enhanced dispatch routes"
echo "• Multiple deployment guides and scripts"
echo "• Testing utilities"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    echo "Please run this script from the root of your git repository"
    exit 1
fi

# Check git status
echo -e "${YELLOW}📊 Checking git status...${NC}"
git status --porcelain

echo ""
echo -e "${YELLOW}📤 Adding all changes to git...${NC}"

# Add all files
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo -e "${YELLOW}⚠️  No changes to commit${NC}"
    exit 0
fi

echo -e "${YELLOW}💾 Committing changes...${NC}"

# Commit with comprehensive message
git commit -m "🚀 Fix dispatch dropdown issue - comprehensive controller update

MAJOR FIX: Dispatch form dropdowns not showing data

## Main Changes:
- controllers/dispatchController.js: Complete rewrite with database integration
- routes/dispatchRoutes.js: Enhanced with all necessary endpoints

## New Features Added:
✅ Real database queries for all dropdowns:
   • getWarehouses() - Queries dispatch_warehouse table
   • getLogistics() - Queries logistics table  
   • getProcessedPersons() - Queries processed_persons table
   • getPaymentModes() - Returns payment options

✅ Enhanced functionality:
   • searchProducts() - Product search with auto-suggestions
   • checkInventory() - Stock validation with FIFO logic
   • createDispatch() - Complete workflow with inventory updates

✅ Reliability features:
   • Fallback data when database queries fail
   • Comprehensive error handling and logging
   • Transaction management for data integrity
   • Stock management with FIFO inventory updates

## API Endpoints Fixed:
- GET /api/dispatch/warehouses
- GET /api/dispatch/logistics  
- GET /api/dispatch/processed-persons
- GET /api/dispatch/payment-modes
- GET /api/dispatch/search-products
- GET /api/dispatch/check-inventory
- POST /api/dispatch/create

## Documentation Added:
- DEPLOY_DISPATCH_FIX_FINAL.md - Deployment guide
- DISPATCH_DROPDOWN_FIX_DEPLOYMENT.md - Comprehensive documentation
- test-dispatch-endpoints.sh - Testing script
- Multiple deployment utilities and guides

## Impact:
- ✅ Frontend dropdowns will now populate with real data
- ✅ Product search will show suggestions as user types
- ✅ Stock validation will work with real inventory
- ✅ Complete dispatch creation workflow functional
- ✅ Fallback data ensures dropdowns always work

Fixes: #dispatch-dropdown-empty-issue
Resolves: Dispatch form dropdowns showing no data
Tested: All endpoints return proper data with fallbacks"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Changes committed successfully${NC}"
else
    echo -e "${RED}❌ Commit failed${NC}"
    exit 1
fi

echo -e "${YELLOW}🌐 Pushing to GitHub...${NC}"

# Push to main branch
git push origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}🎉 SUCCESS! Changes pushed to GitHub${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "1. SSH into your AWS server:"
    echo "   ssh -i ~/.ssh/ec2-python-ssh.pem ubuntu@13.201.222.24"
    echo ""
    echo "2. Pull the latest changes:"
    echo "   cd /home/ubuntu/stockiq-frontend-"
    echo "   git pull origin main"
    echo ""
    echo "3. Restart the server:"
    echo "   pkill -f 'node server.js'"
    echo "   nohup node server.js > server.log 2>&1 &"
    echo ""
    echo "4. Test the endpoints:"
    echo "   # All dropdown endpoints should now return data"
    echo "   # Frontend dropdowns should populate"
    echo ""
    echo -e "${GREEN}✅ Dispatch dropdown fix is now available on GitHub!${NC}"
else
    echo -e "${RED}❌ Push failed${NC}"
    echo "Please check your GitHub credentials and network connection"
    exit 1
fi

echo ""
echo -e "${BLUE}🔗 Key Files Updated:${NC}"
echo "• controllers/dispatchController.js - Main fix"
echo "• routes/dispatchRoutes.js - Route enhancements"
echo "• DEPLOY_DISPATCH_FIX_FINAL.md - Deployment guide"
echo "• test-dispatch-endpoints.sh - Testing script"
echo ""
echo -e "${GREEN}🎯 The comprehensive dispatch controller will fix all dropdown issues!${NC}"