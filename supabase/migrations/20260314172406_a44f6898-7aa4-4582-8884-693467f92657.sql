-- Fix #1: Clean up user_reviews SELECT policy (remove OR true)
DROP POLICY IF EXISTS "Users can view relevant reviews" ON public.user_reviews;
CREATE POLICY "Anyone can view reviews" ON public.user_reviews
FOR SELECT TO authenticated USING (true);

-- Fix #5: Add DELETE policy for notifications
CREATE POLICY "Users can delete their own notifications" ON public.notifications
FOR DELETE TO authenticated USING (auth.uid() = user_id);