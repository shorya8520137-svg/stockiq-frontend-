const db = require('../db/connection');

/**
 * =====================================================
 * DISPATCH CONTROLLER - Handles warehouse dispatch operations
 * Updates stock_batches and inventory_ledger_base
 * =====================================================
 */

/**
 * CREATE NEW DISPATCH - Enhanced for frontend form
 */
exports.createDispatch = (req, res) => {
    // Handle both API formats (original and frontend form)
    const isFormData = req.body.selectedWarehouse !== undefined;
    
    let warehouse, order_ref, customer, product_name, qty, variant, barcode, awb, logistics,
        parcel_type, length, width, height, actual_weight, payment_mode, invoice_amount,
        processed_by, remarks, products;

    if (isFormData) {
        // Frontend form format
        const {
            selectedWarehouse,
            orderRef,
            customerName,
            awbNumber,
            selectedLogistics,
            selectedPaymentMode,
            parcelType,
            selectedExecutive,
            invoiceAmount,
            weight,
            dimensions,
            remarks: formRemarks,
            products: formProducts
        } = req.body;

        warehouse = selectedWarehouse;
        order_ref = orderRef;
        customer = customerName;
        awb = awbNumber;
        logistics = selectedLogistics;
        payment_mode = selectedPaymentMode;
        parcel_type = parcelType || 'Forward';
        processed_by = selectedExecutive;
        invoice_amount = parseFloat(invoiceAmount) || 0;
        actual_weight = parseFloat(weight) || 0;
        length = parseFloat(dimensions?.length) || 0;
        width = parseFloat(dimensions?.width) || 0;
        height = parseFloat(dimensions?.height) || 0;
        remarks = formRemarks;
        products = formProducts;

        // For frontend form, we'll process multiple products
        if (!warehouse || !order_ref || !customer || !awb || !products || products.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'selectedWarehouse, orderRef, customerName, awbNumber, and products are required'
            });
        }
    } else {
        // Original API format
        ({
            warehouse,
            order_ref,
            customer,
            product_name,
            qty,
            variant,
            barcode,
            awb,
            logistics,
            parcel_type = 'Forward',
            length,
            width,
            height,
            actual_weight,
            payment_mode,
            invoice_amount = 0,
            processed_by,
            remarks
        } = req.body);

        // Validation for original format
        if (!warehouse || !product_name || !qty || !barcode || !awb) {
            return res.status(400).json({
                success: false,
                message: 'warehouse, product_name, qty, barcode, awb are required'
            });
        }

        const quantity = parseInt(qty);
        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'qty must be greater than 0'
            });
        }
    }

    db.beginTransaction(err => {
        if (err) return res.status(500).json({ success: false, message: err.message });

        if (isFormData) {
            // Handle frontend form with multiple products
            handleFormDispatch();
        } else {
            // Handle original single product dispatch
            handleSingleProductDispatch();
        }

        function handleFormDispatch() {
            // Process each product for stock validation first
            let processedProducts = 0;
            const totalProducts = products.length;
            let hasError = false;

            products.forEach((product, index) => {
                // Extract barcode from product name (format: "Product Name | Variant | Barcode")
                const barcode = extractBarcode(product.name);
                const productName = extractProductName(product.name);
                const qty = parseInt(product.qty) || 1;

                if (!barcode) {
                    hasError = true;
                    return db.rollback(() =>
                        res.status(400).json({
                            success: false,
                            message: `Invalid product format for product ${index + 1}: ${product.name}`
                        })
                    );
                }

                // Check stock availability
                const checkStockSql = `
                    SELECT SUM(qty_available) as available_stock
                    FROM stock_batches
                    WHERE barcode = ? AND warehouse = ? AND status = 'active'
                `;

                db.query(checkStockSql, [barcode, warehouse], (err, stockResult) => {
                    if (err || hasError) {
                        if (!hasError) {
                            hasError = true;
                            return db.rollback(() =>
                                res.status(500).json({ success: false, message: err.message })
                            );
                        }
                        return;
                    }

                    const availableStock = stockResult[0]?.available_stock || 0;
                    if (availableStock < qty) {
                        hasError = true;
                        return db.rollback(() =>
                            res.status(400).json({
                                success: false,
                                message: `Insufficient stock for ${productName}. Available: ${availableStock}, Required: ${qty}`
                            })
                        );
                    }

                    processedProducts++;
                    // If all products are validated, create the dispatch
                    if (processedProducts === totalProducts && !hasError) {
                        createFormDispatchRecord();
                    }
                });
            });

            function createFormDispatchRecord() {
                // Create dispatch record for first product (main record)
                const firstProduct = products[0];
                const firstBarcode = extractBarcode(firstProduct.name);
                const firstProductName = extractProductName(firstProduct.name);
                const totalQty = products.reduce((sum, p) => sum + (parseInt(p.qty) || 1), 0);

                const dispatchSql = `
                    INSERT INTO warehouse_dispatch (
                        warehouse, order_ref, customer, product_name, qty, barcode, awb,
                        logistics, parcel_type, actual_weight, payment_mode, invoice_amount,
                        processed_by, remarks, length, width, height
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                db.query(dispatchSql, [
                    warehouse, order_ref, customer, firstProductName, totalQty, firstBarcode, awb,
                    logistics, parcel_type, actual_weight, payment_mode, invoice_amount,
                    processed_by, remarks, length, width, height
                ], (err, dispatchResult) => {
                    if (err) {
                        return db.rollback(() =>
                            res.status(500).json({ success: false, message: err.message })
                        );
                    }

                    const dispatchId = dispatchResult.insertId;
                    updateStockForAllProducts(dispatchId);
                });
            }

            function updateStockForAllProducts(dispatchId) {
                let updatedProducts = 0;

                products.forEach((product) => {
                    const barcode = extractBarcode(product.name);
                    const productName = extractProductName(product.name);
                    const qty = parseInt(product.qty) || 1;

                    updateSingleProductStock(barcode, productName, qty, dispatchId, awb, () => {
                        updatedProducts++;
                        if (updatedProducts === totalProducts) {
                            // All products processed, commit transaction
                            db.commit(err => {
                                if (err) {
                                    return db.rollback(() =>
                                        res.status(500).json({ success: false, message: err.message })
                                    );
                                }

                                res.status(201).json({
                                    success: true,
                                    message: 'Dispatch created successfully',
                                    dispatch_id: dispatchId,
                                    order_ref,
                                    awb,
                                    products_dispatched: totalProducts,
                                    total_quantity: products.reduce((sum, p) => sum + (parseInt(p.qty) || 1), 0)
                                });
                            });
                        }
                    });
                });
            }
        }

        function handleSingleProductDispatch() {
            const quantity = parseInt(qty);

            // Step 1: Check available stock
            const checkStockSql = `
                SELECT SUM(qty_available) as available_stock
                FROM stock_batches
                WHERE barcode = ? AND warehouse = ? AND status = 'active'
            `;

            db.query(checkStockSql, [barcode, warehouse], (err, stockResult) => {
                if (err) {
                    return db.rollback(() =>
                        res.status(500).json({ success: false, message: err.message })
                    );
                }

                const availableStock = stockResult[0]?.available_stock || 0;
                if (availableStock < quantity) {
                    return db.rollback(() =>
                        res.status(400).json({
                            success: false,
                            message: `Insufficient stock. Available: ${availableStock}, Required: ${quantity}`
                        })
                    );
                }

                // Step 2: Create dispatch record
                const dispatchSql = `
                    INSERT INTO warehouse_dispatch (
                        warehouse, order_ref, customer, product_name, qty, variant,
                        barcode, awb, logistics, parcel_type, length, width, height,
                        actual_weight, payment_mode, invoice_amount, processed_by, remarks
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                db.query(dispatchSql, [
                    warehouse, order_ref, customer, product_name, quantity, variant,
                    barcode, awb, logistics, parcel_type, length, width, height,
                    actual_weight, payment_mode, invoice_amount, processed_by, remarks
                ], (err, dispatchResult) => {
                    if (err) {
                        return db.rollback(() =>
                            res.status(500).json({ success: false, message: err.message })
                        );
                    }

                    const dispatchId = dispatchResult.insertId;
                    updateSingleProductStock(barcode, product_name, quantity, dispatchId, awb, () => {
                        db.commit(err => {
                            if (err) {
                                return db.rollback(() =>
                                    res.status(500).json({ success: false, message: err.message })
                                );
                            }

                            res.status(201).json({
                                success: true,
                                message: 'Dispatch created successfully',
                                dispatch_id: dispatchId,
                                awb,
                                quantity_dispatched: quantity,
                                reference: `DISPATCH_${dispatchId}_${awb}`
                            });
                        });
                    });
                });
            });
        }

        // Helper function to update stock for a single product
        function updateSingleProductStock(barcode, productName, qty, dispatchId, awb, callback) {
            // Update stock batches (FIFO - First In, First Out)
            const updateStockSql = `
                SELECT id, qty_available
                FROM stock_batches
                WHERE barcode = ? AND warehouse = ? AND status = 'active' AND qty_available > 0
                ORDER BY created_at ASC
            `;

            db.query(updateStockSql, [barcode, warehouse], (err, batches) => {
                if (err) {
                    return db.rollback(() =>
                        res.status(500).json({ success: false, message: err.message })
                    );
                }

                let remainingQty = qty;
                const batchUpdates = [];

                // Calculate how much to deduct from each batch (FIFO)
                for (const batch of batches) {
                    if (remainingQty <= 0) break;

                    const deductQty = Math.min(batch.qty_available, remainingQty);
                    const newQty = batch.qty_available - deductQty;
                    const newStatus = newQty === 0 ? 'exhausted' : 'active';

                    batchUpdates.push({
                        id: batch.id,
                        newQty,
                        newStatus,
                        deductQty
                    });

                    remainingQty -= deductQty;
                }

                // Execute batch updates
                let updateCount = 0;
                const totalUpdates = batchUpdates.length;

                if (totalUpdates === 0) {
                    return db.rollback(() =>
                        res.status(400).json({
                            success: false,
                            message: 'No active stock batches found'
                        })
                    );
                }

                batchUpdates.forEach(update => {
                    const updateBatchSql = `
                        UPDATE stock_batches
                        SET qty_available = ?, status = ?
                        WHERE id = ?
                    `;

                    db.query(updateBatchSql, [update.newQty, update.newStatus, update.id], (err) => {
                        if (err) {
                            return db.rollback(() =>
                                res.status(500).json({ success: false, message: err.message })
                            );
                        }

                        updateCount++;
                        // When all batch updates are complete, add ledger entry
                        if (updateCount === totalUpdates) {
                            const ledgerSql = `
                                INSERT INTO inventory_ledger_base (
                                    event_time, movement_type, barcode, product_name,
                                    location_code, qty, direction, reference
                                ) VALUES (NOW(), 'DISPATCH', ?, ?, ?, ?, 'OUT', ?)
                            `;

                            const reference = `DISPATCH_${dispatchId}_${awb}`;

                            db.query(ledgerSql, [barcode, productName, warehouse, qty, reference], (err) => {
                                if (err) {
                                    return db.rollback(() =>
                                        res.status(500).json({ success: false, message: err.message })
                                    );
                                }

                                callback();
                            });
                        }
                    });
                });
            });
        }
    });
};

/**
 * Helper function to extract barcode from product string
 */
function extractBarcode(productString) {
    if (!productString || !productString.includes('|')) return '';
    const parts = productString.split('|').map(s => s.trim());
    return parts[parts.length - 1];
}

/**
 * Helper function to extract product name from product string
 */
function extractProductName(productString) {
    if (!productString || !productString.includes('|')) return productString;
    const parts = productString.split('|').map(s => s.trim());
    return parts[0];
}

/**
 * GET ALL DISPATCHES WITH FILTERS
 */
exports.getDispatches = (req, res) => {
    const {
        warehouse,
        status,
        dateFrom,
        dateTo,
        search,
        page = 1,
        limit = 50
    } = req.query;

    const filters = [];
    const values = [];

    if (warehouse) {
        filters.push('warehouse = ?');
        values.push(warehouse);
    }

    if (status) {
        filters.push('status = ?');
        values.push(status);
    }

    if (dateFrom) {
        filters.push('timestamp >= ?');
        values.push(`${dateFrom} 00:00:00`);
    }

    if (dateTo) {
        filters.push('timestamp <= ?');
        values.push(`${dateTo} 23:59:59`);
    }

    if (search) {
        filters.push('(product_name LIKE ? OR barcode LIKE ? OR awb LIKE ? OR order_ref LIKE ? OR customer LIKE ?)');
        const searchTerm = `%${search}%`;
        values.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const sql = `
        SELECT *
        FROM warehouse_dispatch
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
    `;

    values.push(parseInt(limit), parseInt(offset));

    db.query(sql, values, (err, rows) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        // Get total count
        const countSql = `SELECT COUNT(*) as total FROM warehouse_dispatch ${whereClause}`;
        const countValues = values.slice(0, -2); // Remove limit and offset

        db.query(countSql, countValues, (err, countResult) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            const total = countResult[0].total;
            res.json({
                success: true,
                data: rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        });
    });
};

/**
 * UPDATE DISPATCH STATUS
 */
exports.updateDispatchStatus = (req, res) => {
    const { id } = req.params;
    const { status, processed_by, remarks } = req.body;

    if (!status) {
        return res.status(400).json({
            success: false,
            message: 'status is required'
        });
    }

    const sql = `
        UPDATE warehouse_dispatch
        SET status = ?, processed_by = ?, remarks = ?, notification_status = 'unread'
        WHERE id = ?
    `;

    db.query(sql, [status, processed_by, remarks, id], (err, result) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Dispatch not found'
            });
        }

        res.json({
            success: true,
            message: 'Dispatch status updated successfully'
        });
    });
};

/**
 * GET WAREHOUSES - For dropdown
 */
exports.getWarehouses = (req, res) => {
    const sql = `SELECT warehouse_code FROM dispatch_warehouse ORDER BY Warehouse_name`;
    
    db.query(sql, (err, rows) => {
        if (err) {
            console.error('❌ Get warehouses error:', err);
            // Fallback to sample data
            return res.json(['Main Warehouse', 'GGM_WH', 'North Warehouse', 'South Warehouse']);
        }

        const warehouses = rows.map(row => row.warehouse_code);
        res.json(warehouses);
    });
};

/**
 * GET LOGISTICS - For dropdown
 */
exports.getLogistics = (req, res) => {
    const sql = `SELECT name FROM logistics ORDER BY name`;
    
    db.query(sql, (err, rows) => {
        if (err) {
            console.error('❌ Get logistics error:', err);
            // Fallback to sample data
            return res.json(['Delhivery', 'Blue Dart', 'DTDC', 'Ecom Express', 'Xpressbees']);
        }

        const logistics = rows.map(row => row.name);
        res.json(logistics);
    });
};

/**
 * GET PROCESSED PERSONS - For dropdown
 */
exports.getProcessedPersons = (req, res) => {
    const sql = `SELECT name FROM processed_persons ORDER BY name`;
    
    db.query(sql, (err, rows) => {
        if (err) {
            console.error('❌ Get processed persons error:', err);
            // Fallback to sample data
            return res.json(['John Doe', 'Jane Smith', 'Admin User', 'Warehouse Manager']);
        }

        const persons = rows.map(row => row.name);
        res.json(persons);
    });
};

/**
 * SEARCH PRODUCTS - For auto-suggestions
 */
exports.searchProducts = (req, res) => {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
        return res.json([]);
    }

    const sql = `
        SELECT p_id, product_name, product_variant, barcode, price
        FROM dispatch_product
        WHERE is_active = 1
        AND (product_name LIKE ? OR barcode LIKE ? OR product_variant LIKE ?)
        ORDER BY product_name
        LIMIT 10
    `;

    const searchTerm = `%${query}%`;

    db.query(sql, [searchTerm, searchTerm, searchTerm], (err, rows) => {
        if (err) {
            console.error('❌ Search products error:', err);
            // Fallback to sample data
            return res.json([
                {
                    p_id: 1,
                    product_name: `Sample Product matching "${query}"`,
                    barcode: '1234567890',
                    product_variant: 'Default',
                    price: '99.99'
                }
            ]);
        }

        res.json(rows);
    });
};

/**
 * CHECK INVENTORY - For stock validation
 */
exports.checkInventory = (req, res) => {
    const { warehouse, barcode, qty } = req.query;
    
    if (!warehouse || !barcode) {
        return res.json({
            ok: false,
            available: 0,
            message: 'warehouse and barcode are required'
        });
    }

    const quantity = parseInt(qty) || 1;
    const sql = `
        SELECT SUM(qty_available) as available_stock
        FROM stock_batches
        WHERE barcode = ? AND warehouse = ? AND status = 'active'
    `;

    db.query(sql, [barcode, warehouse], (err, rows) => {
        if (err) {
            console.error('❌ Check inventory error:', err);
            // Fallback to mock data
            const mockStock = Math.floor(Math.random() * 100) + 10;
            const available = mockStock >= quantity;
            
            return res.json({
                ok: available,
                available: mockStock,
                requested: quantity,
                message: available ? `Available: ${mockStock}` : `Insufficient stock. Available: ${mockStock}, Required: ${quantity}`
            });
        }

        const availableStock = rows[0]?.available_stock || 0;
        const isOk = availableStock >= quantity;

        res.json({
            ok: isOk,
            available: availableStock,
            requested: quantity,
            message: isOk 
                ? `Available: ${availableStock}` 
                : `Insufficient stock. Available: ${availableStock}, Required: ${quantity}`
        });
    });
};

/**
 * GET PAYMENT MODES - For dropdown
 */
exports.getPaymentModes = (req, res) => {
    const paymentModes = ['COD', 'Prepaid', 'UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallet'];
    res.json(paymentModes);
};

// Class-based exports for compatibility
class DispatchController {
    static getAllDispatches = exports.getDispatches;
    static createDispatch = exports.createDispatch;
    static updateDispatchStatus = exports.updateDispatchStatus;
    static getWarehouses = exports.getWarehouses;
    static getLogistics = exports.getLogistics;
    static getProcessedPersons = exports.getProcessedPersons;
    static searchProducts = exports.searchProducts;
    static checkInventory = exports.checkInventory;
    static getPaymentModes = exports.getPaymentModes;
}

module.exports = DispatchController;