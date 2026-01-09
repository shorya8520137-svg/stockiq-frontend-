-- ===============================================
-- COMPLETE SYSTEM DATABASE SCHEMA
-- ===============================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS user_permissions;
DROP TABLE IF EXISTS approval_requests;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS users;

-- ===============================================
-- USERS TABLE
-- ===============================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin', 'manager', 'user', 'warehouse_staff') NOT NULL DEFAULT 'user',
    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    profile_image VARCHAR(500) NULL,
    phone VARCHAR(20) NULL,
    warehouse_access JSON NULL, -- Array of warehouse codes user can access
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255) NULL,
    reset_token VARCHAR(255) NULL,
    reset_token_expires TIMESTAMP NULL
);

-- ===============================================
-- USER SESSIONS TABLE
-- ===============================================
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token),
    INDEX idx_user_sessions (user_id, is_active),
    INDEX idx_expires_at (expires_at)
);

-- ===============================================
-- USER PERMISSIONS TABLE
-- ===============================================
CREATE TABLE user_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    component VARCHAR(100) NOT NULL, -- ProductManager, InventorySheet, OrderSheet, Operations
    action VARCHAR(100) NOT NULL, -- add_product, bulk_import, export_all, etc.
    granted BOOLEAN DEFAULT TRUE,
    granted_by INT NULL, -- User ID who granted this permission
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL, -- For temporary permissions
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_permission (user_id, component, action),
    INDEX idx_user_permissions (user_id, component),
    INDEX idx_component_action (component, action)
);

-- ===============================================
-- ACTIVITY LOGS TABLE
-- ===============================================
CREATE TABLE activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL, -- LOGIN, CREATE_PRODUCT, DISPATCH_SUBMIT, etc.
    component VARCHAR(100) NOT NULL, -- AUTH, ProductManager, Operations, etc.
    details TEXT NOT NULL,
    success BOOLEAN DEFAULT TRUE,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    session_id INT NULL,
    data JSON NULL, -- Additional structured data
    warehouse VARCHAR(20) NULL, -- Warehouse context if applicable
    target_id VARCHAR(100) NULL, -- ID of affected resource (product_id, order_id, etc.)
    target_type VARCHAR(50) NULL, -- Type of affected resource (product, order, user, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL,
    INDEX idx_user_logs (user_id, created_at),
    INDEX idx_action_logs (action, created_at),
    INDEX idx_component_logs (component, created_at),
    INDEX idx_warehouse_logs (warehouse, created_at),
    INDEX idx_success_logs (success, created_at)
);

-- ===============================================
-- NOTIFICATIONS TABLE
-- ===============================================
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error', 'dispatch', 'approval', 'system') NOT NULL DEFAULT 'info',
    
    -- Targeting
    target_user_id INT NULL, -- Specific user
    target_role VARCHAR(50) NULL, -- All users with this role
    target_warehouse VARCHAR(20) NULL, -- All users with access to this warehouse
    
    -- Content
    action_url VARCHAR(500) NULL, -- URL to navigate when clicked
    icon VARCHAR(50) NULL, -- Icon name for display
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    
    -- Metadata
    created_by INT NULL, -- User who triggered this notification
    related_id VARCHAR(100) NULL, -- Related resource ID (order_id, product_id, etc.)
    related_type VARCHAR(50) NULL, -- Related resource type (order, product, user, etc.)
    data JSON NULL, -- Additional structured data
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL, -- Auto-delete after this time
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_target_user (target_user_id, is_read, created_at),
    INDEX idx_target_role (target_role, is_read, created_at),
    INDEX idx_target_warehouse (target_warehouse, is_read, created_at),
    INDEX idx_type_priority (type, priority, created_at),
    INDEX idx_expires_at (expires_at)
);

-- ===============================================
-- APPROVAL REQUESTS TABLE
-- ===============================================
CREATE TABLE approval_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_type ENUM('dispatch', 'damage', 'return', 'recover', 'bulk_transfer', 'user_permission') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Request details
    requested_by INT NOT NULL,
    warehouse VARCHAR(20) NULL,
    data JSON NOT NULL, -- Request-specific data (items, quantities, etc.)
    
    -- Approval workflow
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT NULL,
    
    -- Metadata
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    expires_at TIMESTAMP NULL, -- Auto-reject after this time
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status_type (status, request_type, created_at),
    INDEX idx_requested_by (requested_by, status),
    INDEX idx_warehouse_requests (warehouse, status, created_at),
    INDEX idx_expires_at (expires_at)
);

-- ===============================================
-- INSERT DEFAULT USERS
-- ===============================================
INSERT INTO users (name, email, password_hash, role, status, warehouse_access) VALUES
('Super Admin', 'admin@example.com', '$2b$10$rQZ9QmZ9QmZ9QmZ9QmZ9Qu', 'super_admin', 'active', '["GGM_WH", "BLR_WH", "MUM_WH", "AMD_WH", "HYD_WH"]'),
('Manager User', 'manager@example.com', '$2b$10$rQZ9QmZ9QmZ9QmZ9QmZ9Qu', 'manager', 'active', '["GGM_WH", "BLR_WH"]'),
('Warehouse Staff', 'warehouse@example.com', '$2b$10$rQZ9QmZ9QmZ9QmZ9QmZ9Qu', 'warehouse_staff', 'active', '["GGM_WH"]'),
('Regular User', 'user@example.com', '$2b$10$rQZ9QmZ9QmZ9QmZ9QmZ9Qu', 'user', 'active', '["GGM_WH"]');

-- ===============================================
-- INSERT DEFAULT PERMISSIONS
-- ===============================================
INSERT INTO user_permissions (user_id, component, action, granted_by) VALUES
-- Super Admin - All permissions
(1, 'ProductManager', 'add_product', 1),
(1, 'ProductManager', 'bulk_import', 1),
(1, 'ProductManager', 'export_all', 1),
(1, 'ProductManager', 'self_transfer', 1),
(1, 'ProductManager', 'add_category', 1),
(1, 'InventorySheet', 'timeline', 1),
(1, 'OrderSheet', 'kpi_cards', 1),
(1, 'OrderSheet', 'delete_checkbox', 1),
(1, 'OrderSheet', 'status_dropdown', 1),
(1, 'OrderSheet', 'remarks', 1),
(1, 'Operations', 'dispatch', 1),
(1, 'Operations', 'damage', 1),
(1, 'Operations', 'return', 1),
(1, 'Operations', 'recover', 1),
(1, 'Operations', 'bulk_transfer', 1),

-- Manager - Most permissions
(2, 'ProductManager', 'add_product', 1),
(2, 'ProductManager', 'bulk_import', 1),
(2, 'ProductManager', 'export_all', 1),
(2, 'ProductManager', 'add_category', 1),
(2, 'InventorySheet', 'timeline', 1),
(2, 'OrderSheet', 'kpi_cards', 1),
(2, 'OrderSheet', 'status_dropdown', 1),
(2, 'OrderSheet', 'remarks', 1),
(2, 'Operations', 'dispatch', 1),
(2, 'Operations', 'damage', 1),
(2, 'Operations', 'return', 1),

-- Warehouse Staff - Limited permissions
(3, 'ProductManager', 'add_product', 1),
(3, 'ProductManager', 'export_all', 1),
(3, 'InventorySheet', 'timeline', 1),
(3, 'OrderSheet', 'kpi_cards', 1),
(3, 'Operations', 'dispatch', 1),

-- Regular User - Basic permissions
(4, 'ProductManager', 'export_all', 1),
(4, 'InventorySheet', 'timeline', 1),
(4, 'OrderSheet', 'kpi_cards', 1);

-- ===============================================
-- INSERT SAMPLE NOTIFICATIONS
-- ===============================================
INSERT INTO notifications (title, message, type, target_role, created_by, related_type, data) VALUES
('System Maintenance', 'Scheduled maintenance on Sunday 2AM-4AM', 'info', 'all', 1, 'system', '{"maintenance_window": "2024-01-14 02:00:00"}'),
('New Product Added', 'Assembly Charge has been added to inventory', 'success', 'manager', 2, 'product', '{"product_id": "P001", "warehouse": "GGM_WH"}'),
('Dispatch Submitted', 'Order D001 submitted for approval', 'dispatch', 'admin', 3, 'dispatch', '{"order_id": "D001", "items": 5, "warehouse": "GGM_WH"}');

-- ===============================================
-- INSERT SAMPLE ACTIVITY LOGS
-- ===============================================
INSERT INTO activity_logs (user_id, user_email, user_name, action, component, details, success, ip_address, user_agent, data, warehouse) VALUES
(1, 'admin@example.com', 'Super Admin', 'LOGIN', 'AUTH', 'User logged in successfully', TRUE, '192.168.1.100', 'Chrome 120.0.0.0', '{"login_method": "password"}', NULL),
(2, 'manager@example.com', 'Manager User', 'CREATE_PRODUCT', 'ProductManager', 'Created new product: Assembly Charge', TRUE, '192.168.1.101', 'Chrome 120.0.0.0', '{"product_id": "P001", "barcode": "2788-500"}', 'GGM_WH'),
(3, 'warehouse@example.com', 'Warehouse Staff', 'DISPATCH_SUBMIT', 'Operations', 'Submitted dispatch order for approval', TRUE, '192.168.1.102', 'Chrome 120.0.0.0', '{"order_id": "D001", "items": 5}', 'GGM_WH'),
(1, 'admin@example.com', 'Super Admin', 'UPDATE_USER', 'USER_MANAGEMENT', 'Updated user permissions for manager@example.com', TRUE, '192.168.1.100', 'Chrome 120.0.0.0', '{"target_user": "manager@example.com", "permissions_changed": 3}', NULL);

-- ===============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ===============================================
CREATE INDEX idx_users_email_status ON users(email, status);
CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_notifications_unread ON notifications(target_user_id, is_read, created_at);
CREATE INDEX idx_activity_recent ON activity_logs(created_at DESC);
CREATE INDEX idx_permissions_lookup ON user_permissions(user_id, component, action, granted);

-- ===============================================
-- CREATE VIEWS FOR COMMON QUERIES
-- ===============================================

-- User permissions view
CREATE VIEW user_permissions_view AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    u.role,
    up.component,
    up.action,
    up.granted,
    up.granted_at,
    up.expires_at
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.status = 'active' AND (up.granted = TRUE OR up.granted IS NULL);

-- Recent activity view
CREATE VIEW recent_activity_view AS
SELECT 
    al.*,
    u.name as user_display_name,
    u.role as user_role
FROM activity_logs al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC;

-- Unread notifications view
CREATE VIEW unread_notifications_view AS
SELECT 
    n.*,
    u.name as target_user_name,
    creator.name as created_by_name
FROM notifications n
LEFT JOIN users u ON n.target_user_id = u.id
LEFT JOIN users creator ON n.created_by = creator.id
WHERE n.is_read = FALSE AND (n.expires_at IS NULL OR n.expires_at > NOW());