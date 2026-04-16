import { Trophy, TrendingUp, Star, Users, MessageSquare, Award } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { type ReputationScoreData, REPUTATION_LEVELS, getReputationLevel } from '@/hooks/useReputationScore';

interface ReputationScoreProps {
  scoreData: ReputationScoreData | undefined;
  loading: boolean;
}

const BREAKDOWN_ITEMS = [
  { key: 'events_attended' as const, label: 'Presença confirmada', points: 10, icon: Users },
  { key: 'positive_reviews' as const, label: 'Avaliação positiva recebida', points: 5, icon: Star },
  { key: 'reviews_given' as const, label: 'Avaliação feita', points: 2, icon: MessageSquare },
  { key: 'events_created' as const, label: 'Evento criado', points: 15, icon: TrendingUp },
  { key: 'achievements' as const, label: 'Badge conquistada', points: 25, icon: Award },
];

export const ReputationScore = ({ scoreData, loading }: ReputationScoreProps) => {
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!scoreData) return null;

  const level = getReputationLevel(scoreData.score);
  const nextLevel = REPUTATION_LEVELS.find(l => l.min > scoreData.score);
  const progressInLevel = nextLevel
    ? ((scoreData.score - level.min) / (nextLevel.min - level.min)) * 100
    : 100;
  const pointsToNext = nextLevel ? nextLevel.min - scoreData.score : 0;

  return (
    <div className="space-y-4 p-4">
      {/* Score Card */}
      <div className={cn('p-5 rounded-2xl text-center space-y-3', level.bg)}>
        <div className="flex items-center justify-center gap-2">
          <Trophy className={cn('w-6 h-6', level.color)} />
          <span className={cn('text-4xl font-bold', level.color)}>{scoreData.score}</span>
        </div>
        <div>
          <span className={cn('text-lg font-semibold', level.color)}>{level.name}</span>
          {nextLevel && (
            <p className="text-xs text-muted-foreground mt-1">
              {pointsToNext} pontos para {nextLevel.name}
            </p>
          )}
        </div>
        <Progress value={progressInLevel} className="h-2" />

        {/* Level bar */}
        <div className="flex justify-between text-[10px] text-muted-foreground/60 px-1">
          {REPUTATION_LEVELS.map(l => (
            <span key={l.name} className={cn(l.name === level.name && 'font-bold text-foreground')}>
              {l.name}
            </span>
          ))}
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Como você ganha pontos</h4>
        {BREAKDOWN_ITEMS.map(item => {
          const count = scoreData[item.key];
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">+{item.points} pts cada</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-foreground">{count * item.points}</span>
                <p className="text-[10px] text-muted-foreground">{count}x</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
