import { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, Check, ArrowRight, ArrowLeft, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AnimatedCheck } from '@/components/ui/animated-check';

interface Participant {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface PostEventReviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  participants: Participant[];
  currentUserId: string;
  onComplete: () => void;
}

type Reaction = '🔥' | '👍' | '😐';
type ParticipantBadge = 'punctual' | 'animated' | 'communicative' | 'disappeared';

const REACTIONS: { emoji: Reaction; label: string }[] = [
  { emoji: '🔥', label: 'Incrível' },
  { emoji: '👍', label: 'Foi bem' },
  { emoji: '😐', label: 'Meh' },
];

const PARTICIPANT_BADGES: { id: ParticipantBadge; emoji: string; label: string }[] = [
  { id: 'punctual', emoji: '✅', label: 'Pontual' },
  { id: 'animated', emoji: '🎉', label: 'Animado' },
  { id: 'communicative', emoji: '💬', label: 'Comunicativo' },
  { id: 'disappeared', emoji: '❌', label: 'Desapareceu' },
];

export const PostEventReview = ({
  open, onOpenChange, eventId, eventTitle, participants, currentUserId, onComplete,
}: PostEventReviewProps) => {
  const [step, setStep] = useState(0);
  const [eventRating, setEventRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [participantRatings, setParticipantRatings] = useState<Record<string, { positive: boolean; badges: ParticipantBadge[] }>>({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  const otherParticipants = participants.filter(p => p.user_id !== currentUserId);

  const toggleParticipantPositive = (userId: string, positive: boolean) => {
    setParticipantRatings(prev => ({
      ...prev,
      [userId]: { ...prev[userId], positive, badges: prev[userId]?.badges || [] },
    }));
  };

  const toggleBadge = (userId: string, badge: ParticipantBadge) => {
    setParticipantRatings(prev => {
      const current = prev[userId] || { positive: true, badges: [] };
      const badges = current.badges.includes(badge)
        ? current.badges.filter(b => b !== badge)
        : [...current.badges, badge];
      return { ...prev, [userId]: { ...current, badges } };
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Submit event review
      if (eventRating > 0) {
        await supabase.from('event_reviews').insert({
          event_id: eventId,
          user_id: currentUserId,
          rating: eventRating,
          comment: comment || null,
        });
      }

      // Submit participant reviews
      let points = eventRating > 0 ? 2 : 0; // points for giving review
      for (const [userId, data] of Object.entries(participantRatings)) {
        const overallRating = data.positive ? 4 : 2;
        await supabase.from('user_reviews').insert({
          event_id: eventId,
          reviewer_user_id: currentUserId,
          reviewed_user_id: userId,
          respect_rating: overallRating,
          punctuality_rating: data.badges.includes('punctual') ? 5 : overallRating,
          reliability_rating: data.badges.includes('disappeared') ? 1 : overallRating,
          communication_rating: data.badges.includes('communicative') ? 5 : overallRating,
          safety_rating: overallRating,
          overall_rating: overallRating,
          comment: null,
        });
        points += 2;
      }

      // Check achievements
      await supabase.rpc('check_and_grant_achievements', { p_user_id: currentUserId });

      setPointsEarned(points);
      setStep(3);
      toast.success('Avaliação enviada!');
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.error('Você já avaliou este evento');
      } else {
        toast.error('Erro ao enviar avaliação');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canAdvance = () => {
    if (step === 0) return eventRating > 0;
    if (step === 1) return true;
    if (step === 2) return true;
    return true;
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6 text-center">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Como foi {eventTitle}?</h3>
              <p className="text-sm text-muted-foreground mt-1">Avalie sua experiência</p>
            </div>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => setEventRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star className={cn('w-10 h-10 transition-colors',
                    star <= (hoveredStar || eventRating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground/30'
                  )} />
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-3">
              {REACTIONS.map(r => (
                <button
                  key={r.emoji}
                  onClick={() => setReaction(r.emoji)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
                    reaction === r.emoji
                      ? 'border-primary bg-primary/10 scale-105'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span className="text-2xl">{r.emoji}</span>
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">Como foram os participantes?</h3>
              <p className="text-sm text-muted-foreground mt-1">Avalie quem participou com você</p>
            </div>
            {otherParticipants.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-6">Nenhum outro participante para avaliar</p>
            ) : (
              <div className="space-y-3 max-h-[45vh] overflow-y-auto">
                {otherParticipants.map(p => {
                  const rating = participantRatings[p.user_id];
                  return (
                    <div key={p.user_id} className="p-3 rounded-xl bg-muted/30 space-y-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={p.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{p.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium flex-1">{p.full_name}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => toggleParticipantPositive(p.user_id, true)}
                            className={cn('p-2 rounded-lg transition-colors',
                              rating?.positive === true ? 'bg-green-100 dark:bg-green-900/40 text-green-600' : 'text-muted-foreground hover:bg-muted'
                            )}
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleParticipantPositive(p.user_id, false)}
                            className={cn('p-2 rounded-lg transition-colors',
                              rating?.positive === false ? 'bg-red-100 dark:bg-red-900/40 text-red-600' : 'text-muted-foreground hover:bg-muted'
                            )}
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {rating && (
                        <div className="flex flex-wrap gap-1.5">
                          {PARTICIPANT_BADGES.map(b => (
                            <button
                              key={b.id}
                              onClick={() => toggleBadge(p.user_id, b.id)}
                              className={cn('text-xs px-2 py-1 rounded-full border transition-colors',
                                rating.badges.includes(b.id)
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border text-muted-foreground hover:border-primary/50'
                              )}
                            >
                              {b.emoji} {b.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4 text-center">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Quer deixar um comentário?</h3>
              <p className="text-sm text-muted-foreground mt-1">Opcional · máx. 200 caracteres</p>
            </div>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value.slice(0, 200))}
              placeholder="Conte como foi a experiência..."
              className="min-h-[100px] resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{comment.length}/200</p>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 text-center py-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <AnimatedCheck className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Obrigado pela avaliação!</h3>
              <p className="text-muted-foreground mt-1">Sua opinião ajuda a comunidade</p>
            </div>
            {pointsEarned > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-semibold">
                <Trophy className="w-5 h-5" />
                +{pointsEarned} pontos de reputação!
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Avaliação pós-evento</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        {step < 3 && (
          <div className="flex gap-1.5 mb-2">
            {[0, 1, 2].map(s => (
              <div key={s} className={cn('h-1 flex-1 rounded-full transition-colors',
                s <= step ? 'bg-primary' : 'bg-muted'
              )} />
            ))}
          </div>
        )}

        {renderStep()}

        {/* Navigation */}
        <div className="flex gap-2 mt-4">
          {step > 0 && step < 3 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
          )}
          {step < 2 && (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()} className="flex-1">
              Próximo <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={handleSubmit} loading={submitting} className="flex-1">
              Enviar avaliação <Check className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={() => { onOpenChange(false); onComplete(); }} className="flex-1">
              Fechar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
