const mysql = require('mysql2/promise');
const fs = require('fs');

async function setupPermissionsDatabase() {
    const connection = await mysql.createConnection({
        host: 'inventory-db.cv2iey8a8hbk.ap-south-1.rds.amazonaws.com',
        user: 'admin',
        password: 'gfx998sd',
        database: 'hunyhuny_auto_dispatch',
        multipleStatements: true
    });

    try {
        console.log('✅ Connected to database');
        
        // Read the SQL file
        const sqlContent = fs.readFileSync('permissions-system.sql', 'utf8');
        
        console.log('📄 Executing permissions system SQL...');
        
        // Execute the SQL
        await connection.execute(sqlContent);
        
        console.log('✅ Permissions system setup completed successfully!');
        
        // Verify tables were created
        const [tables] = await connection.execute(`
            SHOW TABLES LIKE '%roles%' 
            UNION 
            SHOW TABLES LIKE '%permissions%' 
            UNION 
            SHOW TABLES LIKE '%users%'
            UNION
            SHOW TABLES LIKE '%audit%'
            UNION
            SHOW TABLES LIKE '%notifications%'
        `);
        
        console.log('📋 Created tables:');
        tables.forEach(table => {
            console.log(`  - ${Object.values(table)[0]}`);
        });
        
    } catch (error) {
        console.error('❌ Error setting up permissions database:', error.message);
    } finally {
        await connection.end();
    }
}

setupPermissionsDatabase();