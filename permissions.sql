-- Simple Permissions System for hunyhuny_auto_dispatch
-- Run: mysql -u root -p hunyhuny_auto_dispatch < permissions.sql

USE hunyhuny_auto_dispatch;

-- 1. Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert basic roles
INSERT IGNORE INTO roles (name, display_name, color) VALUES
('super_admin', 'Super Admin', '#ef4444'),
('admin', 'Admin', '#f97316'),
('manager', 'Manager', '#eab308'),
('user', 'User', '#22c55e');

-- 2. Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert basic permissions
INSERT IGNORE INTO permissions (name, display_name, category) VALUES
('PRODUCTS_VIEW', 'View Products', 'PRODUCTS'),
('PRODUCTS_CREATE', 'Create Products', 'PRODUCTS'),
('PRODUCTS_EDIT', 'Edit Products', 'PRODUCTS'),
('PRODUCTS_DELETE', 'Delete Products', 'PRODUCTS'),
('INVENTORY_VIEW', 'View Inventory', 'INVENTORY'),
('INVENTORY_EDIT', 'Edit Inventory', 'INVENTORY'),
('INVENTORY_BULK_UPLOAD', 'Bulk Upload', 'INVENTORY'),
('ORDERS_VIEW', 'View Orders', 'ORDERS'),
('ORDERS_CREATE', 'Create Orders', 'ORDERS'),
('ORDERS_DISPATCH', 'Dispatch Orders', 'ORDERS'),
('SYSTEM_USER_MANAGEMENT', 'User Management', 'SYSTEM'),
('SYSTEM_PERMISSIONS', 'Manage Permissions', 'SYSTEM');

-- 3. Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_role_permission (role_id, permission_id)
);

-- Assign permissions to roles
-- Super Admin gets all permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'super_admin';

-- Admin gets most permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.name = 'admin' AND p.name != 'SYSTEM_PERMISSIONS';

-- Manager gets operational permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.name = 'manager' AND p.category IN ('PRODUCTS', 'INVENTORY', 'ORDERS');

-- User gets basic view permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p 
WHERE r.name = 'user' AND p.name LIKE '%VIEW%';

-- 4. Update existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive') DEFAULT 'active';

-- Add foreign key if it doesn't exist
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = 'hunyhuny_auto_dispatch' 
    AND TABLE_NAME = 'users' 
    AND CONSTRAINT_NAME = 'fk_users_role');

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE users ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)', 
    'SELECT "Foreign key already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Update existing users with super_admin role
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'super_admin' LIMIT 1) 
WHERE email IN ('admin@hunyhuny.com', 'test@hunyhuny.com') AND role_id IS NULL;

-- Done!
SELECT 'Permissions system setup complete!' as message;
SELECT COUNT(*) as roles FROM roles;
SELECT COUNT(*) as permissions FROM permissions;
SELECT COUNT(*) as role_permissions FROM role_permissions;