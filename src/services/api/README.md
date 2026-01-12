# API Services Documentation

This folder contains all API service modules for the application. Each module provides a clean interface to interact with backend endpoints.

## 📁 Structure

```
src/services/api/
├── index.js          # Base API configuration and utilities
├── auth.js           # Authentication APIs
├── bulkUpload.js     # Bulk upload operations
├── inventory.js      # Inventory management
├── orders.js         # Order management
├── products.js       # Product management
├── warehouses.js     # Warehouse operations
└── README.md         # This documentation
```

## 🚀 Usage

### Import Individual Services
```javascript
import { bulkUploadAPI } from '@/services/api/bulkUpload';
import { inventoryAPI } from '@/services/api/inventory';
```

### Import All Services
```javascript
import { 
    bulkUploadAPI, 
    inventoryAPI, 
    productsAPI, 
    ordersAPI 
} from '@/services/api';
```

## 📋 Available APIs

### 🔐 Authentication (`auth.js`)
- `login(credentials)` - User login
- `logout()` - User logout
- `refreshToken()` - Refresh auth token
- `getProfile()` - Get user profile
- `updateProfile(data)` - Update profile
- `changePassword(data)` - Change password

### 📦 Bulk Upload (`bulkUpload.js`)
- `upload(rows)` - Upload bulk inventory data
- `getWarehouses()` - Get available warehouses
- `getHistory()` - Get upload history
- `getCSVTemplate()` - Get CSV template
- `parseCSV(content, warehouse)` - Parse CSV content
- `validateRow(row)` - Validate row data

**Endpoint**: `POST https://13-201-222-24.nip.io/api/bulk-upload`

### 📊 Inventory (`inventory.js`)
- `getInventory(filters)` - Get inventory with filters
- `getInventoryByWarehouse(warehouse)` - Get warehouse inventory
- `exportInventory(format)` - Export inventory data
- `getInventoryStats()` - Get inventory statistics
- `searchInventory(query, filters)` - Search inventory
- `getLowStockItems(threshold)` - Get low stock items

### 📋 Orders (`orders.js`)
- `getOrders(filters)` - Get orders with filters
- `getOrder(id)` - Get single order
- `createOrder(data)` - Create new order
- `updateOrderStatus(id, status)` - Update order status
- `dispatchOrder(id, data)` - Dispatch order
- `getOrderTracking(id)` - Get tracking info
- `getOrdersByWarehouse(warehouse)` - Get warehouse orders
- `exportOrders(filters, format)` - Export orders

### 🏷️ Products (`products.js`)
- `getProducts(filters)` - Get products with filters
- `getProduct(id)` - Get single product
- `createProduct(data)` - Create new product
- `updateProduct(id, data)` - Update product
- `deleteProduct(id)` - Delete product
- `searchProducts(query, filters)` - Search products
- `getCategories()` - Get product categories
- `bulkImport(products)` - Bulk import products

### 🏢 Warehouses (`warehouses.js`)
- `getWarehouses()` - Get all warehouses
- `getWarehouse(code)` - Get single warehouse
- `searchWarehouses(query)` - Search warehouses
- `getWarehouseStats(code)` - Get warehouse statistics
- `getWarehouseInventory(code)` - Get warehouse inventory

## ⚙️ Configuration

### Base Configuration (`index.js`)
```javascript
export const API_CONFIG = {
    BASE_URL: 'https://13-201-222-24.nip.io/api',
    TIMEOUT: 30000,
    HEADERS: {
        'Content-Type': 'application/json',
    }
};
```

### Error Handling
All API functions include automatic error handling:
- Request timeouts (30 seconds)
- HTTP error status codes
- Network errors
- JSON parsing errors

### Example Usage

```javascript
// Bulk upload example
import { bulkUploadAPI } from '@/services/api';

try {
    const warehouses = await bulkUploadAPI.getWarehouses();
    const csvContent = "barcode,product_name,variant,qty,unit_cost\nABC123,Test Product,Red,10,25.50";
    const rows = bulkUploadAPI.parseCSV(csvContent, 'MUM_WH');
    const result = await bulkUploadAPI.upload(rows);
    
    console.log(`Uploaded ${result.inserted} items successfully`);
} catch (error) {
    console.error('Upload failed:', error.message);
}
```

## 🔧 Environment Variables

- `NEXT_PUBLIC_API_BASE` - API base URL (default: https://13-201-222-24.nip.io/api)
- `NEXT_PUBLIC_API_TIMEOUT` - Request timeout in ms (default: 30000)

## 📝 Notes

- All functions return Promises
- Error handling is built-in
- Automatic request timeouts
- Consistent response format
- TypeScript-friendly (JSDoc comments)
- Centralized configuration