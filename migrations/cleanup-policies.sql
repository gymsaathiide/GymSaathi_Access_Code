
-- Cleanup script - Run this FIRST in Supabase SQL Editor

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own gym data" ON gyms;
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can view their own members" ON members;
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Users can view their own classes" ON classes;
DROP POLICY IF EXISTS "Users can view their own products" ON products;

-- Disable RLS on all tables to start fresh
ALTER TABLE IF EXISTS gyms DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products DISABLE ROW LEVEL SECURITY;

SELECT 'Cleanup completed successfully' as status;
