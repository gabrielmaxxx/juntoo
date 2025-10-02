-- Remove the conflicting restrictive RLS policy that only allows users to view their own profile
-- This policy conflicts with the broader policy that allows all authenticated users to view profiles
-- Since this is a social events app, authenticated users need to see other users' profiles
-- (event creators, participants, etc.)

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- The remaining policy "Authenticated users can view all profiles" will handle all SELECT operations
-- This provides clear, predictable access control for a social application