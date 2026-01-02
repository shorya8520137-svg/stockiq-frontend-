-- =====================================================
-- PRODUCT MANAGEMENT TABLES
-- =====================================================

-- Add missing columns to existing dispatch_product table
ALTER TABLE dispatch_product 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category_id INT,
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS weight DECIMAL(8,3),
ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Create product categories table
CREATE TABLE IF NOT EXISTS product_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    parent_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE SET NULL,
    INDEX idx_name (name),
    INDEX idx_parent (parent_id),
    INDEX idx_active (is_active)
);

-- Add foreign key constraint to dispatch_product
ALTER TABLE dispatch_product 
ADD CONSTRAINT fk_product_category 
FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_name ON dispatch_product(product_name);
CREATE INDEX IF NOT EXISTS idx_product_barcode ON dispatch_product(barcode);
CREATE INDEX IF NOT EXISTS idx_product_category ON dispatch_product(category_id);
CREATE INDEX IF NOT EXISTS idx_product_active ON dispatch_product(is_active);

-- Insert default categories
INSERT IGNORE INTO product_categories (name, display_name, description) VALUES
('baby_wear', 'Baby Wear', 'Baby clothing and accessories'),
('baby_props', 'Baby Props', 'Baby photography props and accessories'),
('baby_furniture', 'Baby Furniture', 'Cribs, strollers, and baby furniture'),
('toys_games', 'Toys & Games', 'Baby toys and educational games'),
('feeding', 'Feeding', 'Bottles, feeding accessories'),
('bathing', 'Bathing', 'Bath tubs and bathing accessories'),
('safety', 'Safety', 'Baby safety products'),
('others', 'Others', 'Miscellaneous baby products');

-- Update existing products with categories based on product names
UPDATE dispatch_product SET category_id = (
    SELECT id FROM product_categories WHERE name = 'baby_wear'
) WHERE product_name LIKE '%wear%' OR product_name LIKE '%clothing%';

UPDATE dispatch_product SET category_id = (
    SELECT id FROM product_categories WHERE name = 'baby_props'
) WHERE product_name LIKE '%prop%' OR product_name LIKE '%duck%' OR product_name LIKE '%mickey%' OR product_name LIKE '%mouse%' OR product_name LIKE '%spiderman%' OR product_name LIKE '%strawberry%';

UPDATE dispatch_product SET category_id = (
    SELECT id FROM product_categories WHERE name = 'baby_furniture'
) WHERE product_name LIKE '%cradle%' OR product_name LIKE '%stroller%';

UPDATE dispatch_product SET category_id = (
    SELECT id FROM product_categories WHERE name = 'bathing'
) WHERE product_name LIKE '%bathtub%' OR product_name LIKE '%bath%';

UPDATE dispatch_product SET category_id = (
    SELECT id FROM product_categories WHERE name = 'toys_games'
) WHERE product_name LIKE '%baloon%' OR product_name LIKE '%toy%' OR product_name LIKE '%game%';

-- Set default category for products without category
UPDATE dispatch_product SET category_id = (
    SELECT id FROM product_categories WHERE name = 'others'
) WHERE category_id IS NULL;