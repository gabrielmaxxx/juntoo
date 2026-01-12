import { Star } from 'lucide-react';
import { EventReview } from '@/components/EventReview';
import { EventReviewForm } from '@/components/EventReviewForm';
import { User } from '@supabase/supabase-js';

interface Review {
  id: string;
  user_id: string;
  event_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface EventReviewsSectionProps {
  eventId: string;
  reviews: Review[];
  averageRating: number | null;
  isEventCompleted: boolean;
  isParticipating: boolean;
  userHasReviewed: boolean;
  currentUser: User | null;
  onReviewSubmitted: () => void;
  onDeleteReview: (reviewId: string) => void;
}

export const EventReviewsSection = ({
  eventId,
  reviews,
  averageRating,
  isEventCompleted,
  isParticipating,
  userHasReviewed,
  currentUser,
  onReviewSubmitted,
  onDeleteReview,
}: EventReviewsSectionProps) => {
  return (
    <div className="border-t border-border/50 pt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground text-base sm:text-lg">Avaliações</h3>
          {averageRating !== null && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {averageRating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Review Form */}
      {isEventCompleted && isParticipating && !userHasReviewed && currentUser && (
        <div className="mb-6">
          <EventReviewForm
            eventId={eventId}
            userId={currentUser.id}
            onReviewSubmitted={onReviewSubmitted}
          />
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-8 bg-muted/20 rounded-lg">
          <Star className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {isEventCompleted 
              ? 'Seja o primeiro a avaliar este evento!'
              : 'As avaliações estarão disponíveis após o evento.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <EventReview
              key={review.id}
              review={review}
              currentUserId={currentUser?.id}
              onDelete={onDeleteReview}
            />
          ))}
        </div>
      )}
    </div>
  );
};
