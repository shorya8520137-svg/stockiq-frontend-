# 🗄️ Database Setup Guide for Phase 3 Features

## Overview
This guide will help you set up the required database tables for the new Phase 3 features including real-time notifications, WebSocket sessions, user mentions, global search, and enhanced activity tracking.

## 📋 Required Tables

The following tables need to be created in your database:

1. **`search_index`** - Global search functionality
2. **`user_mentions`** - User mention system (@username)
3. **`notification_queue`** - Enhanced notifications with priorities
4. **`user_activities`** - Enhanced activity tracking
5. **`dashboard_widgets`** - Permission-based dashboard widgets
6. **`user_widget_preferences`** - User widget customization
7. **`search_analytics`** - Search usage analytics
8. **`user_sessions`** - WebSocket session management

## 🚀 Setup Methods

### Method 1: Automated Setup (Recommended)

```bash
# On your server, navigate to project directory
cd /path/to/your/project

# Run the automated table creation script
node create-missing-tables.js
```

### Method 2: Manual SQL Execution

If the automated script doesn't work due to network issues, you can run the SQL commands manually.

## 📝 Manual SQL Scripts

### 1. Global Search Index Table
```sql
CREATE TABLE IF NOT EXISTS search_index (
    id INT PRIMARY KEY AUTO_INCREMENT,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    searchable_text TEXT NOT NULL,
    metadata JSON,
    weight INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_entity (entity_type, entity_id),
    FULLTEXT INDEX idx_search (searchable_text)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. User Mentions System
```sql
CREATE TABLE IF NOT EXISTS user_mentions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    mentioned_user_id INT NOT NULL,
    mentioning_user_id INT NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    mention_text TEXT,
    context_text TEXT,
    notification_sent BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mentioned_user (mentioned_user_id),
    INDEX idx_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3. Enhanced Notification Queue
```sql
CREATE TABLE IF NOT EXISTS notification_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    read_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_unread (user_id, read_at),
    INDEX idx_type (type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4. Enhanced User Activities
```sql
CREATE TABLE IF NOT EXISTS user_activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_url VARCHAR(500),
    request_method VARCHAR(10),
    response_status INT,
    duration_ms INT,
    is_offline_sync BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_action (user_id, action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at),
    INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5. Dashboard Widgets
```sql
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    widget_key VARCHAR(100) NOT NULL UNIQUE,
    widget_name VARCHAR(255) NOT NULL,
    widget_description TEXT,
    required_permission VARCHAR(100),
    component_path VARCHAR(255),
    default_position JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active),
    INDEX idx_permission (required_permission)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 6. User Widget Preferences
```sql
CREATE TABLE IF NOT EXISTS user_widget_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    widget_key VARCHAR(100) NOT NULL,
    position JSON,
    is_visible BOOLEAN DEFAULT TRUE,
    custom_settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_widget (user_id, widget_key),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 7. Search Analytics
```sql
CREATE TABLE IF NOT EXISTS search_analytics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    search_query VARCHAR(500) NOT NULL,
    search_type VARCHAR(50),
    results_count INT DEFAULT 0,
    selected_result_id INT,
    selected_result_type VARCHAR(50),
    response_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_query (search_query(100)),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 8. WebSocket User Sessions
```sql
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    socket_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_active (user_id, is_active),
    INDEX idx_session (session_id),
    INDEX idx_socket (socket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 9. Insert Default Dashboard Widgets
```sql
INSERT IGNORE INTO dashboard_widgets 
(widget_key, widget_name, widget_description, required_permission, component_path, default_position)
VALUES 
('inventory_overview', 'Inventory Overview', 'Shows current inventory levels and alerts', 'INVENTORY_VIEW', '/components/dashboard/InventoryOverview', '{"x": 0, "y": 0, "w": 6, "h": 4}'),
('recent_dispatches', 'Recent Dispatches', 'Shows recent dispatch activities', 'DISPATCH_VIEW', '/components/dashboard/RecentDispatches', '{"x": 6, "y": 0, "w": 6, "h": 4}'),
('low_stock_alerts', 'Low Stock Alerts', 'Shows products with low stock levels', 'INVENTORY_VIEW', '/components/dashboard/LowStockAlerts', '{"x": 0, "y": 4, "w": 4, "h": 3}'),
('user_activity', 'User Activity', 'Shows recent user activities', 'SYSTEM_AUDIT_LOG', '/components/dashboard/UserActivity', '{"x": 4, "y": 4, "w": 4, "h": 3}'),
('pending_returns', 'Pending Returns', 'Shows pending return requests', 'RETURNS_VIEW', '/components/dashboard/PendingReturns', '{"x": 8, "y": 4, "w": 4, "h": 3}');
```

## 🔧 Post-Setup Tasks

### 1. Populate Search Index
After creating the tables, populate the search index:

```bash
# Run the search index population script
node populate-search-index.js
```

### 2. Restart Your Application
```bash
# Stop the current application
pm2 stop your-app-name
# or
sudo systemctl stop your-app-service

# Start the application with new features
pm2 start your-app-name
# or
sudo systemctl start your-app-service
```

### 3. Verify WebSocket Connection
Check that WebSocket is working:
- Look for "🔌 WebSocket server initialized" in server logs
- Test real-time notifications in the application
- Check browser console for WebSocket connection messages

## 🔍 Verification Queries

Run these queries to verify tables were created successfully:

```sql
-- Check if all tables exist
SHOW TABLES LIKE '%search_index%';
SHOW TABLES LIKE '%user_mentions%';
SHOW TABLES LIKE '%notification_queue%';
SHOW TABLES LIKE '%user_activities%';
SHOW TABLES LIKE '%dashboard_widgets%';
SHOW TABLES LIKE '%user_widget_preferences%';
SHOW TABLES LIKE '%search_analytics%';
SHOW TABLES LIKE '%user_sessions%';

-- Check default widgets were inserted
SELECT COUNT(*) as widget_count FROM dashboard_widgets;

-- Check table structures
DESCRIBE notification_queue;
DESCRIBE user_sessions;
```

## 🚨 Troubleshooting

### Common Issues:

1. **MySQL Version Compatibility**
   - Ensure MySQL 5.7+ or MariaDB 10.2+ for JSON support
   - For older versions, replace JSON columns with TEXT

2. **Permission Issues**
   - Ensure database user has CREATE, INSERT, INDEX privileges
   - Check if FULLTEXT indexes are supported

3. **Character Set Issues**
   - Ensure database uses utf8mb4 charset for emoji support
   - Update database charset if needed:
   ```sql
   ALTER DATABASE your_database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

4. **Connection Timeouts**
   - If automated script fails, run SQL commands manually
   - Check database connection settings in .env file

## 📊 Expected Results

After successful setup, you should have:
- ✅ 8 new database tables created
- ✅ 5 default dashboard widgets inserted
- ✅ Proper indexes for performance
- ✅ WebSocket session management ready
- ✅ Real-time notification system functional
- ✅ Global search capabilities enabled
- ✅ User mention system operational

## 🎯 Next Steps

1. Test the application with new features
2. Monitor server logs for any errors
3. Test WebSocket connections from frontend
4. Verify real-time notifications work
5. Test global search functionality
6. Check user mention system (@username)

Your inventory management system is now ready with all Phase 3 enhancements! 🚀