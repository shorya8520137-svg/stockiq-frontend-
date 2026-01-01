# Database Setup Instructions

## ⚠️ IMPORTANT: Correct Command

**CORRECT:** `node setup-database.js`
**WRONG:** `node database-setup.sql` ❌

## 🚀 Step-by-Step Setup

1. **Navigate to project directory:**
   ```bash
   cd /home/ubuntu/stockiq-frontend/stockiq-frontend-
   ```

2. **Install dependencies (if not done):**
   ```bash
   npm install
   ```

3. **Test the setup script:**
   ```bash
   node test-setup.js
   ```

4. **Run the database setup:**
   ```bash
   node setup-database.js
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

## 🔧 Environment Variables Required

Make sure your `.env` file contains:
```
DB_HOST=inventory-db.cv2iey8a8hbk.ap-south-1.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=gfx998sd
DB_NAME=inventory
JWT_SECRET=supersecretkey123
PORT=5000
NODE_ENV=production
```

## 🐛 Common Errors

1. **"Unexpected token '==='"** - You ran `node database-setup.sql` instead of `node setup-database.js`
2. **"ETIMEDOUT"** - Database connection issue, check AWS RDS security groups
3. **"Table doesn't exist"** - Run the setup script first before starting the server

## 📞 Success Indicators

✅ "Connected to database"
✅ "Created table: roles"
✅ "Created table: users"
✅ "Inserted roles data"
✅ "Inserted user data"
✅ "Database setup completed successfully!"

## 🔑 Default Login Credentials

- **Super Admin:** admin@example.com / admin@123
- **Manager:** manager@example.com / admin@123
- **Operator:** operator@example.com / admin@123
- **Warehouse:** warehouse@example.com / admin@123
- **Viewer:** viewer@example.com / admin@123