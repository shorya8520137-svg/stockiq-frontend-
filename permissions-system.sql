-- =====================================================
-- COMPREHENSIVE PERMISSIONS SYSTEM
-- Single DB file for complete permissions management
-- =====================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS user_permissions;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS audit_log;

-- =====================================================
-- 1. ROLES TABLE
-- =====================================================
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    level INT NOT NULL DEFAULT 1, -- Higher number = more permissions
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO roles (name, display_name, description, level) VALUES
('super_admin', 'Super Admin', 'Full system access with all permissions', 100),
('admin', 'Admin', 'Administrative access with most permissions', 80),
('manager', 'Manager', 'Management level access with operational permissions', 60),
('user', 'User', 'Standard user with basic permissions', 40),
('warehouse_staff', 'Warehouse Staff', 'Warehouse operations with limited permissions', 20);

-- =====================================================
-- 2. PERMISSIONS TABLE
-- =====================================================
CREATE TABLE permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- inventory, orders, admin, etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert permissions for different operations
INSERT INTO permissions (name, display_name, description, category) VALUES
-- Inventory Operations
('inventory.view', 'View Inventory', 'View inventory items and stock levels', 'inventory'),
('inventory.edit', 'Edit Inventory', 'Edit inventory items and details', 'inventory'),
('inventory.bulk_upload', 'Bulk Upload', 'Upload inventory in bulk via CSV/Excel', 'inventory'),
('inventory.damage', 'Record Damage', 'Record damaged inventory items', 'inventory'),
('inventory.recover', 'Record Recovery', 'Record recovered inventory items', 'inventory'),
('inventory.return', 'Process Returns', 'Process customer returns', 'inventory'),
('inventory.self_transfer', 'Self Transfer', 'Transfer inventory between warehouses', 'inventory'),
('inventory.export', 'Export Data', 'Export inventory data to Excel/CSV', 'inventory'),

-- Order Operations
('orders.view', 'View Orders', 'View order details and history', 'orders'),
('orders.create', 'Create Orders', 'Create new orders', 'orders'),
('orders.edit', 'Edit Orders', 'Edit existing orders', 'orders'),
('orders.dispatch', 'Dispatch Orders', 'Dispatch orders for delivery', 'orders'),
('orders.cancel', 'Cancel Orders', 'Cancel orders', 'orders'),

-- Product Operations
('products.view', 'View Products', 'View product catalog', 'products'),
('products.create', 'Create Products', 'Add new products to catalog', 'products'),
('products.edit', 'Edit Products', 'Edit existing products', 'products'),
('products.delete', 'Delete Products', 'Delete products from catalog', 'products'),
('products.categories', 'Manage Categories', 'Create and manage product categories', 'products'),

-- User Management
('users.view', 'View Users', 'View user accounts and details', 'admin'),
('users.create', 'Create Users', 'Create new user accounts', 'admin'),
('users.edit', 'Edit Users', 'Edit user accounts and permissions', 'admin'),
('users.delete', 'Delete Users', 'Delete user accounts', 'admin'),
('users.roles', 'Manage Roles', 'Assign and manage user roles', 'admin'),

-- System Administration
('admin.permissions', 'Manage Permissions', 'Manage system permissions and roles', 'admin'),
('admin.settings', 'System Settings', 'Access and modify system settings', 'admin'),
('admin.audit', 'View Audit Logs', 'View system audit logs and reports', 'admin'),
('admin.notifications', 'Manage Notifications', 'Manage system notifications', 'admin'),

-- Reports and Analytics
('reports.inventory', 'Inventory Reports', 'Generate inventory reports', 'reports'),
('reports.sales', 'Sales Reports', 'Generate sales and order reports', 'reports'),
('reports.analytics', 'Analytics Dashboard', 'Access analytics and insights', 'reports');

-- =====================================================
-- 3. ROLE PERMISSIONS (Default assignments)
-- =====================================================
CREATE TABLE role_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    granted_by INT, -- User ID who granted this permission
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_permission (role_id, permission_id)
);

-- Super Admin - ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'super_admin';

-- Admin - Most permissions except super admin functions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'admin' 
AND p.name NOT IN ('admin.permissions', 'users.delete');

-- Manager - Operational permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'manager' 
AND p.name IN (
    'inventory.view', 'inventory.edit', 'inventory.bulk_upload', 'inventory.damage', 
    'inventory.recover', 'inventory.return', 'inventory.self_transfer', 'inventory.export',
    'orders.view', 'orders.create', 'orders.edit', 'orders.dispatch',
    'products.view', 'products.create', 'products.edit', 'products.categories',
    'reports.inventory', 'reports.sales'
);

-- User - Basic permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'user' 
AND p.name IN (
    'inventory.view', 'inventory.return',
    'orders.view', 'orders.create',
    'products.view'
);

-- Warehouse Staff - Warehouse operations only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r 
CROSS JOIN permissions p 
WHERE r.name = 'warehouse_staff' 
AND p.name IN (
    'inventory.view', 'inventory.damage', 'inventory.recover', 
    'inventory.self_transfer', 'orders.dispatch'
);

-- =====================================================
-- 4. USER ROLES TABLE
-- =====================================================
CREATE TABLE user_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_by INT, -- User ID who assigned this role
    warehouse_code VARCHAR(20), -- Specific warehouse if role is warehouse-specific
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_role_warehouse (user_id, role_id, warehouse_code)
);

-- =====================================================
-- 5. USER SPECIFIC PERMISSIONS (Override role permissions)
-- =====================================================
CREATE TABLE user_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    permission_id INT NOT NULL,
    granted BOOLEAN DEFAULT TRUE, -- TRUE = grant, FALSE = revoke
    granted_by INT, -- User ID who granted/revoked this permission
    warehouse_code VARCHAR(20), -- Specific warehouse if permission is warehouse-specific
    expires_at TIMESTAMP NULL, -- Optional expiration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_permission_warehouse (user_id, permission_id, warehouse_code)
);

-- =====================================================
-- 6. NOTIFICATIONS SYSTEM
-- =====================================================
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type VARCHAR(50) NOT NULL, -- dispatch_submitted, permission_request, etc.
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    user_id INT, -- Target user (NULL for system-wide)
    role_name VARCHAR(50), -- Target role (NULL for specific user)
    warehouse_code VARCHAR(20), -- Warehouse-specific notifications
    data JSON, -- Additional data (order_id, product_id, etc.)
    is_read BOOLEAN DEFAULT FALSE,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    created_by INT, -- User who triggered the notification
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_role_unread (role_name, is_read),
    INDEX idx_warehouse (warehouse_code),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- 7. AUDIT LOG
-- =====================================================
CREATE TABLE audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100) NOT NULL, -- login, logout, create_order, etc.
    resource_type VARCHAR(50), -- order, product, inventory, etc.
    resource_id VARCHAR(100), -- ID of the affected resource
    old_values JSON, -- Previous values (for updates)
    new_values JSON, -- New values (for creates/updates)
    ip_address VARCHAR(45),
    user_agent TEXT,
    warehouse_code VARCHAR(20),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_action (user_id, action),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_warehouse_date (warehouse_code, created_at),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- 8. HELPER VIEWS FOR EASY QUERYING
-- =====================================================

-- View: User permissions with role inheritance
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
    ur.warehouse_code,
    ur.is_active,
    ur.created_at
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.is_active = TRUE AND r.is_active = TRUE;

-- =====================================================
-- 9. STORED PROCEDURES FOR COMMON OPERATIONS
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
        INSERT INTO audit_log (user_id, action, resource_type, resource_id, new_values, warehouse_code)
        VALUES (p_assigned_by, 'assign_role', 'user_role', p_user_id, 
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
-- 10. SAMPLE DATA FOR TESTING
-- =====================================================

-- Sample notifications for dispatch submissions
INSERT INTO notifications (type, title, message, role_name, warehouse_code, data, priority, created_by) VALUES
('dispatch_submitted', 'New Dispatch Submitted', 'Order #12345 has been submitted for dispatch approval', 'manager', 'GGM_WH', '{"order_id": "12345", "items_count": 5}', 'medium', 1),
('bulk_upload_completed', 'Bulk Upload Completed', '150 products uploaded successfully to inventory', 'admin', NULL, '{"uploaded_count": 150, "file_name": "inventory_update.xlsx"}', 'low', 2),
('low_stock_alert', 'Low Stock Alert', 'Product "Baby Diaper" is running low in stock (5 remaining)', 'warehouse_staff', 'GGM_WH', '{"product_id": "2460-3499", "current_stock": 5, "threshold": 10}', 'high', NULL);

-- Sample audit log entries
INSERT INTO audit_log (user_id, action, resource_type, resource_id, new_values, warehouse_code, success) VALUES
(1, 'login', 'user', '1', '{"login_time": "2024-01-09 10:00:00"}', NULL, TRUE),
(2, 'create_order', 'order', '12345', '{"customer_id": 100, "total_amount": 1500.00}', 'GGM_WH', TRUE),
(1, 'bulk_upload', 'inventory', 'bulk_001', '{"file_name": "inventory.xlsx", "records_count": 150}', 'GGM_WH', TRUE);

-- =====================================================
-- 11. INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional indexes for better performance
CREATE INDEX idx_user_roles_user_active ON user_roles(user_id, is_active);
CREATE INDEX idx_user_permissions_user_granted ON user_permissions(user_id, granted);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at);
CREATE INDEX idx_permissions_category_active ON permissions(category, is_active);

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

SELECT 'Permissions system setup completed successfully!' as status;
SELECT COUNT(*) as total_roles FROM roles;
SELECT COUNT(*) as total_permissions FROM permissions;
SELECT COUNT(*) as total_role_permissions FROM role_permissions;