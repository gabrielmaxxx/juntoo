-- Enums
DO $$ BEGIN
  CREATE TYPE public.community_member_role AS ENUM ('admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.community_recurrence AS ENUM ('weekly', 'biweekly', 'monthly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Communities table
CREATE TABLE public.communities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  city TEXT,
  avatar_url TEXT,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_count INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  rules TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_communities_city ON public.communities (city);
CREATE INDEX idx_communities_category ON public.communities (category);
CREATE INDEX idx_communities_public ON public.communities (is_public) WHERE is_public = true;

-- Community members table
CREATE TABLE public.community_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role community_member_role NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);

CREATE INDEX idx_community_members_user ON public.community_members (user_id);
CREATE INDEX idx_community_members_community ON public.community_members (community_id);

-- Community messages table
CREATE TABLE public.community_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_community_messages_community ON public.community_messages (community_id, created_at DESC);

-- Recurring community events table
CREATE TABLE public.recurring_community_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  recurrence community_recurrence NOT NULL DEFAULT 'weekly',
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  category TEXT NOT NULL,
  max_participants INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- SECURITY DEFINER helper functions (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_community_admin(p_community_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = p_community_id
      AND user_id = p_user_id
      AND role = 'admin'
      AND status = 'approved'
  ) OR EXISTS (
    SELECT 1 FROM public.communities
    WHERE id = p_community_id
      AND creator_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_community_member(p_community_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = p_community_id
      AND user_id = p_user_id
      AND status = 'approved'
  );
$$;

-- RLS: communities
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public communities"
  ON public.communities FOR SELECT
  TO authenticated
  USING (is_public = true OR public.is_community_member(id, auth.uid()) OR creator_id = auth.uid());

CREATE POLICY "Authenticated users can create communities"
  ON public.communities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creator or admin can update community"
  ON public.communities FOR UPDATE
  TO authenticated
  USING (public.is_community_admin(id, auth.uid()));

CREATE POLICY "Creator can delete community"
  ON public.communities FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- RLS: community_members
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members visible to community members and public"
  ON public.community_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join communities"
  ON public.community_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave or admin can update"
  ON public.community_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_community_admin(community_id, auth.uid()));

CREATE POLICY "Users can leave or admin can remove"
  ON public.community_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_community_admin(community_id, auth.uid()));

-- RLS: community_messages
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view community messages"
  ON public.community_messages FOR SELECT
  TO authenticated
  USING (public.is_community_member(community_id, auth.uid()));

CREATE POLICY "Members can send messages"
  ON public.community_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_community_member(community_id, auth.uid()));

CREATE POLICY "Users can delete own messages"
  ON public.community_messages FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS: recurring_community_events
ALTER TABLE public.recurring_community_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view recurring events"
  ON public.recurring_community_events FOR SELECT
  TO authenticated
  USING (public.is_community_member(community_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.communities WHERE id = community_id AND is_public = true));

CREATE POLICY "Admins can manage recurring events"
  ON public.recurring_community_events FOR INSERT
  TO authenticated
  WITH CHECK (public.is_community_admin(community_id, auth.uid()));

CREATE POLICY "Admins can update recurring events"
  ON public.recurring_community_events FOR UPDATE
  TO authenticated
  USING (public.is_community_admin(community_id, auth.uid()));

CREATE POLICY "Admins can delete recurring events"
  ON public.recurring_community_events FOR DELETE
  TO authenticated
  USING (public.is_community_admin(community_id, auth.uid()));

-- Trigger: auto-add creator as admin member
CREATE OR REPLACE FUNCTION public.auto_add_community_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.community_members (community_id, user_id, role, status)
  VALUES (NEW.id, NEW.creator_id, 'admin', 'approved');
  NEW.member_count := 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_add_community_creator
  BEFORE INSERT ON public.communities
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_community_creator();

-- Trigger: update member_count on join/leave
CREATE OR REPLACE FUNCTION public.update_community_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
    UPDATE public.communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'approved' THEN
    UPDATE public.communities SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.community_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
      UPDATE public.communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
    ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
      UPDATE public.communities SET member_count = GREATEST(0, member_count - 1) WHERE id = NEW.community_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_community_member_count
  AFTER INSERT OR UPDATE OR DELETE ON public.community_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_community_member_count();