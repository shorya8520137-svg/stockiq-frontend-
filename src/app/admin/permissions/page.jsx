"use client";

import React, { useState, useEffect } from 'react';
import { Shield, Users, Key, Activity, Plus, Edit, Trash2, Search, Save, X, Check, AlertCircle, UserPlus, Bell, Settings2, CheckCircle, Clock, User, Database, FileText, Filter, Calendar, Download } from 'lucide-react';
import styles from './permissions.module.css';
import { usePermissions, PERMISSIONS } from '@/contexts/PermissionsContext';
import { useAuth } from '@/contexts/AuthContext';
import notificationService from '@/services/notificationService';

const PermissionsPage = () => {
    const { hasPermission, userRole, logAction } = usePermissions();
    const { user } = useAuth();
    
    // State management
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddUser, setShowAddUser] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [notification, setNotification] = useState(null);
    const [notifications, setNotifications] = useState([]);
    
    // Activity logs state
    const [activityLogs, setActivityLogs] = useState([]);
    const [logFilters, setLogFilters] = useState({
        user: '',
        action: '',
        dateFrom: '',
        dateTo: '',
        component: ''
    });
    
    // Component permissions state
    const [componentPermissions, setComponentPermissions] = useState({});
    
    // Form states
    const [userForm, setUserForm] = useState({
        name: '',
        email: '',
        password: '',
        role: '',
        status: 'active',
        permissions: []
    });

    // Available roles
    const ROLES = {
        'super_admin': { name: 'Super Admin', color: '#dc2626' },
        'admin': { name: 'Admin', color: '#ea580c' },
        'manager': { name: 'Manager', color: '#2563eb' },
        'user': { name: 'User', color: '#16a34a' },
        'warehouse_staff': { name: 'Warehouse Staff', color: '#7c3aed' }
    };

    // Component-wise permissions structure
    const COMPONENT_PERMISSIONS = {
        'ProductManager': {
            name: 'Product Management',
            actions: [
                { key: 'add_product', name: 'Add Product', description: 'Create new products' },
                { key: 'bulk_import', name: 'Bulk Import', description: 'Import products via CSV/Excel' },
                { key: 'export_all', name: 'Export All', description: 'Export product data' },
                { key: 'self_transfer', name: 'Self Transfer', description: 'Transfer products between warehouses' },
                { key: 'add_category', name: 'Add Category', description: 'Create product categories' }
            ]
        },
        'InventorySheet': {
            name: 'Inventory Management',
            actions: [
                { key: 'timeline', name: 'Timeline Access', description: 'View product timeline and history' }
            ]
        },
        'OrderSheet': {
            name: 'Order Management',
            actions: [
                { key: 'kpi_cards', name: 'KPI Cards', description: 'View order statistics and KPIs' },
                { key: 'delete_checkbox', name: 'Delete Orders', description: 'Delete order entries' },
                { key: 'status_dropdown', name: 'Status Updates', description: 'Update order status' },
                { key: 'remarks', name: 'Edit Remarks', description: 'Add/edit order remarks' }
            ]
        },
        'Operations': {
            name: 'Operations',
            actions: [
                { key: 'dispatch', name: 'Dispatch', description: 'Create dispatch orders', approval: false },
                { key: 'damage', name: 'Damage Report', description: 'Report damaged items', approval: true },
                { key: 'return', name: 'Returns', description: 'Process returns', approval: true },
                { key: 'recover', name: 'Recovery', description: 'Recover damaged items', approval: true },
                { key: 'bulk_transfer', name: 'Bulk Transfer', description: 'Bulk inventory transfers', approval: true }
            ]
        }
    };

    // Check permissions
    if (!hasPermission(PERMISSIONS.SYSTEM_PERMISSIONS)) {
        return (
            <div className={styles.accessDenied}>
                <Shield className={styles.accessDeniedIcon} />
                <h2>Access Denied</h2>
                <p>You don't have permission to access the permissions management system.</p>
                <p>Required permission: <code>SYSTEM_PERMISSIONS</code></p>
                <p>Your role: <span className={styles.roleTag} style={{ backgroundColor: userRole?.color }}>{userRole?.name}</span></p>
            </div>
        );
    }

    // Load data on component mount
    useEffect(() => {
        loadUsers();
        loadNotifications();
        loadComponentPermissions();
        if (user?.role === 'super_admin') {
            loadActivityLogs();
        }

        // Subscribe to notification changes
        const unsubscribe = notificationService.subscribe((notifications) => {
            const userNotifications = notificationService.getNotifications({
                targetUser: user?.email,
                targetRole: user?.role
            });
            setNotifications(userNotifications);
        });

        // Cleanup subscription on unmount
        return unsubscribe;
    }, [user]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            // Use real API instead of mock data
            const { authAPI } = await import('@/services/api/auth');
            const response = await authAPI.getUsers();
            
            if (response.success) {
                setUsers(response.data || []);
            } else {
                throw new Error(response.message || 'Failed to load users');
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            showNotification('Failed to load users: ' + error.message, 'error');
            
            // Fallback to empty array instead of mock data
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const loadNotifications = async () => {
        try {
            // Get notifications for current user
            const userNotifications = notificationService.getNotifications({
                targetUser: user?.email,
                targetRole: user?.role
            });
            
            setNotifications(userNotifications);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    };

    const loadComponentPermissions = async () => {
        try {
            // Use real API instead of mock data
            // For now, initialize empty until we have component permissions API
            setComponentPermissions({});
        } catch (error) {
            console.error('Failed to load component permissions:', error);
            setComponentPermissions({});
        }
    };

    const loadActivityLogs = async () => {
        try {
            // Use real API instead of mock data
            const { authAPI } = await import('@/services/api/auth');
            const response = await authAPI.getAuditLogs({ limit: 50 });
            
            if (response.success) {
                // Transform backend data to match frontend format
                const transformedLogs = (response.data?.logs || []).map(log => ({
                    id: log.id,
                    timestamp: log.created_at,
                    user: log.user_email || 'System',
                    userName: log.user_name || 'System',
                    action: log.action,
                    component: log.resource_type || 'SYSTEM',
                    details: log.new_values ? JSON.stringify(log.new_values) : 'No details',
                    ipAddress: log.ip_address || 'Unknown',
                    userAgent: log.user_agent || 'Unknown',
                    success: log.success !== false,
                    data: log.new_values ? JSON.parse(log.new_values) : {}
                }));
                
                setActivityLogs(transformedLogs);
            } else {
                throw new Error(response.message || 'Failed to load activity logs');
            }
        } catch (error) {
            console.error('Failed to load activity logs:', error);
            
            // Fallback to empty array instead of mock data
            setActivityLogs([]);
        }
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleCreateUser = async () => {
        try {
            // Validate form
            if (!userForm.name || !userForm.email || !userForm.password || !userForm.role) {
                showNotification('Please fill in all required fields', 'error');
                return;
            }

            // Debug: Check if we have a token
            const token = localStorage.getItem('authToken');
            console.log('🔑 Token available:', !!token);
            console.log('🔑 Token preview:', token ? token.substring(0, 20) + '...' : 'No token');

            // Use real API instead of mock
            const { authAPI } = await import('@/services/api/auth');
            
            console.log('📤 Creating user with data:', {
                name: userForm.name,
                email: userForm.email,
                role_id: userForm.role,
                status: userForm.status
            });

            const response = await authAPI.createUser({
                name: userForm.name,
                email: userForm.email,
                password: userForm.password,
                role_id: userForm.role, // Map role to role_id
                status: userForm.status
            });

            console.log('📥 API Response:', response);

            if (response.success) {
                // Reload users from backend
                await loadUsers();
                setUserForm({ name: '', email: '', password: '', role: '', status: 'active', permissions: [] });
                setShowAddUser(false);
                
                // Log action
                await logAction('CREATE_USER', 'USER', { email: userForm.email, role: userForm.role });
                
                showNotification('User created successfully');
            } else {
                throw new Error(response.message || 'Failed to create user');
            }
        } catch (error) {
            console.error('❌ Failed to create user:', error);
            console.error('❌ Error details:', {
                message: error.message,
                stack: error.stack
            });
            showNotification('Failed to create user: ' + error.message, 'error');
        }
    };

    const handleUpdateUser = async () => {
        try {
            // Use real API instead of mock
            const { authAPI } = await import('@/services/api/auth');
            
            const updateData = {
                name: userForm.name,
                email: userForm.email,
                role_id: userForm.role,
                status: userForm.status
            };
            
            // Only include password if provided
            if (userForm.password) {
                updateData.password = userForm.password;
            }
            
            const response = await authAPI.updateUser(editingUser.id, updateData);
            
            if (response.success) {
                // Reload users from backend
                await loadUsers();
                setEditingUser(null);
                setUserForm({ name: '', email: '', password: '', role: '', status: 'active', permissions: [] });
                
                // Log action
                await logAction('UPDATE_USER', 'USER', { userId: editingUser.id, changes: userForm });
                
                showNotification('User updated successfully');
            } else {
                throw new Error(response.message || 'Failed to update user');
            }
        } catch (error) {
            console.error('Failed to update user:', error);
            showNotification('Failed to update user: ' + error.message, 'error');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        
        try {
            // Use real API instead of mock
            const { authAPI } = await import('@/services/api/auth');
            const response = await authAPI.deleteUser(userId);
            
            if (response.success) {
                // Reload users from backend
                await loadUsers();
                
                // Log action
                await logAction('DELETE_USER', 'USER', { userId });
                
                showNotification('User deleted successfully');
            } else {
                throw new Error(response.message || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Failed to delete user:', error);
            showNotification('Failed to delete user: ' + error.message, 'error');
        }
    };

    const handlePermissionChange = (userId, component, action, granted) => {
        setComponentPermissions(prev => {
            const updated = { ...prev };
            if (!updated[userId]) updated[userId] = {};
            if (!updated[userId][component]) updated[userId][component] = [];
            
            if (granted) {
                if (!updated[userId][component].includes(action)) {
                    updated[userId][component].push(action);
                }
            } else {
                updated[userId][component] = updated[userId][component].filter(a => a !== action);
            }
            
            return updated;
        });
    };

    const markNotificationRead = (notificationId) => {
        notificationService.markAsRead(notificationId);
    };

    // Filter functions
    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const unreadNotifications = notifications.filter(n => !n.isRead);

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.headerLeft}>
                        <Shield className={styles.headerIcon} />
                        <div>
                            <h1 className={styles.title}>Permissions Management</h1>
                            <p className={styles.subtitle}>Manage users and component-wise permissions</p>
                        </div>
                    </div>
                    <div className={styles.headerRight}>
                        {/* Notification bell moved to main navbar */}
                    </div>
                </div>
            </div>

            {/* Notification */}
            {notification && (
                <div className={`${styles.notification} ${styles[notification.type]}`}>
                    {notification.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                    {notification.message}
                    <button onClick={() => setNotification(null)}>
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className={styles.tabs}>
                <button 
                    className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <Users size={16} />
                    Users & Permissions
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'notifications' ? styles.active : ''}`}
                    onClick={() => setActiveTab('notifications')}
                >
                    <Bell size={16} />
                    Notifications
                    {unreadNotifications.length > 0 && (
                        <span className={styles.tabBadge}>{unreadNotifications.length}</span>
                    )}
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'approvals' ? styles.active : ''}`}
                    onClick={() => setActiveTab('approvals')}
                >
                    <Settings2 size={16} />
                    Approval Workflow
                </button>
                {/* Activity Logs - Super Admin Only */}
                {user?.role === 'super_admin' && (
                    <button 
                        className={`${styles.tab} ${activeTab === 'logs' ? styles.active : ''}`}
                        onClick={() => setActiveTab('logs')}
                    >
                        <Activity size={16} />
                        Activity Logs
                    </button>
                )}
            </div>

            {/* Content */}
            <div className={styles.content}>
                {/* Users & Permissions Tab */}
                {activeTab === 'users' && (
                    <div className={styles.tabContent}>
                        <div className={styles.tabHeader}>
                            <div className={styles.searchBox}>
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button 
                                className={styles.addButton}
                                onClick={() => setShowAddUser(true)}
                            >
                                <UserPlus size={16} />
                                Add User
                            </button>
                        </div>

                        {/* Users List with Permissions */}
                        <div className={styles.userPermissionsList}>
                            {loading ? (
                                <div className={styles.loading}>Loading users...</div>
                            ) : filteredUsers.length === 0 ? (
                                <div className={styles.empty}>No users found</div>
                            ) : (
                                filteredUsers.map(user => (
                                    <div key={user.id} className={styles.userPermissionCard}>
                                        {/* User Header */}
                                        <div className={styles.userHeader}>
                                            <div className={styles.userInfo}>
                                                <div 
                                                    className={styles.userAvatar}
                                                    style={{ backgroundColor: ROLES[user.role]?.color || '#64748b' }}
                                                >
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className={styles.userName}>{user.name}</div>
                                                    <div className={styles.userEmail}>{user.email}</div>
                                                    <span 
                                                        className={styles.roleTag}
                                                        style={{ backgroundColor: ROLES[user.role]?.color || '#64748b' }}
                                                    >
                                                        {ROLES[user.role]?.name || user.role}
                                                    </span>
                                                    <div className={styles.permissionsSummary}>
                                                        {componentPermissions[user.id] ? 
                                                            `${Object.values(componentPermissions[user.id]).flat().length} permissions` : 
                                                            'No permissions set'
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={styles.userActions}>
                                                <button 
                                                    className={styles.actionButton}
                                                    onClick={() => {
                                                        setEditingUser(user);
                                                        // Load existing permissions for this user
                                                        const existingPermissions = componentPermissions[user.id] ? 
                                                            Object.entries(componentPermissions[user.id]).flatMap(([comp, actions]) => 
                                                                actions.map(action => `${comp}.${action}`)
                                                            ) : [];
                                                        
                                                        setUserForm({
                                                            name: user.name,
                                                            email: user.email,
                                                            password: '',
                                                            role: user.role,
                                                            status: user.status,
                                                            permissions: existingPermissions
                                                        });
                                                    }}
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button 
                                                    className={`${styles.actionButton} ${styles.danger}`}
                                                    onClick={() => handleDeleteUser(user.id)}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                    <div className={styles.tabContent}>
                        <div className={styles.tabHeader}>
                            <h2>System Notifications</h2>
                            <div className={styles.notificationStats}>
                                <span>{notifications.length} total</span>
                                <span>{unreadNotifications.length} unread</span>
                            </div>
                        </div>

                        <div className={styles.notificationsList}>
                            {notifications.length === 0 ? (
                                <div className={styles.empty}>No notifications</div>
                            ) : (
                                notifications.map(notification => (
                                    <div 
                                        key={notification.id} 
                                        className={`${styles.notificationItem} ${!notification.isRead ? styles.unread : ''}`}
                                        onClick={() => markNotificationRead(notification.id)}
                                    >
                                        <div className={styles.notificationIcon}>
                                            <Bell size={16} />
                                        </div>
                                        <div className={styles.notificationContent}>
                                            <div className={styles.notificationHeader}>
                                                <span className={styles.notificationTitle}>{notification.title}</span>
                                                <span className={styles.notificationTime}>
                                                    {new Date(notification.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className={styles.notificationMessage}>{notification.message}</div>
                                            <div className={styles.notificationUser}>
                                                {notification.data?.submittedBy && `From: ${notification.data.submittedBy}`}
                                                {notification.warehouse && ` • Warehouse: ${notification.warehouse}`}
                                            </div>
                                        </div>
                                        {!notification.isRead && <div className={styles.unreadDot} />}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Approval Workflow Tab */}
                {activeTab === 'approvals' && (
                    <div className={styles.tabContent}>
                        <div className={styles.tabHeader}>
                            <h2>Approval Workflow Configuration</h2>
                            <p className={styles.subtitle}>Configure which operations require approval</p>
                        </div>

                        <div className={styles.approvalConfig}>
                            <div className={styles.approvalSection}>
                                <h3>Operations Requiring Approval</h3>
                                <div className={styles.approvalList}>
                                    {Object.entries(COMPONENT_PERMISSIONS).map(([component, config]) => 
                                        config.actions.filter(action => action.approval).map(action => (
                                            <div key={`${component}-${action.key}`} className={styles.approvalItem}>
                                                <div className={styles.approvalInfo}>
                                                    <span className={styles.approvalName}>{config.name} - {action.name}</span>
                                                    <span className={styles.approvalDesc}>{action.description}</span>
                                                </div>
                                                <div className={styles.approvalFlow}>
                                                    <span className={styles.flowStep}>Submit</span>
                                                    <span className={styles.flowArrow}>→</span>
                                                    <span className={styles.flowStep}>Admin Approval</span>
                                                    <span className={styles.flowArrow}>→</span>
                                                    <span className={styles.flowStep}>Execute</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className={styles.approvalSection}>
                                <h3>Notification Settings</h3>
                                <div className={styles.notificationSettings}>
                                    <div className={styles.settingItem}>
                                        <label>
                                            <input type="checkbox" defaultChecked />
                                            Notify on dispatch submission
                                        </label>
                                    </div>
                                    <div className={styles.settingItem}>
                                        <label>
                                            <input type="checkbox" defaultChecked />
                                            Notify on approval requests
                                        </label>
                                    </div>
                                    <div className={styles.settingItem}>
                                        <label>
                                            <input type="checkbox" defaultChecked />
                                            Notify on operation completion
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Activity Logs Tab - Super Admin Only */}
                {activeTab === 'logs' && user?.role === 'super_admin' && (
                    <div className={styles.tabContent}>
                        <div className={styles.tabHeader}>
                            <h2>Activity Logs</h2>
                            <div className={styles.logStats}>
                                <span>{activityLogs.length} total logs</span>
                                <span>{activityLogs.filter(log => log.success).length} successful</span>
                                <span>{activityLogs.filter(log => !log.success).length} failed</span>
                            </div>
                        </div>

                        {/* Log Filters */}
                        <div className={styles.logFilters}>
                            <div className={styles.filterRow}>
                                <div className={styles.filterGroup}>
                                    <label>User</label>
                                    <select
                                        value={logFilters.user}
                                        onChange={(e) => setLogFilters({...logFilters, user: e.target.value})}
                                        className={styles.filterSelect}
                                    >
                                        <option value="">All Users</option>
                                        {users.map(user => (
                                            <option key={user.email} value={user.email}>{user.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.filterGroup}>
                                    <label>Action</label>
                                    <select
                                        value={logFilters.action}
                                        onChange={(e) => setLogFilters({...logFilters, action: e.target.value})}
                                        className={styles.filterSelect}
                                    >
                                        <option value="">All Actions</option>
                                        <option value="LOGIN">Login</option>
                                        <option value="LOGOUT">Logout</option>
                                        <option value="CREATE_PRODUCT">Create Product</option>
                                        <option value="UPDATE_PRODUCT">Update Product</option>
                                        <option value="DELETE_PRODUCT">Delete Product</option>
                                        <option value="BULK_UPLOAD">Bulk Upload</option>
                                        <option value="DISPATCH_SUBMIT">Dispatch Submit</option>
                                        <option value="EXPORT_DATA">Export Data</option>
                                        <option value="CREATE_USER">Create User</option>
                                        <option value="UPDATE_USER">Update User</option>
                                        <option value="DELETE_USER">Delete User</option>
                                    </select>
                                </div>
                                <div className={styles.filterGroup}>
                                    <label>Component</label>
                                    <select
                                        value={logFilters.component}
                                        onChange={(e) => setLogFilters({...logFilters, component: e.target.value})}
                                        className={styles.filterSelect}
                                    >
                                        <option value="">All Components</option>
                                        <option value="AUTH">Authentication</option>
                                        <option value="ProductManager">Product Manager</option>
                                        <option value="InventorySheet">Inventory Sheet</option>
                                        <option value="OrderSheet">Order Sheet</option>
                                        <option value="Operations">Operations</option>
                                        <option value="USER_MANAGEMENT">User Management</option>
                                    </select>
                                </div>
                                <div className={styles.filterGroup}>
                                    <label>From Date</label>
                                    <input
                                        type="date"
                                        value={logFilters.dateFrom}
                                        onChange={(e) => setLogFilters({...logFilters, dateFrom: e.target.value})}
                                        className={styles.filterDate}
                                    />
                                </div>
                                <div className={styles.filterGroup}>
                                    <label>To Date</label>
                                    <input
                                        type="date"
                                        value={logFilters.dateTo}
                                        onChange={(e) => setLogFilters({...logFilters, dateTo: e.target.value})}
                                        className={styles.filterDate}
                                    />
                                </div>
                                <button
                                    className={styles.clearFiltersBtn}
                                    onClick={() => setLogFilters({ user: '', action: '', dateFrom: '', dateTo: '', component: '' })}
                                >
                                    <X size={14} />
                                    Clear Filters
                                </button>
                            </div>
                        </div>

                        {/* Activity Logs List */}
                        <div className={styles.activityLogsList}>
                            {activityLogs.length === 0 ? (
                                <div className={styles.empty}>No activity logs found</div>
                            ) : (
                                activityLogs
                                    .filter(log => {
                                        const matchesUser = !logFilters.user || log.user === logFilters.user;
                                        const matchesAction = !logFilters.action || log.action === logFilters.action;
                                        const matchesComponent = !logFilters.component || log.component === logFilters.component;
                                        const matchesDateFrom = !logFilters.dateFrom || new Date(log.timestamp) >= new Date(logFilters.dateFrom);
                                        const matchesDateTo = !logFilters.dateTo || new Date(log.timestamp) <= new Date(logFilters.dateTo);
                                        
                                        return matchesUser && matchesAction && matchesComponent && matchesDateFrom && matchesDateTo;
                                    })
                                    .map(log => (
                                        <div key={log.id} className={`${styles.logItem} ${!log.success ? styles.logError : ''}`}>
                                            <div className={styles.logIcon}>
                                                {log.success ? (
                                                    <CheckCircle size={16} className={styles.successIcon} />
                                                ) : (
                                                    <AlertCircle size={16} className={styles.errorIcon} />
                                                )}
                                            </div>
                                            <div className={styles.logContent}>
                                                <div className={styles.logHeader}>
                                                    <div className={styles.logAction}>
                                                        <span className={styles.actionName}>{log.action.replace('_', ' ')}</span>
                                                        <span className={styles.componentTag}>{log.component}</span>
                                                    </div>
                                                    <div className={styles.logMeta}>
                                                        <Clock size={12} />
                                                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <div className={styles.logDetails}>
                                                    <div className={styles.logMessage}>{log.details}</div>
                                                    <div className={styles.logUser}>
                                                        <User size={12} />
                                                        <span>{log.userName} ({log.user})</span>
                                                        <span className={styles.logIp}>IP: {log.ipAddress}</span>
                                                    </div>
                                                    {log.data && (
                                                        <div className={styles.logData}>
                                                            <Database size={12} />
                                                            <span>Data: {JSON.stringify(log.data)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            {showAddUser && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Add New User</h3>
                            <button onClick={() => setShowAddUser(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            {/* Basic User Info */}
                            <div className={styles.formSection}>
                                <h4>User Information</h4>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label>Name *</label>
                                        <input
                                            type="text"
                                            value={userForm.name}
                                            onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                                            placeholder="Enter full name"
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Email *</label>
                                        <input
                                            type="email"
                                            value={userForm.email}
                                            onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                                            placeholder="Enter email address"
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Password *</label>
                                        <input
                                            type="password"
                                            value={userForm.password}
                                            onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                                            placeholder="Enter password"
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Role *</label>
                                        <select
                                            value={userForm.role}
                                            onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                                        >
                                            <option value="">Select role</option>
                                            {Object.entries(ROLES).map(([key, role]) => (
                                                <option key={key} value={key}>{role.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Status</label>
                                        <select
                                            value={userForm.status}
                                            onChange={(e) => setUserForm({...userForm, status: e.target.value})}
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Component Permissions */}
                            <div className={styles.formSection}>
                                <h4>Component Permissions</h4>
                                <p className={styles.sectionDesc}>Select which actions this user can perform in each component</p>
                                
                                {Object.entries(COMPONENT_PERMISSIONS).map(([component, config]) => (
                                    <div key={component} className={styles.componentPermissionSection}>
                                        <h5 className={styles.componentName}>{config.name}</h5>
                                        <div className={styles.permissionCheckboxGrid}>
                                            {config.actions.map(action => {
                                                const permissionKey = `${component}.${action.key}`;
                                                const isChecked = userForm.permissions?.includes(permissionKey) || false;
                                                
                                                return (
                                                    <div key={action.key} className={styles.permissionCheckbox}>
                                                        <label className={styles.checkboxLabel}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={(e) => {
                                                                    const permissions = userForm.permissions || [];
                                                                    if (e.target.checked) {
                                                                        setUserForm({
                                                                            ...userForm, 
                                                                            permissions: [...permissions, permissionKey]
                                                                        });
                                                                    } else {
                                                                        setUserForm({
                                                                            ...userForm, 
                                                                            permissions: permissions.filter(p => p !== permissionKey)
                                                                        });
                                                                    }
                                                                }}
                                                            />
                                                            <div className={styles.checkboxInfo}>
                                                                <span className={styles.checkboxName}>
                                                                    {action.name}
                                                                    {action.approval && (
                                                                        <span className={styles.approvalBadge}>Approval Required</span>
                                                                    )}
                                                                </span>
                                                                <span className={styles.checkboxDesc}>{action.description}</span>
                                                            </div>
                                                        </label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button 
                                className={styles.cancelButton}
                                onClick={() => setShowAddUser(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className={styles.saveButton}
                                onClick={handleCreateUser}
                            >
                                <Save size={16} />
                                Create User
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3>Edit User</h3>
                            <button onClick={() => setEditingUser(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            {/* Basic User Info */}
                            <div className={styles.formSection}>
                                <h4>User Information</h4>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label>Name *</label>
                                        <input
                                            type="text"
                                            value={userForm.name}
                                            onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Email *</label>
                                        <input
                                            type="email"
                                            value={userForm.email}
                                            onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>New Password (leave blank to keep current)</label>
                                        <input
                                            type="password"
                                            value={userForm.password}
                                            onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                                            placeholder="Enter new password"
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Role *</label>
                                        <select
                                            value={userForm.role}
                                            onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                                        >
                                            {Object.entries(ROLES).map(([key, role]) => (
                                                <option key={key} value={key}>{role.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Status</label>
                                        <select
                                            value={userForm.status}
                                            onChange={(e) => setUserForm({...userForm, status: e.target.value})}
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Component Permissions */}
                            <div className={styles.formSection}>
                                <h4>Component Permissions</h4>
                                <p className={styles.sectionDesc}>Select which actions this user can perform in each component</p>
                                
                                {Object.entries(COMPONENT_PERMISSIONS).map(([component, config]) => (
                                    <div key={component} className={styles.componentPermissionSection}>
                                        <h5 className={styles.componentName}>{config.name}</h5>
                                        <div className={styles.permissionCheckboxGrid}>
                                            {config.actions.map(action => {
                                                const permissionKey = `${component}.${action.key}`;
                                                const isChecked = userForm.permissions?.includes(permissionKey) || false;
                                                
                                                return (
                                                    <div key={action.key} className={styles.permissionCheckbox}>
                                                        <label className={styles.checkboxLabel}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={(e) => {
                                                                    const permissions = userForm.permissions || [];
                                                                    if (e.target.checked) {
                                                                        setUserForm({
                                                                            ...userForm, 
                                                                            permissions: [...permissions, permissionKey]
                                                                        });
                                                                    } else {
                                                                        setUserForm({
                                                                            ...userForm, 
                                                                            permissions: permissions.filter(p => p !== permissionKey)
                                                                        });
                                                                    }
                                                                }}
                                                            />
                                                            <div className={styles.checkboxInfo}>
                                                                <span className={styles.checkboxName}>
                                                                    {action.name}
                                                                    {action.approval && (
                                                                        <span className={styles.approvalBadge}>Approval Required</span>
                                                                    )}
                                                                </span>
                                                                <span className={styles.checkboxDesc}>{action.description}</span>
                                                            </div>
                                                        </label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button 
                                className={styles.cancelButton}
                                onClick={() => setEditingUser(null)}
                            >
                                Cancel
                            </button>
                            <button 
                                className={styles.saveButton}
                                onClick={handleUpdateUser}
                            >
                                <Save size={16} />
                                Update User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PermissionsPage;