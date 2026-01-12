#!/bin/bash

# Script to get database structure from AWS server
# Run this on your local machine

echo "Connecting to AWS server to get database structure..."

# Create the key file with correct permissions
cat > aws-key.pem << 'EOF'
-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEA4Xn+YpFN+6HLPDzfZg0lVFFJE6vgT/qcMlLT9crzCu7MzYcEru7aGYFTKM2/3vq7SHGEB10C8bgOP+A1OJLazraA4sbcRS1AjCzdMLg6rlyQh9w9xGF89Fm2mcAU6aX35eHjjEU8IBQ6BsNoRwwLubjpB7tPTTvslrNeZmV2s98QZ06pKohtJBkiGbsmg6loNimHXFuLcgOcrSe2mtQi4vttlno26U4eMpjqCk2UZPspRK40+cj8TSWKTQSulAOxEZGjgnT5c+r2XPCk34qYuzXfqdPo1PKpiQnv4iAxzYf5iynQf037EhGHWISOZvQrghowmdWCDRFo1b5I24w4UQIDAQABAoIBAQCbF4XCGP6SAkVAZwKnOI2fxNXGQShm+xPrjYucev/YWk/nY2L2TPcaKhmgbH35C3A9MU/GnNTEnXy3tSoGgwUcwO5Ajta+gpTuloGC3IYIn0UPHpAh/4iqrvbqJPR9jprItisFti3YRvFu64RTslZyZl1r4wx2LKzdL/3T4yDWMWNwxS1Pu0AqVIYkUlz0li5usdiI1BASaIpwFSjsY339H/Kq4YfkOmhs7QWDMhM2CHoaOm40mTwdZNvorVIipIiM3hi1yMNlZKvMISCKW0dXMzpkddkF9DaXEDmF52OkO2FiWvGCk/P6GsSVeQta84i8rUvtZ5gh2aswdxDHgUXBAoGBAPgDkMAB+zAH/oD0TwmeV42jFNXJRT2iNOCG1zXUXH1P5/sEianetu5jcxSxXAKdExpB1g91TlEpXNH191SSShLmVg/WQDMyB1qrW44++/HocLepV5Jfh9a7VKzJ9db+PVNOXt+eTlzdiAJA8PI1zerIMGCEg8kWzpFL6+qEryAJAoGBAOi8pcIDnlapX+R/wQc2xY5V84zYXGHjxWqumXXHG1KLkxC9hL/S2av8+tSC6zq+wm9d9DE4ub7zMJAltOuneM2hibie0uz2yPYr3fHzMTTuDGaOlQ4pVeBiza8Mx5tI3xfCtJnP+1mXmgk0gdMhP8Op8x9xM4B+csnxONlRmVgJAoGADxtofcmhG1PhVMmM5vEWNDJy2nLgHNj8j5CnG0hMOfXcE5Y7LHW8ftjf8aq8CAy5VSgdeeOTWa5DUSbCYgxnJq+RHnXWg0fQ2t0FPqzne9zEwOs3wlq/U30ls0C6ENZ7tc9YSBbEfzOfTUPXaWmNmXeIOtjXjjAtdPxC6o4afMECgYEAwA+l7qTTzwp5UvTGk7B0eZCeqzWFj1bK/M3XYGWOO6FpHOB5I1/aN99OE39ypYj0pbjwIoqAZn8ELYCge/Q5ceCD6bJPuDO0BcqPnvIlQlvMKfoyMXyVHNYMjQ/LzW7mhBIuvdvvvbCo8j29gUEoAM1IEEN3z+sJyXLiihyXohkCgYEA535zqq5R+gVlmAd+p51OjBKzFI3MIGLayWF+DdBoFB074/vJuTvOoWZd8f1XGhYuDVyAGZcHOFUSVkCwvUD8cL9Hmo+xMXrRMPXCWLG/ntqeW+aFtlaLG9ev4RR4Hc9dgHua8SJZlC+uBd7UqlC5aIGke35Bx+tihpeXw+IGM8M=
-----END RSA PRIVATE KEY-----
EOF

# Set correct permissions for the key
chmod 600 aws-key.pem

echo "Getting database structure from server..."

# Connect to server and get database structure
ssh -i aws-key.pem ubuntu@13.201.222.24 << 'ENDSSH'
echo "Connected to server successfully!"
echo "Getting database structure..."

# Get database structure
mysqldump -u root -p --no-data --routines --triggers inventory_db > server_database_structure.sql

# Also get a complete structure with SHOW CREATE TABLE for all tables
mysql -u root -p inventory_db -e "SHOW TABLES;" > tables_list.txt

echo "Database structure exported to server_database_structure.sql"
echo "Tables list exported to tables_list.txt"

# Show what tables exist
echo "=== TABLES IN DATABASE ==="
cat tables_list.txt

echo "=== SAMPLE OF DATABASE STRUCTURE ==="
head -50 server_database_structure.sql

ENDSSH

echo "Copying database structure from server..."

# Copy the files back to local machine
scp -i aws-key.pem ubuntu@13.201.222.24:~/server_database_structure.sql ./
scp -i aws-key.pem ubuntu@13.201.222.24:~/tables_list.txt ./

echo "Database structure files copied to local directory:"
echo "- server_database_structure.sql"
echo "- tables_list.txt"

# Clean up the key file
rm aws-key.pem

echo "Done! Please share the server_database_structure.sql file content."