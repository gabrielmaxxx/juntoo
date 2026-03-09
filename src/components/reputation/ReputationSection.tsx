import { Star, Shield, Clock, Users, MessageCircle, TrendingUp, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReputationStats, UserReview, Badge as BadgeType } from '@/hooks/useUserReputation';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReputationSectionProps {
  stats: ReputationStats | undefined;
  reviews: UserReview[];
  badges: BadgeType[];
  loading: boolean;
}

const CRITERIA_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  respect: { label: 'Respeito', icon: <Shield className="w-3.5 h-3.5" /> },
  punctuality: { label: 'Pontualidade', icon: <Clock className="w-3.5 h-3.5" /> },
  reliability: { label: 'Confiabilidade', icon: <Users className="w-3.5 h-3.5" /> },
  communication: { label: 'Comunicação', icon: <MessageCircle className="w-3.5 h-3.5" /> },
  safety: { label: 'Segurança', icon: <Shield className="w-3.5 h-3.5" /> },
};

export const ReputationSection = ({ stats, reviews, badges, loading }: ReputationSectionProps) => {
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!stats) return null;

  const criteriaData = [
    { key: 'respect', value: stats.average_respect },
    { key: 'punctuality', value: stats.average_punctuality },
    { key: 'reliability', value: stats.average_reliability },
    { key: 'communication', value: stats.average_communication },
    { key: 'safety', value: stats.average_safety },
  ];

  return (
    <div className="space-y-5 p-4">
      {/* Overall Score */}
      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
        <div className="text-center">
          <p className="text-3xl font-bold text-foreground">
            {stats.total_reviews > 0 ? stats.average_overall : '—'}
          </p>
          <div className="flex gap-0.5 justify-center mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(stats.average_overall)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.total_reviews} {stats.total_reviews === 1 ? 'avaliação' : 'avaliações'}
          </p>
        </div>
        <div className="flex-1 space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Taxa de presença
            </span>
            <span className="font-medium text-foreground">{stats.attendance_rate}%</span>
          </div>
          <Progress value={stats.attendance_rate} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{stats.events_attended} presentes</span>
            <span>{stats.events_joined} inscritos</span>
          </div>
        </div>
      </div>

      {/* Criteria Breakdown */}
      {stats.total_reviews > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Avaliações por critério</h4>
          {criteriaData.map((c) => {
            const info = CRITERIA_LABELS[c.key];
            return (
              <div key={c.key} className="flex items-center gap-2">
                <span className="text-muted-foreground">{info.icon}</span>
                <span className="text-xs text-muted-foreground w-28">{info.label}</span>
                <Progress value={(c.value / 5) * 100} className="h-2 flex-1" />
                <span className="text-xs font-medium text-foreground w-8 text-right">{c.value > 0 ? c.value.toFixed(1) : '—'}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Award className="w-4 h-4" /> Conquistas
          </h4>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Badge key={badge.id} className={`${badge.color} text-xs gap-1`}>
                <span>{badge.icon}</span>
                {badge.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Recent Reviews */}
      {reviews.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Avaliações recentes</h4>
          <div className="space-y-3">
            {reviews.slice(0, 5).map((review) => (
              <div key={review.id} className="p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1.5">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={review.reviewer_profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {review.reviewer_profile?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-foreground">{review.reviewer_profile?.full_name}</span>
                  <div className="flex gap-0.5 ml-auto">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s <= Math.round(review.overall_rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-xs text-muted-foreground">{review.comment}</p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {review.event_title} · {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
