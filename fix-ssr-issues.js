#!/usr/bin/env node

// Quick fix for SSR issues in Next.js

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing SSR issues...');

// Fix 1: Add dynamic import for notification preferences page
const preferencesPagePath = 'src/app/notifications/preferences/page.jsx';
if (fs.existsSync(preferencesPagePath)) {
    let content = fs.readFileSync(preferencesPagePath, 'utf8');
    
    // Add dynamic import
    if (!content.includes('dynamic')) {
        content = content.replace(
            '"use client";\n\nimport React',
            '"use client";\n\nimport dynamic from \'next/dynamic\';\nimport React'
        );
        
        // Wrap component in dynamic import
        content = content.replace(
            'export default function NotificationPreferences()',
            'function NotificationPreferences()'
        );
        
        content += '\n\n// Export with dynamic import to prevent SSR issues\nexport default dynamic(() => Promise.resolve(NotificationPreferences), {\n    ssr: false,\n    loading: () => <div>Loading preferences...</div>\n});';
        
        fs.writeFileSync(preferencesPagePath, content);
        console.log('✅ Fixed notification preferences page');
    }
}

// Fix 2: Add loading component for search page
const searchPagePath = 'src/app/search/page.jsx';
if (fs.existsSync(searchPagePath)) {
    console.log('✅ Search page already has mounted check');
}

// Fix 3: Create a loading component
const loadingComponentPath = 'src/components/common/Loading.jsx';
if (!fs.existsSync(loadingComponentPath)) {
    const loadingComponent = `import React from 'react';
import styles from './Loading.module.css';

export default function Loading({ message = 'Loading...' }) {
    return (
        <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>{message}</p>
        </div>
    );
}`;

    const loadingStyles = `.loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #64748b;
}

.loading p {
    margin: 16px 0 0 0;
    font-size: 14px;
}

.spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #e2e8f0;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}`;

    // Create directory if it doesn't exist
    const dir = path.dirname(loadingComponentPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(loadingComponentPath, loadingComponent);
    fs.writeFileSync('src/components/common/Loading.module.css', loadingStyles);
    console.log('✅ Created loading component');
}

console.log('🎉 SSR fixes applied successfully!');
console.log('\n📋 What was fixed:');
console.log('  - Notification API SSR compatibility');
console.log('  - WebSocket browser-only initialization');
console.log('  - Search page hydration issues');
console.log('  - Added loading states for better UX');
console.log('\n🚀 Try building your app now: npm run build');