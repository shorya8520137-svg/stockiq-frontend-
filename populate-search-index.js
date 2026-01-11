#!/usr/bin/env node

// Script to populate search index with existing data

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: 'inventory-db.cv2iey8a8hbk.ap-south-1.rds.amazonaws.com',
    user: 'admin',
    password: 'gfx998sd',
    database: 'hunyhuny_auto_dispatch',
    port: 3306
};

async function populateSearchIndex() {
    try {
        console.log('🔍 Populating search index...');
        const connection = await mysql.createConnection(dbConfig);
        
        // Clear existing search index (if table exists)
        try {
            await connection.execute('DELETE FROM search_index');
            console.log('✅ Cleared existing search index');
        } catch (error) {
            console.log('ℹ️  Search index table not found, will create when database tables are set up');
        }

        let totalIndexed = 0;

        // Index Products
        try {
            const [products] = await connection.execute(`
                SELECT p_id, product_name, product_variant, barcode, description, created_at
                FROM dispatch_product 
                WHERE is_active = 1
            `);

            console.log(`📦 Found ${products.length} products to index`);

            for (const product of products) {
                const searchableText = [
                    product.product_name,
                    product.product_variant,
                    product.barcode,
                    product.description
                ].filter(Boolean).join(' ');

                const metadata = {
                    name: product.product_name,
                    variant: product.product_variant,
                    barcode: product.barcode,
                    description: product.description
                };

                try {
                    await connection.execute(`
                        INSERT INTO search_index 
                        (entity_type, entity_id, searchable_text, metadata, weight, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        'product',
                        product.p_id,
                        searchableText,
                        JSON.stringify(metadata),
                        3, // Higher weight for products
                        product.created_at
                    ]);
                    totalIndexed++;
                } catch (error) {
                    // Skip if search_index table doesn't exist
                    if (error.code !== 'ER_NO_SUCH_TABLE') {
                        console.error(`Error indexing product ${product.p_id}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.log('⚠️  Could not index products:', error.message);
        }

        // Index Inventory
        try {
            const [inventory] = await connection.execute(`
                SELECT id, product, code, variant, warehouse, warehouse_code, stock, updated_at
                FROM inventory 
                WHERE stock >= 0
            `);

            console.log(`📋 Found ${inventory.length} inventory items to index`);

            for (const item of inventory) {
                const searchableText = [
                    item.product,
                    item.code,
                    item.variant,
                    item.warehouse,
                    item.warehouse_code
                ].filter(Boolean).join(' ');

                const metadata = {
                    product: item.product,
                    code: item.code,
                    variant: item.variant,
                    warehouse: item.warehouse,
                    warehouse_code: item.warehouse_code,
                    stock: item.stock
                };

                try {
                    await connection.execute(`
                        INSERT INTO search_index 
                        (entity_type, entity_id, searchable_text, metadata, weight, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        'inventory',
                        item.id,
                        searchableText,
                        JSON.stringify(metadata),
                        2, // Medium weight for inventory
                        item.updated_at
                    ]);
                    totalIndexed++;
                } catch (error) {
                    if (error.code !== 'ER_NO_SUCH_TABLE') {
                        console.error(`Error indexing inventory ${item.id}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.log('⚠️  Could not index inventory:', error.message);
        }

        // Index Users
        try {
            const [users] = await connection.execute(`
                SELECT id, name, email, role, created_at
                FROM users 
                WHERE status = 'active'
            `);

            console.log(`👤 Found ${users.length} users to index`);

            for (const user of users) {
                const searchableText = [
                    user.name,
                    user.email,
                    user.role
                ].filter(Boolean).join(' ');

                const metadata = {
                    name: user.name,
                    email: user.email,
                    role: user.role
                };

                try {
                    await connection.execute(`
                        INSERT INTO search_index 
                        (entity_type, entity_id, searchable_text, metadata, weight, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        'user',
                        user.id,
                        searchableText,
                        JSON.stringify(metadata),
                        1, // Lower weight for users
                        user.created_at
                    ]);
                    totalIndexed++;
                } catch (error) {
                    if (error.code !== 'ER_NO_SUCH_TABLE') {
                        console.error(`Error indexing user ${user.id}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.log('⚠️  Could not index users:', error.message);
        }

        // Index Warehouses
        try {
            const [warehouses] = await connection.execute(`
                SELECT w_id, Warehouse_name, warehouse_code, address
                FROM dispatch_warehouse
            `);

            console.log(`🏢 Found ${warehouses.length} warehouses to index`);

            for (const warehouse of warehouses) {
                const searchableText = [
                    warehouse.Warehouse_name,
                    warehouse.warehouse_code,
                    warehouse.address
                ].filter(Boolean).join(' ');

                const metadata = {
                    name: warehouse.Warehouse_name,
                    code: warehouse.warehouse_code,
                    address: warehouse.address
                };

                try {
                    await connection.execute(`
                        INSERT INTO search_index 
                        (entity_type, entity_id, searchable_text, metadata, weight, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        'warehouse',
                        warehouse.w_id,
                        searchableText,
                        JSON.stringify(metadata),
                        2, // Medium weight for warehouses
                        new Date()
                    ]);
                    totalIndexed++;
                } catch (error) {
                    if (error.code !== 'ER_NO_SUCH_TABLE') {
                        console.error(`Error indexing warehouse ${warehouse.w_id}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.log('⚠️  Could not index warehouses:', error.message);
        }

        // Index Orders/Dispatches
        try {
            const [orders] = await connection.execute(`
                SELECT id, customer_name, warehouse, status, created_at
                FROM warehouse_dispatch 
                ORDER BY created_at DESC
                LIMIT 1000
            `);

            console.log(`📄 Found ${orders.length} orders to index`);

            for (const order of orders) {
                const searchableText = [
                    order.customer_name,
                    order.warehouse,
                    order.status,
                    `Order #${order.id}`
                ].filter(Boolean).join(' ');

                const metadata = {
                    customer_name: order.customer_name,
                    warehouse: order.warehouse,
                    status: order.status,
                    order_id: order.id
                };

                try {
                    await connection.execute(`
                        INSERT INTO search_index 
                        (entity_type, entity_id, searchable_text, metadata, weight, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        'order',
                        order.id,
                        searchableText,
                        JSON.stringify(metadata),
                        2, // Medium weight for orders
                        order.created_at
                    ]);
                    totalIndexed++;
                } catch (error) {
                    if (error.code !== 'ER_NO_SUCH_TABLE') {
                        console.error(`Error indexing order ${order.id}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.log('⚠️  Could not index orders:', error.message);
        }

        console.log(`\n🎉 Search index population complete!`);
        console.log(`📊 Total items indexed: ${totalIndexed}`);
        
        if (totalIndexed === 0) {
            console.log('\n⚠️  No items were indexed. This is likely because:');
            console.log('   1. The search_index table has not been created yet');
            console.log('   2. Run create-missing-tables.js first to create the required tables');
            console.log('   3. Then run this script again to populate the search index');
        }

        await connection.end();

    } catch (error) {
        console.error('❌ Failed to populate search index:', error.message);
        
        if (error.code === 'ETIMEDOUT') {
            console.log('\n💡 Database connection timed out. This might be due to:');
            console.log('   - Network connectivity issues');
            console.log('   - Database server being temporarily unavailable');
            console.log('   - Firewall restrictions');
            console.log('\n🔄 Try running the script again in a few minutes.');
        }
    }
}

// Run the script
populateSearchIndex();