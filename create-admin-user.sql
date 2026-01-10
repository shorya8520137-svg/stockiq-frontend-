-- Create admin user for testing
-- Run this on your server: mysql -u root -p hunyhuny_auto_dispatch < create-admin-user.sql

USE hunyhuny_auto_dispatch;

-- Create a test admin user with hashed password
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (name, email, password, role_id) 
SELECT 'Admin User', 'admin@hunyhuny.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', r.id
FROM roles r WHERE r.name = 'super_admin'
ON DUPLICATE KEY UPDATE 
    password = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role_id = (SELECT id FROM roles WHERE name = 'super_admin' LIMIT 1);

-- Also create test@hunyhuny.com
INSERT INTO users (name, email, password, role_id) 
SELECT 'Test Admin', 'test@hunyhuny.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', r.id
FROM roles r WHERE r.name = 'super_admin'
ON DUPLICATE KEY UPDATE 
    password = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role_id = (SELECT id FROM roles WHERE name = 'super_admin' LIMIT 1);

SELECT 'Admin users created successfully!' as message;
SELECT u.name, u.email, r.display_name as role 
FROM users u 
JOIN roles r ON u.role_id = r.id 
WHERE u.email IN ('admin@hunyhuny.com', 'test@hunyhuny.com');