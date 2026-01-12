-- =====================================================
-- ENHANCED PERMISSIONS SYSTEM DATABASE SCHEMA
-- Builds upon existing structure with comprehensive features
-- =====================================================

-- Use your existing database
USE inventory_db_2026;

-- =====================================================
-- 1. ENHANCE EXISTING USERS TABLE
-- =====================================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS session_token VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS warehouse_access JSON NULL COMMENT 'Array of warehouse codes user can access',
ADD COLUMN IF NOT EXISTS preferences JSON NULL COMMENT 'User preferences and settings',
ADD COLUMN IF NOT EXISTS profile_image VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS department VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS manager_id INT NULL,
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_online_status ON users(is_online, last_activity);
CREATE INDEX IF NOT EXISTS idx_users_session ON users(session_token);
CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id);

-- =====================================================
-- 2. ENHANCE EXISTING ROLES TABLE
-- =====================================================
ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS priority INT DEFAULT 100 COMMENT 'Lower number = higher priority',
ADD COLUMN IF NOT EXISTS can_manage_users BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_approve_requests BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS max_approval_amount DECIMAL(15,2) NULL,
ADD COLUMN IF NOT EXISTS warehouse_restrictions JSON NULL COMMENT 'Warehouse access restrictions',
ADD COLUMN IF NOT EXISTS working_hours JSON NULL COMMENT 'Allowed working hours',
ADD COLUMN IF NOT EXISTS ip_restrictions JSON NULL COMMENT 'IP address restrictions';

-- Update existing roles with priorities
UPDATE roles SET priority = 1 WHERE name = 'super_admin';
UPDATE roles SET priority = 2 WHERE name = 'admin';
UPDATE roles SET priority = 3 WHERE name = 'manager';
UPDATE roles SET priority = 4 WHERE name = 'user';
UPDATE roles SET priority = 5 WHERE name = 'warehouse_staff';

-- =====================================================
-- 3. ENHANCE EXISTING PERMISSIONS TABLE
-- =====================================================
ALTER TABLE permissions 
ADD COLUMN IF NOT EXISTS component VARCHAR(100) NULL COMMENT 'Frontend component this permission applies to',
ADD COLUMN IF NOT EXISTS action_type ENUM('create', 'read', 'update', 'delete', 'execute', 'approve') DEFAULT 'read',
ADD COLUMN IF NOT EXISTS resource_type VARCHAR(100) NULL COMMENT 'Type of resource (product, order, user, etc.)',
ADD COLUMN IF NOT EXISTS conditions JSON NULL COMMENT 'Conditional permission rules',
ADD COLUMN IF NOT EXISTS risk_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approval_workflow JSON NULL COMMENT 'Approval workflow configuration';

-- Insert component-specific permissions
INSERT IGNORE INTO permissions (name, display_name, description, category, component, action_type, resource_type, risk_level) VALUES
-- Dashboard Permissions
('dashboard.view', 'View Dashboard', 'Access main dashboard', 'dashboard', 'Dashboard', 'read', 'dashboard', 'low'),
('dashboard.analytics', 'View Analytics', 'Access analytics and reports', 'dashboard', 'Dashboard', 'read', 'analytics', 'medium'),
('dashboard.export', 'Export Dashboard Data', 'Export dashboard data', 'dashboard', 'Dashboard', 'execute', 'export', 'medium'),

-- Inventory Component Permissions
('inventory.timeline.view', 'View Inventory Timeline', 'View product timeline and history', 'inventory', 'InventorySheet', 'read', 'timeline', 'low'),
('inventory.bulk_upload', 'Bulk Upload Inventory', 'Upload inventory via CSV/Excel', 'inventory', 'InventorySheet', 'create', 'bulk_data', 'high'),
('inventory.export', 'Export Inventory', 'Export inventory data', 'inventory', 'InventorySheet', 'execute', 'export', 'medium'),
('inventory.damage.record', 'Record Damage', 'Record damaged inventory items', 'inventory', 'Operations', 'create', 'damage_report', 'medium'),
('inventory.recover', 'Recover Items', 'Recover damaged inventory items', 'inventory', 'Operations', 'execute', 'recovery', 'medium'),
('inventory.return.process', 'Process Returns', 'Process customer returns', 'inventory', 'Operations', 'execute', 'return', 'medium'),
('inventory.self_transfer', 'Self Transfer', 'Transfer inventory between warehouses', 'inventory', 'Operations', 'execute', 'transfer', 'high'),

-- Product Component Permissions
('products.add', 'Add Products', 'Create new products', 'products', 'ProductManager', 'create', 'product', 'medium'),
('products.bulk_import', 'Bulk Import Products', 'Import products via CSV/Excel', 'products', 'ProductManager', 'create', 'bulk_data', 'high'),
('products.export', 'Export Products', 'Export product data', 'products', 'ProductManager', 'execute', 'export', 'medium'),
('products.categories.manage', 'Manage Categories', 'Create and manage product categories', 'products', 'ProductManager', 'create', 'category', 'medium'),

-- Order Component Permissions
('orders.kpi.view', 'View Order KPIs', 'View order statistics and KPIs', 'orders', 'OrderSheet', 'read', 'kpi', 'low'),
('orders.delete', 'Delete Orders', 'Delete order entries', 'orders', 'OrderSheet', 'delete', 'order', 'high'),
('orders.status.update', 'Update Order Status', 'Update order status', 'orders', 'OrderSheet', 'update', 'order_status', 'medium'),
('orders.remarks.edit', 'Edit Order Remarks', 'Add/edit order remarks', 'orders', 'OrderSheet', 'update', 'order_remarks', 'low'),

-- Dispatch Permissions
('dispatch.create', 'Create Dispatch', 'Create dispatch orders', 'dispatch', 'Operations', 'create', 'dispatch', 'medium'),
('dispatch.approve', 'Approve Dispatch', 'Approve dispatch requests', 'dispatch', 'Operations', 'approve', 'dispatch', 'high'),

-- System Administration Permissions
('system.users.view', 'View Users', 'View user accounts', 'system', 'UserManagement', 'read', 'user', 'medium'),
('system.users.create', 'Create Users', 'Create new user accounts', 'system', 'UserManagement', 'create', 'user', 'high'),
('system.users.edit', 'Edit Users', 'Edit user accounts', 'system', 'UserManagement', 'update', 'user', 'high'),
('system.users.delete', 'Delete Users', 'Delete user accounts', 'system', 'UserManagement', 'delete', 'user', 'critical'),
('system.permissions.manage', 'Manage Permissions', 'Manage system permissions', 'system', 'PermissionManagement', 'update', 'permission', 'critical'),
('system.audit.view', 'View Audit Logs', 'View system audit logs', 'system', 'AuditLog', 'read', 'audit_log', 'high'),
('system.notifications.manage', 'Manage Notifications', 'Manage system notifications', 'system', 'NotificationManagement', 'update', 'notification', 'medium');

-- =====================================================
-- 4. CREATE USER SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    device_info JSON NULL,
    location_info JSON NULL,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    end_reason ENUM('logout', 'timeout', 'forced', 'expired') NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token),
    INDEX idx_user_active (user_id, is_active),
    INDEX idx_expires_at (expires_at),
    INDEX idx_last_activity (last_activity)
);

-- =====================================================
-- 5. CREATE PERMISSION REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS permission_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    requested_permission_id INT NOT NULL,
    requested_by INT NOT NULL,
    reason TEXT NOT NULL,
    business_justification TEXT NULL,
    temporary BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NULL,
    status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT 'pending',
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_requests (user_id, status),
    INDEX idx_pending_requests (status, created_at),
    INDEX idx_expires_at (expires_at)
);

-- =====================================================
-- 6. ENHANCE EXISTING NOTIFICATIONS TABLE
-- =====================================================
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS category ENUM('system', 'user', 'dispatch', 'approval', 'security', 'inventory') DEFAULT 'system',
ADD COLUMN IF NOT EXISTS action_url VARCHAR(500) NULL COMMENT 'URL to navigate when clicked',
ADD COLUMN IF NOT EXISTS action_data JSON NULL COMMENT 'Data for action buttons',
ADD COLUMN IF NOT EXISTS delivery_method ENUM('in_app', 'email', 'sms', 'push') DEFAULT 'in_app',
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS auto_dismiss BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dismiss_after INT NULL COMMENT 'Auto dismiss after N seconds';

-- Create notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    title_template VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    category ENUM('system', 'user', 'dispatch', 'approval', 'security', 'inventory') NOT NULL,
    default_priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    auto_dismiss BOOLEAN DEFAULT FALSE,
    dismiss_after INT NULL,
    variables JSON NULL COMMENT 'Available template variables',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert notification templates
INSERT IGNORE INTO notification_templates (name, title_template, message_template, category, default_priority, variables) VALUES
('user_created', 'New User Created', 'User {{user_name}} ({{user_email}}) has been created with role {{role_name}}', 'user', 'normal', '{"user_name": "string", "user_email": "string", "role_name": "string", "created_by": "string"}'),
('dispatch_submitted', 'Dispatch Submitted', 'Order {{order_ref}} has been submitted for dispatch by {{submitted_by}}', 'dispatch', 'high', '{"order_ref": "string", "submitted_by": "string", "warehouse": "string", "items_count": "number"}'),
('permission_granted', 'Permission Granted', 'You have been granted {{permission_name}} permission by {{granted_by}}', 'user', 'normal', '{"permission_name": "string", "granted_by": "string", "expires_at": "datetime"}'),
('permission_revoked', 'Permission Revoked', 'Your {{permission_name}} permission has been revoked by {{revoked_by}}', 'user', 'high', '{"permission_name": "string", "revoked_by": "string", "reason": "string"}'),
('approval_required', 'Approval Required', '{{operation_type}} operation requires your approval: {{description}}', 'approval', 'urgent', '{"operation_type": "string", "description": "string", "requested_by": "string", "request_id": "number"}'),
('low_stock_alert', 'Low Stock Alert', 'Product {{product_name}} is running low in {{warehouse}} ({{current_stock}} remaining)', 'inventory', 'high', '{"product_name": "string", "warehouse": "string", "current_stock": "number", "threshold": "number"}');

-- =====================================================
-- 7. ENHANCE EXISTING AUDIT_LOG TABLE
-- =====================================================
ALTER TABLE audit_log 
ADD COLUMN IF NOT EXISTS session_id INT NULL,
ADD COLUMN IF NOT EXISTS component VARCHAR(100) NULL COMMENT 'Frontend component',
ADD COLUMN IF NOT EXISTS method VARCHAR(10) NULL COMMENT 'HTTP method',
ADD COLUMN IF NOT EXISTS endpoint VARCHAR(255) NULL COMMENT 'API endpoint',
ADD COLUMN IF NOT EXISTS request_data JSON NULL COMMENT 'Request payload',
ADD COLUMN IF NOT EXISTS response_data JSON NULL COMMENT 'Response data',
ADD COLUMN IF NOT EXISTS duration_ms INT NULL COMMENT 'Request duration in milliseconds',
ADD COLUMN IF NOT EXISTS risk_score INT DEFAULT 0 COMMENT 'Risk assessment score 0-100',
ADD COLUMN IF NOT EXISTS tags JSON NULL COMMENT 'Searchable tags',
ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(255) NULL COMMENT 'Request correlation ID';

-- Add foreign key for session
ALTER TABLE audit_log ADD CONSTRAINT fk_audit_session 
FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_component ON audit_log(component, action);
CREATE INDEX IF NOT EXISTS idx_audit_risk ON audit_log(risk_score, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_correlation ON audit_log(correlation_id);

-- =====================================================
-- 8. CREATE COMPONENT PERMISSIONS MAPPING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS component_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    component_name VARCHAR(100) NOT NULL,
    component_path VARCHAR(255) NOT NULL,
    required_permissions JSON NOT NULL COMMENT 'Array of required permission names',
    optional_permissions JSON NULL COMMENT 'Array of optional permission names',
    fallback_component VARCHAR(255) NULL COMMENT 'Component to show if no permissions',
    description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_component (component_name, component_path),
    INDEX idx_component_active (component_name, is_active)
);

-- Insert component permission mappings
INSERT IGNORE INTO component_permissions (component_name, component_path, required_permissions, optional_permissions, description) VALUES
('Dashboard', '/dashboard', '["dashboard.view"]', '["dashboard.analytics", "dashboard.export"]', 'Main dashboard component'),
('ProductManager', '/products', '["products.view"]', '["products.add", "products.bulk_import", "products.export", "products.categories.manage"]', 'Product management component'),
('InventorySheet', '/inventory', '["inventory.view"]', '["inventory.timeline.view", "inventory.bulk_upload", "inventory.export"]', 'Inventory management component'),
('OrderSheet', '/orders', '["orders.view"]', '["orders.kpi.view", "orders.delete", "orders.status.update", "orders.remarks.edit"]', 'Order management component'),
('DispatchForm', '/order/dispatch', '["dispatch.create"]', '["dispatch.approve"]', 'Dispatch creation form'),
('Operations', '/operations', '["inventory.view"]', '["inventory.damage.record", "inventory.recover", "inventory.return.process", "inventory.self_transfer"]', 'Operations component'),
('UserManagement', '/admin/users', '["system.users.view"]', '["system.users.create", "system.users.edit", "system.users.delete"]', 'User management interface'),
('PermissionManagement', '/admin/permissions', '["system.permissions.manage"]', '[]', 'Permission management interface'),
('AuditLog', '/admin/audit', '["system.audit.view"]', '[]', 'Audit log viewer'),
('NotificationCenter', '/notifications', '[]', '["system.notifications.manage"]', 'Notification center');

-- =====================================================
-- 9. CREATE ONLINE USERS TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_activity_tracking (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_id INT NULL,
    activity_type ENUM('login', 'logout', 'page_view', 'action', 'idle', 'active') NOT NULL,
    page_url VARCHAR(500) NULL,
    component VARCHAR(100) NULL,
    action_details JSON NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL,
    INDEX idx_user_activity (user_id, timestamp),
    INDEX idx_activity_type (activity_type, timestamp),
    INDEX idx_session_activity (session_id, timestamp)
);

-- =====================================================
-- 10. CREATE STORED PROCEDURES FOR PERMISSION CHECKING
-- =====================================================

DELIMITER //

-- Check if user has specific permission
CREATE PROCEDURE IF NOT EXISTS CheckUserPermission(
    IN p_user_id INT,
    IN p_permission_name VARCHAR(100),
    IN p_warehouse_code VARCHAR(20)
)
BEGIN
    DECLARE permission_count INT DEFAULT 0;
    
    -- Check role-based permissions
    SELECT COUNT(*) INTO permission_count
    FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN role_permissions rp ON r.id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = p_user_id 
    AND p.name = p_permission_name
    AND u.status = 'active'
    AND r.is_active = TRUE
    AND p.is_active = TRUE;
    
    -- If no role permission, check user-specific permissions
    IF permission_count = 0 THEN
        SELECT COUNT(*) INTO permission_count
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = p_user_id
        AND p.name = p_permission_name
        AND up.granted = TRUE
        AND p.is_active = TRUE
        AND (up.expires_at IS NULL OR up.expires_at > NOW())
        AND (up.warehouse_code IS NULL OR up.warehouse_code = p_warehouse_code OR p_warehouse_code IS NULL);
    END IF;
    
    SELECT permission_count > 0 as has_permission;
END //

-- Get user's effective permissions
CREATE PROCEDURE IF NOT EXISTS GetUserPermissions(
    IN p_user_id INT
)
BEGIN
    -- Get all effective permissions (role + user-specific)
    SELECT DISTINCT
        p.name,
        p.display_name,
        p.category,
        p.component,
        p.action_type,
        p.resource_type,
        p.risk_level,
        'role' as source,
        r.name as role_name,
        NULL as expires_at
    FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN role_permissions rp ON r.id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = p_user_id
    AND u.status = 'active'
    AND r.is_active = TRUE
    AND p.is_active = TRUE
    
    UNION
    
    SELECT DISTINCT
        p.name,
        p.display_name,
        p.category,
        p.component,
        p.action_type,
        p.resource_type,
        p.risk_level,
        'direct' as source,
        NULL as role_name,
        up.expires_at
    FROM user_permissions up
    JOIN permissions p ON up.permission_id = p.id
    WHERE up.user_id = p_user_id
    AND up.granted = TRUE
    AND p.is_active = TRUE
    AND (up.expires_at IS NULL OR up.expires_at > NOW())
    
    ORDER BY category, name;
END //

-- Log user activity
CREATE PROCEDURE IF NOT EXISTS LogUserActivity(
    IN p_user_id INT,
    IN p_session_id INT,
    IN p_activity_type VARCHAR(20),
    IN p_page_url VARCHAR(500),
    IN p_component VARCHAR(100),
    IN p_action_details JSON,
    IN p_ip_address VARCHAR(45),
    IN p_user_agent TEXT
)
BEGIN
    INSERT INTO user_activity_tracking (
        user_id, session_id, activity_type, page_url, component, 
        action_details, ip_address, user_agent
    ) VALUES (
        p_user_id, p_session_id, p_activity_type, p_page_url, p_component,
        p_action_details, p_ip_address, p_user_agent
    );
    
    -- Update user's last activity
    UPDATE users 
    SET last_activity = NOW(), is_online = TRUE 
    WHERE id = p_user_id;
    
    -- Update session's last activity
    IF p_session_id IS NOT NULL THEN
        UPDATE user_sessions 
        SET last_activity = NOW() 
        WHERE id = p_session_id;
    END IF;
END //

-- Create notification from template
CREATE PROCEDURE IF NOT EXISTS CreateNotificationFromTemplate(
    IN p_template_name VARCHAR(100),
    IN p_target_user_id INT,
    IN p_target_role VARCHAR(50),
    IN p_variables JSON,
    IN p_created_by INT
)
BEGIN
    DECLARE template_title VARCHAR(255);
    DECLARE template_message TEXT;
    DECLARE template_category VARCHAR(20);
    DECLARE template_priority VARCHAR(10);
    DECLARE template_auto_dismiss BOOLEAN;
    DECLARE template_dismiss_after INT;
    
    -- Get template details
    SELECT title_template, message_template, category, default_priority, auto_dismiss, dismiss_after
    INTO template_title, template_message, template_category, template_priority, template_auto_dismiss, template_dismiss_after
    FROM notification_templates
    WHERE name = p_template_name AND is_active = TRUE;
    
    -- Replace variables in title and message (simplified - in real implementation use proper template engine)
    -- For now, just insert the notification
    INSERT INTO notifications (
        title, message, type, target_user_id, target_role, 
        category, priority, created_by, data, auto_dismiss, dismiss_after
    ) VALUES (
        template_title, template_message, template_category, p_target_user_id, p_target_role,
        template_category, template_priority, p_created_by, p_variables, template_auto_dismiss, template_dismiss_after
    );
    
    SELECT LAST_INSERT_ID() as notification_id;
END //

DELIMITER ;

-- =====================================================
-- 11. CREATE VIEWS FOR EASY QUERYING
-- =====================================================

-- Active users with their permissions
CREATE OR REPLACE VIEW active_users_with_permissions AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.status,
    u.is_online,
    u.last_activity,
    r.name as role_name,
    r.display_name as role_display_name,
    r.priority as role_priority,
    GROUP_CONCAT(DISTINCT p.name ORDER BY p.name) as permissions,
    COUNT(DISTINCT p.id) as permission_count
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id AND p.is_active = TRUE
WHERE u.status = 'active'
GROUP BY u.id, u.name, u.email, u.status, u.is_online, u.last_activity, r.name, r.display_name, r.priority;

-- Component access matrix
CREATE OR REPLACE VIEW component_access_matrix AS
SELECT 
    cp.component_name,
    cp.component_path,
    u.id as user_id,
    u.name as user_name,
    u.email as user_email,
    r.name as role_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM permissions p
            JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = u.role_id
            AND JSON_CONTAINS(cp.required_permissions, CONCAT('"', p.name, '"'))
            AND p.is_active = TRUE
        ) THEN TRUE
        ELSE FALSE
    END as has_access
FROM component_permissions cp
CROSS JOIN users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.status = 'active' AND cp.is_active = TRUE;

-- Recent activity summary
CREATE OR REPLACE VIEW recent_activity_summary AS
SELECT 
    u.name as user_name,
    u.email as user_email,
    uat.activity_type,
    uat.component,
    uat.page_url,
    uat.timestamp,
    uat.ip_address,
    CASE 
        WHEN uat.timestamp > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 'active'
        WHEN uat.timestamp > DATE_SUB(NOW(), INTERVAL 30 MINUTE) THEN 'recent'
        ELSE 'idle'
    END as activity_status
FROM user_activity_tracking uat
JOIN users u ON uat.user_id = u.id
WHERE uat.timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY uat.timestamp DESC;

-- =====================================================
-- 12. INSERT SAMPLE DATA FOR TESTING
-- =====================================================

-- Update existing admin user with enhanced fields
UPDATE users SET 
    is_online = FALSE,
    warehouse_access = '["GGM_WH", "MAIN_WH", "NORTH_WH", "SOUTH_WH"]',
    preferences = '{"theme": "light", "language": "en", "notifications": true}',
    department = 'Administration',
    timezone = 'Asia/Kolkata'
WHERE email = 'admin@hunyhuny.com';

-- Create sample notification
INSERT IGNORE INTO notifications (
    title, message, type, target_role, category, priority, 
    data, created_by
) VALUES (
    'System Enhanced', 
    'Permissions system has been upgraded with new features', 
    'info', 
    NULL, 
    'system', 
    'normal',
    '{"version": "2.0", "features": ["component_permissions", "audit_tracking", "real_time_notifications"]}',
    1
);

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

SELECT 'Enhanced permissions system setup completed successfully!' as status;
SELECT COUNT(*) as total_users FROM users WHERE status = 'active';
SELECT COUNT(*) as total_permissions FROM permissions WHERE is_active = TRUE;
SELECT COUNT(*) as total_components FROM component_permissions WHERE is_active = TRUE;
SELECT COUNT(*) as total_templates FROM notification_templates WHERE is_active = TRUE;