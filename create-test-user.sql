-- Create a test user for login
-- First, make sure we have a super admin role
INSERT IGNORE INTO roles (id, name, display_name, description, level, is_active) VALUES
(1, 'super_admin', 'Super Admin', 'Full system access with all permissions', 100, 1);

-- Create test user with hashed password
-- Password: admin123 (hashed with bcrypt)
INSERT IGNORE INTO users (id, name, email, password_hash, role_id, status, created_at) VALUES
(1, 'Super Admin', 'admin@hunyhuny.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 'active', NOW());

-- Alternative with plain text password (will be converted by backend)
INSERT IGNORE INTO users (id, name, email, password, role_id, status, created_at) VALUES
(2, 'Test Admin', 'test@hunyhuny.com', 'admin123', 1, 'active', NOW())
ON DUPLICATE KEY UPDATE password = 'admin123';

-- Make sure all permissions are assigned to super admin role
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE is_active = 1;