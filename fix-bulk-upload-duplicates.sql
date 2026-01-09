-- Fix for bulk upload duplicate entry errors
-- This should be applied to the backend database

-- IMPORTANT: Only barcode is strictly required for bulk upload
-- Product names can be the same for different variants, so they're optional
-- The system should auto-generate product names if missing

-- The issue is that the backend is using INSERT which fails on duplicates
-- Instead, it should use INSERT ... ON DUPLICATE KEY UPDATE or REPLACE INTO

-- Example of what the backend should do:

-- Instead of:
-- INSERT INTO stock_batches (barcode, warehouse, product_name, variant, qty, unit_cost, event_time, event_type)
-- VALUES (?, ?, ?, ?, ?, ?, NOW(), 'bulk_upload')

-- Use this approach for UPSERT (recommended):
INSERT INTO stock_batches (barcode, warehouse, product_name, variant, qty, unit_cost, event_time, event_type)
VALUES (?, ?, COALESCE(?, CONCAT('Product ', ?)), COALESCE(?, ''), COALESCE(?, 0), COALESCE(?, 0), NOW(), 'bulk_upload')
ON DUPLICATE KEY UPDATE
    qty = qty + VALUES(qty),  -- Add to existing quantity (for stock adjustments)
    unit_cost = COALESCE(VALUES(unit_cost), unit_cost),  -- Update unit cost if provided
    event_time = NOW(),  -- Update timestamp
    product_name = COALESCE(VALUES(product_name), product_name),  -- Update product name if provided
    variant = COALESCE(VALUES(variant), variant);  -- Update variant if provided

-- OR for complete replacement (if you want to replace existing stock):
REPLACE INTO stock_batches (barcode, warehouse, product_name, variant, qty, unit_cost, event_time, event_type)
VALUES (?, ?, COALESCE(?, CONCAT('Product ', ?)), COALESCE(?, ''), COALESCE(?, 0), COALESCE(?, 0), NOW(), 'bulk_upload');

-- The unique constraint causing the issue is likely:
-- UNIQUE KEY `uniq_opening_only` (`barcode`, `warehouse`)

-- This constraint is good for preventing true duplicates, but the backend
-- needs to handle it properly with UPSERT logic instead of failing.

-- Backend API endpoint should be modified to:
-- 1. Validate that barcode is provided (only required field)
-- 2. Auto-generate product_name if missing: CONCAT('Product ', barcode)
-- 3. Default qty to 0 if missing
-- 4. Default unit_cost to 0 if missing
-- 5. Default variant to empty string if missing
-- 6. Try UPSERT instead of INSERT
-- 7. Track both insertions and updates in the response
-- 8. Show in timeline as separate events (bulk_upload_new vs bulk_upload_update)

-- Example validation logic for backend:
-- IF barcode IS NULL OR barcode = '' THEN
--     SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Barcode is required';
-- END IF;
-- 
-- SET product_name = COALESCE(product_name, CONCAT('Product ', barcode));
-- SET variant = COALESCE(variant, '');
-- SET qty = COALESCE(qty, 0);
-- SET unit_cost = COALESCE(unit_cost, 0);