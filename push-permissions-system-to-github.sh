#!/bin/bash

echo "🚀 Pushing Production Permissions System to GitHub..."
echo "===================================================="

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository"
    echo "Please run this script from your project root directory"
    exit 1
fi

# Check git status
echo "📊 Checking git status..."
git status

echo ""
echo "📝 Adding all changes to git..."

# Add all the new permissions system files
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "ℹ️ No changes to commit"
    exit 0
fi

echo ""
echo "📋 Creating comprehensive commit message..."

# Create detailed commit message
COMMIT_MESSAGE="🔐 Implement Production Permissions System

✨ Features Added:
- Database-level permission enforcement (51 tables analyzed)
- Component-based access control with permission gates
- Real-time user activity tracking and online/offline status
- Comprehensive audit logging system
- Permission-aware dashboard that only shows accessible components
- Enhanced notification system with templates
- Permission request approval workflow

🗄️ Database Changes:
- Added 5 new permission tables (user_permissions, user_activity_tracking, etc.)
- Enhanced permissions from 12 to 33 across 12 categories
- Added 14 component permission mappings
- Initialized user activity tracking for all 8 existing users

🔧 Backend Implementation:
- Enhanced permissions controller with CRUD operations
- Permission middleware for database-level enforcement
- New API routes: /api/enhanced-permissions/*
- Real-time WebSocket integration for notifications
- Stored procedures for efficient permission checking

🎨 Frontend Implementation:
- Permission-based dashboard with dynamic component loading
- Role-based UI rendering (Super Admin, Admin, Manager, User)
- Real-time activity tracking and component navigation
- Permission gates for all major components
- Enhanced user context with permission checking

📊 System Coverage:
- Dashboard, Inventory, Products, Orders, Dispatch
- Timeline, Returns, Damage Recovery, Messages, Search
- Admin Panel, User Management, Audit Logs
- Component visibility based on user permissions

🔒 Security Features:
- Database-level permission validation
- Audit trail for all user actions
- Session-based activity tracking
- Permission inheritance (role + direct permissions)
- Secure API endpoints with middleware protection

This implements a production-ready permissions system with comprehensive
database-level enforcement and permission-aware frontend components."

echo ""
echo "💾 Committing changes..."
git commit -m "$COMMIT_MESSAGE"

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to commit changes"
    exit 1
fi

echo ""
echo "🌐 Pushing to GitHub..."

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

# Push to origin
git push origin "$CURRENT_BRANCH"

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed permissions system to GitHub!"
    echo ""
    echo "🔗 Changes pushed to branch: $CURRENT_BRANCH"
    echo ""
    echo "📋 Summary of changes:"
    echo "- 5 new database tables for permissions system"
    echo "- Enhanced permissions controller and middleware"
    echo "- Permission-based dashboard and components"
    echo "- Real-time activity tracking and notifications"
    echo "- Comprehensive audit logging system"
    echo ""
    echo "🎉 Production permissions system is now on GitHub!"
else
    echo "❌ Error: Failed to push to GitHub"
    echo "Please check your git configuration and try again"
    exit 1
fi

echo ""
echo "===================================================="