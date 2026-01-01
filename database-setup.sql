-- =====================================================
-- COMPLETE INVENTORY MANAGEMENT SYSTEM DATABASE SCHEMA
-- Database: hunyhuny_auto_dispatch
-- =====================================================

USE hunyhuny_auto_dispatch;

-- =====================================================
-- 1. ROLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#64748b',
    priority INT DEFAULT 999,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_priority (priority),
    INDEX idx_active (is_active)
);

-- =====================================================
-- 2. PERMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
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

-- =====================================================
-- 3. USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    login_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    INDEX idx_email (email),
    INDEX idx_role (role_id),
    INDEX idx_active (is_active),
    INDEX idx_last_login (last_login)
);

-- =====================================================
-- 4. ROLE_PERMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    granted_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_role_permission (role_id, permission_id),
    INDEX idx_role (role_id),
    INDEX idx_permission (permission_id)
);

-- =====================================================
-- 5. AUDIT_LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    resource_id INT NULL,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_resource (resource),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- 6. INVENTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product VARCHAR(255) NOT NULL,
    barcode VARCHAR(100) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    warehouse VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_product_warehouse (barcode, warehouse),
    INDEX idx_product (product),
    INDEX idx_barcode (barcode),
    INDEX idx_warehouse (warehouse),
    INDEX idx_stock (stock),
    INDEX idx_active (is_active)
);

-- =====================================================
-- 7. ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    dimensions VARCHAR(50),
    length DECIMAL(10,2),
    width DECIMAL(10,2),
    height DECIMAL(10,2),
    awb VARCHAR(100),
    order_ref VARCHAR(100),
    warehouse VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    payment_mode VARCHAR(50),
    invoice_amount DECIMAL(12,2),
    remark TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_customer (customer),
    INDEX idx_product (product_name),
    INDEX idx_awb (awb),
    INDEX idx_order_ref (order_ref),
    INDEX idx_warehouse (warehouse),
    INDEX idx_status (status),
    INDEX idx_timestamp (timestamp),
    INDEX idx_active (is_active)
);

-- =====================================================
-- 8. DISPATCHES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS dispatches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_type VARCHAR(50) NOT NULL,
    warehouse VARCHAR(50) NOT NULL,
    order_ref VARCHAR(100),
    customer_name VARCHAR(255) NOT NULL,
    awb VARCHAR(100),
    logistics VARCHAR(100),
    payment_mode VARCHAR(50),
    processed_by VARCHAR(100),
    invoice_amount DECIMAL(12,2),
    weight DECIMAL(10,2),
    length DECIMAL(10,2),
    width DECIMAL(10,2),
    height DECIMAL(10,2),
    remarks TEXT,
    products JSON,
    status VARCHAR(50) DEFAULT 'pending',
    created_by INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_warehouse (warehouse),
    INDEX idx_customer (customer_name),
    INDEX idx_awb (awb),
    INDEX idx_order_ref (order_ref),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by),
    INDEX idx_active (is_active),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- 9. CHANNELS TABLE (for messaging)
-- =====================================================
CREATE TABLE IF NOT EXISTS channels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    created_by INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_name (name),
    INDEX idx_private (is_private),
    INDEX idx_active (is_active)
);

-- =====================================================
-- 10. MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    channel_id INT NULL,
    user_id INT NOT NULL,
    recipient_id INT NULL,
    message TEXT NOT NULL,
    message_type ENUM('text', 'voice', 'file') DEFAULT 'text',
    file_data JSON NULL,
    voice_duration INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_channel (channel_id),
    INDEX idx_user (user_id),
    INDEX idx_recipient (recipient_id),
    INDEX idx_type (message_type),
    INDEX idx_active (is_active),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- 11. DAMAGE_RECOVERY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS damage_recovery (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_type VARCHAR(255) NOT NULL,
    barcode VARCHAR(100) NOT NULL,
    warehouse VARCHAR(50) NOT NULL,
    action_type ENUM('damage', 'recovery') NOT NULL,
    quantity INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    processed_by INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_barcode (barcode),
    INDEX idx_warehouse (warehouse),
    INDEX idx_action_type (action_type),
    INDEX idx_processed_by (processed_by),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- 12. RETURNS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS returns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_type VARCHAR(255) NOT NULL,
    barcode VARCHAR(100) NOT NULL,
    warehouse VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    subtype VARCHAR(100),
    status ENUM('pending', 'approved', 'rejected', 'processed') DEFAULT 'pending',
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_barcode (barcode),
    INDEX idx_warehouse (warehouse),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- 13. TRANSFERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS transfers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    from_warehouse VARCHAR(50) NOT NULL,
    to_warehouse VARCHAR(50) NOT NULL,
    transfer_type VARCHAR(20) DEFAULT 'FIFO',
    products JSON NOT NULL,
    total_items INT NOT NULL,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_from_warehouse (from_warehouse),
    INDEX idx_to_warehouse (to_warehouse),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- INSERT DEFAULT ROLES
-- =====================================================
INSERT IGNORE INTO roles (name, display_name, description, color, priority) VALUES
('super_admin', 'Super Admin', 'Full system access with user management', '#dc2626', 1),
('admin', 'Admin', 'Full operational access without user management', '#ea580c', 2),
('manager', 'Manager', 'Management and reporting access', '#ca8a04', 3),
('operator', 'Operator', 'Daily operations access', '#16a34a', 4),
('warehouse_staff', 'Warehouse Staff', 'Inventory and warehouse operations', '#2563eb', 5),
('viewer', 'Viewer', 'Read-only access to reports and data', '#64748b', 6);

-- =====================================================
-- INSERT DEFAULT PERMISSIONS
-- =====================================================
INSERT IGNORE INTO permissions (name, display_name, description, category) VALUES
-- Dashboard permissions
('dashboard.view', 'View Dashboard', 'Access to main dashboard', 'dashboard'),
('dashboard.analytics', 'Dashboard Analytics', 'Access to analytics and charts', 'dashboard'),
('dashboard.export', 'Export Dashboard Data', 'Export dashboard reports', 'dashboard'),

-- Inventory permissions
('inventory.view', 'View Inventory', 'View inventory items and stock levels', 'inventory'),
('inventory.create', 'Create Inventory', 'Add new inventory items', 'inventory'),
('inventory.edit', 'Edit Inventory', 'Modify existing inventory items', 'inventory'),
('inventory.delete', 'Delete Inventory', 'Remove inventory items', 'inventory'),
('inventory.transfer', 'Transfer Inventory', 'Transfer stock between warehouses', 'inventory'),
('inventory.export', 'Export Inventory', 'Export inventory data', 'inventory'),
('inventory.bulk_upload', 'Bulk Upload Inventory', 'Upload inventory via CSV/Excel', 'inventory'),

-- Orders permissions
('orders.view', 'View Orders', 'View order details and history', 'orders'),
('orders.create', 'Create Orders', 'Create new orders', 'orders'),
('orders.edit', 'Edit Orders', 'Modify existing orders', 'orders'),
('orders.delete', 'Delete Orders', 'Remove orders from system', 'orders'),
('orders.dispatch', 'Dispatch Orders', 'Process and dispatch orders', 'orders'),
('orders.export', 'Export Orders', 'Export order data', 'orders'),
('orders.remarks', 'Manage Order Remarks', 'Add and edit order remarks', 'orders'),

-- Tracking permissions
('tracking.view', 'View Tracking', 'Access tracking information', 'tracking'),
('tracking.real_time', 'Real-time Tracking', 'Access real-time tracking updates', 'tracking'),

-- Messages permissions
('messages.view', 'View Messages', 'Access messaging system', 'messages'),
('messages.send', 'Send Messages', 'Send messages and replies', 'messages'),
('messages.create_channel', 'Create Channels', 'Create new message channels', 'messages'),
('messages.delete', 'Delete Messages', 'Delete messages and channels', 'messages'),
('messages.voice', 'Voice Messages', 'Send and receive voice messages', 'messages'),
('messages.file_upload', 'File Upload', 'Upload and share files', 'messages'),

-- Operations permissions
('operations.dispatch', 'Dispatch Operations', 'Handle dispatch operations', 'operations'),
('operations.damage', 'Damage Management', 'Manage damaged items', 'operations'),
('operations.return', 'Return Management', 'Handle returns and refunds', 'operations'),
('operations.recover', 'Recovery Operations', 'Recover lost or damaged items', 'operations'),
('operations.bulk', 'Bulk Operations', 'Perform bulk operations', 'operations'),

-- System permissions
('system.settings', 'System Settings', 'Access system configuration', 'system'),
('system.user_management', 'User Management', 'Manage users and accounts', 'system'),
('system.permissions', 'Permission Management', 'Manage roles and permissions', 'system'),
('system.audit_log', 'Audit Log Access', 'View system audit logs', 'system'),

-- Export permissions
('export.csv', 'Export CSV', 'Export data in CSV format', 'export'),
('export.pdf', 'Export PDF', 'Export data in PDF format', 'export'),
('export.excel', 'Export Excel', 'Export data in Excel format', 'export');

-- =====================================================
-- ASSIGN PERMISSIONS TO ROLES
-- =====================================================

-- Super Admin gets all permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin';

-- Admin gets all permissions except user management
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin' 
AND p.name NOT IN ('system.user_management');

-- Manager gets management and reporting permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'manager' 
AND p.name IN (
    'dashboard.view', 'dashboard.analytics', 'dashboard.export',
    'inventory.view', 'inventory.export',
    'orders.view', 'orders.create', 'orders.edit', 'orders.remarks', 'orders.export',
    'tracking.view', 'tracking.real_time',
    'messages.view', 'messages.send',
    'operations.dispatch', 'operations.return',
    'export.csv', 'export.pdf', 'export.excel'
);

-- Operator gets daily operations permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'operator' 
AND p.name IN (
    'dashboard.view',
    'inventory.view', 'inventory.edit',
    'orders.view', 'orders.create', 'orders.edit', 'orders.dispatch', 'orders.remarks',
    'tracking.view',
    'messages.view', 'messages.send',
    'operations.dispatch', 'operations.damage', 'operations.return',
    'export.csv'
);

-- Warehouse Staff gets inventory and warehouse permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'warehouse_staff' 
AND p.name IN (
    'dashboard.view',
    'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.transfer', 'inventory.bulk_upload',
    'orders.view', 'orders.remarks',
    'messages.view', 'messages.send',
    'operations.dispatch', 'operations.damage',
    'export.csv'
);

-- Viewer gets read-only permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'viewer' 
AND p.name IN (
    'dashboard.view',
    'inventory.view',
    'orders.view',
    'tracking.view',
    'messages.view'
);

-- =====================================================
-- CREATE DEFAULT USERS
-- =====================================================
INSERT IGNORE INTO users (email, password_hash, name, role_id)
SELECT 'admin@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super Admin', r.id
FROM roles r WHERE r.name = 'super_admin';

INSERT IGNORE INTO users (email, password_hash, name, role_id)
SELECT 'manager@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Manager User', r.id
FROM roles r WHERE r.name = 'manager';

INSERT IGNORE INTO users (email, password_hash, name, role_id)
SELECT 'operator@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Operator User', r.id
FROM roles r WHERE r.name = 'operator';

INSERT IGNORE INTO users (email, password_hash, name, role_id)
SELECT 'warehouse@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Warehouse Staff', r.id
FROM roles r WHERE r.name = 'warehouse_staff';

INSERT IGNORE INTO users (email, password_hash, name, role_id)
SELECT 'viewer@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Viewer User', r.id
FROM roles r WHERE r.name = 'viewer';

-- =====================================================
-- CREATE DEFAULT CHANNELS
-- =====================================================
INSERT IGNORE INTO channels (name, display_name, description) VALUES
('general', 'General', 'General discussion channel'),
('random', 'Random', 'Random conversations and off-topic discussions'),
('dev-team', 'Dev Team', 'Development team discussions');

-- =====================================================
-- SAMPLE INVENTORY DATA
-- =====================================================
INSERT IGNORE INTO inventory (product, barcode, stock, warehouse) VALUES
('iPhone 14 Pro', 'IP14P001', 25, 'GGM_WH'),
('iPhone 14 Pro', 'IP14P001', 18, 'BLR_WH'),
('iPhone 14 Pro', 'IP14P001', 12, 'MUM_WH'),
('Samsung Galaxy S23', 'SGS23001', 30, 'GGM_WH'),
('Samsung Galaxy S23', 'SGS23001', 22, 'BLR_WH'),
('MacBook Air M2', 'MBA2001', 15, 'GGM_WH'),
('MacBook Air M2', 'MBA2001', 8, 'BLR_WH'),
('iPad Pro 12.9', 'IPP129001', 20, 'GGM_WH'),
('iPad Pro 12.9', 'IPP129001', 14, 'MUM_WH'),
('AirPods Pro 2', 'APP2001', 50, 'GGM_WH'),
('AirPods Pro 2', 'APP2001', 35, 'BLR_WH'),
('AirPods Pro 2', 'APP2001', 28, 'MUM_WH'),
('Dell XPS 13', 'DXP13001', 12, 'GGM_WH'),
('Dell XPS 13', 'DXP13001', 8, 'BLR_WH'),
('Sony WH-1000XM5', 'SWH1000001', 25, 'GGM_WH'),
('Sony WH-1000XM5', 'SWH1000001', 18, 'MUM_WH');

-- =====================================================
-- SAMPLE ORDER DATA
-- =====================================================
INSERT IGNORE INTO orders (customer, product_name, quantity, dimensions, length, width, height, awb, order_ref, warehouse, status, payment_mode, invoice_amount, remark) VALUES
('John Doe', 'iPhone 14 Pro', 1, '15×8×1', 15.0, 8.0, 1.0, 'BD123456789', 'ORD001', 'GGM_WH', 'dispatched', 'COD', 89999.00, 'Urgent delivery requested'),
('Jane Smith', 'Samsung Galaxy S23', 2, '16×8×1', 16.0, 8.0, 1.0, 'DTDC987654321', 'ORD002', 'BLR_WH', 'pending', 'Prepaid', 159998.00, 'Gift wrapping required'),
('Mike Johnson', 'MacBook Air M2', 1, '30×21×2', 30.0, 21.0, 2.0, 'DEL456789123', 'ORD003', 'GGM_WH', 'dispatched', 'COD', 119999.00, 'Corporate order'),
('Sarah Wilson', 'AirPods Pro 2', 3, '12×10×5', 12.0, 10.0, 5.0, 'ECOM789123456', 'ORD004', 'MUM_WH', 'processing', 'Prepaid', 74997.00, 'Bulk order discount applied'),
('David Brown', 'iPad Pro 12.9', 1, '28×22×1', 28.0, 22.0, 1.0, 'FEDEX123789456', 'ORD005', 'GGM_WH', 'dispatched', 'COD', 109999.00, 'Educational discount');

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
SELECT 'Database setup completed successfully!' as message;
SELECT 'Default users created with password: admin@123' as note;
SELECT 'Available roles: super_admin, admin, manager, operator, warehouse_staff, viewer' as roles;