import { ArrowLeft, Users, Star, Calendar, MapPin, TrendingUp, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useEventStats } from '@/hooks/useEventStats';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventDashboardProps {
  eventId: string;
  onBack: () => void;
}

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  subtitle,
  loading 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  subtitle?: string;
  loading?: boolean;
}) => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-4">
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`w-3.5 h-3.5 ${
          star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'
        }`}
        aria-hidden="true"
      />
    ))}
  </div>
);

export const EventDashboard = ({ eventId, onBack }: EventDashboardProps) => {
  const { data: stats, isLoading } = useEventStats(eventId);

  const chartConfig = {
    count: {
      label: 'Confirmações',
      color: 'hsl(var(--primary))',
    },
  };

  const occupancyRate = stats?.event.max_participants 
    ? Math.round((stats.participantsCount / stats.event.max_participants) * 100)
    : null;

  const isPastEvent = stats?.event.date
    ? isPastDateTime(stats.event.date, (stats.event as { time?: string }).time ?? '23:59')
    : false;


  return (
    <div className="min-h-full bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">
              {isLoading ? <Skeleton className="h-6 w-40" /> : stats?.event.title}
            </h1>
            {stats?.event && (
              <p className="text-xs text-muted-foreground">
                Dashboard do Evento
              </p>
            )}
          </div>
          {isPastEvent && (
            <Badge variant="secondary">Realizado</Badge>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Event Info */}
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : stats?.event && (
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                {stats.event.image_url && (
                  <img 
                    src={stats.event.image_url} 
                    alt={stats.event.title}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {format(parseLocalDate(stats.event.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      {' às '}{stats.event.time.slice(0, 5)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                    <span className="truncate">{stats.event.location}</span>
                  </div>
                  <Badge variant="outline">{stats.event.category}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="Participantes"
            value={stats?.participantsCount || 0}
            icon={Users}
            subtitle={stats?.event.max_participants ? `de ${stats.event.max_participants} vagas` : undefined}
            loading={isLoading}
          />
          <StatCard
            title="Avaliação"
            value={stats?.averageRating ? stats.averageRating.toFixed(1) : '-'}
            icon={Star}
            subtitle={`${stats?.totalReviews || 0} avaliações`}
            loading={isLoading}
          />
        </div>

        {/* Occupancy Rate */}
        {occupancyRate !== null && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Taxa de Ocupação</span>
                <span className="text-sm font-bold text-primary">{occupancyRate}%</span>
              </div>
              <Progress value={occupancyRate} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {stats?.participantsCount} de {stats?.event.max_participants} vagas preenchidas
              </p>
            </CardContent>
          </Card>
        )}

        {/* Confirmations Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" aria-hidden="true" />
              Confirmações (Últimos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : stats?.participantsByDay && stats.participantsByDay.some(d => d.count > 0) ? (
              <ChartContainer config={chartConfig} className="h-40 w-full">
                <AreaChart data={stats.participantsByDay}>
                  <defs>
                    <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                    width={20}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#fillCount)"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                Nenhuma confirmação nos últimos 30 dias
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participants List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" aria-hidden="true" />
              Participantes ({stats?.participantsCount || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : stats?.participants && stats.participants.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.participants.map((participant) => (
                  <div 
                    key={participant.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={participant.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {participant.profile?.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {participant.profile?.full_name || 'Usuário'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Confirmou em {format(new Date(participant.joined_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground text-sm">
                Nenhum participante ainda
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reviews List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" aria-hidden="true" />
              Avaliações ({stats?.totalReviews || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : stats?.reviews && stats.reviews.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {stats.reviews.map((review) => (
                  <div 
                    key={review.id}
                    className="p-3 rounded-lg bg-muted/50 space-y-2"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={review.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {review.profile?.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {review.profile?.full_name || 'Usuário'}
                        </p>
                        <StarRating rating={review.rating} />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(review.created_at), "dd/MM/yy", { locale: ptBR })}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground pl-11">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground text-sm">
                Nenhuma avaliação ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
