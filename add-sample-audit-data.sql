-- Add sample audit log data for testing
INSERT INTO audit_log (user_id, action, resource_type, resource_id, new_values, ip_address, success, created_at) VALUES
(1, 'LOGIN', 'USER', '1', '{"ip": "192.168.1.100", "user_agent": "Chrome"}', '192.168.1.100', 1, NOW() - INTERVAL 1 HOUR),
(1, 'CREATE_PRODUCT', 'PRODUCT', 'P001', '{"product_name": "Test Product", "barcode": "123456789"}', '192.168.1.100', 1, NOW() - INTERVAL 2 HOUR),
(1, 'BULK_UPLOAD', 'INVENTORY', 'BULK001', '{"file_name": "inventory.xlsx", "records_count": 150}', '192.168.1.100', 1, NOW() - INTERVAL 3 HOUR),
(1, 'DISPATCH_ORDER', 'ORDER', 'ORD001', '{"order_id": "ORD001", "warehouse": "GGM_WH", "items": 5}', '192.168.1.100', 1, NOW() - INTERVAL 4 HOUR),
(1, 'UPDATE_INVENTORY', 'INVENTORY', 'INV001', '{"product": "Baby Diaper", "old_stock": 100, "new_stock": 95}', '192.168.1.100', 1, NOW() - INTERVAL 5 HOUR),
(1, 'EXPORT_DATA', 'INVENTORY', 'EXP001', '{"export_type": "products", "format": "xlsx", "records": 2600}', '192.168.1.100', 1, NOW() - INTERVAL 6 HOUR),
(1, 'CREATE_USER', 'USER', '2', '{"name": "Manager User", "email": "manager@example.com", "role": "manager"}', '192.168.1.100', 1, NOW() - INTERVAL 7 HOUR),
(1, 'DAMAGE_RECORD', 'INVENTORY', 'DMG001', '{"product": "Electronics Item", "quantity": 2, "reason": "Water damage"}', '192.168.1.100', 1, NOW() - INTERVAL 8 HOUR),
(1, 'RETURN_PROCESS', 'ORDER', 'RET001', '{"return_id": "RET001", "order_id": "ORD002", "items": 3}', '192.168.1.100', 1, NOW() - INTERVAL 9 HOUR),
(1, 'SELF_TRANSFER', 'INVENTORY', 'TRF001', '{"from_warehouse": "GGM_WH", "to_warehouse": "BLR_WH", "items": 10}', '192.168.1.100', 1, NOW() - INTERVAL 10 HOUR);