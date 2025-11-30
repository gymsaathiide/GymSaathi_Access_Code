-- Migration: Add multi-gym support for users
-- This allows users to be members/trainers/admins at multiple gyms

-- Create gym_admins table
CREATE TABLE IF NOT EXISTS gym_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(gym_id, user_id)
);

-- Migrate existing admin users to gym_admins table
INSERT INTO gym_admins (gym_id, user_id, created_at)
SELECT gym_id, id, created_at 
FROM users 
WHERE role = 'admin' AND gym_id IS NOT NULL
ON CONFLICT (gym_id, user_id) DO NOTHING;

-- Migrate existing trainer users to trainers table if not already there
INSERT INTO trainers (gym_id, user_id, name, email, phone, created_at)
SELECT u.gym_id, u.id, u.name, u.email, u.phone, u.created_at
FROM users u
WHERE u.role = 'trainer' AND u.gym_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM trainers t WHERE t.user_id = u.id AND t.gym_id = u.gym_id
  )
ON CONFLICT (gym_id, user_id) DO NOTHING;

-- Remove gym_id foreign key constraint from users table
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_gym_id_gyms_id_fk;

-- Remove gym_id column from users table
ALTER TABLE users DROP COLUMN IF EXISTS gym_id;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_gym_admins_user_id ON gym_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_admins_gym_id ON gym_admins(gym_id);
CREATE INDEX IF NOT EXISTS idx_trainers_user_id ON trainers(user_id);
