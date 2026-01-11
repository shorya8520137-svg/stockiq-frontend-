#!/bin/bash

# Phase 3 Deployment Script
# This script pulls the latest changes and sets up the database

echo "🚀 Starting Phase 3 Deployment..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Pull latest changes
print_status "Pulling latest changes from git..."
if git pull origin main; then
    print_success "Git pull completed successfully"
else
    print_error "Git pull failed. Please check your git configuration."
    exit 1
fi

# Step 2: Install dependencies
print_status "Installing new dependencies..."
if npm install; then
    print_success "Dependencies installed successfully"
else
    print_warning "npm install had some issues, trying alternative method..."
    if node install-websocket-deps.js; then
        print_success "WebSocket dependencies installed via script"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
fi

# Step 3: Create database tables
print_status "Setting up database tables..."
if node create-missing-tables.js; then
    print_success "Database tables created successfully"
else
    print_warning "Automated database setup failed. Please run manually:"
    echo "  1. Connect to your MySQL database"
    echo "  2. Run the SQL commands from database-setup-guide.md"
    echo "  3. Or try: node create-missing-tables.js"
fi

# Step 4: Populate search index (optional)
print_status "Populating search index..."
if node populate-search-index.js; then
    print_success "Search index populated successfully"
else
    print_warning "Search index population failed. You can run this later:"
    echo "  node populate-search-index.js"
fi

# Step 5: Check if PM2 is available
if command -v pm2 &> /dev/null; then
    print_status "Restarting application with PM2..."
    
    # Try to restart if app is already running
    if pm2 restart all 2>/dev/null; then
        print_success "Application restarted with PM2"
    else
        print_warning "PM2 restart failed. Starting fresh..."
        if pm2 start server.js --name "inventory-app"; then
            print_success "Application started with PM2"
        else
            print_error "Failed to start with PM2"
        fi
    fi
    
    # Show PM2 status
    pm2 status
else
    print_warning "PM2 not found. Please restart your application manually:"
    echo "  node server.js"
    echo "  or use your preferred process manager"
fi

echo ""
echo "=================================="
print_success "Phase 3 Deployment Complete! 🎉"
echo ""
echo "📋 What was deployed:"
echo "  ✅ Real-time WebSocket notifications"
echo "  ✅ User mention system (@username)"
echo "  ✅ Enhanced search functionality"
echo "  ✅ Notification preferences"
echo "  ✅ Activity tracking"
echo "  ✅ Session management"
echo ""
echo "🔍 Verification steps:"
echo "  1. Check server logs for WebSocket initialization"
echo "  2. Test login and look for real-time notifications"
echo "  3. Try @username mentions in comments"
echo "  4. Test global search functionality"
echo "  5. Check notification preferences page"
echo ""
echo "📖 For troubleshooting, see: database-setup-guide.md"
echo "🌐 Your application should be running with all Phase 3 features!"