import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';

interface Participant {
  user_id: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface EventParticipantsProps {
  participants: Participant[];
  currentUser: User | null;
}

export const EventParticipants = ({ participants, currentUser }: EventParticipantsProps) => {
  const navigate = useNavigate();

  if (participants.length === 0) return null;

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-3">
        Participantes ({participants.length})
      </h3>
      <div className="flex items-center -space-x-2">
        {participants.slice(0, 5).map((participant, index) => (
          <div 
            key={participant.user_id} 
            className="relative cursor-pointer hover:z-50 hover:scale-110 transition-transform" 
            style={{ zIndex: 5 - index }}
            onClick={() => {
              if (participant.user_id !== currentUser?.id) {
                navigate(`/user/${participant.user_id}`);
              }
            }}
          >
            <div className="w-12 h-12 rounded-full bg-muted border-2 border-background flex items-center justify-center">
              {participant.profiles?.avatar_url ? (
                <img 
                  src={participant.profiles.avatar_url} 
                  alt={participant.profiles.full_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-muted-foreground">
                  {participant.profiles?.full_name?.charAt(0) || 'U'}
                </span>
              )}
            </div>
          </div>
        ))}
        {participants.length > 5 && (
          <div className="w-12 h-12 rounded-full bg-muted border-2 border-background flex items-center justify-center text-sm font-medium text-muted-foreground">
            +{participants.length - 5}
          </div>
        )}
      </div>
    </div>
  );
};
