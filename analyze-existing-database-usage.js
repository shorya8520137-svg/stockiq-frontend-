const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing existing database usage in controllers and routes...\n');

// Function to read file content
function readFileContent(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        return null;
    }
}

// Function to extract table names from SQL queries
function extractTableNames(content) {
    const tables = new Set();
    
    // Common SQL patterns
    const patterns = [
        /FROM\s+(\w+)/gi,
        /INSERT\s+INTO\s+(\w+)/gi,
        /UPDATE\s+(\w+)/gi,
        /DELETE\s+FROM\s+(\w+)/gi,
        /JOIN\s+(\w+)/gi,
        /TABLE\s+(\w+)/gi
    ];
    
    patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
            matches.forEach(match => {
                const tableName = match.split(/\s+/).pop();
                if (tableName && tableName.length > 2 && !tableName.includes('(')) {
                    tables.add(tableName.toLowerCase());
                }
            });
        }
    });
    
    return Array.from(tables);
}

// Analyze controllers
console.log('=== ANALYZING CONTROLLERS ===');
const controllersDir = './controllers';
if (fs.existsSync(controllersDir)) {
    const controllerFiles = fs.readdirSync(controllersDir).filter(file => file.endsWith('.js'));
    
    controllerFiles.forEach(file => {
        console.log(`\n--- ${file} ---`);
        const content = readFileContent(path.join(controllersDir, file));
        if (content) {
            const tables = extractTableNames(content);
            console.log('Tables used:', tables.length > 0 ? tables.join(', ') : 'None detected');
            
            // Look for permission-related code
            if (content.includes('permission') || content.includes('role') || content.includes('auth')) {
                console.log('🔐 Contains permission/auth logic');
            }
        }
    });
}

// Analyze SQL files
console.log('\n\n=== ANALYZING SQL FILES ===');
const sqlFiles = fs.readdirSync('.').filter(file => file.endsWith('.sql'));

sqlFiles.forEach(file => {
    console.log(`\n--- ${file} ---`);
    const content = readFileContent(file);
    if (content) {
        // Extract CREATE TABLE statements
        const createTableMatches = content.match(/CREATE TABLE[^;]+;/gi);
        if (createTableMatches) {
            console.log('Tables defined:');
            createTableMatches.forEach(match => {
                const tableName = match.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?(\w+)`?/i);
                if (tableName) {
                    console.log(`  - ${tableName[1]}`);
                }
            });
        }
        
        const tables = extractTableNames(content);
        if (tables.length > 0) {
            console.log('Tables referenced:', tables.join(', '));
        }
    }
});

// Analyze routes
console.log('\n\n=== ANALYZING ROUTES ===');
const routesDir = './routes';
if (fs.existsSync(routesDir)) {
    const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));
    
    routeFiles.forEach(file => {
        console.log(`\n--- ${file} ---`);
        const content = readFileContent(path.join(routesDir, file));
        if (content) {
            // Extract route endpoints
            const routeMatches = content.match(/router\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi);
            if (routeMatches) {
                console.log('Endpoints:');
                routeMatches.forEach(match => {
                    console.log(`  ${match}`);
                });
            }
        }
    });
}

console.log('\n=== SUMMARY ===');
console.log('Analysis complete! This shows what database tables and permissions are currently being used.');