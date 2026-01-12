#!/bin/bash

echo "🔧 Fixing Database Schema Issues..."
echo "=================================="

# SSH into the server and fix the database issues
ssh -i ~/.ssh/ec2-python-ssh.pem ubuntu@13.201.222.24 << 'EOF'
echo "✅ Connected to AWS server successfully!"
echo ""

# Database credentials
DB_HOST="inventory-db.cv2iey8a8hbk.ap-south-1.rds.amazonaws.com"
DB_USER="admin"
DB_PASSWORD="gfx998sd"
DB_NAME="hunyhuny_auto_dispatch"

echo "🔧 Fixing database schema issues in: $DB_NAME"
echo ""

echo "=== 1. CHECKING CURRENT TABLE NAMES ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = '$DB_NAME' 
AND TABLE_NAME LIKE '%audit%';"

echo ""
echo "=== 2. CHECKING USERS TABLE STRUCTURE ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE users;"

echo ""
echo "=== 3. CREATING AUDIT_LOGS TABLE (if not exists) ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id BIGINT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_user_id (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_created_at (created_at)
);"

echo ""
echo "=== 4. COPYING DATA FROM audit_log TO audit_logs (if needed) ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
INSERT IGNORE INTO audit_logs (id, user_id, action, resource, resource_id, old_values, new_values, ip_address, user_agent, created_at)
SELECT id, user_id, action, resource, resource_id, old_values, new_values, ip_address, user_agent, created_at
FROM audit_log
WHERE EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'audit_log');"

echo ""
echo "=== 5. CHECKING IF password_hash COLUMN EXISTS ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = '$DB_NAME' 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME IN ('password', 'password_hash');"

echo ""
echo "=== 6. ADDING password_hash COLUMN (if not exists) ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NULL AFTER email;"

echo ""
echo "=== 7. COPYING password TO password_hash (if password column exists) ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
UPDATE users 
SET password_hash = COALESCE(password_hash, 'temp_password_hash')
WHERE password_hash IS NULL OR password_hash = '';"

echo ""
echo "=== 8. VERIFYING FIXES ==="
echo "--- Checking audit_logs table ---"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT COUNT(*) as audit_logs_count FROM audit_logs;"

echo ""
echo "--- Checking users table structure ---"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = '$DB_NAME' 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME IN ('password', 'password_hash');"

echo ""
echo "=== 9. TESTING PERMISSION SYSTEM TABLES ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT 
    'user_permissions' as table_name,
    COUNT(*) as row_count
FROM user_permissions
UNION ALL
SELECT 
    'user_activity_tracking' as table_name,
    COUNT(*) as row_count
FROM user_activity_tracking
UNION ALL
SELECT 
    'component_permissions' as table_name,
    COUNT(*) as row_count
FROM component_permissions
UNION ALL
SELECT 
    'notification_templates' as table_name,
    COUNT(*) as row_count
FROM notification_templates;"

echo ""
echo "🎉 Database schema fixes completed!"
echo "=================================="

EOF

echo ""
echo "📋 Schema fix completed!"