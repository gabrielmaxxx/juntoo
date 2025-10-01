-- Remove ALL existing policies from event_participants to start fresh
DROP POLICY IF EXISTS "Event creators can view participants" ON event_participants;
DROP POLICY IF EXISTS "Participants can view other participants" ON event_participants;
DROP POLICY IF EXISTS "Users can join events" ON event_participants;
DROP POLICY IF EXISTS "Users can leave events" ON event_participants;

-- Simple policy: authenticated users can view all participants (no recursion)
CREATE POLICY "Authenticated users can view participants"
ON event_participants
FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own participation
CREATE POLICY "Users can join events"
ON event_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own participation
CREATE POLICY "Users can leave events"
ON event_participants
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);