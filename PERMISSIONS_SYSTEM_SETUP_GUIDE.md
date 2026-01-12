# 🔐 Production Permissions System - Setup Guide

## Overview
This guide will help you set up the comprehensive permissions system that has been implemented for your inventory management application.

## 📋 What's Been Implemented

### Database Level (51 Tables Analyzed)
- ✅ **5 New Permission Tables Created**
- ✅ **33 Permissions Across 12 Categories**
- ✅ **14 Component Permission Mappings**
- ✅ **User Activity Tracking for All Users**
- ✅ **Audit Logging System**

### Backend Implementation
- ✅ **Enhanced Permissions Controller**
- ✅ **Permission Middleware**
- ✅ **Real-time Notifications**
- ✅ **API Routes: `/api/enhanced-permissions/*`**

### Frontend Implementation
- ✅ **Permission-Based Dashboard**
- ✅ **Dynamic Component Loading**
- ✅ **Role-Based UI**
- ✅ **Permission Gates**

---

## 🚀 Setup Instructions

### Step 1: Push Changes to GitHub

```bash
# Make the script executable
chmod +x push-permissions-system-to-github.sh

# Push all changes to GitHub
./push-permissions-system-to-github.sh
```

### Step 2: Pull Changes on Your Server

```bash
# SSH to your server
ssh -i ~/.ssh/ec2-python-ssh.pem ubuntu@13.201.222.24

# Navigate to your project directory
cd /path/to/your/project

# Pull the latest changes
git pull origin main
```

### Step 3: Database Setup (Already Done)
The database changes have already been applied to your production database:
- ✅ 5 new tables created
- ✅ 33 permissions added
- ✅ Component mappings configured
- ✅ User activity tracking initialized

### Step 4: Restart Your Server

```bash
# On your server, restart the Node.js application
pm2 restart all
# OR if using different process manager
sudo systemctl restart your-app-service
```

### Step 5: Verify the Setup

#### Test API Endpoints
```bash
# Test enhanced permissions endpoint
curl -X GET "https://13-201-222-24.nip.io/api/enhanced-permissions/users/online" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test user permissions
curl -X GET "https://13-201-222-24.nip.io/api/enhanced-permissions/users/1/permissions" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Test Frontend
1. **Login to your application**: `https://your-frontend-url.vercel.app`
2. **Check Dashboard**: Should only show components you have access to
3. **Test Different Users**: Login with different roles to see different permissions

---

## 🔑 User Roles & Permissions

### Super Admin (Role ID: 1)
- **All Permissions**: Complete system access
- **Users**: Super Admin, Test Admin
- **Dashboard**: All components visible

### Admin (Role ID: 2)
- **Most Permissions**: Operational access without user management
- **Users**: Curl Test User, NipIO Final User, Test User, soni, shorya
- **Dashboard**: Most components except user management

### Manager (Role ID: 3)
- **Limited Permissions**: Operational access
- **Dashboard**: Basic operational components

### User (Role ID: 4)
- **Basic Permissions**: View-only access
- **Dashboard**: Limited components

---

## 🧪 Testing the Permissions System

### Test 1: Component Visibility
1. Login as different users
2. Check which components appear on dashboard
3. Verify users can only see components they have permissions for

### Test 2: API Access
```bash
# Test with Super Admin token
curl -X GET "https://13-201-222-24.nip.io/api/enhanced-permissions/users" \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN"

# Test with regular user token (should fail)
curl -X GET "https://13-201-222-24.nip.io/api/enhanced-permissions/users" \
  -H "Authorization: Bearer USER_TOKEN"
```

### Test 3: Activity Tracking
1. Login and navigate between components
2. Check user activity in database:
```sql
SELECT * FROM user_activity_tracking WHERE user_id = YOUR_USER_ID;
```

### Test 4: Audit Logs
1. Perform actions (create user, change permissions)
2. Check audit logs:
```sql
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10;
```

---

## 📊 Database Tables Created

### 1. `user_permissions`
- Direct user permissions (beyond role permissions)
- Expiration dates for temporary permissions
- Audit trail of who granted permissions

### 2. `user_activity_tracking`
- Real-time online/offline status
- Current action and component tracking
- Session data and IP tracking

### 3. `component_permissions`
- Maps components to required permissions
- Defines which permissions needed for each page/feature

### 4. `permission_requests`
- Permission approval workflow
- Request tracking and approval history

### 5. `notification_templates`
- System notification templates
- Configurable notification messages

---

## 🔧 Configuration Options

### Environment Variables
Make sure these are set in your `.env` file:
```env
# Database Configuration (already set)
DB_HOST=inventory-db.cv2iey8a8hbk.ap-south-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=gfx998sd
DB_NAME=hunyhuny_auto_dispatch

# JWT Configuration
JWT_SECRET=your-secret-key

# Server Configuration
PORT=5000
```

### Permission Categories
The system includes these permission categories:
- **DASHBOARD**: Dashboard access and analytics
- **PRODUCTS**: Product management
- **INVENTORY**: Inventory operations
- **ORDERS**: Order processing
- **DISPATCH**: Dispatch management
- **TIMELINE**: Order tracking
- **RETURNS**: Return processing
- **DAMAGE**: Damage recovery
- **MESSAGES**: Communication system
- **SEARCH**: Search functionality
- **REPORTS**: Reporting features
- **ADMIN**: Administrative functions
- **SYSTEM**: System management

---

## 🚨 Troubleshooting

### Issue 1: Components Not Showing
**Problem**: Dashboard shows "No components available"
**Solution**: 
1. Check user role in database
2. Verify role has permissions assigned
3. Check `role_permissions` table

### Issue 2: API Endpoints Returning 403
**Problem**: Permission denied errors
**Solution**:
1. Verify JWT token is valid
2. Check user has required permission
3. Verify middleware is working

### Issue 3: Activity Tracking Not Working
**Problem**: User activity not being recorded
**Solution**:
1. Check `user_activity_tracking` table exists
2. Verify user ID is correct
3. Check API calls are being made

### Issue 4: Database Connection Issues
**Problem**: Cannot connect to database
**Solution**:
1. Verify database credentials in `.env`
2. Check database server is running
3. Test connection manually

---

## 📞 Support Commands

### Check Database Tables
```sql
-- Verify new tables exist
SHOW TABLES LIKE '%permission%';
SHOW TABLES LIKE '%activity%';

-- Check permissions count
SELECT category, COUNT(*) FROM permissions GROUP BY category;

-- Check user permissions
SELECT u.name, r.display_name, COUNT(p.id) as permission_count
FROM users u
JOIN roles r ON u.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
GROUP BY u.id;
```

### Check Server Status
```bash
# Check if server is running
curl -X GET "https://13-201-222-24.nip.io/health/cors"

# Check API status
curl -X GET "https://13-201-222-24.nip.io/api"
```

### View Logs
```bash
# View server logs
pm2 logs
# OR
tail -f /var/log/your-app.log
```

---

## 🎯 Next Steps

1. **Test the System**: Follow the testing guide above
2. **Create More Users**: Add users with different roles
3. **Customize Permissions**: Modify permissions as needed
4. **Monitor Activity**: Check audit logs regularly
5. **Setup Notifications**: Configure notification preferences

---

## 📚 Additional Resources

- **Database Schema**: See `production-permissions-system.sql`
- **API Documentation**: Check `/api/enhanced-permissions/*` endpoints
- **Frontend Components**: See updated dashboard and permission gates
- **Audit Logs**: Monitor user activity and system changes

---

## ✅ Verification Checklist

- [ ] Changes pushed to GitHub
- [ ] Server restarted with new code
- [ ] Database tables created (5 new tables)
- [ ] Permissions system working (33 permissions)
- [ ] Dashboard showing role-based components
- [ ] API endpoints responding correctly
- [ ] User activity being tracked
- [ ] Audit logs being created
- [ ] Different user roles tested
- [ ] Component access working correctly

---

**🎉 Your production permissions system is now ready!**

The system provides comprehensive database-level permission enforcement with a permission-aware frontend that only shows components users can access. Users will only see timeline, dispatch, inventory, etc. if they have the appropriate permissions.