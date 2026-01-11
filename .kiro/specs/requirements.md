# Inventory Management System - Enhanced Requirements Specification

## Project Overview
A comprehensive inventory management system enhancement focusing on permission-based dashboard components, real-time notifications, global search, activity tracking, and advanced timeline features.

## Current System Status
- ✅ Backend server running successfully (Node.js/Express)
- ✅ Database connected (MySQL on AWS RDS)
- ✅ Basic authentication system working
- ✅ Permission system foundation in place
- ✅ Product and inventory management APIs functional
- ⚠️ Frontend needs enhancement for new features

## Core Enhancement Requirements

### 1. Permission-Based Dashboard Components
**User Story:** As a user, I want dashboard components to render based on my permissions so that I only see relevant functionality.

**Acceptance Criteria:**
- Dashboard components dynamically render based on user role and permissions
- Each component checks user permissions before displaying
- Unauthorized components are hidden, not just disabled
- Permission checks happen on both frontend and backend
- Real-time permission updates without page refresh

**Technical Implementation:**
```javascript
// Frontend Components Needed:
- src/components/common/PermissionGate.jsx
- src/components/dashboard/DashboardGrid.jsx
- src/components/dashboard/widgets/InventoryOverview.jsx
- src/components/dashboard/widgets/RecentDispatches.jsx
- src/components/dashboard/widgets/LowStockAlerts.jsx
- src/components/dashboard/widgets/UserActivity.jsx
- src/components/dashboard/widgets/PendingReturns.jsx

// Backend Enhancements:
- Enhanced permission middleware
- Widget permission management API
- User effective permissions calculation
```

### 2. Remove Static Notification Bell from Permissions Tab
**User Story:** As a user, I want the notification bell removed from the permissions tab and moved to the main navbar.

**Acceptance Criteria:**
- ✅ Remove notification bell from permissions page
- ✅ Add dynamic notification bell to main navbar
- ✅ Show logged-in user name in navbar
- ✅ Real-time notification count updates
- ✅ Notification dropdown with recent notifications

**Current Status:** 
- Static notification bell exists in permissions page (needs removal)
- Navbar needs enhancement for dynamic notifications

### 3. Global Search with Intelligent Suggestions
**User Story:** As a user, I want a responsive search bar in the header that suggests all dashboard services and content.

**Acceptance Criteria:**
- Search bar in top header with responsive design
- Intelligent suggestions for all dashboard services/pages
- Search across products, orders, users, warehouses, etc.
- Keyboard navigation (arrow keys, enter, escape)
- Click on suggestion opens the relevant tab/page
- Search history and recent searches
- Fuzzy search capabilities

**Technical Requirements:**
```javascript
// New Database Tables Needed:
CREATE TABLE search_index (
    id INT PRIMARY KEY AUTO_INCREMENT,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    searchable_text TEXT NOT NULL,
    metadata JSON,
    weight INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FULLTEXT INDEX idx_search (searchable_text)
);

// Frontend Components:
- src/components/common/GlobalSearch.jsx
- src/components/common/SearchSuggestions.jsx
- src/hooks/useGlobalSearch.js

// Backend APIs:
- /api/search/global
- /api/search/suggestions
- /api/search/analytics
```

### 4. Dynamic Notification System
**User Story:** As a user, I want real-time notifications for dispatch and other events with user mentions.

**Acceptance Criteria:**
- Real-time notifications for dispatch, inventory changes, mentions
- Notification badges with unread count
- Notification history and mark as read functionality
- Push notifications for critical events
- User mention system (@username) in remarks
- Notification preferences per user

**Technical Implementation:**
```javascript
// New Database Tables:
CREATE TABLE notification_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_mentions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    mentioned_user_id INT NOT NULL,
    mentioning_user_id INT NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    mention_text TEXT,
    notification_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

// WebSocket Implementation:
- Real-time notification delivery
- User session management
- Connection health monitoring
```

### 5. Enhanced Timeline with Nested Tracking
**User Story:** As a user, I want detailed tracking cards with dispatch details and advanced filtering.

**Acceptance Criteria:**
- Nested tracking cards showing detailed information
- Click on dispatch entry shows details from warehouse_dispatch table
- Warehouse-wise filtering in timeline
- Event-wise filtering (dispatch, inventory, returns, etc.)
- Timeline shows complete audit trail
- Export timeline data functionality

**Current Status:**
- Basic timeline exists in `controllers/timelineController.js`
- Frontend timeline components need enhancement
- Database integration with warehouse_dispatch table needed

### 6. Advanced Order Management
**User Story:** As a user, I want comprehensive order tracking with multi-product support.

**Acceptance Criteria:**
- Multiple product entries for single dispatch
- Each product shows as separate entry with individual tracking
- Status updates bound to database-driven dropdown
- Real-time status synchronization
- Order history and timeline
- Bulk status updates

### 7. Comprehensive Activity Tracking
**User Story:** As an admin, I want comprehensive activity tracking for all user actions including offline activities.

**Acceptance Criteria:**
- Track all user activities (login, CRUD operations, exports, etc.)
- Log offline activities when user comes back online
- Store user IP, timestamp, action details, and data changes
- Provide filtering by user, action type, date range, component
- Export audit logs functionality
- Real-time activity monitoring

**Technical Implementation:**
```javascript
// New Database Table:
CREATE TABLE user_activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_offline_sync BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

// Middleware Implementation:
- Activity tracking middleware for all API requests
- Offline activity queue with sync mechanism
- Performance monitoring integration
```

## Database Schema Enhancements

### Existing Tables (43 tables identified)
- **User Management:** users, roles, permissions, role_permissions, user_effective_permissions
- **Inventory:** inventory, stock_batches, stock_transactions, inventory_adjustments
- **Products:** products, dispatch_product, product_categories, product_parts
- **Warehouse:** warehouse_dispatch, warehouse_dispatch_items, dispatch_warehouse
- **Tracking:** tracking_history, tracking_history_backup
- **Notifications:** notifications, messages, message_reads
- **Audit:** audit_log
- **Returns:** returns, returns_main, return_parts
- **Stores:** stores, storeinventory

### New Tables Required
1. **search_index** - Global search functionality
2. **user_mentions** - User mention system in remarks
3. **notification_queue** - Enhanced notification system
4. **user_activities** - Comprehensive activity tracking
5. **dashboard_widgets** - Permission-based dashboard components
6. **user_widget_preferences** - User widget customization
7. **search_analytics** - Search usage analytics
8. **user_sessions** - Real-time session management

## Implementation Priority

### Phase 1: Foundation (Week 1-2)
1. ✅ Fix server startup issues (COMPLETED)
2. ✅ Database connection verification (COMPLETED)
3. Remove notification bell from permissions tab
4. Enhance navbar with user info and dynamic notifications
5. Create missing database tables
6. Implement permission-based component rendering

### Phase 2: Search & Navigation (Week 3-4)
1. Implement global search infrastructure
2. Create search indexing system
3. Build intelligent suggestion engine
4. Add keyboard navigation support
5. Implement search analytics

### Phase 3: Real-time Features (Week 5-6)
1. Implement WebSocket/SSE for real-time notifications
2. Create notification management system
3. Build mention system with notifications
4. Add real-time activity tracking
5. Implement offline activity sync

### Phase 4: Timeline & Orders (Week 7-8)
1. Enhance timeline with nested tracking cards
2. Implement advanced filtering system
3. Create multi-product order management
4. Add status management system
5. Build order analytics dashboard

### Phase 5: Testing & Optimization (Week 9-10)
1. Comprehensive testing suite
2. Performance optimization
3. Security audit
4. Documentation and training materials
5. Deployment preparation

## Success Metrics
- **Performance:** Search response time < 200ms, Real-time notifications < 100ms
- **User Experience:** Search success rate > 90%, Notification read rate > 80%
- **System:** Dashboard load time < 2s, API response time < 500ms
- **Business:** Improved user productivity, Better inventory tracking accuracy

## Technical Architecture

### Frontend Structure
```
src/
├── components/
│   ├── common/
│   │   ├── GlobalSearch/
│   │   ├── NotificationBell/
│   │   ├── PermissionGate/
│   │   └── MentionInput/
│   ├── dashboard/
│   │   ├── DashboardGrid/
│   │   ├── widgets/
│   │   └── ActivityFeed/
│   ├── timeline/
│   │   ├── TimelineCard/
│   │   ├── NestedTrackingCard/
│   │   └── TimelineFilters/
│   └── orders/
│       ├── MultiProductOrder/
│       ├── StatusDropdown/
│       └── OrderTimeline/
├── contexts/
│   ├── PermissionsContext/
│   ├── NotificationContext/
│   ├── SearchContext/
│   └── ActivityContext/
├── services/
│   ├── api/
│   ├── websocket/
│   ├── search/
│   └── notifications/
└── hooks/
    ├── usePermissions/
    ├── useNotifications/
    ├── useGlobalSearch/
    └── useActivity/
```

### Backend Structure
```
controllers/
├── searchController.js
├── notificationController.js
├── activityController.js
├── timelineController.js (enhanced)
├── orderController.js
└── mentionController.js

middleware/
├── permissionMiddleware.js (enhanced)
├── activityTracker.js
├── notificationMiddleware.js
└── searchMiddleware.js

services/
├── permissionService.js
├── notificationService.js
├── searchService.js
├── activityService.js
└── mentionService.js
```

## Security Considerations
- Permission validation on all API endpoints
- Activity logging for security audit
- Secure WebSocket connections
- Input validation for mentions and search
- Rate limiting for search and notifications
- Data encryption for sensitive information

## Next Steps
1. **Immediate:** Remove notification bell from permissions tab and enhance navbar
2. **Short-term:** Create missing database tables and implement permission-based components
3. **Medium-term:** Implement global search and real-time notification system
4. **Long-term:** Complete timeline enhancements and comprehensive testing

This specification provides a clear roadmap for enhancing the inventory management system with all requested features while maintaining system stability and user experience.