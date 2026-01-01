# 🏭 Complete Inventory Management Backend

A comprehensive backend system for inventory management with advanced features including damage/recovery tracking, returns management, bulk inventory uploads, FIFO transfers, and enterprise-grade permissions.

## 🚀 Features

### **Core Inventory Management**
- ✅ Multi-warehouse inventory tracking
- ✅ Product search and barcode management
- ✅ Stock level monitoring and alerts
- ✅ FIFO inventory transfers between warehouses
- ✅ Bulk inventory upload via Excel/CSV

### **Order & Dispatch Management**
- ✅ Universal order search with suggestions
- ✅ Order lifecycle management
- ✅ Dispatch operations with inventory updates
- ✅ Real-time stock checking during dispatch

### **Advanced Operations**
- ✅ Damage & Recovery tracking
- ✅ Returns management with approval workflow
- ✅ Self-transfer operations (FIFO)
- ✅ Bulk operations support

### **Analytics & Reporting**
- ✅ Real-time dashboard with KPIs
- ✅ Revenue vs cost analytics
- ✅ Warehouse volume statistics
- ✅ Activity heatmaps and trends

### **Communication System**
- ✅ Slack-like messaging with channels
- ✅ Direct messages between users
- ✅ Voice messages and file attachments
- ✅ @mentions and #channel support

### **Enterprise Security**
- ✅ Role-based access control (RBAC)
- ✅ JWT authentication with refresh tokens
- ✅ 35+ granular permissions across 8 categories
- ✅ Complete audit logging
- ✅ Rate limiting and CORS protection

## 📁 Project Structure

```
backend/
├── controllers/           # Business logic controllers
│   ├── authController.js         # Authentication & JWT
│   ├── inventoryController.js    # Inventory management
│   ├── orderController.js        # Order operations
│   ├── dispatchController.js     # Dispatch operations
│   ├── dashboardController.js    # Analytics & KPIs
│   ├── permissionsController.js  # RBAC system
│   ├── messageController.js      # Messaging system
│   ├── damageController.js       # Damage & recovery
│   ├── returnController.js       # Returns management
│   ├── inventoryEntryController.js # Bulk uploads
│   ├── stockController.js        # Stock search & alerts
│   └── transferController.js     # FIFO transfers
├── routes/               # API route definitions
│   ├── authRoutes.js
│   ├── inventoryRoutes.js
│   ├── orderRoutes.js
│   ├── dispatchRoutes.js
│   ├── dashboardRoutes.js
│   ├── permissionsRoutes.js
│   ├── messageRoutes.js
│   ├── damageRoutes.js
│   ├── returnRoutes.js
│   ├── inventoryEntryRoutes.js
│   ├── stockRoutes.js
│   └── transferRoutes.js
├── middleware/           # Custom middleware
│   ├── authMiddleware.js         # JWT validation
│   └── permissionMiddleware.js   # Permission checking
├── db/                   # Database configuration
│   └── connection.js             # MySQL connection pool
├── uploads/              # File upload directory
├── database-setup.sql    # Complete database schema
├── setup-database.js     # Automated setup script
├── server.js            # Main server file
├── package.json         # Dependencies
└── .env                 # Environment variables
```

## 🗄️ Database Schema (13 Tables)

1. **roles** - 6 hierarchical roles (Super Admin → Viewer)
2. **permissions** - 35+ granular permissions across 8 categories
3. **users** - User accounts with role assignment
4. **role_permissions** - Many-to-many role-permission mapping
5. **audit_logs** - Complete activity tracking
6. **inventory** - Product stock by warehouse
7. **orders** - Order management with full details
8. **dispatches** - Dispatch operations with product tracking
9. **channels** - Message channels (general, random, dev-team)
10. **messages** - Slack-like messaging system
11. **damage_recovery** - Damage and recovery tracking
12. **returns** - Returns management with approval workflow
13. **transfers** - FIFO inventory transfers between warehouses

## 🔧 Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create `.env` file with your database credentials:
```env
# Database Connection
DB_HOST=inventory-db.cv2iey8a8hbk.ap-south-1.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=gfx998sd
DB_NAME=hunyhuny_auto_dispatch

# JWT Configuration
JWT_SECRET=supersecretkey123

# Server Configuration
PORT=5000
NODE_ENV=production
```

### 3. Database Setup
Run the automated setup script:
```bash
node setup-database.js
```

This will:
- Create all 13 database tables
- Insert default roles and permissions
- Create test users with different roles
- Add sample inventory and order data

### 4. Start Server
```bash
# Production
npm start

# Development with auto-reload
npm run dev
```

Server will start at `http://localhost:5000`

## 🔑 Default Test Users

All users have password: `admin@123`

| Email | Role | Permissions |
|-------|------|-------------|
| admin@example.com | Super Admin | All permissions |
| manager@example.com | Manager | Management + reporting |
| operator@example.com | Operator | Daily operations |
| warehouse@example.com | Warehouse Staff | Inventory focused |
| viewer@example.com | Viewer | Read-only access |

## 🛡️ Permission System

### **Roles Hierarchy**
1. **Super Admin** - Full system access + user management
2. **Admin** - Full operational access (no user management)
3. **Manager** - Management and reporting access
4. **Operator** - Daily operations access
5. **Warehouse Staff** - Inventory and warehouse operations
6. **Viewer** - Read-only access

### **Permission Categories**
- **Dashboard** (3 permissions) - View, analytics, export
- **Inventory** (7 permissions) - CRUD, transfer, export, bulk upload
- **Orders** (7 permissions) - CRUD, dispatch, export, remarks
- **Tracking** (2 permissions) - View, real-time
- **Messages** (6 permissions) - View, send, channels, voice, files
- **Operations** (5 permissions) - Dispatch, damage, return, recover, bulk
- **System** (4 permissions) - Settings, users, permissions, audit
- **Export** (3 permissions) - CSV, PDF, Excel

## 📊 API Endpoints

### **Authentication**
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token

### **Inventory Management**
- `GET /api/inventory/by-warehouse` - Get inventory by warehouse
- `GET /api/inventory/product-tracking/:barcode` - Product tracking
- `POST /api/inventory` - Create/update inventory
- `POST /api/inventory/transfer` - Transfer between warehouses

### **Orders & Dispatch**
- `POST /api/orders/ordersheet-universal-search` - Universal search
- `GET /api/orders/ordersheet-suggest` - Search suggestions
- `POST /api/orders/update-remark` - Update order remarks
- `POST /api/dispatch-beta/create` - Create dispatch

### **Dashboard & Analytics**
- `GET /api/dashboard/kpis` - Key performance indicators
- `GET /api/dashboard/revenue-cost` - Revenue vs cost data
- `GET /api/dashboard/warehouse-volume` - Warehouse statistics
- `GET /api/dashboard/activity` - Recent activity feed

### **Advanced Operations**
- `POST /api/stock/damage` - Process damage/recovery
- `POST /api/returns` - Create return
- `POST /api/inventory-entry/inventory-entry` - Bulk upload
- `POST /api/transfers/fifo` - FIFO transfer

### **Messaging System**
- `GET /api/messages/channels` - Get all channels
- `POST /api/messages/channels/send` - Send channel message
- `POST /api/messages/direct/send` - Send direct message

### **Permissions & Users**
- `GET /api/permissions/roles` - Get all roles
- `GET /api/permissions/users` - Get all users
- `GET /api/permissions/audit-logs` - Get audit logs

## 🔍 Key Features Explained

### **FIFO Transfers**
- First In, First Out inventory transfers
- Automatic stock validation
- Transaction-based operations
- Complete audit trail

### **Damage & Recovery**
- Track damaged inventory
- Recovery operations to restore stock
- Statistical reporting
- Integration with inventory levels

### **Bulk Upload**
- Excel/CSV file support
- Data validation and error reporting
- Template download
- Progress tracking

### **Returns Management**
- Multi-step approval workflow
- Automatic inventory updates
- Subtype tracking (parts, components)
- Statistical analysis

### **Real-time Dashboard**
- Live KPI updates
- Interactive charts and graphs
- Activity heatmaps
- Warehouse performance metrics

## 🚀 Production Deployment

### **AWS Deployment**
1. Upload files to your AWS EC2 instance
2. Install Node.js and npm
3. Run `npm install` to install dependencies
4. Configure environment variables
5. Run `node setup-database.js` to setup database
6. Start with `npm start`

### **Process Management**
Use PM2 for production process management:
```bash
npm install -g pm2
pm2 start server.js --name "inventory-backend"
pm2 startup
pm2 save
```

### **Nginx Configuration**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔧 Development

### **Adding New Features**
1. Create controller in `controllers/`
2. Create routes in `routes/`
3. Add route to `server.js`
4. Update database schema if needed
5. Add permissions if required

### **Database Migrations**
For schema changes, update `database-setup.sql` and run:
```bash
node setup-database.js
```

### **Testing**
```bash
# Test API endpoints
curl http://localhost:5000/health

# Test authentication
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin@123"}'
```

## 📝 License

MIT License - feel free to use this project for your inventory management needs.

## 🤝 Support

For issues or questions:
1. Check the API endpoints are correctly configured
2. Verify database connection settings
3. Ensure all required permissions are set
4. Check server logs for detailed error messages

---

**Built with ❤️ for comprehensive inventory management**