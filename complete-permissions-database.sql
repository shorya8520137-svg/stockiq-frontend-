-- =====================================================
-- COMPLETE PERMISSIONS SYSTEM DATABASE SETUP
-- Single comprehensive script for hunyhuny_auto_dispatch
-- Run with: mysql -u root -p hunyhuny_auto_dispatch < complete-permissions-database.sql
-- =====================================================

USE hunyhuny_auto_dispatch;

-- =====================================================
-- 1. DROP EXISTING TABLES (Clean Setup)
-- =====================================================
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS user_permissions;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- 2. CREATE ROLES TABLE
-- =====================================================
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',
    level INT NOT NULL DEFAULT 1, -- Higher number = more permissions
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_level (level),
    INDEX idx_active (is_active)
);

-- Insert default roles
INSERT INTO roles (name, display_name, description, color, level) VALUES
('super_admin', 'Super Admin', 'Full system access with all permissions', '#ef4444', 100),
('admin', 'Admin', 'Administrative access with most permissions', '#f97316', 80),
('manager', 'Manager', 'Management operations and oversight', '#eab308', 60),
('operator', 'Operator', 'Operational tasks and daily operations', '#22c55e', 40),
('warehouse_staff', 'Warehouse Staff', 'Warehouse operations and inventory', '#3b82f6', 20),
('viewer', 'Viewer', 'Read-only access to view data', '#6366f1', 10);

-- =====================================================
-- 3. CREATE PERMISSIONS TABLE
-- =====================================================
CREATE TABLE permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_category (category),
    INDEX idx_active (is_active)
);

-- Insert all permissions
INSERT INTO permissions (name, display_name, description, category) VALUES
-- DASHBOARD PERMISSIONS
('DASHBOARD_VIEW', 'View Dashboard', 'Access to main dashboard', 'DASHBOARD'),
('DASHBOARD_STATS', 'View Statistics', 'View dashboard statistics and metrics', 'DASHBOARD'),
('DASHBOARD_CHARTS', 'View Charts', 'Access to dashboard charts and graphs', 'DASHBOARD'),
('DASHBOARD_EXPORT', 'Export Dashboard', 'Export dashboard data and reports', 'DASHBOARD'),
('DASHBOARD_CUSTOMIZE', 'Customize Dashboard', 'Customize dashboard layout and widgets', 'DASHBOARD'),

-- INVENTORY PERMISSIONS
('INVENTORY_VIEW', 'View Inventory', 'View inventory items and stock levels', 'INVENTORY'),
('INVENTORY_CREATE', 'Create Inventory', 'Add new inventory items', 'INVENTORY'),
('INVENTORY_EDIT', 'Edit Inventory', 'Modify existing inventory items', 'INVENTORY'),
('INVENTORY_DELETE', 'Delete Inventory', 'Remove inventory items', 'INVENTORY'),
('INVENTORY_BULK_UPLOAD', 'Bulk Upload Inventory', 'Upload inventory in bulk via CSV', 'INVENTORY'),
('INVENTORY_BULK_EXPORT', 'Bulk Export Inventory', 'Export inventory data in bulk', 'INVENTORY'),
('INVENTORY_TRANSFER', 'Transfer Inventory', 'Transfer inventory between warehouses', 'INVENTORY'),
('INVENTORY_ADJUST', 'Adjust Inventory', 'Make inventory adjustments and corrections', 'INVENTORY'),
('INVENTORY_AUDIT', 'Audit Inventory', 'Perform inventory audits and reconciliation', 'INVENTORY'),
('INVENTORY_TIMELINE', 'View Timeline', 'View inventory movement timeline', 'INVENTORY'),
('INVENTORY_REPORTS', 'Inventory Reports', 'Generate and view inventory reports', 'INVENTORY'),

-- ORDER PERMISSIONS
('ORDERS_VIEW', 'View Orders', 'View order list and details', 'ORDERS'),
('ORDERS_CREATE', 'Create Orders', 'Create new orders', 'ORDERS'),
('ORDERS_EDIT', 'Edit Orders', 'Modify existing orders', 'ORDERS'),
('ORDERS_DELETE', 'Delete Orders', 'Cancel or delete orders', 'ORDERS'),
('ORDERS_PROCESS', 'Process Orders', 'Process and fulfill orders', 'ORDERS'),
('ORDERS_DISPATCH', 'Dispatch Orders', 'Dispatch orders for delivery', 'ORDERS'),
('ORDERS_RETURNS', 'Handle Returns', 'Process order returns and refunds', 'ORDERS'),
('ORDERS_BULK_PROCESS', 'Bulk Process Orders', 'Process multiple orders at once', 'ORDERS'),
('ORDERS_EXPORT', 'Export Orders', 'Export order data and reports', 'ORDERS'),
('ORDERS_REPORTS', 'Order Reports', 'Generate and view order reports', 'ORDERS'),

-- TRACKING PERMISSIONS
('TRACKING_VIEW', 'View Tracking', 'View shipment tracking information', 'TRACKING'),
('TRACKING_UPDATE', 'Update Tracking', 'Update tracking status and information', 'TRACKING'),
('TRACKING_CREATE', 'Create Tracking', 'Create new tracking entries', 'TRACKING'),
('TRACKING_BULK_UPDATE', 'Bulk Update Tracking', 'Update multiple tracking entries', 'TRACKING'),
('TRACKING_REPORTS', 'Tracking Reports', 'Generate tracking and delivery reports', 'TRACKING'),
('TRACKING_NOTIFICATIONS', 'Tracking Notifications', 'Send tracking notifications to customers', 'TRACKING'),

-- MESSAGES PERMISSIONS
('MESSAGES_VIEW', 'View Messages', 'View team messages and communications', 'MESSAGES'),
('MESSAGES_SEND', 'Send Messages', 'Send messages to team members', 'MESSAGES'),
('MESSAGES_DELETE', 'Delete Messages', 'Delete messages and conversations', 'MESSAGES'),
('MESSAGES_MODERATE', 'Moderate Messages', 'Moderate team communications', 'MESSAGES'),
('MESSAGES_EXPORT', 'Export Messages', 'Export message history and logs', 'MESSAGES'),

-- PRODUCTS PERMISSIONS
('PRODUCTS_VIEW', 'View Products', 'View product catalog and details', 'PRODUCTS'),
('PRODUCTS_CREATE', 'Create Products', 'Add new products to catalog', 'PRODUCTS'),
('PRODUCTS_EDIT', 'Edit Products', 'Modify existing product information', 'PRODUCTS'),
('PRODUCTS_DELETE', 'Delete Products', 'Remove products from catalog', 'PRODUCTS'),
('PRODUCTS_BULK_IMPORT', 'Bulk Import Products', 'Import products in bulk via CSV', 'PRODUCTS'),
('PRODUCTS_BULK_EXPORT', 'Bulk Export Products', 'Export product data in bulk', 'PRODUCTS'),
('PRODUCTS_CATEGORIES', 'Manage Categories', 'Manage product categories and classifications', 'PRODUCTS'),
('PRODUCTS_PRICING', 'Manage Pricing', 'Update product prices and cost information', 'PRODUCTS'),
('PRODUCTS_REPORTS', 'Product Reports', 'Generate and view product reports', 'PRODUCTS'),

-- OPERATIONS PERMISSIONS
('OPERATIONS_DAMAGE_RECORD', 'Record Damage', 'Record damaged inventory items', 'OPERATIONS'),
('OPERATIONS_DAMAGE_RECOVER', 'Recover Damage', 'Process damage recovery operations', 'OPERATIONS'),
('OPERATIONS_WAREHOUSE_MANAGE', 'Manage Warehouses', 'Manage warehouse information and settings', 'OPERATIONS'),
('OPERATIONS_STAFF_MANAGE', 'Manage Staff', 'Manage warehouse staff and assignments', 'OPERATIONS'),
('OPERATIONS_QUALITY_CONTROL', 'Quality Control', 'Perform quality control checks', 'OPERATIONS'),
('OPERATIONS_REPORTS', 'Operations Reports', 'Generate operational reports and analytics', 'OPERATIONS'),

-- SYSTEM PERMISSIONS
('SYSTEM_USER_MANAGEMENT', 'User Management', 'Manage system users and accounts', 'SYSTEM'),
('SYSTEM_ROLE_MANAGEMENT', 'Role Management', 'Manage user roles and permissions', 'SYSTEM'),
('SYSTEM_PERMISSION_MANAGEMENT', 'Permission Management', 'Manage system permissions', 'SYSTEM'),
('SYSTEM_SETTINGS', 'System Settings', 'Configure system settings and preferences', 'SYSTEM'),
('SYSTEM_BACKUP', 'System Backup', 'Perform system backups and data export', 'SYSTEM'),
('SYSTEM_RESTORE', 'System Restore', 'Restore system from backups', 'SYSTEM'),
('SYSTEM_AUDIT_LOG', 'Audit Log', 'View system audit logs and user activities', 'SYSTEM'),
('SYSTEM_MAINTENANCE', 'System Maintenance', 'Perform system maintenance tasks', 'SYSTEM'),
('SYSTEM_MONITORING', 'System Monitoring', 'Monitor system performance and health', 'SYSTEM'),
('SYSTEM_INTEGRATION', 'System Integration', 'Manage external system integrations', 'SYSTEM');

-- =====================================================
-- 4. CREATE ROLE PERMISSIONS TABLE
-- =====================================================
CREATE TABLE role_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    granted_by INT NULL, -- User ID who granted this permission
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_permission (role_id, permission_id),
    INDEX idx_role (role_id),
    INDEX idx_permission (permission_id)
);

-- Assign all permissions to super_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'super_admin';

-- Assign permissions to admin (most permissions except critical system ones)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'admin' 
AND p.name NOT IN ('SYSTEM_BACKUP', 'SYSTEM_RESTORE', 'SYSTEM_MAINTENANCE');

-- Assign permissions to manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'manager' 
AND p.category IN ('DASHBOARD', 'INVENTORY', 'ORDERS', 'TRACKING', 'PRODUCTS', 'OPERATIONS')
AND p.name NOT LIKE '%DELETE%'
AND p.name NOT LIKE '%BULK%';

-- Assign permissions to operator
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'operator' 
AND p.category IN ('INVENTORY', 'ORDERS', 'TRACKING', 'OPERATIONS')
AND p.name NOT LIKE '%DELETE%'
AND p.name NOT LIKE '%MANAGE%';

-- Assign permissions to warehouse_staff
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'warehouse_staff' 
AND (p.category IN ('INVENTORY', 'OPERATIONS') 
     OR p.name IN ('ORDERS_VIEW', 'ORDERS_PROCESS', 'TRACKING_VIEW', 'TRACKING_UPDATE'));

-- Assign permissions to viewer (read-only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'viewer' 
AND p.name LIKE '%VIEW%';

-- =====================================================
-- 5. UPDATE USERS TABLE
-- =====================================================
-- Add role_id column to existing users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive') DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL;

-- Add foreign key constraint if it doesn't exist
SET @constraint_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = 'hunyhuny_auto_dispatch' 
    AND TABLE_NAME = 'users' 
    AND CONSTRAINT_NAME = 'users_role_fk');

SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE users ADD CONSTRAINT users_role_fk FOREIGN KEY (role_id) REFERENCES roles(id)', 
    'SELECT "Foreign key already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 6. CREATE USER ROLES TABLE (For multiple roles per user)
-- =====================================================
CREATE TABLE user_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_by INT NULL, -- User ID who assigned this role
    warehouse_code VARCHAR(20) NULL, -- Specific warehouse if role is warehouse-specific
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_role_warehouse (user_id, role_id, warehouse_code),
    INDEX idx_user (user_id),
    INDEX idx_role (role_id),
    INDEX idx_warehouse (warehouse_code)
);

-- =====================================================
-- 7. CREATE USER PERMISSIONS TABLE (Override role permissions)
-- =====================================================
CREATE TABLE user_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    permission_id INT NOT NULL,
    granted BOOLEAN DEFAULT TRUE, -- TRUE = grant, FALSE = revoke
    granted_by INT NULL, -- User ID who granted/revoked this permission
    warehouse_code VARCHAR(20) NULL, -- Specific warehouse if permission is warehouse-specific
    expires_at TIMESTAMP NULL, -- Optional expiration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_permission_warehouse (user_id, permission_id, warehouse_code),
    INDEX idx_user (user_id),
    INDEX idx_permission (permission_id),
    INDEX idx_warehouse (warehouse_code)
);

-- =====================================================
-- 8. CREATE NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type VARCHAR(50) NOT NULL, -- dispatch_submitted, permission_request, etc.
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    user_id INT NULL, -- Target user (NULL for system-wide)
    role_name VARCHAR(50) NULL, -- Target role (NULL for specific user)
    warehouse_code VARCHAR(20) NULL, -- Warehouse-specific notifications
    data JSON NULL, -- Additional data (order_id, product_id, etc.)
    is_read BOOLEAN DEFAULT FALSE,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    created_by INT NULL, -- User who triggered the notification
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_role_unread (role_name, is_read),
    INDEX idx_warehouse (warehouse_code),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- 9. CREATE AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL, -- login, logout, create_order, etc.
    resource VARCHAR(100) NOT NULL, -- order, product, inventory, etc.
    resource_id VARCHAR(100) NULL, -- ID of the affected resource
    old_values JSON NULL, -- Previous values (for updates)
    new_values JSON NULL, -- New values (for creates/updates)
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    warehouse_code VARCHAR(20) NULL,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_action (user_id, action),
    INDEX idx_resource (resource, resource_id),
    INDEX idx_warehouse_date (warehouse_code, created_at),
    INDEX idx_created_at (created_at),
    INDEX idx_success (success)
);

-- =====================================================
-- 10. CREATE HELPER VIEWS
-- =====================================================

-- View: User effective permissions (combines role and direct permissions)
CREATE VIEW user_effective_permissions AS
SELECT DISTINCT
    ur.user_id,
    p.name as permission_name,
    p.display_name as permission_display_name,
    p.category,
    ur.warehouse_code,
    'role' as source,
    r.name as role_name
FROM user_roles ur
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN roles r ON ur.role_id = r.id
WHERE ur.is_active = TRUE AND p.is_active = TRUE AND r.is_active = TRUE

UNION

SELECT DISTINCT
    up.user_id,
    p.name as permission_name,
    p.display_name as permission_display_name,
    p.category,
    up.warehouse_code,
    'direct' as source,
    NULL as role_name
FROM user_permissions up
JOIN permissions p ON up.permission_id = p.id
WHERE up.granted = TRUE 
AND p.is_active = TRUE 
AND (up.expires_at IS NULL OR up.expires_at > NOW());

-- View: User roles with details
CREATE VIEW user_roles_detailed AS
SELECT 
    ur.user_id,
    ur.role_id,
    r.name as role_name,
    r.display_name as role_display_name,
    r.level as role_level,
    r.color as role_color,
    ur.warehouse_code,
    ur.is_active,
    ur.created_at
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.is_active = TRUE AND r.is_active = TRUE;

-- =====================================================
-- 11. CREATE STORED PROCEDURES
-- =====================================================

DELIMITER //

-- Check if user has specific permission
CREATE PROCEDURE CheckUserPermission(
    IN p_user_id INT,
    IN p_permission_name VARCHAR(100),
    IN p_warehouse_code VARCHAR(20)
)
BEGIN
    SELECT COUNT(*) as has_permission
    FROM user_effective_permissions
    WHERE user_id = p_user_id 
    AND permission_name = p_permission_name
    AND (warehouse_code IS NULL OR warehouse_code = p_warehouse_code OR p_warehouse_code IS NULL);
END //

-- Assign role to user
CREATE PROCEDURE AssignUserRole(
    IN p_user_id INT,
    IN p_role_name VARCHAR(50),
    IN p_assigned_by INT,
    IN p_warehouse_code VARCHAR(20)
)
BEGIN
    DECLARE role_id INT;
    
    SELECT id INTO role_id FROM roles WHERE name = p_role_name AND is_active = TRUE;
    
    IF role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id, assigned_by, warehouse_code)
        VALUES (p_user_id, role_id, p_assigned_by, p_warehouse_code)
        ON DUPLICATE KEY UPDATE 
            is_active = TRUE,
            assigned_by = p_assigned_by,
            updated_at = CURRENT_TIMESTAMP;
            
        -- Log the action
        INSERT INTO audit_logs (user_id, action, resource, resource_id, new_values, warehouse_code)
        VALUES (p_assigned_by, 'ASSIGN_ROLE', 'USER_ROLE', p_user_id, 
                JSON_OBJECT('role_name', p_role_name, 'warehouse_code', p_warehouse_code), 
                p_warehouse_code);
    END IF;
END //

-- Create notification
CREATE PROCEDURE CreateNotification(
    IN p_type VARCHAR(50),
    IN p_title VARCHAR(200),
    IN p_message TEXT,
    IN p_user_id INT,
    IN p_role_name VARCHAR(50),
    IN p_warehouse_code VARCHAR(20),
    IN p_data JSON,
    IN p_priority ENUM('low', 'medium', 'high', 'urgent'),
    IN p_created_by INT
)
BEGIN
    INSERT INTO notifications (type, title, message, user_id, role_name, warehouse_code, data, priority, created_by)
    VALUES (p_type, p_title, p_message, p_user_id, p_role_name, p_warehouse_code, p_data, p_priority, p_created_by);
END //

DELIMITER ;

-- =====================================================
-- 12. INSERT SAMPLE DATA
-- =====================================================

-- Update existing users with roles (if they exist)
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'super_admin' LIMIT 1) 
WHERE email IN ('admin@hunyhuny.com', 'test@hunyhuny.com') AND role_id IS NULL;

-- Insert sample notifications
INSERT INTO notifications (type, title, message, role_name, warehouse_code, data, priority, created_by) VALUES
('dispatch_submitted', 'New Dispatch Submitted', 'Order #12345 has been submitted for dispatch approval', 'manager', 'GGM_WH', '{"order_id": "12345", "items_count": 5}', 'medium', 1),
('bulk_upload_completed', 'Bulk Upload Completed', '150 products uploaded successfully to inventory', 'admin', NULL, '{"uploaded_count": 150, "file_name": "inventory_update.xlsx"}', 'low', 1),
('low_stock_alert', 'Low Stock Alert', 'Product "Baby Diaper" is running low in stock (5 remaining)', 'warehouse_staff', 'GGM_WH', '{"product_id": "2460-3499", "current_stock": 5, "threshold": 10}', 'high', NULL);

-- Insert sample audit log entries
INSERT INTO audit_logs (user_id, action, resource, resource_id, new_values, warehouse_code, success, created_at) VALUES
(1, 'LOGIN', 'USER', '1', '{"ip": "192.168.1.100", "user_agent": "Chrome"}', NULL, TRUE, NOW() - INTERVAL 1 HOUR),
(1, 'CREATE_PRODUCT', 'PRODUCT', 'P001', '{"product_name": "Test Product", "barcode": "123456789"}', 'GGM_WH', TRUE, NOW() - INTERVAL 2 HOUR),
(1, 'BULK_UPLOAD', 'INVENTORY', 'BULK001', '{"file_name": "inventory.xlsx", "records_count": 150}', 'GGM_WH', TRUE, NOW() - INTERVAL 3 HOUR),
(1, 'DISPATCH_ORDER', 'ORDER', 'ORD001', '{"order_id": "ORD001", "warehouse": "GGM_WH", "items": 5}', 'GGM_WH', TRUE, NOW() - INTERVAL 4 HOUR),
(1, 'UPDATE_INVENTORY', 'INVENTORY', 'INV001', '{"product": "Baby Diaper", "old_stock": 100, "new_stock": 95}', 'GGM_WH', TRUE, NOW() - INTERVAL 5 HOUR),
(1, 'EXPORT_DATA', 'INVENTORY', 'EXP001', '{"export_type": "products", "format": "xlsx", "records": 2600}', 'GGM_WH', TRUE, NOW() - INTERVAL 6 HOUR),
(1, 'CREATE_USER', 'USER', '2', '{"name": "Manager User", "email": "manager@example.com", "role": "manager"}', NULL, TRUE, NOW() - INTERVAL 7 HOUR),
(1, 'DAMAGE_RECORD', 'INVENTORY', 'DMG001', '{"product": "Electronics Item", "quantity": 2, "reason": "Water damage"}', 'GGM_WH', TRUE, NOW() - INTERVAL 8 HOUR),
(1, 'RETURN_PROCESS', 'ORDER', 'RET001', '{"return_id": "RET001", "order_id": "ORD002", "items": 3}', 'GGM_WH', TRUE, NOW() - INTERVAL 9 HOUR),
(1, 'SELF_TRANSFER', 'INVENTORY', 'TRF001', '{"from_warehouse": "GGM_WH", "to_warehouse": "BLR_WH", "items": 10}', 'GGM_WH', TRUE, NOW() - INTERVAL 10 HOUR);

-- =====================================================
-- 13. FINAL VERIFICATION
-- =====================================================

-- Display setup summary
SELECT 'PERMISSIONS SYSTEM SETUP COMPLETED SUCCESSFULLY!' as status;
SELECT COUNT(*) as total_roles FROM roles;
SELECT COUNT(*) as total_permissions FROM permissions;
SELECT COUNT(*) as total_role_permissions FROM role_permissions;
SELECT COUNT(*) as total_notifications FROM notifications;
SELECT COUNT(*) as total_audit_logs FROM audit_logs;

-- Show role permission counts
SELECT 
    r.name as role_name,
    r.display_name,
    COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name, r.display_name
ORDER BY r.level DESC;

-- Show users with roles (if any exist)
SELECT 
    u.name as user_name,
    u.email,
    r.name as role_name,
    r.display_name as role_display_name,
    u.status
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.role_id IS NOT NULL
ORDER BY r.level DESC;

SELECT 'Setup completed! You can now use the permissions system.' as message;