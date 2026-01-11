"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api/auth";
import websocketService from "../services/websocketService";

const AuthContext = createContext(null);

// No fallback users - force real database authentication only

// Legacy support for existing users
const LEGACY_ROLE_MAPPING = {
    "admin": "super_admin",
    "super_admin": "super_admin",
    "manager": "manager",
    "operator": "operator",
    "warehouse_staff": "warehouse_staff",
    "viewer": "viewer"
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);

    useEffect(() => {
        // Check if user is logged in from localStorage
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("authToken");
        
        if (storedUser && storedToken) {
            try {
                const parsedUser = JSON.parse(storedUser);
                // Handle legacy role mapping for existing users
                if (parsedUser.role) {
                    parsedUser.role = LEGACY_ROLE_MAPPING[parsedUser.role] || parsedUser.role;
                }
                setUser(parsedUser);
                setToken(storedToken);
                // Update localStorage with mapped role
                localStorage.setItem("user", JSON.stringify(parsedUser));
                
                // Connect to WebSocket with stored token
                connectWebSocket(storedToken);
            } catch (e) {
                localStorage.removeItem("user");
                localStorage.removeItem("authToken");
            }
        }
        setLoading(false);
    }, []);

    // Connect to WebSocket
    const connectWebSocket = async (authToken) => {
        try {
            await websocketService.connect(authToken);
            console.log('✅ WebSocket connected via AuthContext');
        } catch (error) {
            console.error('❌ WebSocket connection failed:', error);
        }
    };

    // Disconnect WebSocket
    const disconnectWebSocket = () => {
        websocketService.disconnect();
        console.log('🔌 WebSocket disconnected via AuthContext');
    };

    useEffect(() => {
        // Check if user is logged in from localStorage
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("authToken");
        
        if (storedUser && token) {
            try {
                const parsedUser = JSON.parse(storedUser);
                // Handle legacy role mapping for existing users
                if (parsedUser.role) {
                    parsedUser.role = LEGACY_ROLE_MAPPING[parsedUser.role] || parsedUser.role;
                }
                setUser(parsedUser);
                // Update localStorage with mapped role
                localStorage.setItem("user", JSON.stringify(parsedUser));
            } catch (e) {
                localStorage.removeItem("user");
                localStorage.removeItem("authToken");
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            // Only use real API - no fallback authentication
            const response = await authAPI.login({ email, password });
            
            if (response.user && response.token) {
                const userData = {
                    ...response.user,
                    role: LEGACY_ROLE_MAPPING[response.user.role] || response.user.role,
                    loginTime: new Date().toISOString()
                };
                
                setUser(userData);
                setToken(response.token);
                localStorage.setItem("user", JSON.stringify(userData));
                localStorage.setItem("authToken", response.token);
                
                // Connect to WebSocket after successful login
                await connectWebSocket(response.token);
                
                return { success: true, user: userData };
            }
            
            return { success: false, error: "Invalid credentials" };
            
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message || "Login failed. Please try again." };
        }
    };

    const logout = async () => {
        try {
            if (user) {
                await authAPI.logout();
            }
            
            // Disconnect WebSocket before clearing user data
            disconnectWebSocket();
            
            setUser(null);
            setToken(null);
            localStorage.removeItem("user");
            localStorage.removeItem("authToken");
        } catch (error) {
            console.error('Logout error:', error);
            // Clear local storage and disconnect WebSocket anyway
            disconnectWebSocket();
            setUser(null);
            setToken(null);
            localStorage.removeItem("user");
            localStorage.removeItem("authToken");
        }
    };

    const hasPermission = (permission) => {
        if (!user) return false;
        // This will be handled by PermissionsContext
        // Keeping for backward compatibility
        if (user.role === "super_admin") return true;
        return false;
    };

    const switchRole = (newRole) => {
        if (!user || user.role !== "super_admin") return false;
        
        const updatedUser = { ...user, role: newRole };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        
        // Log role switch
        const switchLog = {
            timestamp: new Date().toISOString(),
            user: user.email,
            role: user.role,
            action: 'ROLE_SWITCH',
            resource: 'AUTH',
            details: { oldRole: user.role, newRole, source: 'api' }
        };
        
        console.log('Role switched:', switchLog);
        
        return true;
    };

    // Cleanup WebSocket on unmount
    useEffect(() => {
        return () => {
            disconnectWebSocket();
        };
    }, []);

    return (
        <AuthContext.Provider
            value={{ 
                user, 
                token,
                login, 
                logout, 
                loading, 
                hasPermission, 
                switchRole,
                connectWebSocket,
                disconnectWebSocket,
                websocketService // Expose websocket service for direct access
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}

