import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';

interface Creator {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface EventCreatorProps {
  creator: Creator;
  currentUser: User | null;
}

export const EventCreator = ({ creator, currentUser }: EventCreatorProps) => {
  const navigate = useNavigate();

  return (
    <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
      <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">Organizador</h3>
      <div 
        className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => {
          if (creator.user_id !== currentUser?.id) {
            navigate(`/user/${creator.user_id}`);
          }
        }}
      >
        {creator.avatar_url ? (
          <img 
            src={creator.avatar_url} 
            alt={creator.full_name}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {creator.full_name?.charAt(0) || 'U'}
            </span>
          </div>
        )}
        <div>
          <p className="font-medium text-foreground text-sm sm:text-base">{creator.full_name}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Criador do evento</p>
        </div>
      </div>
    </div>
  );
};
