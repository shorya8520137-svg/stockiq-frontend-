"use client";

import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
    const { user } = useAuth();
    const { 
        hasPermission, 
        canAccessComponent, 
        trackUserActivity,
        loading: permissionsLoading 
    } = usePermissions();
    
    const [dashboardComponents, setDashboardComponents] = useState([]);
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalInventory: 0,
        pendingDispatches: 0,
        activeUsers: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!permissionsLoading) {
            // Get components user has access to
            const accessibleComponents = getAccessibleComponents();
            setDashboardComponents(accessibleComponents);
            
            // Track dashboard access
            if (trackUserActivity) {
                trackUserActivity('dashboard', 'view');
            }
            
            // Load dashboard stats if user has permissions
            loadDashboardStats();
            setLoading(false);
        }
    }, [permissionsLoading, hasPermission, trackUserActivity]);

    const getAccessibleComponents = () => {
        const components = [];
        
        if (hasPermission('INVENTORY_VIEW')) {
            components.push({
                name: 'Inventory',
                path: '/inventory',
                icon: '📦',
                description: 'Manage stock levels and inventory'
            });
        }
        
        if (hasPermission('PRODUCTS_VIEW')) {
            components.push({
                name: 'Products',
                path: '/products',
                icon: '🏷️',
                description: 'Manage product catalog'
            });
        }
        
        if (hasPermission('ORDERS_VIEW')) {
            components.push({
                name: 'Orders',
                path: '/order',
                icon: '📋',
                description: 'View and manage orders'
            });
        }
        
        if (hasPermission('DISPATCH_VIEW')) {
            components.push({
                name: 'Dispatch',
                path: '/order/dispatch',
                icon: '🚚',
                description: 'Create and manage dispatches'
            });
        }
        
        if (hasPermission('TIMELINE_VIEW')) {
            components.push({
                name: 'Timeline',
                path: '/tracking',
                icon: '📍',
                description: 'Track order progress'
            });
        }
        
        if (hasPermission('RETURNS_VIEW')) {
            components.push({
                name: 'Returns',
                path: '/returns',
                icon: '↩️',
                description: 'Handle product returns'
            });
        }
        
        if (hasPermission('DAMAGE_VIEW')) {
            components.push({
                name: 'Damage Recovery',
                path: '/damage-recovery',
                icon: '🔧',
                description: 'Manage damaged items'
            });
        }
        
        if (hasPermission('MESSAGES_VIEW')) {
            components.push({
                name: 'Messages',
                path: '/messages',
                icon: '💬',
                description: 'Team communication'
            });
        }
        
        if (hasPermission('SEARCH_VIEW')) {
            components.push({
                name: 'Search',
                path: '/search',
                icon: '🔍',
                description: 'Search across the system'
            });
        }
        
        if (hasPermission('ADMIN_PANEL')) {
            components.push({
                name: 'Admin Panel',
                path: '/admin',
                icon: '⚙️',
                description: 'System administration'
            });
        }
        
        return components;
    };

    const loadDashboardStats = async () => {
        try {
            const promises = [];
            
            // Only load stats for components user can access
            if (hasPermission('PRODUCTS_VIEW')) {
                promises.push(
                    fetch('/api/products/count')
                        .then(res => res.ok ? res.json() : { count: 0 })
                        .then(data => ({ type: 'products', count: data.count || 0 }))
                        .catch(() => ({ type: 'products', count: 0 }))
                );
            }
            
            if (hasPermission('INVENTORY_VIEW')) {
                promises.push(
                    fetch('/api/inventory/stats')
                        .then(res => res.ok ? res.json() : { totalItems: 0 })
                        .then(data => ({ type: 'inventory', count: data.totalItems || 0 }))
                        .catch(() => ({ type: 'inventory', count: 0 }))
                );
            }
            
            if (hasPermission('ORDERS_VIEW')) {
                promises.push(
                    fetch('/api/dispatch/pending-count')
                        .then(res => res.ok ? res.json() : { count: 0 })
                        .then(data => ({ type: 'dispatches', count: data.count || 0 }))
                        .catch(() => ({ type: 'dispatches', count: 0 }))
                );
            }
            
            if (hasPermission('SYSTEM_USER_MANAGEMENT')) {
                promises.push(
                    fetch('/api/enhanced-permissions/users/online')
                        .then(res => res.ok ? res.json() : { count: 0 })
                        .then(data => ({ type: 'users', count: data.count || 0 }))
                        .catch(() => ({ type: 'users', count: 0 }))
                );
            }
            
            const results = await Promise.all(promises);
            const newStats = { ...stats };
            
            results.forEach(result => {
                switch (result.type) {
                    case 'products':
                        newStats.totalProducts = result.count;
                        break;
                    case 'inventory':
                        newStats.totalInventory = result.count;
                        break;
                    case 'dispatches':
                        newStats.pendingDispatches = result.count;
                        break;
                    case 'users':
                        newStats.activeUsers = result.count;
                        break;
                }
            });
            
            setStats(newStats);
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    };

    const handleComponentClick = (component) => {
        if (trackUserActivity) {
            trackUserActivity(component.name.toLowerCase(), 'navigate');
        }
    };

    if (loading || permissionsLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
                <p className="text-gray-600">Welcome back, {user?.name || 'User'}!</p>
                <div className="flex items-center gap-4 mt-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {user?.role || 'No Role'}
                    </span>
                    <span className="text-gray-500 text-sm">{user?.email}</span>
                </div>
            </div>

            {/* Stats Cards - Only show if user has relevant permissions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {hasPermission('PRODUCTS_VIEW') && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="text-3xl mr-4">📦</div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">{stats.totalProducts}</h3>
                                <p className="text-gray-600">Total Products</p>
                            </div>
                        </div>
                    </div>
                )}
                
                {hasPermission('INVENTORY_VIEW') && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="text-3xl mr-4">📊</div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">{stats.totalInventory}</h3>
                                <p className="text-gray-600">Inventory Items</p>
                            </div>
                        </div>
                    </div>
                )}
                
                {hasPermission('ORDERS_VIEW') && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="text-3xl mr-4">🚚</div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">{stats.pendingDispatches}</h3>
                                <p className="text-gray-600">Pending Dispatches</p>
                            </div>
                        </div>
                    </div>
                )}
                
                {hasPermission('SYSTEM_USER_MANAGEMENT') && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="text-3xl mr-4">👥</div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">{stats.activeUsers}</h3>
                                <p className="text-gray-600">Active Users</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Component Grid - Only show components user has access to */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Components</h2>
                {dashboardComponents.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <div className="text-6xl mb-4">🔒</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Access</h3>
                        <p className="text-gray-600">No components available. Contact your administrator for access.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {dashboardComponents.map((component) => (
                            <Link 
                                key={component.name} 
                                href={component.path}
                                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block"
                                onClick={() => handleComponentClick(component)}
                            >
                                <div className="text-4xl mb-4">{component.icon}</div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">{component.name}</h3>
                                <p className="text-gray-600 text-sm">{component.description}</p>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Actions - Based on permissions */}
            {(hasPermission('ORDERS_CREATE') || hasPermission('INVENTORY_EDIT') || hasPermission('PRODUCTS_CREATE')) && (
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {hasPermission('ORDERS_CREATE') && (
                            <Link 
                                href="/order/dispatch" 
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-4 flex items-center justify-center transition-colors"
                            >
                                <span className="text-2xl mr-2">🚀</span>
                                Create Dispatch
                            </Link>
                        )}
                        {hasPermission('INVENTORY_EDIT') && (
                            <Link 
                                href="/inventory/bulk-upload" 
                                className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-4 flex items-center justify-center transition-colors"
                            >
                                <span className="text-2xl mr-2">📤</span>
                                Bulk Upload
                            </Link>
                        )}
                        {hasPermission('PRODUCTS_CREATE') && (
                            <Link 
                                href="/products?action=create" 
                                className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-4 flex items-center justify-center transition-colors"
                            >
                                <span className="text-2xl mr-2">➕</span>
                                Add Product
                            </Link>
                        )}
                        {hasPermission('TIMELINE_VIEW') && (
                            <Link 
                                href="/tracking" 
                                className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg p-4 flex items-center justify-center transition-colors"
                            >
                                <span className="text-2xl mr-2">📍</span>
                                Track Orders
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* Admin Section - Only for admin users */}
            {(hasPermission('ADMIN_PANEL') || hasPermission('SYSTEM_USER_MANAGEMENT')) && (
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Administration</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {hasPermission('SYSTEM_USER_MANAGEMENT') && (
                            <Link 
                                href="/admin/users" 
                                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 flex items-center"
                            >
                                <span className="text-3xl mr-4">👥</span>
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900">User Management</h4>
                                    <p className="text-gray-600 text-sm">Manage users and roles</p>
                                </div>
                            </Link>
                        )}
                        {hasPermission('SYSTEM_PERMISSIONS') && (
                            <Link 
                                href="/admin/permissions" 
                                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 flex items-center"
                            >
                                <span className="text-3xl mr-4">🔐</span>
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900">Permissions</h4>
                                    <p className="text-gray-600 text-sm">Manage system permissions</p>
                                </div>
                            </Link>
                        )}
                        {hasPermission('AUDIT_LOGS') && (
                            <Link 
                                href="/admin/audit" 
                                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 flex items-center"
                            >
                                <span className="text-3xl mr-4">📋</span>
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900">Audit Logs</h4>
                                    <p className="text-gray-600 text-sm">View system activity</p>
                                </div>
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
