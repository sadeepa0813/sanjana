-- ==========================================
-- SUPABASE DATABASE SETUP & UPDATES
-- ==========================================

-- 1. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 2. Update Profiles Table (Add Role & Ban Status)
-- Check if columns exist first to avoid errors (idempotent)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE profiles ADD COLUMN role text DEFAULT 'customer';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_banned') THEN
        ALTER TABLE profiles ADD COLUMN is_banned boolean DEFAULT false;
    END IF;
END $$;

-- 3. RLS POLICIES

-- PROFILES:
-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (except role/ban status - handled via trigger or admin only)
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- Admins can update any profile (Ban/Promote)
CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- PRODUCTS:
-- Everyone can view products
CREATE POLICY "Public can view products" ON products
    FOR SELECT USING (true);

-- Only Admins can insert/update/delete products
CREATE POLICY "Admins can manage products" ON products
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- ORDERS:
-- Users can view their own orders
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own orders
CREATE POLICY "Users can create orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all orders
CREATE POLICY "Admins can view all orders" ON orders
    FOR SELECT USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- Admins can update all orders
CREATE POLICY "Admins can update all orders" ON orders
    FOR UPDATE USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- Admins can delete orders
CREATE POLICY "Admins can delete orders" ON orders
    FOR DELETE USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- 4. Initial Admin User (Optional - Run manually if needed)
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
