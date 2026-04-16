import { motion } from 'framer-motion';
import { Users, MapPin, Calendar } from 'lucide-react';
import { Community } from '../hooks/useCommunities';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface CommunityCardProps {
  community: Community;
  onClick?: (community: Community) => void;
}

export const CommunityCard = ({ community, onClick }: CommunityCardProps) => {
  return (
    <motion.article
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick?.(community)}
      className="bg-card rounded-2xl p-4 cursor-pointer"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center gap-3">
        <Avatar className="w-12 h-12 rounded-xl">
          <AvatarImage src={community.avatar_url || undefined} alt={community.name} />
          <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold">
            {community.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-sm truncate">{community.name}</h3>
            {!community.is_public && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">Privada</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{community.description}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {community.member_count}
            </span>
            {community.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {community.city}
              </span>
            )}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {community.category}
            </Badge>
          </div>
        </div>
      </div>
    </motion.article>
  );
};
