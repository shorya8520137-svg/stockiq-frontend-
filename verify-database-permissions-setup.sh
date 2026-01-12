#!/bin/bash

echo "🔍 Verifying Database Permissions System Setup..."
echo "================================================="

# SSH into the server and verify the database setup
ssh -i ~/.ssh/ec2-python-ssh.pem ubuntu@13.201.222.24 << 'EOF'
echo "✅ Connected to AWS server successfully!"
echo ""

# Database credentials
DB_HOST="inventory-db.cv2iey8a8hbk.ap-south-1.rds.amazonaws.com"
DB_USER="admin"
DB_PASSWORD="gfx998sd"
DB_NAME="hunyhuny_auto_dispatch"

echo "📊 Verifying database: $DB_NAME"
echo "🔗 Host: $DB_HOST"
echo ""

echo "=== 1. CHECKING NEW PERMISSION TABLES ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = '$DB_NAME' 
AND TABLE_NAME IN (
    'user_permissions', 
    'user_activity_tracking', 
    'component_permissions', 
    'permission_requests', 
    'notification_templates'
)
ORDER BY TABLE_NAME;"

echo ""
echo "=== 2. CHECKING PERMISSIONS COUNT BY CATEGORY ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT 
    category,
    COUNT(*) as permission_count,
    GROUP_CONCAT(name SEPARATOR ', ') as permissions
FROM permissions 
WHERE is_active = 1
GROUP BY category
ORDER BY category;"

echo ""
echo "=== 3. CHECKING COMPONENT PERMISSIONS MAPPING ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT 
    component_name,
    component_path,
    required_permissions,
    is_active
FROM component_permissions 
WHERE is_active = 1
ORDER BY component_name;"

echo ""
echo "=== 4. CHECKING USER ACTIVITY TRACKING ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT 
    u.name as username,
    u.email,
    uat.is_online,
    uat.current_action,
    uat.last_activity,
    uat.created_at
FROM user_activity_tracking uat
JOIN users u ON uat.user_id = u.id
ORDER BY u.name;"

echo ""
echo "=== 5. CHECKING ROLE PERMISSIONS ASSIGNMENT ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT 
    r.name as role_name,
    r.display_name,
    COUNT(rp.permission_id) as permission_count,
    GROUP_CONCAT(p.name SEPARATOR ', ') as permissions
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE r.is_active = 1
GROUP BY r.id, r.name, r.display_name
ORDER BY r.name;"

echo ""
echo "=== 6. CHECKING USER ROLES AND PERMISSIONS ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT 
    u.name as username,
    u.email,
    r.name as role_name,
    r.display_name as role_display,
    u.status,
    u.is_active
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.is_active = 1
ORDER BY r.name, u.name;"

echo ""
echo "=== 7. CHECKING NOTIFICATION TEMPLATES ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT 
    template_key,
    title_template,
    notification_type,
    priority,
    is_active
FROM notification_templates 
WHERE is_active = 1
ORDER BY notification_type, template_key;"

echo ""
echo "=== 8. CHECKING AUDIT LOG ENTRIES ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT 
    al.id,
    u.name as username,
    al.action,
    al.resource,
    al.created_at
FROM audit_log al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC
LIMIT 10;"

echo ""
echo "=== 9. TESTING PERMISSION CHECKING FUNCTION ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
-- Test permission checking for Super Admin (user_id = 1)
SELECT 
    'Super Admin Permission Check' as test_name,
    COUNT(*) as permissions_found
FROM (
    -- Role-based permissions
    SELECT rp.permission_id
    FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN role_permissions rp ON r.id = rp.role_id
    WHERE u.id = 1
    
    UNION
    
    -- Direct user permissions
    SELECT up.permission_id
    FROM user_permissions up
    WHERE up.user_id = 1 AND up.is_active = 1
) as effective_permissions;"

echo ""
echo "=== 10. CHECKING DATABASE INDEXES ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = '$DB_NAME' 
AND TABLE_NAME IN (
    'user_permissions', 
    'user_activity_tracking', 
    'component_permissions'
)
ORDER BY TABLE_NAME, INDEX_NAME;"

echo ""
echo "🎉 Database verification complete!"
echo "================================================="

EOF

echo ""
echo "📋 Database verification completed!"