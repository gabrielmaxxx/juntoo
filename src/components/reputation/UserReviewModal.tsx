import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Participant {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface UserReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  participant: Participant;
  reviewerUserId: string;
  onReviewSubmitted: () => void;
}

const CRITERIA = [
  { key: 'respect', label: 'Respeito', question: 'Essa pessoa foi respeitosa?' },
  { key: 'punctuality', label: 'Pontualidade', question: 'Essa pessoa chegou no horário?' },
  { key: 'reliability', label: 'Confiabilidade', question: 'Essa pessoa realmente compareceu?' },
  { key: 'communication', label: 'Comunicação', question: 'A comunicação foi clara e amigável?' },
  { key: 'safety', label: 'Segurança', question: 'Você se sentiu seguro(a) interagindo?' },
] as const;

type CriteriaKey = typeof CRITERIA[number]['key'];

export const UserReviewModal = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  participant,
  reviewerUserId,
  onReviewSubmitted,
}: UserReviewModalProps) => {
  const [ratings, setRatings] = useState<Record<CriteriaKey, number>>({
    respect: 0,
    punctuality: 0,
    reliability: 0,
    communication: 0,
    safety: 0,
  });
  const [hoveredRatings, setHoveredRatings] = useState<Record<CriteriaKey, number>>({
    respect: 0,
    punctuality: 0,
    reliability: 0,
    communication: 0,
    safety: 0,
  });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const allRated = Object.values(ratings).every((r) => r > 0);

  const handleSubmit = async () => {
    if (!allRated) {
      toast({ title: 'Avaliação incompleta', description: 'Preencha todos os critérios.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('user_reviews').insert({
        reviewer_user_id: reviewerUserId,
        reviewed_user_id: participant.user_id,
        event_id: eventId,
        respect_rating: ratings.respect,
        punctuality_rating: ratings.punctuality,
        reliability_rating: ratings.reliability,
        communication_rating: ratings.communication,
        safety_rating: ratings.safety,
        comment: comment.trim() || null,
      });

      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Já avaliado', description: 'Você já avaliou este participante neste evento.', variant: 'destructive' });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: 'Avaliação enviada!', description: 'Obrigado pelo seu feedback.' });
      onReviewSubmitted();
      onOpenChange(false);
      // Reset
      setRatings({ respect: 0, punctuality: 0, reliability: 0, communication: 0, safety: 0 });
      setComment('');
    } catch (error: any) {
      console.error('Error submitting user review:', error);
      toast({ title: 'Erro ao enviar', description: error.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Avaliar Participante</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
          <Avatar className="w-10 h-10">
            <AvatarImage src={participant.avatar_url || undefined} />
            <AvatarFallback>{participant.full_name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm text-foreground">{participant.full_name}</p>
            <p className="text-xs text-muted-foreground">{eventTitle}</p>
          </div>
        </div>

        <div className="space-y-4 mt-2">
          {CRITERIA.map((criterion) => (
            <div key={criterion.key}>
              <p className="text-sm font-medium text-foreground mb-1">{criterion.label}</p>
              <p className="text-xs text-muted-foreground mb-2">{criterion.question}</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatings((prev) => ({ ...prev, [criterion.key]: star }))}
                    onMouseEnter={() => setHoveredRatings((prev) => ({ ...prev, [criterion.key]: star }))}
                    onMouseLeave={() => setHoveredRatings((prev) => ({ ...prev, [criterion.key]: 0 }))}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= (hoveredRatings[criterion.key] || ratings[criterion.key])
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Deixe um comentário curto sobre sua experiência</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              placeholder="Opcional, até 200 caracteres..."
              className="min-h-[80px] resize-none"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{comment.length}/200</p>
          </div>

          <Button onClick={handleSubmit} disabled={submitting || !allRated} className="w-full">
            {submitting ? 'Enviando...' : 'Enviar Avaliação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
