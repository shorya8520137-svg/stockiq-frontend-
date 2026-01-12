require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const http = require("http");
const websocketService = require("./services/websocketService");

const app = express();

// Create HTTP server for WebSocket
const server = http.createServer(app);

// ===============================
// MIDDLEWARE
// ===============================

// Proper production CORS configuration
const allowedOrigins = [
    "https://stockiq-frontend-bgf31pney-test-tests-projects-d6b8ba0b.vercel.app",
    "https://stockiq-frontend-8np7yu2b9-test-tests-projects-d6b8ba0b.vercel.app", 
    "https://stockiq-frontend-58vg9s040-test-tests-projects-d6b8ba0b.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001"
];

app.use(cors({
    origin: function (origin, callback) {
        // Log all incoming origins for debugging
        console.log('🌐 Incoming CORS origin:', origin || 'NO ORIGIN');
        
        // Allow server-to-server or curl requests (no origin)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            console.log('✅ Origin allowed:', origin);
            return callback(null, true);
        }
        
        console.log('❌ Origin rejected:', origin);
        console.log('📋 Allowed origins:', allowedOrigins);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Let CORS handle OPTIONS properly
app.options("*", cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));

// ===============================
// DATABASE
// ===============================
require("./db/connection");

// ===============================
// WEBSOCKET INITIALIZATION
// ===============================
websocketService.initialize(server);

// ===============================
// ROUTES (FRONTEND COMPATIBLE)
// ===============================

// 🔥 AUTH ROUTES (ADDED)
app.use("/api/auth", require("./routes/authRoutes"));

// 🔥 PERMISSIONS ROUTES (ADDED) 
app.use("/api", require("./routes/permissionsRoutes"));

// 🔥 SEARCH ROUTES (ADDED)
app.use("/api/search", require("./routes/searchRoutes"));

// 🔥 NOTIFICATION ROUTES (ADDED)
app.use("/api/notifications", require("./routes/notificationRoutes"));

// 🔥 MENTION ROUTES (ADDED)
app.use("/api/mentions", require("./routes/mentionRoutes"));

app.use("/api/dispatch", require("./routes/dispatchRoutes"));
app.use("/api/dispatch-beta", require("./routes/dispatchRoutes")); // existing

// 🔥 PRODUCT ROUTES (ADDED)
app.use("/api/products", require("./routes/productRoutes"));

// inventory routes
app.use('/api/inventory', require('./routes/inventoryRoutes'));

// bulk uplode routes
app.use('/api/bulk-upload', require('./routes/bulkUploadRoutes'));

// damage recovery routes
app.use('/api/damage-recovery', require('./routes/damageRecoveryRoutes'));

// returns routes
app.use('/api/returns', require('./routes/returnsRoutes'));

// timeline routes
app.use('/api/timeline', require('./routes/timelineRoutes'));

// order tracking routes
app.use('/api/order-tracking', require('./routes/orderTrackingRoutes'));

// self transfer routes
app.use('/api/self-transfer', require('./routes/selfTransferRoutes'));

// ===============================
// HEALTH CHECK & CORS TEST
// ===============================
app.get("/", (req, res) => {
    res.status(200).json({
        status: "OK",
        service: "Inventory Backend",
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: "/api/auth/login",
            users: "/api/users", 
            products: "/api/products",
            inventory: "/api/inventory"
        }
    });
});

app.get("/health/cors", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "CORS is working",
        origin: req.headers.origin || null,
        method: req.method,
        headers: {
            authorization: req.headers.authorization ? "present" : "missing",
            contentType: req.headers["content-type"] || null
        },
        timestamp: new Date().toISOString()
    });
});

app.get("/api", (req, res) => {
    res.status(200).json({
        status: "OK",
        service: "Inventory API",
        version: "1.0.0",
        timestamp: new Date().toISOString()
    });
});

// Test endpoint for debugging
app.get("/api/test", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Test endpoint working",
        timestamp: new Date().toISOString(),
        headers: req.headers,
        query: req.query
    });
});

// ===============================
// GLOBAL ERROR HANDLER
// ===============================
app.use((err, req, res, next) => {
    console.error("[SERVER ERROR]", err);
    res.status(500).json({
        success: false,
        error: err.message || "Internal Server Error",
    });
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

server.listen(PORT, HOST, () => {
    console.log("======================================");
    console.log("🚀 Inventory Backend Started");
    console.log(`🌍 Port: ${PORT}`);
    console.log("🔌 WebSocket Server: Enabled");
    console.log("======================================");
});