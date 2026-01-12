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

-- =====================================================
-- ENHANCED ROLE PERMISSIONS
-- =====================================================

-- Get permission IDs for new permissions
SET @dashboard_view = (SELECT id FROM permissions WHERE name = 'DASHBOARD_VIEW');
SET @timeline_view = (SELECT id FROM permissions WHERE name = 'TIMELINE_VIEW');
SET @dispatch_view = (SELECT id FROM permissions WHERE name = 'DISPATCH_VIEW');
SET @dispatch_create = (SELECT id FROM permissions WHERE name = 'DISPATCH_CREATE');
SET @dispatch_edit = (SELECT id FROM permissions WHERE name = 'DISPATCH_EDIT');
SET @returns_view = (SELECT id FROM permissions WHERE name = 'RETURNS_VIEW');
SET @damage_view = (SELECT id FROM permissions WHERE name = 'DAMAGE_VIEW');
SET @messages_view = (SELECT id FROM permissions WHERE name = 'MESSAGES_VIEW');
SET @messages_send = (SELECT id FROM permissions WHERE name = 'MESSAGES_SEND');
SET @search_view = (SELECT id FROM permissions WHERE name = 'SEARCH_VIEW');
SET @reports_view = (SELECT id FROM permissions WHERE name = 'REPORTS_VIEW');
SET @admin_panel = (SELECT id FROM permissions WHERE name = 'ADMIN_PANEL');
SET @audit_logs = (SELECT id FROM permissions WHERE name = 'AUDIT_LOGS');

-- Super Admin gets all permissions
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) 
SELECT 1, id FROM permissions WHERE is_active = 1;

-- Admin gets most permissions except user management
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(2, @dashboard_view),
(2, @timeline_view),
(2, @dispatch_view),
(2, @dispatch_create),
(2, @dispatch_edit),
(2, @returns_view),
(2, @damage_view),
(2, @messages_view),
(2, @messages_send),
(2, @search_view),
(2, @reports_view);

-- Manager gets operational permissions
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(3, @dashboard_view),
(3, @timeline_view),
(3, @dispatch_view),
(3, @dispatch_create),
(3, @returns_view),
(3, @messages_view),
(3, @messages_send),
(3, @search_view),
(3, @reports_view);

-- User gets basic permissions
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(4, @dashboard_view),
(4, @timeline_view),
(4, @dispatch_view),
(4, @messages_view),
(4, @search_view);

-- =====================================================
-- VIEWS FOR EFFICIENT PERMISSION CHECKING
-- =====================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS `user_effective_permissions`;

-- Create view for user effective permissions
CREATE VIEW `user_effective_permissions` AS
SELECT DISTINCT
    u.id as user_id,
    u.name as username,
    u.email,
    p.id as permission_id,
    p.name as permission_name,
    p.display_name as permission_display_name,
    p.category as permission_category,
    'role' as permission_source,
    r.name as role_name
FROM users u
JOIN roles r ON u.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.is_active = 1 AND r.is_active = 1 AND p.is_active = 1

UNION

SELECT DISTINCT
    u.id as user_id,
    u.name as username,
    u.email,
    p.id as permission_id,
    p.name as permission_name,
    p.display_name as permission_display_name,
    p.category as permission_category,
    'direct' as permission_source,
    NULL as role_name
FROM users u
JOIN user_permissions up ON u.id = up.user_id
JOIN permissions p ON up.permission_id = p.id
WHERE u.is_active = 1 AND up.is_active = 1 AND p.is_active = 1
AND (up.expires_at IS NULL OR up.expires_at > NOW());

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for user_permissions
CREATE INDEX IF NOT EXISTS `idx_user_permissions_user_id` ON `user_permissions`(`user_id`);
CREATE INDEX IF NOT EXISTS `idx_user_permissions_permission_id` ON `user_permissions`(`permission_id`);
CREATE INDEX IF NOT EXISTS `idx_user_permissions_active` ON `user_permissions`(`is_active`);

-- Indexes for user_activity_tracking
CREATE INDEX IF NOT EXISTS `idx_user_activity_user_id` ON `user_activity_tracking`(`user_id`);
CREATE INDEX IF NOT EXISTS `idx_user_activity_online` ON `user_activity_tracking`(`is_online`);
CREATE INDEX IF NOT EXISTS `idx_user_activity_last_activity` ON `user_activity_tracking`(`last_activity`);

-- Indexes for component_permissions
CREATE INDEX IF NOT EXISTS `idx_component_permissions_name` ON `component_permissions`(`component_name`);
CREATE INDEX IF NOT EXISTS `idx_component_permissions_active` ON `component_permissions`(`is_active`);

-- Indexes for permission_requests
CREATE INDEX IF NOT EXISTS `idx_permission_requests_user_id` ON `permission_requests`(`user_id`);
CREATE INDEX IF NOT EXISTS `idx_permission_requests_status` ON `permission_requests`(`status`);
CREATE INDEX IF NOT EXISTS `idx_permission_requests_created_at` ON `permission_requests`(`created_at`);

-- =====================================================
-- STORED PROCEDURES FOR COMMON OPERATIONS
-- =====================================================

DELIMITER //

-- Procedure to check user permission
CREATE PROCEDURE IF NOT EXISTS `CheckUserPermission`(
    IN p_user_id INT,
    IN p_permission_name VARCHAR(100),
    OUT p_has_permission BOOLEAN
)
BEGIN
    DECLARE permission_count INT DEFAULT 0;
    
    SELECT COUNT(*) INTO permission_count
    FROM user_effective_permissions
    WHERE user_id = p_user_id 
    AND permission_name = p_permission_name;
    
    SET p_has_permission = (permission_count > 0);
END //

-- Procedure to grant permission to user
CREATE PROCEDURE IF NOT EXISTS `GrantUserPermission`(
    IN p_user_id INT,
    IN p_permission_id INT,
    IN p_granted_by INT,
    IN p_expires_at TIMESTAMP
)
BEGIN
    INSERT INTO user_permissions (user_id, permission_id, granted_by, expires_at)
    VALUES (p_user_id, p_permission_id, p_granted_by, p_expires_at)
    ON DUPLICATE KEY UPDATE
        granted_by = p_granted_by,
        granted_at = CURRENT_TIMESTAMP,
        expires_at = p_expires_at,
        is_active = 1;
END //

-- Procedure to revoke permission from user
CREATE PROCEDURE IF NOT EXISTS `RevokeUserPermission`(
    IN p_user_id INT,
    IN p_permission_id INT
)
BEGIN
    UPDATE user_permissions 
    SET is_active = 0 
    WHERE user_id = p_user_id AND permission_id = p_permission_id;
END //

-- Procedure to update user activity
CREATE PROCEDURE IF NOT EXISTS `UpdateUserActivity`(
    IN p_user_id INT,
    IN p_action VARCHAR(100),
    IN p_component VARCHAR(50),
    IN p_session_data JSON,
    IN p_ip_address VARCHAR(45),
    IN p_user_agent TEXT
)
BEGIN
    INSERT INTO user_activity_tracking (
        user_id, is_online, current_action, current_component, 
        session_data, ip_address, user_agent
    )
    VALUES (
        p_user_id, 1, p_action, p_component, 
        p_session_data, p_ip_address, p_user_agent
    )
    ON DUPLICATE KEY UPDATE
        is_online = 1,
        last_activity = CURRENT_TIMESTAMP,
        current_action = p_action,
        current_component = p_component,
        session_data = p_session_data,
        ip_address = p_ip_address,
        user_agent = p_user_agent;
END //

DELIMITER ;

-- =====================================================
-- TRIGGERS FOR AUDIT LOGGING
-- =====================================================

DELIMITER //

-- Trigger for user permission changes
CREATE TRIGGER IF NOT EXISTS `tr_user_permissions_audit` 
AFTER INSERT ON `user_permissions`
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (user_id, action, resource, resource_id, new_values)
    VALUES (
        NEW.granted_by,
        'GRANT_PERMISSION',
        'USER_PERMISSION',
        NEW.id,
        JSON_OBJECT(
            'user_id', NEW.user_id,
            'permission_id', NEW.permission_id,
            'expires_at', NEW.expires_at
        )
    );
END //

-- Trigger for user activity tracking
CREATE TRIGGER IF NOT EXISTS `tr_user_activity_audit`
AFTER INSERT ON `user_activity_tracking`
FOR EACH ROW
BEGIN
    IF NEW.current_action NOT IN ('heartbeat', 'ping') THEN
        INSERT INTO audit_log (user_id, action, resource, resource_id, new_values)
        VALUES (
            NEW.user_id,
            'USER_ACTIVITY',
            'USER_TRACKING',
            NEW.id,
            JSON_OBJECT(
                'action', NEW.current_action,
                'component', NEW.current_component,
                'ip_address', NEW.ip_address
            )
        );
    END IF;
END //

DELIMITER ;

-- =====================================================
-- INITIAL DATA SETUP
-- =====================================================

-- Initialize user activity tracking for existing users
INSERT IGNORE INTO user_activity_tracking (user_id, is_online, current_action, current_component)
SELECT id, 0, 'system_init', 'initialization'
FROM users 
WHERE is_active = 1;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify the setup
SELECT 'Permissions System Setup Complete' as status;

SELECT 
    'Total Permissions' as metric,
    COUNT(*) as count
FROM permissions 
WHERE is_active = 1;

SELECT 
    'Total Role Permissions' as metric,
    COUNT(*) as count
FROM role_permissions;

SELECT 
    'Total Component Permissions' as metric,
    COUNT(*) as count
FROM component_permissions 
WHERE is_active = 1;

SELECT 
    'Users with Activity Tracking' as metric,
    COUNT(*) as count
FROM user_activity_tracking;

-- Show user effective permissions summary
SELECT 
    u.name as username,
    r.display_name as role,
    COUNT(DISTINCT uep.permission_id) as total_permissions
FROM users u
JOIN roles r ON u.role_id = r.id
LEFT JOIN user_effective_permissions uep ON u.id = uep.user_id
WHERE u.is_active = 1
GROUP BY u.id, u.name, r.display_name
ORDER BY total_permissions DESC;