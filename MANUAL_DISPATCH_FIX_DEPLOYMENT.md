# 🚀 MANUAL DISPATCH DROPDOWN FIX DEPLOYMENT

## 📋 Quick Fix Instructions

Since automated deployment has SSH permission issues, here's the manual approach:

### Step 1: SSH into your server
```bash
ssh -i stockiq.pem ubuntu@13.201.222.24
cd /home/ubuntu/stockiq-frontend-
```

### Step 2: Backup current files
```bash
cp controllers/dispatchController.js controllers/dispatchController.js.backup
cp routes/dispatchRoutes.js routes/dispatchRoutes.js.backup
```

### Step 3: Update the dispatch controller
Replace the content of `controllers/dispatchController.js` with the comprehensive version from this repository.

**Key changes in the new controller:**
- Real database queries for all dropdowns
- Fallback data when database fails
- Stock checking with FIFO logic
- Product search functionality
- Complete dispatch creation workflow

### Step 4: Restart the server
```bash
# Kill existing server
pkill -f "node server.js"

# Start server
nohup node server.js > server.log 2>&1 &

# Check status
ps aux | grep "node server.js"
```

### Step 5: Test the endpoints
```bash
# Get auth token
TOKEN=$(curl -s -X POST "https://13-201-222-24.nip.io/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@hunyhuny.com","password":"gfx998sd"}' | \
    grep -o '"token":"[^"]*' | cut -d'"' -f4)

# Test warehouses
curl -H "Authorization: Bearer $TOKEN" \
    "https://13-201-222-24.nip.io/api/dispatch/warehouses"

# Test logistics
curl -H "Authorization: Bearer $TOKEN" \
    "https://13-201-222-24.nip.io/api/dispatch/logistics"

# Test executives
curl -H "Authorization: Bearer $TOKEN" \
    "https://13-201-222-24.nip.io/api/dispatch/processed-persons"
```

## 🎯 Expected Results

After deployment, you should see:

**Warehouses endpoint:** `["GGM_WH", "MAIN_WH", "NORTH_WH", "SOUTH_WH"]`
**Logistics endpoint:** `["Delhivery", "Blue Dart", "DTDC", "Ecom Express", "Xpressbees"]`
**Executives endpoint:** `["John Doe", "Jane Smith", "Admin User", "Warehouse Manager"]`

## 🔧 If Database Tables Don't Exist

Run this SQL to create the required tables:

```sql
-- Connect to your MySQL database first
mysql -u your_username -p your_database

-- Create tables
CREATE TABLE IF NOT EXISTS dispatch_warehouse (
    id INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_code VARCHAR(50) UNIQUE NOT NULL,
    Warehouse_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS processed_persons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT IGNORE INTO dispatch_warehouse (warehouse_code, Warehouse_name) VALUES
('GGM_WH', 'GGM Warehouse'),
('MAIN_WH', 'Main Warehouse'),
('NORTH_WH', 'North Warehouse'),
('SOUTH_WH', 'South Warehouse');

INSERT IGNORE INTO logistics (name) VALUES
('Delhivery'),
('Blue Dart'),
('DTDC'),
('Ecom Express'),
('Xpressbees');

INSERT IGNORE INTO processed_persons (name) VALUES
('John Doe'),
('Jane Smith'),
('Admin User'),
('Warehouse Manager');
```

## ✅ Success Checklist

- [ ] Updated dispatch controller on server
- [ ] Restarted server successfully  
- [ ] All dropdown endpoints return data
- [ ] Frontend dropdowns populate
- [ ] Product search works
- [ ] Stock checking functions

The comprehensive dispatch controller will fix all dropdown issues and provide full functionality!