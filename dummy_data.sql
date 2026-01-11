-- ==========================================
-- DUMMY DATA POPULATION SCRIPT
-- Context: Sri Lankan Electronics Store
-- ==========================================

-- 1. Insert Products
INSERT INTO public.products (name, description, price_lkr, stock, category, image_url)
VALUES 
  (
    'Sony WH-1000XM5 Wireless Headphones', 
    'Industry-leading noise canceling with two processors controlling 8 microphones for unprecedented noise cancellation.', 
    125000.00, 
    15, 
    'Audio', 
    'https://placehold.co/600x400?text=Sony+XM5'
  ),
  (
    'Apple Watch Series 9', 
    'Advanced health sensors and apps, so you can take an ECG, measure heart rate and blood oxygen.', 
    145000.00, 
    10, 
    'Wearables', 
    'https://placehold.co/600x400?text=Apple+Watch+9'
  ),
  (
    'JBL Flip 6 Portable Speaker', 
    'Bold JBL Original Pro Sound with 2-way speaker system for crystal clear, powerful sound.', 
    42500.00, 
    25, 
    'Audio', 
    'https://placehold.co/600x400?text=JBL+Flip+6'
  ),
  (
    'Anker PowerCore 20000mAh', 
    'Ultra-high capacity portable charger with PowerIQ technology for high-speed charging.', 
    18500.00, 
    50, 
    'Accessories', 
    'https://placehold.co/600x400?text=Anker+PowerBank'
  ),
  (
    'Logitech MX Master 3S Mouse', 
    'Performance wireless mouse with ultra-fast scrolling and 8K DPI any-surface tracking.', 
    38000.00, 
    20, 
    'Accessories', 
    'https://placehold.co/600x400?text=MX+Master+3S'
  ),
  (
    'Samsung 27" Curved Monitor', 
    'Immersive viewing experience with 1800R curvature and Game Mode technology.', 
    65000.00, 
    8, 
    'Electronics', 
    'https://placehold.co/600x400?text=Samsung+Curved'
  );

-- 2. Insert Coupons
INSERT INTO public.coupons (code, discount_percent, active, expiry_date)
VALUES 
  ('WELCOME10', 10, true, NOW() + INTERVAL '30 days'),
  ('LANKA25', 25, true, NOW() + INTERVAL '7 days'),
  ('FREESHIP', 100, true, NOW() + INTERVAL '365 days');

-- 3. Insert Reviews
-- NOTE: 'user_id' must be a valid UUID from your auth.users table. 
-- Replace 'PLACEHOLDER_USER_ID' with a real user ID from your Authentication > Users table.

-- Example assuming products were inserted sequentially with IDs 1, 2, 3...
-- If you have a specific user ID, uncomment and run the block below:

/*
INSERT INTO public.reviews (user_id, product_id, rating, comment)
VALUES
  (
    'PLACEHOLDER_USER_ID', -- Replace this!
    (SELECT id FROM products WHERE name = 'Sony WH-1000XM5 Wireless Headphones' LIMIT 1),
    5, 
    'Best headphones I have ever owned! Noise cancellation is top tier.'
  ),
  (
    'PLACEHOLDER_USER_ID', -- Replace this!
    (SELECT id FROM products WHERE name = 'JBL Flip 6 Portable Speaker' LIMIT 1),
    4, 
    'Great sound for the size, but battery life could be better.'
  ),
  (
    'PLACEHOLDER_USER_ID', -- Replace this!
    (SELECT id FROM products WHERE name = 'Anker PowerCore 20000mAh' LIMIT 1),
    5, 
    'Super fast delivery to Kandy. Genuine product.'
  );
*/
