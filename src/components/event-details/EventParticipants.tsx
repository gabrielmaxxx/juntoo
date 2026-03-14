import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { Users } from 'lucide-react';

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
    <div className="bg-card rounded-2xl p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" aria-hidden="true" />
          Participantes
        </h3>
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          {participants.length}
        </span>
      </div>
      <div className="flex items-center -space-x-2.5">
        {participants.slice(0, 6).map((participant, index) => (
          <div 
            key={participant.user_id} 
            className="relative cursor-pointer hover:z-50 hover:scale-110 transition-all duration-200" 
            style={{ zIndex: 6 - index }}
            onClick={() => {
              if (participant.user_id !== currentUser?.id) {
                navigate(`/user/${participant.user_id}`);
              }
            }}
          >
            <div className="w-11 h-11 rounded-full bg-muted border-[2.5px] border-background flex items-center justify-center overflow-hidden">
              {participant.profiles?.avatar_url ? (
                <img 
                  src={participant.profiles.avatar_url} 
                  alt={participant.profiles.full_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">
                  {participant.profiles?.full_name?.charAt(0) || 'U'}
                </span>
              )}
            </div>
          </div>
        ))}
        {participants.length > 6 && (
          <div className="w-11 h-11 rounded-full bg-primary/10 border-[2.5px] border-background flex items-center justify-center text-xs font-bold text-primary" style={{ zIndex: 0 }}>
            +{participants.length - 6}
          </div>
        )}
      </div>
    </div>
  );
};
