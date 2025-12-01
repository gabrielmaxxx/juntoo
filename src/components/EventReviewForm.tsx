import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EventReviewFormProps {
  eventId: string;
  userId: string;
  onReviewSubmitted: () => void;
}

export const EventReviewForm = ({ eventId, userId, onReviewSubmitted }: EventReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast({
        title: 'Avaliação incompleta',
        description: 'Por favor, selecione uma classificação.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('event_reviews')
        .insert({
          event_id: eventId,
          user_id: userId,
          rating,
          comment: comment.trim() || null
        });

      if (error) throw error;

      toast({
        title: 'Avaliação enviada!',
        description: 'Obrigado pelo seu feedback.'
      });

      setRating(0);
      setComment('');
      onReviewSubmitted();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Erro ao enviar avaliação',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-muted/30 rounded-lg p-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">Sua avaliação</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hoveredRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="comment" className="text-sm font-medium mb-2 block">
          Comentário (opcional)
        </Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Compartilhe sua experiência no evento..."
          className="min-h-[100px] resize-none"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {comment.length}/500
        </p>
      </div>

      <Button 
        type="submit" 
        disabled={submitting || rating === 0}
        className="w-full"
      >
        {submitting ? 'Enviando...' : 'Enviar Avaliação'}
      </Button>
    </form>
  );
};
