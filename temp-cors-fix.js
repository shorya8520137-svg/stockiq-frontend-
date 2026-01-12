#!/usr/bin/env node

/**
 * Temporary CORS and Auth fix for testing
 * This will make the API accessible from Vercel frontend
 */

const fs = require('fs');

console.log('🔧 Applying temporary CORS and auth fixes...');

// 1. Update server.js CORS config
let serverContent = fs.readFileSync('server.js', 'utf8');

// Enhanced CORS configuration
const newCorsConfig = `app.use(cors({
    origin: [
        "http://localhost:3000",
        "http://localhost:3001", 
        "https://stockiq-frontend-58vg9s040-test-tests-projects-d6b8ba0b.vercel.app",
        "https://*.vercel.app",
        "*"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    exposedHeaders: ["Authorization"],
    preflightContinue: false,
    optionsSuccessStatus: 200
}));`;

serverContent = serverContent.replace(
    /app\.use\(cors\(\{[\s\S]*?\}\)\);/,
    newCorsConfig
);

fs.writeFileSync('server.js', serverContent);
console.log('✅ Updated CORS configuration in server.js');

// 2. Create optional auth middleware for testing
const optionalAuthContent = `const jwt = require('jsonwebtoken');

// Optional authentication middleware for testing
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // No token provided - continue without user info
        req.user = null;
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            // Invalid token - continue without user info
            req.user = null;
        } else {
            req.user = user;
        }
        next();
    });
};

module.exports = { optionalAuth };
`;

fs.writeFileSync('middleware/optionalAuth.js', optionalAuthContent);
console.log('✅ Created optional auth middleware');

// 3. Update inventory routes to use optional auth
let inventoryRoutes = fs.readFileSync('routes/inventoryRoutes.js', 'utf8');

inventoryRoutes = inventoryRoutes.replace(
    `const { authenticateToken } = require('../middleware/auth');`,
    `const { optionalAuth } = require('../middleware/optionalAuth');`
);

inventoryRoutes = inventoryRoutes.replace(
    `router.use(authenticateToken);`,
    `router.use(optionalAuth);`
);

fs.writeFileSync('routes/inventoryRoutes.js', inventoryRoutes);
console.log('✅ Updated inventory routes to use optional auth');

console.log('🚀 Temporary fixes applied!');
console.log('📝 Restart your server: node server.js');
console.log('⚠️  Remember to revert these changes after testing!');