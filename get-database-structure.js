const mysql = require('mysql2');
require('dotenv').config();

// Database connection using your existing credentials
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
});

console.log('🔍 Getting database structure...');
console.log(`📊 Database: ${process.env.DB_NAME} on ${process.env.DB_HOST}`);

// Function to get all tables
function getTables() {
    return new Promise((resolve, reject) => {
        connection.query('SHOW TABLES', (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

// Function to get table structure
function getTableStructure(tableName) {
    return new Promise((resolve, reject) => {
        connection.query(`DESCRIBE ${tableName}`, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

// Function to get table creation SQL
function getCreateTable(tableName) {
    return new Promise((resolve, reject) => {
        connection.query(`SHOW CREATE TABLE ${tableName}`, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

// Main function to get complete database structure
async function getDatabaseStructure() {
    try {
        console.log('\n=== CONNECTING TO DATABASE ===');
        
        // Get all tables
        const tables = await getTables();
        const tableNames = tables.map(row => Object.values(row)[0]);
        
        console.log('\n=== TABLES IN DATABASE ===');
        console.log('Tables found:', tableNames.length);
        tableNames.forEach((table, index) => {
            console.log(`${index + 1}. ${table}`);
        });

        console.log('\n=== TABLE STRUCTURES ===');
        
        // Get structure for each table
        for (const tableName of tableNames) {
            console.log(`\n--- TABLE: ${tableName} ---`);
            
            try {
                // Get table description
                const structure = await getTableStructure(tableName);
                console.log('Columns:');
                structure.forEach(col => {
                    console.log(`  ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default} | ${col.Extra}`);
                });

                // Get CREATE TABLE statement
                const createTable = await getCreateTable(tableName);
                console.log('\nCREATE TABLE statement:');
                console.log(createTable[0]['Create Table']);
                console.log('\n' + '='.repeat(80));
                
            } catch (error) {
                console.error(`Error getting structure for ${tableName}:`, error.message);
            }
        }

        console.log('\n=== SUMMARY ===');
        console.log(`Total tables: ${tableNames.length}`);
        console.log('Database structure analysis complete!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        connection.end();
    }
}

// Run the script
getDatabaseStructure();