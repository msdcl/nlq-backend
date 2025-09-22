-- E-commerce Database Setup Script
-- Creates tables and inserts comprehensive dummy data for dashboard analytics

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS product_inventory CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;

-- Create categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customers table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    country VARCHAR(50),
    postal_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Create products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    sku VARCHAR(100) UNIQUE,
    brand VARCHAR(100),
    weight DECIMAL(8,2),
    dimensions VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create product inventory table
CREATE TABLE product_inventory (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    warehouse_location VARCHAR(100),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    total_amount DECIMAL(12,2) NOT NULL,
    shipping_address TEXT,
    billing_address TEXT,
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending',
    shipping_cost DECIMAL(8,2) DEFAULT 0,
    tax_amount DECIMAL(8,2) DEFAULT 0,
    discount_amount DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP
);

-- Create order_items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create reviews table
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    product_id INTEGER REFERENCES products(id),
    order_id INTEGER REFERENCES orders(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    helpful_votes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices and gadgets'),
('Clothing', 'Fashion and apparel'),
('Home & Garden', 'Home improvement and garden supplies'),
('Sports & Outdoors', 'Sports equipment and outdoor gear'),
('Books', 'Books and educational materials'),
('Beauty & Health', 'Beauty products and health supplements'),
('Toys & Games', 'Toys and entertainment'),
('Automotive', 'Car parts and accessories'),
('Food & Beverages', 'Food items and drinks'),
('Jewelry', 'Jewelry and accessories');

-- Generate 1000+ customers
INSERT INTO customers (first_name, last_name, email, phone, address, city, state, country, postal_code, created_at, last_login)
SELECT 
    first_names.first_name,
    last_names.last_name,
    LOWER(first_names.first_name || '.' || last_names.last_name || (i % 1000) || '@example.com') as email,
    '+1-' || LPAD((random() * 9999999999)::bigint::text, 10, '0') as phone,
    (random() * 1000)::int || ' ' || 
    CASE (random() * 5)::int
        WHEN 0 THEN 'Main St'
        WHEN 1 THEN 'Oak Ave'
        WHEN 2 THEN 'Pine Rd'
        WHEN 3 THEN 'Elm St'
        WHEN 4 THEN 'Cedar Ln'
    END as address,
    CASE (random() * 20)::int
        WHEN 0 THEN 'New York'
        WHEN 1 THEN 'Los Angeles'
        WHEN 2 THEN 'Chicago'
        WHEN 3 THEN 'Houston'
        WHEN 4 THEN 'Phoenix'
        WHEN 5 THEN 'Philadelphia'
        WHEN 6 THEN 'San Antonio'
        WHEN 7 THEN 'San Diego'
        WHEN 8 THEN 'Dallas'
        WHEN 9 THEN 'San Jose'
        WHEN 10 THEN 'Austin'
        WHEN 11 THEN 'Jacksonville'
        WHEN 12 THEN 'Fort Worth'
        WHEN 13 THEN 'Columbus'
        WHEN 14 THEN 'Charlotte'
        WHEN 15 THEN 'San Francisco'
        WHEN 16 THEN 'Indianapolis'
        WHEN 17 THEN 'Seattle'
        WHEN 18 THEN 'Denver'
        WHEN 19 THEN 'Washington'
    END as city,
    CASE (random() * 10)::int
        WHEN 0 THEN 'CA'
        WHEN 1 THEN 'NY'
        WHEN 2 THEN 'TX'
        WHEN 3 THEN 'FL'
        WHEN 4 THEN 'IL'
        WHEN 5 THEN 'PA'
        WHEN 6 THEN 'OH'
        WHEN 7 THEN 'GA'
        WHEN 8 THEN 'NC'
        WHEN 9 THEN 'MI'
    END as state,
    'USA' as country,
    LPAD((random() * 99999)::int::text, 5, '0') as postal_code,
    CURRENT_TIMESTAMP - (random() * interval '365 days') as created_at,
    CURRENT_TIMESTAMP - (random() * interval '30 days') as last_login
FROM 
    (SELECT unnest(ARRAY['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Jennifer', 'William', 'Linda', 'James', 'Patricia', 'Richard', 'Mary', 'Charles', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Betty', 'Paul', 'Helen', 'Mark', 'Sandra', 'Donald', 'Donna', 'Steven', 'Carol', 'Andrew', 'Ruth', 'Joshua', 'Sharon', 'Kenneth', 'Michelle', 'Kevin', 'Laura', 'Brian', 'Sarah', 'George', 'Kimberly', 'Timothy', 'Deborah', 'Ronald', 'Dorothy', 'Jason', 'Lisa', 'Edward', 'Nancy', 'Jeffrey', 'Karen', 'Ryan', 'Betty', 'Jacob', 'Helen', 'Gary', 'Sandra', 'Nicholas', 'Donna', 'Eric', 'Carol', 'Jonathan', 'Ruth', 'Stephen', 'Sharon', 'Larry', 'Michelle', 'Justin', 'Laura', 'Scott', 'Sarah', 'Brandon', 'Kimberly', 'Benjamin', 'Deborah', 'Samuel', 'Dorothy', 'Gregory', 'Lisa', 'Alexander', 'Nancy', 'Patrick', 'Karen', 'Jack', 'Betty', 'Dennis', 'Helen', 'Jerry', 'Sandra', 'Tyler', 'Donna', 'Aaron', 'Carol', 'Jose', 'Ruth', 'Henry', 'Sharon', 'Adam', 'Michelle', 'Douglas', 'Laura', 'Nathan', 'Sarah', 'Peter', 'Kimberly', 'Zachary', 'Deborah', 'Kyle', 'Dorothy', 'Noah', 'Lisa', 'Alan', 'Nancy', 'Jeremy', 'Karen', 'Ethan', 'Betty', 'Wayne', 'Helen', 'Ralph', 'Sandra', 'Roy', 'Donna', 'Eugene', 'Carol', 'Louis', 'Ruth', 'Philip', 'Sharon', 'Bobby', 'Michelle', 'Johnny', 'Laura', 'Lawrence', 'Sarah']) as first_name) first_names,
    (SELECT unnest(ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez']) as last_name) last_names,
    generate_series(1, 1000) as i;

-- Insert products with categories
INSERT INTO products (name, description, price, category_id, sku, brand, weight, dimensions)
SELECT 
    product_data.name,
    product_data.description,
    product_data.price,
    product_data.category_id,
    'SKU-' || LPAD((random() * 999999)::int::text, 6, '0') as sku,
    product_data.brand,
    (random() * 10 + 0.1)::decimal(8,2) as weight,
    (random() * 20 + 5)::int || 'x' || (random() * 15 + 3)::int || 'x' || (random() * 10 + 2)::int || ' inches' as dimensions
FROM (
    SELECT unnest(ARRAY[
        'Wireless Bluetooth Headphones', 'Smart Watch Series 5', 'Laptop Stand Adjustable', 'Phone Case Clear', 'Bluetooth Speaker Portable',
        'Gaming Mouse RGB', 'Mechanical Keyboard', 'USB-C Hub', 'Wireless Charger', 'Laptop Backpack',
        'Cotton T-Shirt', 'Denim Jeans', 'Hoodie Sweatshirt', 'Running Shoes', 'Dress Shirt',
        'Summer Dress', 'Winter Jacket', 'Athletic Shorts', 'Formal Pants', 'Casual Sneakers',
        'Garden Hose 50ft', 'Plant Pot Set', 'Lawn Mower Electric', 'Garden Tools Kit', 'Outdoor Furniture',
        'Grill Cover', 'Plant Seeds Mix', 'Garden Gloves', 'Watering Can', 'Garden Bench',
        'Tennis Racket', 'Yoga Mat', 'Dumbbell Set', 'Basketball', 'Soccer Ball',
        'Camping Tent', 'Hiking Backpack', 'Sleeping Bag', 'Water Bottle', 'Fitness Tracker',
        'Programming Book', 'Cookbook Collection', 'Fiction Novel', 'History Book', 'Science Textbook',
        'Language Learning', 'Art Book', 'Biography', 'Children Book', 'Reference Guide',
        'Face Cream', 'Shampoo Set', 'Vitamins Daily', 'Skincare Kit', 'Hair Dryer',
        'Makeup Palette', 'Perfume Bottle', 'Toothbrush Electric', 'Body Lotion', 'Nail Polish Set',
        'Board Game', 'Puzzle 1000pc', 'Action Figure', 'LEGO Set', 'Video Game',
        'Card Game', 'Doll House', 'Remote Car', 'Building Blocks', 'Art Supplies',
        'Car Phone Mount', 'Dashboard Camera', 'Floor Mats Set', 'Air Freshener', 'Tire Pressure Gauge',
        'Oil Filter', 'Car Cover', 'Jump Starter', 'Tire Inflator', 'Cleaning Kit',
        'Coffee Beans', 'Tea Collection', 'Protein Powder', 'Snack Mix', 'Energy Drink',
        'Chocolate Box', 'Nuts Assorted', 'Dried Fruits', 'Granola Bars', 'Organic Honey',
        'Gold Necklace', 'Silver Ring', 'Diamond Earrings', 'Pearl Bracelet', 'Watch Luxury',
        'Anklet Chain', 'Pendant Set', 'Bangle Set', 'Brooch Vintage', 'Cufflinks'
    ]) as name,
    'High-quality ' || unnest(ARRAY[
        'wireless audio device with noise cancellation', 'smart wearable with health tracking', 'adjustable laptop stand for ergonomic work', 'protective phone case with clear design', 'portable bluetooth speaker with bass',
        'gaming mouse with RGB lighting', 'mechanical keyboard with tactile switches', 'USB-C hub with multiple ports', 'wireless charging pad for phones', 'laptop backpack with padded compartments',
        'comfortable cotton t-shirt', 'classic denim jeans', 'warm hoodie sweatshirt', 'running shoes with cushioning', 'formal dress shirt',
        'elegant summer dress', 'warm winter jacket', 'athletic shorts for sports', 'formal dress pants', 'casual sneakers for everyday wear',
        'durable garden hose', 'ceramic plant pot set', 'electric lawn mower', 'complete garden tools kit', 'outdoor furniture set',
        'protective grill cover', 'mixed plant seeds', 'comfortable garden gloves', 'watering can for plants', 'garden bench for seating',
        'professional tennis racket', 'non-slip yoga mat', 'adjustable dumbbell set', 'official basketball', 'soccer ball for training',
        '4-person camping tent', 'hiking backpack with hydration', 'warm sleeping bag', 'insulated water bottle', 'fitness tracking device',
        'comprehensive programming guide', 'gourmet cookbook collection', 'bestselling fiction novel', 'detailed history book', 'science textbook',
        'language learning course', 'art technique book', 'celebrity biography', 'children storybook', 'reference guide',
        'moisturizing face cream', 'premium shampoo set', 'daily vitamin supplements', 'complete skincare kit', 'professional hair dryer',
        'makeup eyeshadow palette', 'luxury perfume bottle', 'electric toothbrush', 'nourishing body lotion', 'nail polish set',
        'strategy board game', '1000-piece jigsaw puzzle', 'collectible action figure', 'LEGO building set', 'popular video game',
        'classic card game', 'dollhouse playset', 'remote control car', 'building blocks set', 'art supplies kit',
        'car phone mount holder', 'dashboard camera recorder', 'car floor mats set', 'air freshener dispenser', 'tire pressure gauge',
        'car oil filter', 'protective car cover', 'jump starter battery', 'tire inflator pump', 'car cleaning kit',
        'premium coffee beans', 'artisan tea collection', 'protein powder supplement', 'mixed snack variety', 'energy drink',
        'luxury chocolate box', 'assorted nuts mix', 'dried fruits selection', 'granola bars pack', 'organic honey jar',
        'elegant gold necklace', 'sterling silver ring', 'diamond stud earrings', 'pearl bracelet', 'luxury wristwatch',
        'delicate anklet chain', 'matching pendant set', 'bangle bracelet set', 'vintage brooch', 'formal cufflinks'
    ]) as description,
    (random() * 500 + 10)::decimal(10,2) as price,
    (random() * 10 + 1)::int as category_id,
    unnest(ARRAY[
        'Sony', 'Apple', 'Logitech', 'Samsung', 'Bose', 'Microsoft', 'Dell', 'HP', 'Canon', 'Nikon',
        'Nike', 'Adidas', 'Puma', 'Under Armour', 'Reebok', 'Levi', 'Gap', 'H&M', 'Zara', 'Uniqlo',
        'Black & Decker', 'DeWalt', 'Craftsman', 'Husqvarna', 'Toro', 'Scotts', 'Miracle-Gro', 'Fiskars', 'Ames', 'Gardeners',
        'Wilson', 'Spalding', 'Nike', 'Adidas', 'Under Armour', 'Coleman', 'North Face', 'Patagonia', 'Columbia', 'REI',
        'OReilly', 'McGraw-Hill', 'Penguin', 'Random House', 'HarperCollins', 'Simon & Schuster', 'Wiley', 'Pearson', 'Cengage', 'Macmillan',
        'Loreal', 'Olay', 'Neutrogena', 'Cetaphil', 'Aveeno', 'Dove', 'Pantene', 'Head & Shoulders', 'Garnier', 'Maybelline',
        'Hasbro', 'Mattel', 'LEGO', 'Ravensburger', 'Monopoly', 'Scrabble', 'Risk', 'Settlers', 'Catan', 'Pictionary',
        'AutoZone', 'Advance Auto', 'NAPA', 'OReilly', 'Pep Boys', 'CarMax', 'AutoNation', 'Carvana', 'Vroom', 'Carvana',
        'Starbucks', 'Dunkin', 'Folgers', 'Maxwell House', 'Twinings', 'Bigelow', 'Celestial Seasonings', 'Tazo', 'Yogi', 'Traditional Medicinals',
        'Tiffany', 'Cartier', 'Rolex', 'Omega', 'Tag Heuer', 'Breitling', 'Patek Philippe', 'Audemars Piguet', 'Vacheron Constantin', 'Jaeger-LeCoultre'
    ]) as brand
) product_data;

-- Insert product inventory
INSERT INTO product_inventory (product_id, quantity, reserved_quantity, warehouse_location)
SELECT 
    p.id,
    (random() * 1000 + 10)::int as quantity,
    (random() * 50)::int as reserved_quantity,
    CASE (random() * 5)::int
        WHEN 0 THEN 'Warehouse A - East Coast'
        WHEN 1 THEN 'Warehouse B - West Coast'
        WHEN 2 THEN 'Warehouse C - Central'
        WHEN 3 THEN 'Warehouse D - South'
        WHEN 4 THEN 'Warehouse E - North'
    END as warehouse_location
FROM products p;

-- Generate orders (approximately 5000 orders over the last year)
INSERT INTO orders (customer_id, order_number, status, total_amount, shipping_address, billing_address, payment_method, payment_status, shipping_cost, tax_amount, discount_amount, created_at, updated_at, shipped_at, delivered_at)
SELECT 
    (random() * 1000 + 1)::int as customer_id,
    'ORD-' || LPAD((random() * 999999)::int::text, 6, '0') as order_number,
    CASE (random() * 100)::int
        WHEN 0 THEN 'cancelled'
        WHEN 1 THEN 'returned'
        WHEN 2 THEN 'refunded'
        WHEN 3 THEN 'pending'
        WHEN 4 THEN 'processing'
        WHEN 5 THEN 'shipped'
        ELSE 'delivered'
    END as status,
    (random() * 500 + 20)::decimal(12,2) as total_amount,
    'Shipping Address ' || (random() * 1000)::int as shipping_address,
    'Billing Address ' || (random() * 1000)::int as billing_address,
    CASE (random() * 4)::int
        WHEN 0 THEN 'credit_card'
        WHEN 1 THEN 'paypal'
        WHEN 2 THEN 'apple_pay'
        ELSE 'google_pay'
    END as payment_method,
    CASE (random() * 10)::int
        WHEN 0 THEN 'failed'
        WHEN 1 THEN 'pending'
        ELSE 'completed'
    END as payment_status,
    (random() * 20 + 5)::decimal(8,2) as shipping_cost,
    (random() * 50 + 5)::decimal(8,2) as tax_amount,
    (random() * 30)::decimal(8,2) as discount_amount,
    CURRENT_TIMESTAMP - (random() * interval '365 days') as created_at,
    CURRENT_TIMESTAMP - (random() * interval '30 days') as updated_at,
    CASE 
        WHEN (random() * 100)::int > 20 THEN CURRENT_TIMESTAMP - (random() * interval '30 days')
        ELSE NULL
    END as shipped_at,
    CASE 
        WHEN (random() * 100)::int > 30 THEN CURRENT_TIMESTAMP - (random() * interval '20 days')
        ELSE NULL
    END as delivered_at
FROM generate_series(1, 5000);

-- Generate order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
SELECT 
    o.id as order_id,
    (random() * (SELECT COUNT(*) FROM products) + 1)::int as product_id,
    (random() * 5 + 1)::int as quantity,
    p.price as unit_price,
    p.price * (random() * 5 + 1)::int as total_price
FROM orders o
CROSS JOIN LATERAL (
    SELECT price FROM products ORDER BY random() LIMIT 1
) p
WHERE (random() * 10)::int < 8; -- 80% chance of having items

-- Generate reviews
INSERT INTO reviews (customer_id, product_id, order_id, rating, title, comment, helpful_votes, created_at)
SELECT 
    o.customer_id,
    oi.product_id,
    o.id as order_id,
    (random() * 5 + 1)::int as rating,
    CASE (random() * 5)::int
        WHEN 0 THEN 'Great product!'
        WHEN 1 THEN 'Highly recommended'
        WHEN 2 THEN 'Good value for money'
        WHEN 3 THEN 'Excellent quality'
        ELSE 'Love it!'
    END as title,
    CASE (random() * 3)::int
        WHEN 0 THEN 'This product exceeded my expectations. Great quality and fast shipping!'
        WHEN 1 THEN 'Good product overall, would buy again.'
        WHEN 2 THEN 'Not bad, but could be better. Decent value for the price.'
    END as comment,
    (random() * 20)::int as helpful_votes,
    o.created_at + (random() * interval '7 days') as created_at
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE (random() * 10)::int < 3; -- 30% chance of having a review

-- Create indexes for better performance
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_customer_id ON reviews(customer_id);

-- Update statistics
ANALYZE;

-- Display summary
SELECT 
    'Categories' as table_name, COUNT(*) as count FROM categories
UNION ALL
SELECT 'Customers', COUNT(*) FROM customers
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Order Items', COUNT(*) FROM order_items
UNION ALL
SELECT 'Reviews', COUNT(*) FROM reviews
UNION ALL
SELECT 'Product Inventory', COUNT(*) FROM product_inventory;
