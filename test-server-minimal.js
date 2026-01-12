#!/usr/bin/env node

/**
 * Minimal server test without database
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Basic CORS
app.use(cors({
    origin: function (origin, callback) {
        console.log('🌐 Incoming CORS origin:', origin || 'NO ORIGIN');
        if (!origin) return callback(null, true);
        if (origin === "http://localhost:3000" || origin.endsWith(".vercel.app")) {
            console.log('✅ Origin allowed:', origin);
            return callback(null, true);
        }
        console.log('❌ Origin rejected:', origin);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Test endpoints
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Inventory Backend',
        timestamp: new Date().toISOString(),
        message: 'Server is running without database'
    });
});

app.get('/api/test', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Test endpoint working',
        timestamp: new Date().toISOString()
    });
});

// Simple auth endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (email === 'admin@hunyhuny.com' && password === 'gfx998sd') {
        res.json({
            success: true,
            message: 'Login successful (test mode)',
            token: 'test-token-123',
            user: {
                id: 1,
                name: 'Admin User',
                email: email,
                role: 'super_admin'
            }
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    }
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log('======================================');
    console.log('🚀 Minimal Test Server Started');
    console.log(`🌍 Port: ${PORT}`);
    console.log('🔌 Database: Disabled (test mode)');
    console.log('======================================');
});