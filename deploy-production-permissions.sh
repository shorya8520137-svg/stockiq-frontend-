#!/bin/bash

echo "🚀 Deploying Production Permissions System..."
echo "=============================================="

# SSH into the server and deploy the permissions system
ssh -i ~/.ssh/ec2-python-ssh.pem ubuntu@13.201.222.24 << 'EOF'
echo "✅ Connected to AWS server successfully!"
echo ""

# Database credentials
DB_HOST="inventory-db.cv2iey8a8hbk.ap-south-1.rds.amazonaws.com"
DB_USER="admin"
DB_PASSWORD="gfx998sd"
DB_NAME="hunyhuny_auto_dispatch"

echo "📊 Deploying to database: $DB_NAME"
echo "🔗 Host: $DB_HOST"
echo ""

# Create the SQL file on the server
cat > production-permissions-system.sql << 'SQLEOF'
-- Production Permissions System for hunyhuny_auto_dispatch
-- Based on actual database analysis (51 tables)
-- Created: 2026-01-12

-- =====================================================
-- MISSING PERMISSION TABLES (to be added)
-- =====================================================

-- User Permissions Table (for direct user permissions)
CREATE TABLE IF NOT EXISTS `user_permissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `permission_id` INT NOT NULL,
    `granted_by` INT NULL,
    `granted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `expires_at` TIMESTAMP NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    UNIQUE KEY `unique_user_permission` (`user_id`, `permission_id`)
);

-- User Activity Tracking Table (for online/offline status)
CREATE TABLE IF NOT EXISTS `user_activity_tracking` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `is_online` TINYINT(1) DEFAULT 0,
    `last_activity` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `current_action` VARCHAR(100) NULL,
    `current_component` VARCHAR(50) NULL,
    `session_data` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_user_tracking` (`user_id`)
);

-- Component Permissions Table (for granular component access)
CREATE TABLE IF NOT EXISTS `component_permissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `component_name` VARCHAR(50) NOT NULL,
    `component_path` VARCHAR(100) NOT NULL,
    `required_permissions` JSON NOT NULL,
    `description` TEXT NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_component` (`component_name`)
);

-- Permission Requests Table (for permission approval workflow)
CREATE TABLE IF NOT EXISTS `permission_requests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `requested_permission_id` INT NOT NULL,
    `requested_by` INT NOT NULL,
    `reason` TEXT NULL,
    `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    `approved_by` INT NULL,
    `approved_at` TIMESTAMP NULL,
    `rejection_reason` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`requested_permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- Notification Templates Table (for system notifications)
CREATE TABLE IF NOT EXISTS `notification_templates` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `template_key` VARCHAR(100) NOT NULL,
    `title_template` VARCHAR(200) NOT NULL,
    `message_template` TEXT NOT NULL,
    `notification_type` VARCHAR(50) NOT NULL,
    `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `unique_template_key` (`template_key`)
);

-- =====================================================
-- ENHANCED PERMISSIONS DATA
-- =====================================================

-- Add missing permissions for comprehensive system coverage
INSERT IGNORE INTO `permissions` (`name`, `display_name`, `category`, `is_active`) VALUES
-- Dashboard permissions
('DASHBOARD_VIEW', 'View Dashboard', 'DASHBOARD', 1),
('DASHBOARD_ANALYTICS', 'View Analytics', 'DASHBOARD', 1),

-- Timeline permissions
('TIMELINE_VIEW', 'View Timeline', 'TIMELINE', 1),
('TIMELINE_EXPORT', 'Export Timeline', 'TIMELINE', 1),

-- Dispatch permissions
('DISPATCH_VIEW', 'View Dispatch', 'DISPATCH', 1),
('DISPATCH_CREATE', 'Create Dispatch', 'DISPATCH', 1),
('DISPATCH_EDIT', 'Edit Dispatch', 'DISPATCH', 1),
('DISPATCH_DELETE', 'Delete Dispatch', 'DISPATCH', 1),

-- Returns permissions
('RETURNS_VIEW', 'View Returns', 'RETURNS', 1),
('RETURNS_CREATE', 'Create Returns', 'RETURNS', 1),
('RETURNS_EDIT', 'Edit Returns', 'RETURNS', 1),

-- Damage Recovery permissions
('DAMAGE_VIEW', 'View Damage Recovery', 'DAMAGE', 1),
('DAMAGE_CREATE', 'Create Damage Recovery', 'DAMAGE', 1),
('DAMAGE_EDIT', 'Edit Damage Recovery', 'DAMAGE', 1),

-- Messages permissions
('MESSAGES_VIEW', 'View Messages', 'MESSAGES', 1),
('MESSAGES_SEND', 'Send Messages', 'MESSAGES', 1),
('MESSAGES_DELETE', 'Delete Messages', 'MESSAGES', 1),

-- Search permissions
('SEARCH_VIEW', 'Use Search', 'SEARCH', 1),
('SEARCH_ANALYTICS', 'View Search Analytics', 'SEARCH', 1),

-- Reports permissions
('REPORTS_VIEW', 'View Reports', 'REPORTS', 1),
('REPORTS_EXPORT', 'Export Reports', 'REPORTS', 1),

-- Admin permissions
('ADMIN_PANEL', 'Access Admin Panel', 'ADMIN', 1),
('AUDIT_LOGS', 'View Audit Logs', 'ADMIN', 1);

-- =====================================================
-- COMPONENT PERMISSIONS MAPPING
-- =====================================================

INSERT IGNORE INTO `component_permissions` (`component_name`, `component_path`, `required_permissions`, `description`) VALUES
('Dashboard', '/dashboard', '["DASHBOARD_VIEW"]', 'Main dashboard access'),
('Inventory', '/inventory', '["INVENTORY_VIEW"]', 'Inventory management access'),
('Products', '/products', '["PRODUCTS_VIEW"]', 'Product management access'),
('Orders', '/order', '["ORDERS_VIEW"]', 'Order management access'),
('Dispatch', '/order/dispatch', '["DISPATCH_VIEW"]', 'Dispatch management access'),
('Timeline', '/tracking', '["TIMELINE_VIEW"]', 'Timeline tracking access'),
('Returns', '/returns', '["RETURNS_VIEW"]', 'Returns management access'),
('Damage Recovery', '/damage-recovery', '["DAMAGE_VIEW"]', 'Damage recovery access'),
('Messages', '/messages', '["MESSAGES_VIEW"]', 'Messaging system access'),
('Search', '/search', '["SEARCH_VIEW"]', 'Global search access'),
('Admin Panel', '/admin', '["ADMIN_PANEL"]', 'Administrative panel access'),
('User Management', '/admin/users', '["SYSTEM_USER_MANAGEMENT"]', 'User management access'),
('Permissions', '/admin/permissions', '["SYSTEM_PERMISSIONS"]', 'Permission management access'),
('Audit Logs', '/admin/audit', '["AUDIT_LOGS"]', 'Audit log access');

-- =====================================================
-- NOTIFICATION TEMPLATES
-- =====================================================

INSERT IGNORE INTO `notification_templates` (`template_key`, `title_template`, `message_template`, `notification_type`, `priority`) VALUES
('USER_CREATED', 'New User Created', 'A new user "{{username}}" has been created by {{creator}}', 'USER_MANAGEMENT', 'medium'),
('USER_PERMISSION_GRANTED', 'Permission Granted', 'User "{{username}}" has been granted {{permission}} permission', 'PERMISSION_CHANGE', 'low'),
('USER_PERMISSION_REVOKED', 'Permission Revoked', 'User "{{username}}" has had {{permission}} permission revoked', 'PERMISSION_CHANGE', 'medium'),
('DISPATCH_CREATED', 'New Dispatch Created', 'Dispatch #{{dispatch_id}} has been created for {{product_name}}', 'DISPATCH', 'medium'),
('INVENTORY_LOW_STOCK', 'Low Stock Alert', 'Product {{product_name}} is running low in {{warehouse}}', 'INVENTORY', 'high'),
('SYSTEM_MAINTENANCE', 'System Maintenance', 'System maintenance scheduled for {{date}}', 'SYSTEM', 'high'),
('LOGIN_FAILED', 'Failed Login Attempt', 'Failed login attempt for {{email}} from {{ip_address}}', 'SECURITY', 'high'),
('PERMISSION_REQUEST', 'Permission Request', 'User {{username}} has requested {{permission}} permission', 'PERMISSION_REQUEST', 'medium');

-- Initialize user activity tracking for existing users
INSERT IGNORE INTO user_activity_tracking (user_id, is_online, current_action, current_component)
SELECT id, 0, 'system_init', 'initialization'
FROM users 
WHERE is_active = 1;

SQLEOF

echo "📁 SQL file created successfully"
echo ""

echo "🔄 Executing SQL deployment..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < production-permissions-system.sql

if [ $? -eq 0 ]; then
    echo "✅ Permissions system deployed successfully!"
else
    echo "❌ Deployment failed!"
    exit 1
fi

echo ""
echo "🔍 Verifying deployment..."

# Verify new tables were created
echo "=== NEW TABLES CREATED ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT TABLE_NAME, TABLE_ROWS 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = '$DB_NAME' 
AND TABLE_NAME IN ('user_permissions', 'user_activity_tracking', 'component_permissions', 'permission_requests', 'notification_templates')
ORDER BY TABLE_NAME;"

echo ""
echo "=== PERMISSIONS COUNT ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT 
    category,
    COUNT(*) as permission_count
FROM permissions 
WHERE is_active = 1
GROUP BY category
ORDER BY category;"

echo ""
echo "=== COMPONENT PERMISSIONS ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT component_name, component_path, description
FROM component_permissions 
WHERE is_active = 1
ORDER BY component_name;"

echo ""
echo "=== USER ACTIVITY TRACKING INITIALIZED ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT 
    u.name as username,
    uat.is_online,
    uat.current_action,
    uat.created_at
FROM user_activity_tracking uat
JOIN users u ON uat.user_id = u.id
ORDER BY u.name;"

echo ""
echo "🎉 Production permissions system deployment complete!"
echo "=============================================="

EOF

echo ""
echo "📋 Deployment completed!"
echo ""
echo "Next steps:"
echo "1. Update your backend controllers to use the new permission system"
echo "2. Update frontend components with permission gates"
echo "3. Test the permission system with different user roles"