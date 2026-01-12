#!/usr/bin/env node

/**
 * Test server startup to identify issues
 */

console.log('🔍 Testing server startup...');

try {
    // Test basic requires
    console.log('📦 Testing basic requires...');
    require('dotenv').config();
    const express = require('express');
    const cors = require('cors');
    const morgan = require('morgan');
    const http = require('http');
    console.log('✅ Basic requires successful');
    
    // Test database connection
    console.log('🗄️ Testing database connection...');
    const db = require('./db/connection');
    console.log('✅ Database connection successful');
    
    // Test websocket service
    console.log('🔌 Testing websocket service...');
    const websocketService = require('./services/websocketService');
    console.log('✅ WebSocket service loaded');
    
    // Test route requires
    console.log('🛣️ Testing route requires...');
    const authRoutes = require('./routes/authRoutes');
    const permissionsRoutes = require('./routes/permissionsRoutes');
    const searchRoutes = require('./routes/searchRoutes');
    const notificationRoutes = require('./routes/notificationRoutes');
    const mentionRoutes = require('./routes/mentionRoutes');
    const dispatchRoutes = require('./routes/dispatchRoutes');
    const productRoutes = require('./routes/productRoutes');
    const inventoryRoutes = require('./routes/inventoryRoutes');
    const bulkUploadRoutes = require('./routes/bulkUploadRoutes');
    const damageRecoveryRoutes = require('./routes/damageRecoveryRoutes');
    const returnsRoutes = require('./routes/returnsRoutes');
    const timelineRoutes = require('./routes/timelineRoutes');
    const orderTrackingRoutes = require('./routes/orderTrackingRoutes');
    const selfTransferRoutes = require('./routes/selfTransferRoutes');
    console.log('✅ All routes loaded successfully');
    
    console.log('🎉 All components loaded successfully!');
    console.log('🚀 Server should be able to start...');
    
} catch (error) {
    console.error('❌ Error during startup test:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}