#!/bin/bash

echo "🔍 Analyzing complete database with all 43 tables..."
echo "=================================================="

# SSH into the server and analyze each table
ssh -i ~/.ssh/ec2-python-ssh.pem ubuntu@13.201.222.24 << 'EOF'
echo "✅ Connected to AWS server successfully!"
echo ""

# Database credentials
DB_HOST="inventory-db.cv2iey8a8hbk.ap-south-1.rds.amazonaws.com"
DB_USER="admin"
DB_PASSWORD="gfx998sd"
DB_NAME="hunyhuny_auto_dispatch"

echo "📊 Analyzing database: $DB_NAME"
echo "🔗 Host: $DB_HOST"
echo ""

# Get all table names
echo "=== GETTING ALL TABLE NAMES ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;" > all_tables.txt
cat all_tables.txt

# Count total tables
TABLE_COUNT=$(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT COUNT(*) as table_count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '$DB_NAME';" | tail -n 1)
echo ""
echo "📈 Total tables found: $TABLE_COUNT"
echo ""

# Analyze each table
echo "=== DETAILED TABLE ANALYSIS ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    ROUND(DATA_LENGTH/1024/1024, 2) as 'DATA_SIZE_MB',
    ROUND(INDEX_LENGTH/1024/1024, 2) as 'INDEX_SIZE_MB',
    TABLE_COMMENT,
    CREATE_TIME,
    UPDATE_TIME
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = '$DB_NAME' 
ORDER BY TABLE_ROWS DESC;"

echo ""
echo "=== PERMISSION-RELATED TABLES ANALYSIS ==="

# Users table
echo "--- USERS TABLE ---"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE users;" 2>/dev/null
echo "Sample users data:"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT id, name, email, role_id, status, created_at FROM users LIMIT 10;" 2>/dev/null
echo ""

# Roles table
echo "--- ROLES TABLE ---"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE roles;" 2>/dev/null
echo "All roles data:"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT * FROM roles;" 2>/dev/null
echo ""

# Permissions table
echo "--- PERMISSIONS TABLE ---"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE permissions;" 2>/dev/null
echo "All permissions data:"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT * FROM permissions;" 2>/dev/null
echo ""

# Role permissions table
echo "--- ROLE_PERMISSIONS TABLE ---"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE role_permissions;" 2>/dev/null
echo "All role permissions data:"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT * FROM role_permissions;" 2>/dev/null
echo ""

# Audit log table
echo "--- AUDIT_LOG TABLE ---"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE audit_log;" 2>/dev/null
echo "Recent audit log entries:"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10;" 2>/dev/null
echo ""

echo "=== MAIN BUSINESS TABLES ANALYSIS ==="

# Dispatch product table
echo "--- DISPATCH_PRODUCT TABLE ---"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE dispatch_product;" 2>/dev/null
echo "Sample dispatch products:"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT p_id, product_name, barcode, category_id, is_active FROM dispatch_product LIMIT 5;" 2>/dev/null
echo ""

# Inventory ledger base table
echo "--- INVENTORY_LEDGER_BASE TABLE ---"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE inventory_ledger_base;" 2>/dev/null
echo "Recent inventory movements:"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT id, event_time, movement_type, barcode, product_name, location_code, qty, direction FROM inventory_ledger_base ORDER BY event_time DESC LIMIT 5;" 2>/dev/null
echo ""

# Stock batches table
echo "--- STOCK_BATCHES TABLE ---"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE stock_batches;" 2>/dev/null
echo "Sample stock batches:"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT * FROM stock_batches LIMIT 3;" 2>/dev/null
echo ""

# Warehouse dispatch table
echo "--- WAREHOUSE_DISPATCH TABLE ---"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE warehouse_dispatch;" 2>/dev/null
echo "Recent warehouse dispatches:"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT * FROM warehouse_dispatch ORDER BY created_at DESC LIMIT 3;" 2>/dev/null
echo ""

echo "=== NOTIFICATION AND MESSAGING TABLES ==="

# Notifications table
echo "--- NOTIFICATIONS TABLE ---"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE notifications;" 2>/dev/null
echo "Sample notifications:"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT * FROM notifications LIMIT 3;" 2>/dev/null
echo ""

# Messages table
echo "--- MESSAGES TABLE ---"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE messages;" 2>/dev/null
echo "Recent messages:"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT id, sender_id, content, created_at FROM messages ORDER BY created_at DESC LIMIT 3;" 2>/dev/null
echo ""

echo "=== USER ACTIVITY AND SESSION TABLES ==="

# User sessions table
echo "--- USER_SESSIONS TABLE ---"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE user_sessions;" 2>/dev/null
echo "Active user sessions:"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT * FROM user_sessions WHERE is_active = 1 LIMIT 5;" 2>/dev/null
echo ""

# User activities table
echo "--- USER_ACTIVITIES TABLE ---"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "DESCRIBE user_activities;" 2>/dev/null
echo "Recent user activities:"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT * FROM user_activities ORDER BY created_at DESC LIMIT 5;" 2>/dev/null
echo ""

echo "=== CHECKING FOR MISSING PERMISSION TABLES ==="

# Check if user_roles table exists (it was missing in the structure)
echo "Checking for user_roles table..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES LIKE 'user_roles';" 2>/dev/null

# Check if user_permissions table exists
echo "Checking for user_permissions table..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES LIKE 'user_permissions';" 2>/dev/null

# Check if user_activity_tracking table exists
echo "Checking for user_activity_tracking table..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES LIKE 'user_activity_tracking';" 2>/dev/null

echo ""
echo "=== FOREIGN KEY RELATIONSHIPS ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE REFERENCED_TABLE_SCHEMA = '$DB_NAME' 
ORDER BY TABLE_NAME, COLUMN_NAME;"

echo ""
echo "🎉 Complete database analysis finished!"
echo "=================================================="

EOF

echo ""
echo "📋 Database analysis completed!"