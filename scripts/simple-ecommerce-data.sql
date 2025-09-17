-- Simple E-commerce Data Insert
-- This script inserts dummy data step by step to avoid constraint issues

-- Clear existing data first
TRUNCATE TABLE order_items, orders, product_inventory, products, categories, customers, reviews RESTART IDENTITY CASCADE;

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

-- Insert customers one by one to avoid duplicate emails
DO $$
DECLARE
    i INTEGER;
    first_names TEXT[] := ARRAY['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Jennifer', 'William', 'Linda', 'James', 'Patricia', 'Richard', 'Mary', 'Charles', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Betty', 'Paul', 'Helen', 'Mark', 'Sandra', 'Donald', 'Donna', 'Steven', 'Carol', 'Andrew', 'Ruth', 'Joshua', 'Sharon', 'Kenneth', 'Michelle', 'Kevin', 'Laura', 'Brian', 'Sarah', 'George', 'Kimberly', 'Timothy', 'Deborah', 'Ronald', 'Dorothy', 'Jason', 'Lisa', 'Edward', 'Nancy', 'Jeffrey', 'Karen', 'Ryan', 'Betty', 'Jacob', 'Helen', 'Gary', 'Sandra', 'Nicholas', 'Donna', 'Eric', 'Carol', 'Jonathan', 'Ruth', 'Stephen', 'Sharon', 'Larry', 'Michelle', 'Justin', 'Laura', 'Scott', 'Sarah', 'Brandon', 'Kimberly', 'Benjamin', 'Deborah', 'Samuel', 'Dorothy', 'Gregory', 'Lisa', 'Alexander', 'Nancy', 'Patrick', 'Karen', 'Jack', 'Betty', 'Dennis', 'Helen', 'Jerry', 'Sandra', 'Tyler', 'Donna', 'Aaron', 'Carol', 'Jose', 'Ruth', 'Henry', 'Sharon', 'Adam', 'Michelle', 'Douglas', 'Laura', 'Nathan', 'Sarah', 'Peter', 'Kimberly', 'Zachary', 'Deborah', 'Kyle', 'Dorothy', 'Noah', 'Lisa', 'Alan', 'Nancy', 'Jeremy', 'Karen', 'Ethan', 'Betty', 'Wayne', 'Helen', 'Ralph', 'Sandra', 'Roy', 'Donna', 'Eugene', 'Carol', 'Louis', 'Ruth', 'Philip', 'Sharon', 'Bobby', 'Michelle', 'Johnny', 'Laura', 'Lawrence', 'Sarah'];
    last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez'];
    cities TEXT[] := ARRAY['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington'];
    states TEXT[] := ARRAY['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
BEGIN
    FOR i IN 1..1000 LOOP
        INSERT INTO customers (first_name, last_name, email, phone, address, city, state, country, postal_code, created_at, last_login)
        VALUES (
            first_names[1 + (i-1) % array_length(first_names, 1)],
            last_names[1 + (i-1) % array_length(last_names, 1)],
            LOWER(first_names[1 + (i-1) % array_length(first_names, 1)] || '.' || last_names[1 + (i-1) % array_length(last_names, 1)] || i || '@example.com'),
            '+1-' || LPAD((random() * 9999999999)::bigint::text, 10, '0'),
            (random() * 1000)::int || ' ' || 
            CASE (random() * 5)::int
                WHEN 0 THEN 'Main St'
                WHEN 1 THEN 'Oak Ave'
                WHEN 2 THEN 'Pine Rd'
                WHEN 3 THEN 'Elm St'
                WHEN 4 THEN 'Cedar Ln'
            END,
            cities[1 + (random() * array_length(cities, 1))::int % array_length(cities, 1)],
            states[1 + (random() * array_length(states, 1))::int % array_length(states, 1)],
            'USA',
            LPAD((random() * 99999)::int::text, 5, '0'),
            CURRENT_TIMESTAMP - (random() * interval '365 days'),
            CURRENT_TIMESTAMP - (random() * interval '30 days')
        );
    END LOOP;
END $$;

-- Insert products
INSERT INTO products (name, description, price, category_id, sku, brand, weight, dimensions)
SELECT 
    product_names.name,
    'High-quality product with excellent features and durability' as description,
    (random() * 500 + 10)::decimal(10,2) as price,
    (random() * 10 + 1)::int as category_id,
    'SKU-' || LPAD(i::text, 6, '0') as sku,
    brands.brand,
    (random() * 10 + 0.1)::decimal(8,2) as weight,
    (random() * 20 + 5)::int || 'x' || (random() * 15 + 3)::int || 'x' || (random() * 10 + 2)::int || ' inches' as dimensions
FROM 
    (SELECT unnest(ARRAY[
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
    ]) as name
) product_names,
    (SELECT unnest(ARRAY[
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
    ]) as brand) brands,
    generate_series(1, 100) as i;

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

-- Insert orders
INSERT INTO orders (customer_id, order_number, status, total_amount, shipping_address, billing_address, payment_method, payment_status, shipping_cost, tax_amount, discount_amount, created_at, updated_at, shipped_at, delivered_at)
SELECT 
    (random() * 1000 + 1)::int as customer_id,
    'ORD-' || LPAD(i::text, 6, '0') as order_number,
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
    'Shipping Address ' || i as shipping_address,
    'Billing Address ' || i as billing_address,
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
FROM generate_series(1, 5000) as i;

-- Insert order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
SELECT 
    o.id as order_id,
    (random() * 100 + 1)::int as product_id,
    (random() * 5 + 1)::int as quantity,
    p.price as unit_price,
    p.price * (random() * 5 + 1)::int as total_price
FROM orders o
CROSS JOIN LATERAL (
    SELECT price FROM products ORDER BY random() LIMIT 1
) p
WHERE (random() * 10)::int < 8; -- 80% chance of having items

-- Insert reviews
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
