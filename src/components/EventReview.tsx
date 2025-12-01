import { Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventReviewProps {
  review: {
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    user_id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  currentUserId?: string;
  onDelete?: (reviewId: string) => void;
}

export const EventReview = ({ review, currentUserId, onDelete }: EventReviewProps) => {
  const isOwnReview = currentUserId === review.user_id;

  return (
    <div className="border-b border-border/50 pb-4 last:border-0">
      <div className="flex items-start gap-3">
        {review.profiles.avatar_url ? (
          <img 
            src={review.profiles.avatar_url} 
            alt={review.profiles.full_name}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-primary">
              {review.profiles.full_name?.charAt(0) || 'U'}
            </span>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="font-medium text-foreground text-sm">
                {review.profiles.full_name}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= review.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(review.created_at), "d 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
            </div>
            
            {isOwnReview && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(review.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {review.comment && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {review.comment}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
