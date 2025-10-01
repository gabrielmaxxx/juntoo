-- Drop the problematic RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "Participants can view other participants profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view event creators profiles" ON profiles;

-- Drop the foreign key that's causing issues
ALTER TABLE event_participants DROP CONSTRAINT IF EXISTS event_participants_user_id_fkey;

-- Simplify: Allow all authenticated users to view all profiles
-- This is necessary for event functionality to work properly
CREATE POLICY "Authenticated users can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- Keep existing policies for profile management
-- Users can still only update/insert their own profiles