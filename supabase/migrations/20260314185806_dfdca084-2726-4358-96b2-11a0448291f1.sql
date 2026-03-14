-- Create a security definer function to check conversation membership
-- This avoids recursive RLS issues when direct_messages policies reference conversation_participants
CREATE OR REPLACE FUNCTION public.is_conversation_member(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE user_id = _user_id
      AND conversation_id = _conversation_id
  )
$$;

-- Drop existing INSERT policy on direct_messages
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.direct_messages;

-- Recreate using the security definer function
CREATE POLICY "Users can send messages in their conversations"
ON public.direct_messages
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = sender_id
  AND is_conversation_member(auth.uid(), conversation_id)
);

-- Also fix SELECT policy to avoid the same issue
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.direct_messages;

CREATE POLICY "Users can view messages in their conversations"
ON public.direct_messages
FOR SELECT
TO public
USING (
  is_conversation_member(auth.uid(), conversation_id)
);

-- Also fix UPDATE policy
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.direct_messages;

CREATE POLICY "Users can mark messages as read"
ON public.direct_messages
FOR UPDATE
TO public
USING (
  is_conversation_member(auth.uid(), conversation_id)
);