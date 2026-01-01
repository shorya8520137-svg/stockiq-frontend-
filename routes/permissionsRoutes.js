const express = require('express');
const router = express.Router();
const PermissionsController = require('../controllers/permissionsController');
const authMiddleware = require('../middleware/authMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');

// All permission routes require authentication
router.use(authMiddleware);

// Get all roles
router.get('/roles', 
    permissionMiddleware('system.permissions'),
    PermissionsController.getRoles
);

// Get all permissions
router.get('/permissions', 
    permissionMiddleware('system.permissions'),
    PermissionsController.getPermissions
);

// Get role permissions
router.get('/roles/:roleId/permissions', 
    permissionMiddleware('system.permissions'),
    PermissionsController.getRolePermissions
);

// Update role permissions
router.put('/roles/:roleId/permissions', 
    permissionMiddleware('system.permissions'),
    PermissionsController.updateRolePermissions
);

// Get all users
router.get('/users', 
    permissionMiddleware('system.user_management'),
    PermissionsController.getUsers
);

// Create user
router.post('/users', 
    permissionMiddleware('system.user_management'),
    PermissionsController.createUser
);

// Update user
router.put('/users/:userId', 
    permissionMiddleware('system.user_management'),
    PermissionsController.updateUser
);

// Get audit logs
router.get('/audit-logs', 
    permissionMiddleware('system.audit_log'),
    PermissionsController.getAuditLogs
);

module.exports = router;