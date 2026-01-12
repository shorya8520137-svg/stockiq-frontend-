const https = require('https');

// Test login API
const testLogin = () => {
    const postData = JSON.stringify({
        email: 'admin@hunyhuny.com',
        password: 'gfx998sd'
    });

    const options = {
        hostname: '13-201-222-24.nip.io',
        port: 443,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        },
        // Allow self-signed certificates
        rejectUnauthorized: false
    };

    console.log('🔍 Testing login API...');
    console.log('URL:', `https://${options.hostname}${options.path}`);
    console.log('Data:', { email: 'admin@hunyhuny.com', password: '***' });

    const req = https.request(options, (res) => {
        console.log('📡 Response Status:', res.statusCode);
        console.log('📡 Response Headers:', res.headers);

        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log('📡 Response Body:', data);
            try {
                const parsed = JSON.parse(data);
                if (parsed.success) {
                    console.log('✅ LOGIN SUCCESS!');
                    console.log('🎫 Token received:', parsed.token ? 'YES' : 'NO');
                    console.log('👤 User data:', parsed.user);
                } else {
                    console.log('❌ LOGIN FAILED:', parsed.message);
                }
            } catch (e) {
                console.log('❌ Failed to parse response:', e.message);
            }
        });
    });

    req.on('error', (e) => {
        console.error('❌ Request error:', e.message);
    });

    req.write(postData);
    req.end();
};

// Also test CORS preflight
const testCORS = () => {
    const options = {
        hostname: '13-201-222-24.nip.io',
        port: 443,
        path: '/api/auth/login',
        method: 'OPTIONS',
        headers: {
            'Origin': 'https://stockiq-frontend-8np7yu2b9-test-tests-projects-d6b8ba0b.vercel.app',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type'
        },
        rejectUnauthorized: false
    };

    console.log('\n🔍 Testing CORS preflight...');
    
    const req = https.request(options, (res) => {
        console.log('📡 CORS Status:', res.statusCode);
        console.log('📡 CORS Headers:', res.headers);
        
        if (res.headers['access-control-allow-origin']) {
            console.log('✅ CORS WORKING!');
        } else {
            console.log('❌ CORS NOT WORKING!');
        }
    });

    req.on('error', (e) => {
        console.error('❌ CORS error:', e.message);
    });

    req.end();
};

console.log('🚀 Starting API tests...');
testLogin();
setTimeout(testCORS, 2000);