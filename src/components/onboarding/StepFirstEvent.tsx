import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useOnboarding } from './OnboardingContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { ArrowRight, PartyPopper, Plus, Loader2 } from 'lucide-react';
import { AnimatedCheck } from '@/components/ui/animated-check';
import { motion } from 'framer-motion';
import { Event } from '@/types';
import { CATEGORIES } from '@/constants/categories';

interface StepFirstEventProps {
  onComplete: () => void;
  onEventClick?: (event: Event) => void;
}

export const StepFirstEvent = ({ onComplete, onEventClick }: StepFirstEventProps) => {
  const { data } = useOnboarding();
  const { user, updateProfile, refreshProfile } = useAuthContext();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const interests = data.interests.length > 0 ? data.interests : CATEGORIES as unknown as string[];
      const { data: rows } = await supabase
        .from('events_with_details')
        .select('*')
        .eq('is_private', false)
        .gte('date', new Date().toISOString().split('T')[0])
        .in('category', interests)
        .order('participants_count', { ascending: false })
        .limit(6);

      if (rows) {
        setEvents(rows.map(e => ({
          id: e.id!,
          title: e.title!,
          category: e.category!,
          location: e.location!,
          date: e.date!,
          time: e.time!,
          price: e.price?.toString() || '0',
          description: e.description || '',
          imageUrl: e.image_url || '',
          participantsCount: e.participants_count || 0,
          createdBy: e.created_by!,
          creatorName: e.creator_name || undefined,
          creatorAvatar: e.creator_avatar || undefined,
        })));
      }
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, [data.interests]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleJoin = async (event: Event) => {
    if (!user || joined.has(event.id)) return;
    setJoining(event.id);
    try {
      await supabase.from('event_participants').insert({
        event_id: event.id,
        user_id: user.id,
      });
      setJoined(prev => new Set(prev).add(event.id));
    } catch {
      // Silently fail
    } finally {
      setJoining(null);
    }
  };

  const handleFinish = async () => {
    if (!user) { onComplete(); return; }
    setSaving(true);
    try {
      let avatarUrl = null;
      if (data.avatarFile) {
        const ext = data.avatarFile.name.split('.').pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error } = await supabase.storage.from('avatars').upload(path, data.avatarFile, { upsert: true });
        if (!error) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
          avatarUrl = urlData.publicUrl;
        }
      }

      const city = data.city && data.state ? `${data.city} - ${data.state}` : data.city || '';

      await updateProfile({
        full_name: data.fullName.trim() || 'Usuário',
        interests: data.interests,
        ...(avatarUrl && { avatar_url: avatarUrl }),
        ...(city && { city }),
      });

      await supabase
        .from('profiles')
        .update({ onboarding_completed: true } as any)
        .eq('user_id', user.id);

      await refreshProfile();
    } catch {
      // Complete anyway
    } finally {
      setSaving(false);
      onComplete();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <PartyPopper className="w-10 h-10 text-primary mx-auto" />
        <h2 className="text-xl font-heading font-bold text-foreground">
          Perfeito! Encontramos atividades para você 🎉
        </h2>
        <p className="text-sm text-muted-foreground font-body">
          Participe de um evento e comece a se conectar com pessoas incríveis.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="space-y-2.5 max-h-[38vh] overflow-y-auto pr-1">
          {events.slice(0, 3).map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-3 items-center p-3 rounded-xl border border-border bg-card"
            >
              <button
                onClick={() => { onEventClick?.(event); }}
                className="flex gap-3 items-center flex-1 min-w-0 text-left"
              >
                <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                  {event.imageUrl ? (
                    <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">🎯</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate font-body">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.category} · {event.participantsCount} pessoas</p>
                  <p className="text-xs text-primary font-semibold">{formatDate(event.date)}</p>
                </div>
              </button>
              <Button
                size="sm"
                variant={joined.has(event.id) ? 'outline' : 'default'}
                disabled={joining === event.id}
                onClick={() => handleJoin(event)}
                className="flex-shrink-0 min-w-[80px]"
              >
                {joining === event.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : joined.has(event.id) ? (
                  <span className="flex items-center gap-1"><AnimatedCheck size={14} /> Feito</span>
                ) : (
                  'Participar'
                )}
              </Button>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 space-y-4 px-2">
          <div className="text-5xl" aria-hidden="true">🌱</div>
          <div className="space-y-2">
            <h3 className="text-base font-heading font-bold text-foreground">
              Você está chegando antes de todo mundo!
            </h3>
            <p className="text-sm text-muted-foreground font-body max-w-[300px] mx-auto leading-relaxed">
              O Juntoo está começando em Valença e região. Crie o primeiro evento e mostre o caminho para a comunidade.
            </p>
          </div>
          <Button variant="hero" onClick={handleFinish} className="gap-2">
            <Plus className="w-4 h-4" /> Criar primeira atividade
          </Button>
        </div>
      )}

      <div className="space-y-2 pt-1">
        <Button onClick={handleFinish} className="w-full" variant="hero" disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>Explorar o Juntoo <ArrowRight className="ml-2 w-5 h-5" /></>
          )}
        </Button>
        {joined.size === 0 && events.length > 0 && (
          <p className="text-xs text-center text-muted-foreground font-body">
            💡 Participe de pelo menos 1 evento para começar com tudo!
          </p>
        )}
      </div>
    </div>
  );
};
