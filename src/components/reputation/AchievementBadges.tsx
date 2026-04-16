import { Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { type Achievement, BADGE_DEFINITIONS } from '@/hooks/useReputationScore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AchievementBadgesProps {
  achievements: Achievement[];
  loading: boolean;
}

export const AchievementBadges = ({ achievements, loading }: AchievementBadgesProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const unlockedIds = new Set(achievements.map(a => a.badge_id));
  const getUnlockDate = (badgeId: string) => {
    const a = achievements.find(a => a.badge_id === badgeId);
    return a ? formatDistanceToNow(new Date(a.unlocked_at), { addSuffix: true, locale: ptBR }) : null;
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Conquistas</h4>
        <span className="text-xs text-muted-foreground">
          {achievements.length}/{BADGE_DEFINITIONS.length}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {BADGE_DEFINITIONS.map(badge => {
          const unlocked = unlockedIds.has(badge.id);
          const unlockDate = getUnlockDate(badge.id);

          return (
            <div
              key={badge.id}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all',
                unlocked
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-border bg-muted/20 opacity-50'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-xl',
                unlocked ? 'bg-primary/10' : 'bg-muted'
              )}>
                {unlocked ? badge.icon : <Lock className="w-4 h-4 text-muted-foreground" />}
              </div>
              <span className={cn('text-xs font-medium leading-tight',
                unlocked ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {badge.name}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                {unlocked ? unlockDate : badge.hint}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
