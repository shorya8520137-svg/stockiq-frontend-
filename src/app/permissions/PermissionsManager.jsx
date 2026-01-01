"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions, ROLES, PERMISSIONS } from "@/contexts/PermissionsContext";
import styles from "./permissions.module.css";

export default function PermissionsManager() {
    const { user, availableUsers, switchRole, apiAvailable } = useAuth();
    const { userRole, hasPermission, logAction, getAuditLog, loading } = usePermissions();
    const [activeTab, setActiveTab] = useState("overview");
    const [selectedRole, setSelectedRole] = useState(null);
    const [auditLog, setAuditLog] = useState([]);
    const [loadingAudit, setLoadingAudit] = useState(false);

    // Check if user has permission to access this page
    if (!hasPermission(PERMISSIONS.SYSTEM_PERMISSIONS)) {
        return (
            <div className={styles.accessDenied}>
                <div className={styles.accessDeniedContent}>
                    <h2>🔒 Access Denied</h2>
                    <p>You don't have permission to access the permissions management system.</p>
                    <p>Required permission: <code>system.permissions</code></p>
                    <p>Your role: <span style={{ color: userRole?.color }}>{userRole?.name}</span></p>
                </div>
            </div>
        );
    }

    const loadAuditLog = async () => {
        if (hasPermission(PERMISSIONS.SYSTEM_AUDIT_LOG)) {
            setLoadingAudit(true);
            try {
                const log = await getAuditLog();
                setAuditLog(Array.isArray(log) ? log.slice(-50).reverse() : []); // Show last 50 entries
            } catch (error) {
                console.error('Failed to load audit log:', error);
                setAuditLog([]);
            } finally {
                setLoadingAudit(false);
            }
        }
    };

    const handleRoleSwitch = async (newRole) => {
        if (switchRole(newRole)) {
            await logAction('ROLE_SWITCH', 'PERMISSIONS', { 
                oldRole: user.role, 
                newRole,
                reason: 'Testing permissions'
            });
            // Refresh page to update permissions
            window.location.reload();
        }
    };

    const getRoleStats = () => {
        return Object.entries(ROLES).map(([key, role]) => ({
            key,
            ...role,
            userCount: availableUsers.filter(u => u.role === key.toLowerCase()).length
        }));
    };

    const getPermissionsByCategory = () => {
        const categories = {};
        Object.entries(PERMISSIONS).forEach(([key, permission]) => {
            const category = permission.split('.')[0];
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push({ key, permission });
        });
        return categories;
    };

    return (
        <div className={styles.permissionsContainer}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.headerIcon}>🛡️</div>
                    <div className={styles.headerInfo}>
                        <h1>Access Control Center</h1>
                        <span>Enterprise role and permission management</span>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.connectionStatus}>
                        <div className={`${styles.statusIndicator} ${apiAvailable ? styles.online : styles.offline}`}>
                            <span className={styles.statusDot}></span>
                            <span className={styles.statusText}>
                                {apiAvailable ? 'API Connected' : 'Local Mode'}
                            </span>
                        </div>
                    </div>
                    <div className={styles.currentUser}>
                        <div className={styles.userBadge}>
                            <span 
                                className={styles.userRole} 
                                style={{ backgroundColor: userRole?.color }}
                            >
                                {userRole?.name}
                            </span>
                            <div className={styles.userInfo}>
                                <span className={styles.userName}>{user?.name}</span>
                                <span className={styles.userEmail}>{user?.email}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className={styles.tabNav}>
                <button 
                    className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    <span className={styles.tabIcon}>📊</span>
                    <span className={styles.tabLabel}>Overview</span>
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'roles' ? styles.active : ''}`}
                    onClick={() => setActiveTab('roles')}
                >
                    <span className={styles.tabIcon}>👥</span>
                    <span className={styles.tabLabel}>Roles</span>
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'permissions' ? styles.active : ''}`}
                    onClick={() => setActiveTab('permissions')}
                >
                    <span className={styles.tabIcon}>🔑</span>
                    <span className={styles.tabLabel}>Permissions</span>
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <span className={styles.tabIcon}>👤</span>
                    <span className={styles.tabLabel}>Users</span>
                </button>
                {hasPermission(PERMISSIONS.SYSTEM_AUDIT_LOG) && (
                    <button 
                        className={`${styles.tab} ${activeTab === 'audit' ? styles.active : ''}`}
                        onClick={() => {
                            setActiveTab('audit');
                            loadAuditLog();
                        }}
                    >
                        <span className={styles.tabIcon}>📋</span>
                        <span className={styles.tabLabel}>Audit Log</span>
                    </button>
                )}
                {user?.role === 'super_admin' && (
                    <button 
                        className={`${styles.tab} ${activeTab === 'testing' ? styles.active : ''}`}
                        onClick={() => setActiveTab('testing')}
                    >
                        <span className={styles.tabIcon}>🧪</span>
                        <span className={styles.tabLabel}>Role Testing</span>
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className={styles.content}>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className={styles.overview}>
                        <div className={styles.statsGrid}>
                            <div className={styles.statCard} style={{ '--role-color': '#3b82f6' }}>
                                <h3>System Roles</h3>
                                <div className={styles.statNumber}>{Object.keys(ROLES).length}</div>
                                <p className={styles.statDescription}>Defined access levels</p>
                            </div>
                            <div className={styles.statCard} style={{ '--role-color': '#8b5cf6' }}>
                                <h3>Permissions</h3>
                                <div className={styles.statNumber}>{Object.keys(PERMISSIONS).length}</div>
                                <p className={styles.statDescription}>Granular controls</p>
                            </div>
                            <div className={styles.statCard} style={{ '--role-color': '#06b6d4' }}>
                                <h3>Active Users</h3>
                                <div className={styles.statNumber}>{availableUsers.length}</div>
                                <p className={styles.statDescription}>Registered accounts</p>
                            </div>
                            <div className={styles.statCard} style={{ '--role-color': '#10b981' }}>
                                <h3>Your Access</h3>
                                <div className={styles.statNumber}>{userRole?.permissions?.length || 0}</div>
                                <p className={styles.statDescription}>Granted permissions</p>
                            </div>
                        </div>

                        <div className={styles.rolesOverview}>
                            <h3>Roles Overview</h3>
                            <div className={styles.rolesList}>
                                {getRoleStats().map((role) => (
                                    <div key={role.key} className={styles.roleCard}>
                                        <div className={styles.roleHeader}>
                                            <div 
                                                className={styles.roleColor} 
                                                style={{ backgroundColor: role.color }}
                                            ></div>
                                            <div className={styles.roleInfo}>
                                                <h4>{role.name}</h4>
                                                <p>{role.description}</p>
                                            </div>
                                        </div>
                                        <div className={styles.roleStats}>
                                            <span>{role.permissions.length} permissions</span>
                                            <span>{role.userCount} users</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Roles Tab */}
                {activeTab === 'roles' && (
                    <div className={styles.rolesTab}>
                        <div className={styles.rolesGrid}>
                            {Object.entries(ROLES).map(([key, role]) => (
                                <div 
                                    key={key} 
                                    className={`${styles.roleDetailCard} ${selectedRole === key ? styles.selected : ''}`}
                                    onClick={() => setSelectedRole(selectedRole === key ? null : key)}
                                >
                                    <div className={styles.roleDetailHeader}>
                                        <div 
                                            className={styles.roleColorLarge} 
                                            style={{ backgroundColor: role.color }}
                                        ></div>
                                        <div>
                                            <h3>{role.name}</h3>
                                            <p>{role.description}</p>
                                            <span className={styles.priority}>Priority: {role.priority}</span>
                                        </div>
                                    </div>
                                    
                                    {selectedRole === key && (
                                        <div className={styles.rolePermissions}>
                                            <h4>Permissions ({role.permissions.length})</h4>
                                            <div className={styles.permissionsList}>
                                                {role.permissions.map((permission) => (
                                                    <span key={permission} className={styles.permissionTag}>
                                                        {permission}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Permissions Tab */}
                {activeTab === 'permissions' && (
                    <div className={styles.permissionsTab}>
                        {Object.entries(getPermissionsByCategory()).map(([category, permissions]) => (
                            <div key={category} className={styles.permissionCategory}>
                                <h3>{category.charAt(0).toUpperCase() + category.slice(1)} Permissions</h3>
                                <div className={styles.permissionsGrid}>
                                    {permissions.map(({ key, permission }) => (
                                        <div key={key} className={styles.permissionCard}>
                                            <div className={styles.permissionName}>{permission}</div>
                                            <div className={styles.permissionRoles}>
                                                {Object.entries(ROLES)
                                                    .filter(([_, role]) => role.permissions.includes(permission))
                                                    .map(([roleKey, role]) => (
                                                        <span 
                                                            key={roleKey}
                                                            className={styles.roleTag}
                                                            style={{ backgroundColor: role.color }}
                                                        >
                                                            {role.name}
                                                        </span>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className={styles.usersTab}>
                        <div className={styles.usersGrid}>
                            {availableUsers.map((user) => {
                                const role = ROLES[user.role.toUpperCase()];
                                return (
                                    <div key={user.email} className={styles.userCard}>
                                        <div className={styles.userAvatar}>
                                            {user.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div className={styles.userInfo}>
                                            <h4>{user.name}</h4>
                                            <p>{user.email}</p>
                                            <span 
                                                className={styles.userRole}
                                                style={{ backgroundColor: role?.color }}
                                            >
                                                {role?.name}
                                            </span>
                                        </div>
                                        <div className={styles.userStats}>
                                            <span>{role?.permissions?.length || 0} permissions</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Audit Log Tab */}
                {activeTab === 'audit' && hasPermission(PERMISSIONS.SYSTEM_AUDIT_LOG) && (
                    <div className={styles.auditTab}>
                        <div className={styles.auditHeader}>
                            <h3>Recent Activity</h3>
                            <button 
                                className={styles.refreshBtn} 
                                onClick={loadAuditLog}
                                disabled={loadingAudit}
                            >
                                {loadingAudit ? '🔄 Loading...' : '🔄 Refresh'}
                            </button>
                        </div>
                        {loadingAudit ? (
                            <div className={styles.loadingState}>
                                <div className={styles.spinner}></div>
                                <p>Loading audit logs...</p>
                            </div>
                        ) : (
                            <div className={styles.auditLog}>
                                {auditLog.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <p>No audit logs available</p>
                                        {!apiAvailable && (
                                            <p className={styles.localNote}>
                                                Running in local mode - logs are stored locally
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    auditLog.map((entry, index) => (
                                        <div key={index} className={styles.auditEntry}>
                                            <div className={styles.auditTime}>
                                                {new Date(entry.timestamp).toLocaleString()}
                                            </div>
                                            <div className={styles.auditUser}>
                                                {entry.user} ({entry.role})
                                            </div>
                                            <div className={styles.auditAction}>
                                                {entry.action} on {entry.resource}
                                            </div>
                                            {entry.details && (
                                                <div className={styles.auditDetails}>
                                                    {typeof entry.details === 'object' 
                                                        ? JSON.stringify(entry.details)
                                                        : entry.details
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Role Testing Tab */}
                {activeTab === 'testing' && user?.role === 'super_admin' && (
                    <div className={styles.testingTab}>
                        <div className={styles.testingHeader}>
                            <h3>Role Testing</h3>
                            <p>Switch between roles to test different permission levels</p>
                        </div>
                        <div className={styles.roleTestGrid}>
                            {Object.entries(ROLES).map(([key, role]) => (
                                <button
                                    key={key}
                                    className={`${styles.roleTestCard} ${user.role === key.toLowerCase() ? styles.currentRole : ''}`}
                                    onClick={() => handleRoleSwitch(key.toLowerCase())}
                                >
                                    <div 
                                        className={styles.roleTestColor}
                                        style={{ backgroundColor: role.color }}
                                    ></div>
                                    <div className={styles.roleTestInfo}>
                                        <h4>{role.name}</h4>
                                        <p>{role.permissions.length} permissions</p>
                                    </div>
                                    {user.role === key.toLowerCase() && (
                                        <div className={styles.currentBadge}>Current</div>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className={styles.testingWarning}>
                            ⚠️ Role switching will refresh the page to apply new permissions
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}