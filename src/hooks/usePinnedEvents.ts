import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePinnedEvents = () => {
  const [pinnedEventIds, setPinnedEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPinnedEvents();
  }, []);

  const fetchPinnedEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('pinned_events')
        .select('event_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setPinnedEventIds(data?.map(p => p.event_id) || []);
    } catch (error) {
      console.error('Error fetching pinned events:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePin = async (eventId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const isPinned = pinnedEventIds.includes(eventId);

      if (isPinned) {
        const { error } = await supabase
          .from('pinned_events')
          .delete()
          .eq('user_id', user.id)
          .eq('event_id', eventId);

        if (error) throw error;
        setPinnedEventIds(prev => prev.filter(id => id !== eventId));
      } else {
        const { error } = await supabase
          .from('pinned_events')
          .insert({ user_id: user.id, event_id: eventId });

        if (error) throw error;
        setPinnedEventIds(prev => [...prev, eventId]);
      }
      return true;
    } catch (error) {
      console.error('Error toggling pin:', error);
      return false;
    }
  };

  const isPinned = (eventId: string) => pinnedEventIds.includes(eventId);

  return { pinnedEventIds, loading, togglePin, isPinned, refetch: fetchPinnedEvents };
};
