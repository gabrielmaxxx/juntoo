import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, FileText, ShieldAlert, BarChart3, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface Stats {
  totalUsers: number;
  activeToday: number;
  eventsToday: number;
  activeEvents: number;
  openReports: number;
  suspendedUsers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [eventsChart, setEventsChart] = useState<{ week: string; count: number }[]>([]);
  const [usersChart, setUsersChart] = useState<{ week: string; count: number }[]>([]);
  const [reportsChart, setReportsChart] = useState<{ week: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
      const today = new Date().toISOString().split('T')[0];
      const [
        { count: totalUsers },
        { count: eventsToday },
        { count: activeEvents },
        { count: openReports },
        { count: suspendedUsers },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('events').select('*', { count: 'exact', head: true }).gte('date', today),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'created'),
        supabase.from('user_penalties').select('*', { count: 'exact', head: true }).eq('is_active', true).in('penalty_type', ['suspension', 'ban']),
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        activeToday: 0, // Would need session tracking
        eventsToday: eventsToday || 0,
        activeEvents: activeEvents || 0,
        openReports: openReports || 0,
        suspendedUsers: suspendedUsers || 0,
      });

      // Weekly charts - last 8 weeks
      const weeks: { start: string; end: string; label: string }[] = [];
      for (let i = 7; i >= 0; i--) {
        const start = new Date();
        start.setDate(start.getDate() - i * 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        weeks.push({
          start: start.toISOString(),
          end: end.toISOString(),
          label: `S${8 - i}`,
        });
      }

      const eventsByWeek: { week: string; count: number }[] = [];
      const usersByWeek: { week: string; count: number }[] = [];
      const reportsByWeek: { week: string; count: number }[] = [];

      for (const w of weeks) {
        const [{ count: ec }, { count: uc }, { count: rc }] = await Promise.all([
          supabase.from('events').select('*', { count: 'exact', head: true }).gte('created_at', w.start).lt('created_at', w.end),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', w.start).lt('created_at', w.end),
          supabase.from('reports').select('*', { count: 'exact', head: true }).gte('created_at', w.start).lt('created_at', w.end),
        ]);
        eventsByWeek.push({ week: w.label, count: ec || 0 });
        usersByWeek.push({ week: w.label, count: uc || 0 });
        reportsByWeek.push({ week: w.label, count: rc || 0 });
      }

      setEventsChart(eventsByWeek);
      setUsersChart(usersByWeek);
      setReportsChart(reportsByWeek);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const cards = [
    { label: 'Total de Usuários', value: stats?.totalUsers, icon: Users, color: 'text-blue-500' },
    { label: 'Eventos Hoje', value: stats?.eventsToday, icon: Calendar, color: 'text-green-500' },
    { label: 'Eventos Ativos', value: stats?.activeEvents, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Denúncias Abertas', value: stats?.openReports, icon: FileText, color: 'text-orange-500' },
    { label: 'Usuários Suspensos', value: stats?.suspendedUsers, icon: ShieldAlert, color: 'text-red-500' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <c.icon className={cn('w-4 h-4', c.color)} />
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Eventos por Semana</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={eventsChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Novos Usuários por Semana</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={usersChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Denúncias por Semana</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={reportsChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
