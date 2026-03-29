import { Shield, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustScoreBadgeProps {
  score: number; // 0-5 scale
  totalReviews: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const getTrustLevel = (score: number) => {
  if (score >= 4.5) return { label: 'Excelente', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40', icon: ShieldCheck };
  if (score >= 3.5) return { label: 'Bom', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/40', icon: ShieldCheck };
  if (score >= 2.5) return { label: 'Regular', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/40', icon: Shield };
  if (score >= 1.5) return { label: 'Baixo', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/40', icon: ShieldAlert };
  return { label: 'Crítico', color: 'text-destructive', bg: 'bg-destructive/10', icon: ShieldX };
};

/**
 * Converts internal trust data into a 0-5 visual score.
 * Formula: weighted average of reputation rating (70%) and participation factor (30%).
 */
export function computeTrustScore5(averageOverall: number, eventsAttended: number, totalReviews: number): number {
  // averageOverall is already 0-5
  const ratingComponent = averageOverall; // 0-5

  // Participation factor: caps at 5 for 20+ events
  const participationComponent = Math.min(eventsAttended / 4, 5);

  // If no reviews yet, rely more on participation
  if (totalReviews === 0) {
    return Math.round(Math.min(participationComponent, 3) * 10) / 10; // cap at 3 without reviews
  }

  const score = ratingComponent * 0.7 + participationComponent * 0.3;
  return Math.round(Math.min(score, 5) * 10) / 10;
}

export const TrustScoreBadge = ({ score, totalReviews, size = 'md', showLabel = true }: TrustScoreBadgeProps) => {
  const level = getTrustLevel(score);
  const Icon = level.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-1.5 text-base gap-2',
  };

  const iconSizes = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-5 h-5' };

  if (totalReviews === 0 && score === 0) {
    return (
      <div className={cn('inline-flex items-center rounded-full font-medium', sizeClasses[size], 'bg-muted text-muted-foreground')}>
        <Shield className={iconSizes[size]} />
        {showLabel && <span>Sem avaliações</span>}
      </div>
    );
  }

  return (
    <div className={cn('inline-flex items-center rounded-full font-semibold', sizeClasses[size], level.bg, level.color)}>
      <Icon className={iconSizes[size]} />
      <span>{score.toFixed(1)}</span>
      {showLabel && <span className="font-normal opacity-80">· {level.label}</span>}
    </div>
  );
};
