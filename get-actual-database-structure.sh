#!/bin/bash

# Script to get database structure from AWS server using correct credentials
# Run this on your server (after SSH connection)

echo "Getting database structure using application credentials..."

# Database credentials from your .env file
DB_HOST="inventory-db.cv2iey8a8hbk.ap-south-1.rds.amazonaws.com"
DB_USER="admin"
DB_PASSWORD="gfx998sd"
DB_NAME="hunyhuny_auto_dispatch"

echo "Connecting to database: $DB_NAME on $DB_HOST"

# Get list of all tables
echo "=== GETTING TABLE LIST ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;" > tables_list.txt
cat tables_list.txt

# Get complete database structure
echo "=== GETTING DATABASE STRUCTURE ==="
mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" --no-data --routines --triggers "$DB_NAME" > server_database_structure.sql

# Get table structures individually for better readability
echo "=== GETTING INDIVIDUAL TABLE STRUCTURES ==="
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = '$DB_NAME' 
ORDER BY TABLE_NAME, ORDINAL_POSITION;" > table_columns.txt

# Show sample of the structure
echo "=== SAMPLE DATABASE STRUCTURE ==="
head -100 server_database_structure.sql

echo "=== TABLE COLUMNS INFO ==="
cat table_columns.txt

echo "Files created:"
echo "- server_database_structure.sql (complete structure)"
echo "- tables_list.txt (list of tables)"
echo "- table_columns.txt (column details)"