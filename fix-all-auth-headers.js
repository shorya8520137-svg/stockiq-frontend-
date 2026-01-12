#!/usr/bin/env node

/**
 * Comprehensive fix for all auth header issues in the project
 * This script will add auth headers to all frontend components
 */

const fs = require('fs');
const path = require('path');

// Helper function to add auth headers to fetch calls
const addAuthHeaders = (content) => {
    // Pattern 1: Simple fetch calls without headers
    content = content.replace(
        /fetch\(`([^`]+)`\)\.then/g,
        `fetchWithAuth(\`$1\`).then`
    );
    
    // Pattern 2: fetch calls with basic headers
    content = content.replace(
        /fetch\(`([^`]+)`, \{\s*method: "([^"]+)",\s*headers: \{ "Content-Type": "application\/json" \}/g,
        `fetchWithAuth(\`$1\`, { method: "$2" }`
    );
    
    return content;
};

// Add fetchWithAuth helper to components that need it
const addFetchWithAuthHelper = (content) => {
    if (content.includes('fetchWithAuth')) return content;
    
    const helperFunction = `
// Helper function to make authenticated requests
const fetchWithAuth = async (url, options = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = \`Bearer \${token}\`;
    }
    return fetch(url, { ...options, headers });
};
`;
    
    // Insert after imports
    const importEndIndex = content.lastIndexOf('import ');
    if (importEndIndex !== -1) {
        const nextLineIndex = content.indexOf('\n', importEndIndex);
        return content.slice(0, nextLineIndex + 1) + helperFunction + content.slice(nextLineIndex + 1);
    }
    
    return helperFunction + content;
};

console.log('🔧 Fixing all auth header issues...');

// Files that need auth header fixes
const filesToFix = [
    'src/app/products/TransferForm.jsx',
    'src/app/order/websiteorder/websiteorder.jsx',
    'src/app/order/OrderSheet.jsx',
    'src/app/inventory/selftransfer/ReturnModal.jsx',
    'src/app/inventory/selftransfer/DamageRecoveryModal.jsx',
    'src/app/tracking/Dashboard.jsx'
];

filesToFix.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        
        // Add fetchWithAuth helper
        content = addFetchWithAuthHelper(content);
        
        // Fix fetch calls
        content = addAuthHeaders(content);
        
        fs.writeFileSync(file, content);
        console.log(`✅ Fixed auth headers in ${file}`);
    } else {
        console.log(`⚠️  File not found: ${file}`);
    }
});

console.log('🚀 All auth header issues fixed!');
console.log('📝 Manual fixes may still be needed for complex cases.');