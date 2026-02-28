
-- Fix: restrict conversation creation to authenticated users only
DROP POLICY "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix: restrict participant addition - user can only add themselves or be added via the security definer function
DROP POLICY "Authenticated users can add participants" ON public.conversation_participants;
CREATE POLICY "Users can add participants via function"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id OR is_service_role());
