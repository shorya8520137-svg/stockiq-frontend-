
// Test API Connection
import { checkAPIHealth } from './src/services/api/config.js';

async function testConnection() {
    try {
        console.log('🧪 Testing API connection...');
        const result = await checkAPIHealth();
        
        if (result.success) {
            console.log('✅ API connection successful!');
            console.log('📊 Response:', result.data);
        } else {
            console.log('❌ API connection failed:', result.error);
        }
    } catch (error) {
        console.log('❌ Connection test error:', error.message);
    }
}

testConnection();
