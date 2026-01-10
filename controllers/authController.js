const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');
const { logActivity } = require('./activityController');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

class AuthController {
    // ===============================================
    // REGISTER NEW USER
    // ===============================================
    static async register(req, res) {
        const { name, email, password, role = 'user', warehouse_access = [] } = req.body;
        const clientIp = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent') || 'Unknown';

        try {
            // Validate input
            if (!name || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, email, and password are required'
                });
            }

            // Check if user already exists
            const [existingUsers] = await db.execute(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            if (existingUsers.length > 0) {
                await logActivity({
                    user_email: email,
                    user_name: name,
                    action: 'REGISTER_FAILED',
                    component: 'AUTH',
                    details: 'Registration failed - email already exists',
                    success: false,
                    ip_address: clientIp,
  