import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { Users, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

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
  createdBy?: string;
}

export const EventParticipants = ({ participants, currentUser, createdBy }: EventParticipantsProps) => {
  const navigate = useNavigate();

  const socialProof = useMemo(() => {
    const count = participants.length;
    if (count === 0) return null;
    
    // Find named participants (not current user)
    const others = participants.filter(p => p.user_id !== currentUser?.id);
    const firstName = others[0]?.profiles?.full_name?.split(' ')[0];
    
    if (count === 1 && firstName) return `${firstName} confirmou presença`;
    if (count <= 3 && firstName) return `${firstName} e mais ${count - 1} ${count - 1 === 1 ? 'pessoa' : 'pessoas'} vão`;
    if (firstName) return `${firstName} e mais ${count - 1} pessoas confirmaram`;
    return `${count} ${count === 1 ? 'pessoa confirmou' : 'pessoas confirmaram'} presença`;
  }, [participants, currentUser]);

  const milestoneMessage = useMemo(() => {
    const count = participants.length;
    if (count >= 50) return '🔥 Evento lotado! Mais de 50 pessoas vão!';
    if (count >= 25) return '🚀 Evento popular! 25+ pessoas confirmaram!';
    if (count >= 10) return '✨ Esse evento está ganhando destaque!';
    return null;
  }, [participants.length]);

  const isCreator = currentUser?.id === createdBy;

  if (participants.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl p-4 space-y-3" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" aria-hidden="true" />
          Participantes
        </h3>
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          {participants.length}
        </span>
      </div>

      {/* Social proof message */}
      {socialProof && (
        <p className="text-xs text-muted-foreground">
          {socialProof}
        </p>
      )}

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

      {/* Milestone message for creator */}
      {isCreator && milestoneMessage && (
        <div className="flex items-center gap-2 bg-primary/5 rounded-xl px-3 py-2 mt-1">
          <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
          <p className="text-xs font-medium text-primary">{milestoneMessage}</p>
        </div>
      )}
    </div>
  );
};
