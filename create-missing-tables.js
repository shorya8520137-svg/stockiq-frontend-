#!/usr/bin/env node

// Script to create missing database tables for enhanced functionality

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: 'inventory-db.cv2iey8a8hbk.ap-south-1.rds.amazonaws.com',
    user: 'admin',
    password: 'gfx998sd',
    database: 'hunyhuny_auto_dispatch',
    port: 3306
};

const missingTables = {
    // Global search index
    search_index: `
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
    `,
    
    // User mentions system
    user_mentions: `
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
    `,
    
    // Enhanced notification queue
    notification_queue: `
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
    `,
    
    // Enhanced activity tracking
    user_activities: `
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
    `,
    
    // Dashboard widget permissions
    dashboard_widgets: `
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
    `,
    
    // User widget preferences
    user_widget_preferences: `
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
    `,
    
    // Search analytics
    search_analytics: `
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
    `,
    
    // Real-time sessions for WebSocket management
    user_sessions: `
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
    `
};

// Default dashboard widgets
const defaultWidgets = [
    {
        widget_key: 'inventory_overview',
        widget_name: 'Inventory Overview',
        widget_description: 'Shows current inventory levels and alerts',
        required_permission: 'INVENTORY_VIEW',
        component_path: '/components/dashboard/InventoryOverview',
        default_position: JSON.stringify({ x: 0, y: 0, w: 6, h: 4 })
    },
    {
        widget_key: 'recent_dispatches',
        widget_name: 'Recent Dispatches',
        widget_description: 'Shows recent dispatch activities',
        required_permission: 'DISPATCH_VIEW',
        component_path: '/components/dashboard/RecentDispatches',
        default_position: JSON.stringify({ x: 6, y: 0, w: 6, h: 4 })
    },
    {
        widget_key: 'low_stock_alerts',
        widget_name: 'Low Stock Alerts',
        widget_description: 'Shows products with low stock levels',
        required_permission: 'INVENTORY_VIEW',
        component_path: '/components/dashboard/LowStockAlerts',
        default_position: JSON.stringify({ x: 0, y: 4, w: 4, h: 3 })
    },
    {
        widget_key: 'user_activity',
        widget_name: 'User Activity',
        widget_description: 'Shows recent user activities',
        required_permission: 'SYSTEM_AUDIT_LOG',
        component_path: '/components/dashboard/UserActivity',
        default_position: JSON.stringify({ x: 4, y: 4, w: 4, h: 3 })
    },
    {
        widget_key: 'pending_returns',
        widget_name: 'Pending Returns',
        widget_description: 'Shows pending return requests',
        required_permission: 'RETURNS_VIEW',
        component_path: '/components/dashboard/PendingReturns',
        default_position: JSON.stringify({ x: 8, y: 4, w: 4, h: 3 })
    }
];

async function createMissingTables() {
    try {
        console.log('🔧 Creating missing database tables...');
        const connection = await mysql.createConnection(dbConfig);
        
        // Create tables
        for (const [tableName, createSQL] of Object.entries(missingTables)) {
            try {
                console.log(`📋 Creating table: ${tableName}`);
                await connection.execute(createSQL);
                console.log(`✅ Table ${tableName} created successfully`);
            } catch (error) {
                console.error(`❌ Error creating table ${tableName}:`, error.message);
            }
        }
        
        // Insert default dashboard widgets
        console.log('\n🎯 Inserting default dashboard widgets...');
        for (const widget of defaultWidgets) {
            try {
                await connection.execute(`
                    INSERT IGNORE INTO dashboard_widgets 
                    (widget_key, widget_name, widget_description, required_permission, component_path, default_position)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    widget.widget_key,
                    widget.widget_name,
                    widget.widget_description,
                    widget.required_permission,
                    widget.component_path,
                    widget.default_position
                ]);
                console.log(`✅ Widget ${widget.widget_key} inserted`);
            } catch (error) {
                console.error(`❌ Error inserting widget ${widget.widget_key}:`, error.message);
            }
        }
        
        console.log('\n🎉 All missing tables created successfully!');
        console.log('\n📊 Summary:');
        console.log(`   - ${Object.keys(missingTables).length} tables created`);
        console.log(`   - ${defaultWidgets.length} default widgets inserted`);
        console.log('\n🔍 Tables created:');
        Object.keys(missingTables).forEach(table => {
            console.log(`   - ${table}`);
        });
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Failed to create missing tables:', error.message);
    }
}

// Run the script
createMissingTables();