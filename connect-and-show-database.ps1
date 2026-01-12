# PowerShell script to connect to AWS server and show database structure

Write-Host "🔍 Connecting to AWS server and accessing database..." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Yellow

# Create a temporary script file for SSH execution
$sshScript = @"
echo "✅ Connected to AWS server successfully!"
echo ""

# Database credentials
DB_HOST="inventory-db.cv2iey8a8hbk.ap-south-1.rds.amazonaws.com"
DB_USER="admin"
DB_PASSWORD="gfx998sd"
DB_NAME="hunyhuny_auto_dispatch"

echo "📊 Connecting to database: `$DB_NAME"
echo "🔗 Host: `$DB_HOST"
echo ""

# Show all databases
echo "=== AVAILABLE DATABASES ==="
mysql -h "`$DB_HOST" -u "`$DB_USER" -p"`$DB_PASSWORD" -e "SHOW DATABASES;"
echo ""

# Show all tables in the target database
echo "=== TABLES IN `$DB_NAME ==="
mysql -h "`$DB_HOST" -u "`$DB_USER" -p"`$DB_PASSWORD" "`$DB_NAME" -e "SHOW TABLES;"
echo ""

# Get detailed table information
echo "=== TABLE DETAILS ==="
mysql -h "`$DB_HOST" -u "`$DB_USER" -p"`$DB_PASSWORD" "`$DB_NAME" -e "
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    DATA_LENGTH,
    INDEX_LENGTH,
    CREATE_TIME,
    UPDATE_TIME
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = '`$DB_NAME' 
ORDER BY TABLE_NAME;"
echo ""

# Show table structures for key tables
echo "=== KEY TABLE STRUCTURES ==="

echo "--- USERS TABLE ---"
mysql -h "`$DB_HOST" -u "`$DB_USER" -p"`$DB_PASSWORD" "`$DB_NAME" -e "DESCRIBE users;" 2>/dev/null || echo "users table not found"
echo ""

echo "--- ROLES TABLE ---"
mysql -h "`$DB_HOST" -u "`$DB_USER" -p"`$DB_PASSWORD" "`$DB_NAME" -e "DESCRIBE roles;" 2>/dev/null || echo "roles table not found"
echo ""

echo "--- PERMISSIONS TABLE ---"
mysql -h "`$DB_HOST" -u "`$DB_USER" -p"`$DB_PASSWORD" "`$DB_NAME" -e "DESCRIBE permissions;" 2>/dev/null || echo "permissions table not found"
echo ""

echo "--- USER_ROLES TABLE ---"
mysql -h "`$DB_HOST" -u "`$DB_USER" -p"`$DB_PASSWORD" "`$DB_NAME" -e "DESCRIBE user_roles;" 2>/dev/null || echo "user_roles table not found"
echo ""

echo "--- ROLE_PERMISSIONS TABLE ---"
mysql -h "`$DB_HOST" -u "`$DB_USER" -p"`$DB_PASSWORD" "`$DB_NAME" -e "DESCRIBE role_permissions;" 2>/dev/null || echo "role_permissions table not found"
echo ""

echo "--- DISPATCH_PRODUCT TABLE ---"
mysql -h "`$DB_HOST" -u "`$DB_USER" -p"`$DB_PASSWORD" "`$DB_NAME" -e "DESCRIBE dispatch_product;" 2>/dev/null || echo "dispatch_product table not found"
echo ""

echo "--- INVENTORY_LEDGER_BASE TABLE ---"
mysql -h "`$DB_HOST" -u "`$DB_USER" -p"`$DB_PASSWORD" "`$DB_NAME" -e "DESCRIBE inventory_ledger_base;" 2>/dev/null || echo "inventory_ledger_base table not found"
echo ""

echo "--- AUDIT_LOGS TABLE ---"
mysql -h "`$DB_HOST" -u "`$DB_USER" -p"`$DB_PASSWORD" "`$DB_NAME" -e "DESCRIBE audit_logs;" 2>/dev/null || echo "audit_logs table not found"
echo ""

# Show sample data from key tables
echo "=== SAMPLE DATA ==="

echo "--- USERS (first 5 rows) ---"
mysql -h "`$DB_HOST" -u "`$DB_USER" -p"`$DB_PASSWORD" "`$DB_NAME" -e "SELECT id, username, email, status, created_at FROM users LIMIT 5;" 2>/dev/null || echo "No users data"
echo ""

echo "--- ROLES (all rows) ---"
mysql -h "`$DB_HOST" -u "`$DB_USER" -p"`$DB_PASSWORD" "`$DB_NAME" -e "SELECT * FROM roles;" 2>/dev/null || echo "No roles data"
echo ""

echo "--- PERMISSIONS (first 10 rows) ---"
mysql -h "`$DB_HOST" -u "`$DB_USER" -p"`$DB_PASSWORD" "`$DB_NAME" -e "SELECT id, name, component, action, description FROM permissions LIMIT 10;" 2>/dev/null || echo "No permissions data"
echo ""

# Export complete database structure
echo "=== EXPORTING DATABASE STRUCTURE ==="
mysqldump -h "`$DB_HOST" -u "`$DB_USER" -p"`$DB_PASSWORD" --no-data --routines --triggers "`$DB_NAME" > ~/database_structure_export.sql
echo "✅ Database structure exported to ~/database_structure_export.sql"

# Show file size
ls -lh ~/database_structure_export.sql

echo ""
echo "🎉 Database analysis complete!"
echo "=================================================="
"@

# Write the script to a temporary file
$tempScript = "temp_db_script.sh"
$sshScript | Out-File -FilePath $tempScript -Encoding UTF8

try {
    # Execute SSH command
    Write-Host "Executing SSH command..." -ForegroundColor Yellow
    
    # Use the key file from your home directory
    $keyPath = "~/.ssh/ec2-python-ssh.pem"
    
    # Execute the SSH command
    ssh -i $keyPath ubuntu@13.201.222.24 "bash -s" < $tempScript
    
    Write-Host ""
    Write-Host "📋 Script execution completed!" -ForegroundColor Green
    Write-Host "The database structure has been exported to the server at ~/database_structure_export.sql" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To copy the structure file to your local machine, run:" -ForegroundColor Yellow
    Write-Host "scp -i ~/.ssh/ec2-python-ssh.pem ubuntu@13.201.222.24:~/database_structure_export.sql ./" -ForegroundColor White
    
} catch {
    Write-Host "Error executing SSH command: $_" -ForegroundColor Red
} finally {
    # Clean up temporary file
    if (Test-Path $tempScript) {
        Remove-Item $tempScript
    }
}