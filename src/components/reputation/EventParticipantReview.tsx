import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserReviewModal } from './UserReviewModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

interface Participant {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface EventParticipantReviewProps {
  eventId: string;
  eventTitle: string;
  participants: Participant[];
  isEventCompleted: boolean;
  isParticipating: boolean;
}

export const EventParticipantReview = ({
  eventId,
  eventTitle,
  participants,
  isEventCompleted,
  isParticipating,
}: EventParticipantReviewProps) => {
  const { user } = useAuthContext();
  const [reviewedUserIds, setReviewedUserIds] = useState<Set<string>>(new Set());
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  useEffect(() => {
    if (!user || !isEventCompleted) return;
    fetchExistingReviews();
  }, [user, eventId, isEventCompleted]);

  const fetchExistingReviews = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_reviews')
      .select('reviewed_user_id')
      .eq('reviewer_user_id', user.id)
      .eq('event_id', eventId);

    if (data) {
      setReviewedUserIds(new Set(data.map((r: any) => r.reviewed_user_id)));
    }
  };

  if (!isEventCompleted || !isParticipating || !user) return null;

  const reviewableParticipants = participants.filter(
    (p) => p.user_id !== user.id
  );

  if (reviewableParticipants.length === 0) return null;

  const unreviewedCount = reviewableParticipants.filter(
    (p) => !reviewedUserIds.has(p.user_id)
  ).length;

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Avaliar Participantes
          </CardTitle>
          {unreviewedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Como foi sua experiência com os participantes deste evento?
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {reviewableParticipants.map((participant) => {
            const alreadyReviewed = reviewedUserIds.has(participant.user_id);
            return (
              <div key={participant.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={participant.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{participant.full_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground flex-1 truncate">{participant.full_name}</span>
                {alreadyReviewed ? (
                  <span className="text-xs text-muted-foreground">✓ Avaliado</span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedParticipant(participant)}
                  >
                    Avaliar
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {selectedParticipant && user && (
        <UserReviewModal
          open={!!selectedParticipant}
          onOpenChange={(open) => !open && setSelectedParticipant(null)}
          eventId={eventId}
          eventTitle={eventTitle}
          participant={selectedParticipant}
          reviewerUserId={user.id}
          onReviewSubmitted={fetchExistingReviews}
        />
      )}
    </>
  );
};
