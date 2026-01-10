// Central API configuration and exports
export { API_CONFIG, apiRequest, checkAPIHealth } from './config';

// Export all API services
export * as auth from './auth.js';
export * as inventory from './inventory.js';
export * as products from './products.js';
export * as orders from './orders.js';
export * as warehouses from './warehouses.js';
export * as bulkUpload from './bulkUpload.js';
export * as dispatch from './dispatch.js';
export * as returns from './returns.js';
export * as damageRecovery from './damageRecovery.js';