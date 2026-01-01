require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const dispatchRoutes = require('./routes/dispatchRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const permissionsRoutes = require('./routes/permissionsRoutes');
const messageRoutes = require('./routes/messageRoutes');
const damageRoutes = require('./routes/damageRoutes');
const returnRoutes = require('./routes/returnRoutes');
const inventoryEntryRoutes = require('./routes/inventoryEntryRoutes');
const stockRoutes = require('./routes/stockRoutes');
const transferRoutes = require('./routes/transferRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const timelineRoutes = require('./routes/timelineRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    }
});
app.use(limiter);

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'https://13-201-222-24.nip.io',
            'https://your-frontend-domain.com'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ordersheet-universal-search', orderRoutes); // Legacy compatibility
app.use('/api/ordersheet-suggest', orderRoutes); // Legacy compatibility
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/dispatch-beta', dispatchRoutes); // Legacy compatibility
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/roles', permissionsRoutes); // Legacy compatibility
app.use('/api/users', permissionsRoutes); // Legacy compatibility
app.use('/api/audit-logs', permissionsRoutes); // Legacy compatibility
app.use('/api/messages', messageRoutes);
app.use('/api/stock', stockRoutes); // Stock search and management
app.use('/api/damage', damageRoutes); // Damage and recovery operations
app.use('/api/returns', returnRoutes); // Return management
app.use('/api/inventory-entry', inventoryEntryRoutes); // Bulk inventory upload
app.use('/api/transfers', transferRoutes); // Inventory transfers
app.use('/api/tracking', trackingRoutes); // Real-time tracking
app.use('/api/tracker', timelineRoutes); // Product timeline and history

// Product tracking endpoint (legacy compatibility)
app.get('/api/product-tracking/:barcode', require('./middleware/authMiddleware'), async (req, res) => {
    const InventoryController = require('./controllers/inventoryController');
    return InventoryController.getProductTracking(req, res);
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    
    // Handle CORS errors
    if (error.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'CORS policy violation'
        });
    }
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON in request body'
        });
    }
    
    // Default error response
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
🚀 Inventory Management API Server Started
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Health Check: http://localhost:${PORT}/health
📊 API Base URL: http://localhost:${PORT}/api
⏰ Started at: ${new Date().toISOString()}
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

module.exports = app;