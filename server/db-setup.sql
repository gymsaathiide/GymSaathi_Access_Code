-- Database setup script for attendance state machine
-- This script should be run after Drizzle schema push to add constraints not supported by Drizzle ORM

-- Enforce single active attendance session per member per gym
-- This prevents race conditions in check-in/out operations
CREATE UNIQUE INDEX IF NOT EXISTS attendance_unique_open_session 
ON attendance (gym_id, member_id) 
WHERE status = 'in' AND check_out_time IS NULL;
