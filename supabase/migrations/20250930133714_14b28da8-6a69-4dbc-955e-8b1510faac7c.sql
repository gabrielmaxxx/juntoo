-- Add foreign key between event_participants and profiles
ALTER TABLE event_participants
ADD CONSTRAINT event_participants_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(user_id) 
ON DELETE CASCADE;

-- Update RLS policy to allow participants to view profiles of other participants
CREATE POLICY "Participants can view other participants profiles"
ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM event_participants ep1
    WHERE ep1.user_id = profiles.user_id
    AND EXISTS (
      SELECT 1 FROM event_participants ep2
      WHERE ep2.event_id = ep1.event_id
      AND ep2.user_id = auth.uid()
    )
  )
);

-- Policy to allow viewing profile of event creators
CREATE POLICY "Users can view event creators profiles"
ON profiles
FOR SELECT
USING (
  user_id IN (
    SELECT created_by FROM events WHERE is_private = false
  )
);