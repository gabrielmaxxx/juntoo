import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Target, Users, Zap, MessageCircle, RotateCcw, ShieldCheck,
  TrendingUp, TrendingDown, Star, AlertTriangle, Calendar,
  UserCheck, Clock, ArrowUpRight, Activity, Heart,
} from 'lucide-react';

interface Metrics {
  north_star: {
    completed_events_with_participants: number;
    total_participations_completed: number;
    avg_participants_per_completed: number;
  };
  acquisition: {
    total_users: number;
    new_today: number;
    new_yesterday: number;
    new_this_week: number;
    new_this_month: number;
    onboarding_completed: number;
    onboarding_rate: number;
  };
  activation: {
    users_joined_events: number;
    users_created_events: number;
    activation_rate: number;
    activated_first_24h: number;
    activation_24h_rate: number;
  };
  engagement: {
    total_messages: number;
    messages_today: number;
    messages_this_week: number;
    events_with_chat_activity: number;
    dm_count_week: number;
    avg_participations_per_event: number;
    total_reviews: number;
    reviews_this_week: number;
  };
  retention: {
    d1_retention: number;
    d7_retention: number;
    recurring_participants: number;
    recurring_rate: number;
  };
  trust: {
    avg_user_rating: number;
    avg_event_rating: number;
    total_reports: number;
    open_reports: number;
    reports_this_week: number;
    problematic_users: number;
    active_penalties: number;
    banned_users: number;
    suspended_users: number;
    verified_users: number;
    verification_rate: number;
  };
  content: {
    total_events: number;
    events_today: number;
    events_this_week: number;
    active_events: number;
    private_events: number;
    recurring_events: number;
    total_friendships: number;
    pending_friend_requests: number;
  };
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

function MetricCard({ label, value, icon: Icon, subtitle, color, large }: {
  label: string; value: string | number; icon?: any; subtitle?: string; color?: string; large?: boolean;
}) {
  return (
    <Card className={large ? 'col-span-full md:col-span-2' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className={cn('font-bold text-foreground', large ? 'text-3xl' : 'text-xl')}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {Icon && <Icon className={cn('w-5 h-5 shrink-0', color || 'text-muted-foreground')} />}
        </div>
      </CardContent>
    </Card>
  );
}

function PercentBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={cn('w-5 h-5', color)} />
        <h2 className="text-base font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function AdminMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.rpc('get_platform_metrics');
      if (!error && data) setMetrics(data as unknown as Metrics);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!metrics) {
    return <p className="text-center text-muted-foreground py-8">Erro ao carregar métricas.</p>;
  }

  const m = metrics;
  const todayGrowth = m.acquisition.new_yesterday > 0
    ? Math.round(((m.acquisition.new_today - m.acquisition.new_yesterday) / m.acquisition.new_yesterday) * 100)
    : m.acquisition.new_today > 0 ? 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Métricas da Plataforma</h1>
        <p className="text-sm text-muted-foreground">Dados em tempo real do Juntoo</p>
      </div>

      {/* GATILHO DE DENSIDADE */}
      <DensityTrigger />

      {/* NORTH STAR */}

      <Section title="North Star — Eventos Realizados" icon={Target} color="text-primary">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricCard
            label="Eventos com Participação Real"
            value={m.north_star.completed_events_with_participants}
            icon={Target}
            color="text-primary"
            subtitle="Eventos finalizados com participantes"
            large
          />
          <MetricCard
            label="Participações Realizadas"
            value={m.north_star.total_participations_completed}
            icon={UserCheck}
            color="text-emerald-500"
          />
          <MetricCard
            label="Média por Evento"
            value={m.north_star.avg_participants_per_completed}
            icon={Users}
            color="text-blue-500"
            subtitle="participantes/evento"
          />
        </div>
      </Section>

      {/* ACQUISITION */}
      <Section title="Aquisição" icon={Users} color="text-blue-500">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Total Usuários" value={m.acquisition.total_users} icon={Users} color="text-blue-500" />
          <MetricCard
            label="Novos Hoje"
            value={m.acquisition.new_today}
            icon={todayGrowth >= 0 ? TrendingUp : TrendingDown}
            color={todayGrowth >= 0 ? 'text-emerald-500' : 'text-destructive'}
            subtitle={`${todayGrowth >= 0 ? '+' : ''}${todayGrowth}% vs ontem`}
          />
          <MetricCard label="Novos na Semana" value={m.acquisition.new_this_week} icon={ArrowUpRight} color="text-blue-400" />
          <MetricCard label="Novos no Mês" value={m.acquisition.new_this_month} icon={Calendar} color="text-blue-600" />
        </div>
        <Card>
          <CardContent className="p-4 space-y-3">
            <PercentBar label="Taxa de Onboarding Completo" value={m.acquisition.onboarding_rate} color="bg-blue-500" />
            <p className="text-xs text-muted-foreground">{m.acquisition.onboarding_completed} de {m.acquisition.total_users} completaram</p>
          </CardContent>
        </Card>
      </Section>

      {/* ACTIVATION */}
      <Section title="Ativação" icon={Zap} color="text-amber-500">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard label="Entraram em Eventos" value={m.activation.users_joined_events} icon={UserCheck} color="text-emerald-500" />
          <MetricCard label="Criaram Eventos" value={m.activation.users_created_events} icon={Calendar} color="text-amber-500" />
          <MetricCard label="Ativados em 24h" value={m.activation.activated_first_24h} icon={Clock} color="text-orange-500" subtitle={`${m.activation.activation_24h_rate}% dos usuários`} />
        </div>
        <Card>
          <CardContent className="p-4 space-y-3">
            <PercentBar label="Taxa de Ativação Geral" value={m.activation.activation_rate} color="bg-amber-500" />
            <PercentBar label="Ativação em 24h" value={m.activation.activation_24h_rate} color="bg-orange-500" />
          </CardContent>
        </Card>
      </Section>

      {/* ENGAGEMENT */}
      <Section title="Engajamento" icon={MessageCircle} color="text-violet-500">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Mensagens Totais" value={m.engagement.total_messages} icon={MessageCircle} color="text-violet-500" />
          <MetricCard label="Mensagens Hoje" value={m.engagement.messages_today} icon={Activity} color="text-violet-400" />
          <MetricCard label="Chats Ativos (7d)" value={m.engagement.events_with_chat_activity} icon={MessageCircle} color="text-indigo-500" subtitle="eventos com atividade" />
          <MetricCard label="DMs na Semana" value={m.engagement.dm_count_week} icon={MessageCircle} color="text-pink-500" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard label="Méd. Participantes/Evento" value={m.engagement.avg_participations_per_event} icon={Users} color="text-violet-500" />
          <MetricCard label="Avaliações Totais" value={m.engagement.total_reviews} icon={Star} color="text-yellow-500" />
          <MetricCard label="Avaliações (7d)" value={m.engagement.reviews_this_week} icon={Star} color="text-yellow-400" />
        </div>
      </Section>

      {/* RETENTION */}
      <Section title="Retenção" icon={RotateCcw} color="text-emerald-500">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Retenção D1" value={`${m.retention.d1_retention}%`} icon={RotateCcw} color="text-emerald-500" subtitle="voltaram após 1 dia" />
          <MetricCard label="Retenção D7" value={`${m.retention.d7_retention}%`} icon={RotateCcw} color="text-emerald-400" subtitle="voltaram após 7 dias" />
          <MetricCard label="Participantes Recorrentes" value={m.retention.recurring_participants} icon={Heart} color="text-rose-500" subtitle="2+ eventos" />
          <MetricCard label="Taxa Recorrência" value={`${m.retention.recurring_rate}%`} icon={TrendingUp} color="text-emerald-600" />
        </div>
        <Card>
          <CardContent className="p-4 space-y-3">
            <PercentBar label="Retenção D1" value={m.retention.d1_retention} color="bg-emerald-500" />
            <PercentBar label="Retenção D7" value={m.retention.d7_retention} color="bg-emerald-400" />
            <PercentBar label="Participação Recorrente" value={m.retention.recurring_rate} color="bg-rose-500" />
          </CardContent>
        </Card>
      </Section>

      {/* TRUST & SAFETY */}
      <Section title="Confiança & Segurança" icon={ShieldCheck} color="text-red-500">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Nota Média (Usuários)" value={m.trust.avg_user_rating} icon={Star} color="text-yellow-500" subtitle="de 5.0" />
          <MetricCard label="Nota Média (Eventos)" value={m.trust.avg_event_rating} icon={Star} color="text-yellow-400" subtitle="de 5.0" />
          <MetricCard label="Usuários Verificados" value={m.trust.verified_users} icon={ShieldCheck} color="text-emerald-500" subtitle={`${m.trust.verification_rate}% da base`} />
          <MetricCard label="Denúncias Abertas" value={m.trust.open_reports} icon={AlertTriangle} color="text-orange-500" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Denúncias (7d)" value={m.trust.reports_this_week} icon={AlertTriangle} color="text-orange-400" />
          <MetricCard label="Usuários Problemáticos" value={m.trust.problematic_users} icon={AlertTriangle} color="text-destructive" />
          <MetricCard label="Banidos" value={m.trust.banned_users} icon={ShieldCheck} color="text-destructive" />
          <MetricCard label="Suspensos" value={m.trust.suspended_users} icon={ShieldCheck} color="text-orange-500" />
        </div>
      </Section>

      {/* CONTENT */}
      <Section title="Conteúdo" icon={Calendar} color="text-cyan-500">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Total de Eventos" value={m.content.total_events} icon={Calendar} color="text-cyan-500" />
          <MetricCard label="Eventos Hoje" value={m.content.events_today} icon={Calendar} color="text-cyan-400" />
          <MetricCard label="Eventos Ativos" value={m.content.active_events} icon={TrendingUp} color="text-emerald-500" />
          <MetricCard label="Eventos Privados" value={m.content.private_events} icon={ShieldCheck} color="text-slate-500" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard label="Eventos Recorrentes" value={m.content.recurring_events} icon={RotateCcw} color="text-cyan-600" />
          <MetricCard label="Amizades" value={m.content.total_friendships} icon={Heart} color="text-rose-500" />
          <MetricCard label="Pedidos Pendentes" value={m.content.pending_friend_requests} icon={Users} color="text-amber-500" />
        </div>
      </Section>
    </div>
  );
}
