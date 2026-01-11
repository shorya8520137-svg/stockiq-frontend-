-- Fix dispatch controller by creating missing tables

-- Create dispatch_warehouse table
CREATE TABLE IF NOT EXISTS dispatch_warehouse (
    id INT PRIMARY KEY AUTO_INCREMENT,
    warehouse_code VARCHAR(50) NOT NULL UNIQUE,
    Warehouse_name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create processed_persons table
CREATE TABLE IF NOT EXISTS processed_persons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create logistics table
CREATE TABLE IF NOT EXISTS logistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    contact_info VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data for dispatch_warehouse
INSERT IGNORE INTO dispatch_warehouse (warehouse_code, Warehouse_name, location) VALUES
('GGM_WH', 'Gurgaon Main Warehouse', 'Gurgaon, Haryana'),
('DEL_WH', 'Delhi Warehouse', 'Delhi, India'),
('MUM_WH', 'Mumbai Warehouse', 'Mumbai, Maharashtra'),
('BLR_WH', 'Bangalore Warehouse', 'Bangalore, Karnataka'),
('HYD_WH', 'Hyderabad Warehouse', 'Hyderabad, Telangana');

-- Insert sample data for processed_persons
INSERT IGNORE INTO processed_persons (name, email, role) VALUES
('Rahul Sharma', 'rahul.sharma@company.com', 'Dispatch Manager'),
('Priya Singh', 'priya.singh@company.com', 'Warehouse Executive'),
('Amit Kumar', 'amit.kumar@company.com', 'Operations Lead'),
('Sneha Patel', 'sneha.patel@company.com', 'Logistics Coordinator'),
('Vikash Gupta', 'vikash.gupta@company.com', 'Dispatch Executive');

-- Insert sample data for logistics
INSERT IGNORE INTO logistics (name, contact_info) VALUES
('Blue Dart', 'Phone: 1800-123-4567, Email: support@bluedart.com'),
('DTDC', 'Phone: 1800-209-0909, Email: customercare@dtdc.com'),
('FedEx', 'Phone: 1800-419-3339, Email: support@fedex.com'),
('Delhivery', 'Phone: 011-4747-4747, Email: care@delhivery.com'),
('Ecom Express', 'Phone: 0124-4544444, Email: support@ecomexpress.in'),
('Aramex', 'Phone: 1800-103-7890, Email: info@aramex.com');