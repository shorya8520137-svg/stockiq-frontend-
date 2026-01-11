"use client";

import React from 'react';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * PermissionGate Component
 * 
 * Conditionally renders children based on user permissions.
 * Provides a clean way to implement permission-based UI rendering.
 * 
 * @param {string|string[]} permission - Required permission(s)
 * @param {React.ReactNode} children - Content to render if authorized
 * @param {React.ReactNode} fallback - Content to render if not authorized (default: null)
 * @param {boolean} requireAll - If true, user must have ALL permissions (default: false)
 * @param {string} userRole - Override user role for testing (optional)
 * @param {boolean} showFallback - Whether to show fallback content (default: false)
 */
const PermissionGate = ({ 
    permission, 
    children, 
    fallback = null,
    requireAll = false,
    userRole = null,
    showFallback = false
}) => {
    const { hasPermission, userRole: contextUserRole } = usePermissions();
    const { user } = useAuth();
    
    // Use provided userRole or get from context
    const currentUserRole = userRole || contextUserRole || user?.role;
    
    // Super admin bypass - super admins have access to everything
    if (currentUserRole === 'super_admin') {
        return children;
    }
    
    // Handle single permission
    if (typeof permission === 'string') {
        const hasAccess = hasPermission(permission);
        
        if (hasAccess) {
            return children;
        }
        
        return showFallback ? fallback : null;
    }
    
    // Handle multiple permissions
    if (Array.isArray(permission)) {
        let hasAccess = false;
        
        if (requireAll) {
            // User must have ALL permissions
            hasAccess = permission.every(perm => hasPermission(perm));
        } else {
            // User must have at least ONE permission
            hasAccess = permission.some(perm => hasPermission(perm));
        }
        
        if (hasAccess) {
            return children;
        }
        
        return showFallback ? fallback : null;
    }
    
    // If no permission specified, render children (open access)
    if (!permission) {
        return children;
    }
    
    // Default: no access
    return showFallback ? fallback : null;
};

/**
 * Hook for permission checking in components
 * 
 * @param {string|string[]} permission - Permission(s) to check
 * @param {boolean} requireAll - If true, user must have ALL permissions
 * @returns {boolean} - Whether user has required permission(s)
 */
export const usePermissionCheck = (permission, requireAll = false) => {
    const { hasPermission, userRole } = usePermissions();
    
    // Super admin bypass
    if (userRole === 'super_admin') {
        return true;
    }
    
    // Handle single permission
    if (typeof permission === 'string') {
        return hasPermission(permission);
    }
    
    // Handle multiple permissions
    if (Array.isArray(permission)) {
        if (requireAll) {
            return permission.every(perm => hasPermission(perm));
        } else {
            return permission.some(perm => hasPermission(perm));
        }
    }
    
    // No permission specified - open access
    if (!permission) {
        return true;
    }
    
    return false;
};

/**
 * Higher-order component for permission-based rendering
 * 
 * @param {React.Component} Component - Component to wrap
 * @param {string|string[]} permission - Required permission(s)
 * @param {React.ReactNode} fallback - Fallback content
 * @param {boolean} requireAll - Whether all permissions are required
 * @returns {React.Component} - Wrapped component
 */
export const withPermission = (Component, permission, fallback = null, requireAll = false) => {
    return function PermissionWrappedComponent(props) {
        return (
            <PermissionGate 
                permission={permission} 
                fallback={fallback}
                requireAll={requireAll}
                showFallback={!!fallback}
            >
                <Component {...props} />
            </PermissionGate>
        );
    };
};

/**
 * Component for displaying permission-based menu items
 */
export const PermissionMenuItem = ({ 
    permission, 
    children, 
    onClick, 
    className = '',
    disabled = false,
    ...props 
}) => {
    const hasAccess = usePermissionCheck(permission);
    
    if (!hasAccess) {
        return null;
    }
    
    return (
        <button
            className={className}
            onClick={onClick}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
};

/**
 * Component for displaying permission-based action buttons
 */
export const PermissionButton = ({ 
    permission, 
    children, 
    fallback = null,
    showDisabled = false,
    disabledMessage = "You don't have permission to perform this action",
    ...props 
}) => {
    const hasAccess = usePermissionCheck(permission);
    
    if (!hasAccess) {
        if (showDisabled) {
            return (
                <button 
                    {...props} 
                    disabled={true}
                    title={disabledMessage}
                    style={{ opacity: 0.5, cursor: 'not-allowed' }}
                >
                    {children}
                </button>
            );
        }
        return fallback;
    }
    
    return (
        <button {...props}>
            {children}
        </button>
    );
};

export default PermissionGate;