import { ArrowLeft, Calendar, Users, Star, TrendingUp, Clock, CheckCircle, ChevronRight, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCreatorStats } from '@/hooks/useCreatorStats';
import { useUserCreatedEvents } from '@/hooks/useUserEvents';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CreatorDashboardProps {
  onBack: () => void;
  onEventDashboardClick: (eventId: string) => void;
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

const CATEGORY_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const CreatorDashboard = ({ onBack, onEventDashboardClick }: CreatorDashboardProps) => {
  const { user } = useAuthContext();
  const { data: stats, isLoading } = useCreatorStats(user?.id);
  const { data: createdEvents = [], isLoading: eventsLoading } = useUserCreatedEvents(user?.id);

  const chartConfig = {
    participants: {
      label: 'Participantes',
      color: 'hsl(var(--primary))',
    },
    count: {
      label: 'Eventos',
      color: 'hsl(var(--primary))',
    },
  };

  // Helper function to check if event is past
  const isEventPast = (date: string): boolean => {
    const eventDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

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
          <h1 className="text-lg font-semibold">Dashboard do Criador</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="Total de Eventos"
            value={stats?.totalEvents || 0}
            icon={Calendar}
            subtitle={`${stats?.upcomingEvents || 0} próximos`}
            loading={isLoading}
          />
          <StatCard
            title="Participantes"
            value={stats?.totalParticipants || 0}
            icon={Users}
            loading={isLoading}
          />
          <StatCard
            title="Avaliação Média"
            value={stats?.averageRating ? stats.averageRating.toFixed(1) : '-'}
            icon={Star}
            subtitle={`${stats?.totalReviews || 0} avaliações`}
            loading={isLoading}
          />
          <StatCard
            title="Eventos Realizados"
            value={stats?.pastEvents || 0}
            icon={CheckCircle}
            loading={isLoading}
          />
        </div>

        {/* Events List - NEW */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" aria-hidden="true" />
              Seus Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : createdEvents.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {createdEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onEventDashboardClick(event.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                  >
                    {event.imageUrl && (
                      <img 
                        src={event.imageUrl} 
                        alt={event.title}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.date), "dd 'de' MMM", { locale: ptBR })} • {event.participantsCount ?? event.attendees?.length ?? 0} participantes
                      </p>
                    </div>
                    {isEventPast(event.date) ? (
                      <Badge variant="secondary" className="flex-shrink-0">Realizado</Badge>
                    ) : (
                      <Badge variant="outline" className="flex-shrink-0">Próximo</Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground text-sm">
                Nenhum evento criado ainda
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participants Over Time Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" aria-hidden="true" />
              Confirmações por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : stats?.participantsByMonth && stats.participantsByMonth.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-48 w-full">
                <LineChart data={stats.participantsByMonth}>
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="participants" 
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Nenhum dado de participantes ainda
              </div>
            )}
          </CardContent>
        </Card>

        {/* Events by Category Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" aria-hidden="true" />
              Eventos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : stats?.eventsByCategory && stats.eventsByCategory.length > 0 ? (
              <div className="flex flex-col md:flex-row items-center gap-4">
                <ChartContainer config={chartConfig} className="h-48 w-full md:w-1/2">
                  <PieChart>
                    <Pie
                      data={stats.eventsByCategory}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ category, count }) => `${count}`}
                      labelLine={false}
                    >
                      {stats.eventsByCategory.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-wrap gap-2 justify-center md:flex-col md:items-start">
                  {stats.eventsByCategory.slice(0, 5).map((item, index) => (
                    <div key={item.category} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">{item.category}</span>
                      <span className="font-medium">({item.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Nenhum evento criado ainda
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" aria-hidden="true" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {stats.recentActivity.map((activity, index) => (
                  <div 
                    key={`${activity.eventId}-${activity.type}-${index}`}
                    className="flex items-start gap-3 p-2 rounded-lg bg-muted/50"
                  >
                    <div className={`p-1.5 rounded-full ${
                      activity.type === 'participant' 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {activity.type === 'participant' ? (
                        <Users className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <Star className="w-3 h-3" aria-hidden="true" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.eventTitle}</p>
                      <p className="text-xs text-muted-foreground">{activity.details}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(activity.date), "dd/MM", { locale: ptBR })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Nenhuma atividade recente
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
