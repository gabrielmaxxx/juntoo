import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Gauge, Rocket } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const BRAND = '#00D4D4';
const EVENTS_GOAL = 25;
const USERS_GOAL = 10000;

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function GoalBar({ label, value, goal, suffix }: { label: string; value: number; goal: number; suffix: string }) {
  const pct = Math.min(Math.round((value / goal) * 100), 100);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold text-foreground">{pct}%</span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: BRAND }}
        />
      </div>
      <p className="text-sm font-bold text-foreground">
        {value.toLocaleString('pt-BR')}
        <span className="text-xs font-normal text-muted-foreground"> / {goal.toLocaleString('pt-BR')} {suffix}</span>
      </p>
    </div>
  );
}

export function DensityTrigger() {
  const [loading, setLoading] = useState(true);
  const [weeklyEvents, setWeeklyEvents] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [series, setSeries] = useState<{ week: string; events: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const today = new Date();
      const start12w = new Date(today);
      start12w.setDate(start12w.getDate() - 7 * 12);

      const [eventsRes, usersRes] = await Promise.all([
        supabase
          .from('events')
          .select('date')
          .eq('city', 'Valença')
          .eq('state', 'RJ')
          .is('cancelled_at', null)
          .gte('date', toISODate(start12w))
          .lte('date', toISODate(today)),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);

      const rows = eventsRes.data || [];

      // Bucket into 12 weekly windows (oldest -> newest)
      const buckets = Array.from({ length: 12 }, (_, i) => {
        const end = new Date(today);
        end.setDate(end.getDate() - 7 * (11 - i));
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        return { start, end, events: 0 };
      });

      rows.forEach((r: { date: string }) => {
        const d = new Date(`${r.date}T12:00:00`);
        const b = buckets.find(x => d >= x.start && d <= x.end);
        if (b) b.events += 1;
      });

      setSeries(
        buckets.map(b => ({
          week: b.end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          events: b.events,
        })),
      );
      setWeeklyEvents(buckets[buckets.length - 1].events);
      setTotalUsers(usersRes.count || 0);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  const eventsPct = (weeklyEvents / EVENTS_GOAL) * 100;
  const usersPct = (totalUsers / USERS_GOAL) * 100;
  const reached = eventsPct >= 100 || usersPct >= 100;

  const eventsMissing = Math.max(EVENTS_GOAL - weeklyEvents, 0);
  const usersMissing = Math.max(USERS_GOAL - totalUsers, 0);
  const closestIsEvents = eventsPct >= usersPct;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Gauge className="w-5 h-5" style={{ color: BRAND }} />
        <h2 className="text-base font-bold text-foreground">Gatilho de Densidade</h2>
      </div>

      {reached && (
        <div
          className="rounded-xl p-4 flex items-start gap-3 text-white"
          style={{ backgroundColor: BRAND }}
        >
          <Rocket className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold leading-snug">
            Gatilho de densidade atingido — Pilar 1 de monetização pode virar receita ativa
            (ver Livro Institucional, Capítulo 13)
          </p>
        </div>
      )}

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <GoalBar
            label="Eventos ativos/semana em Valença/RJ"
            value={weeklyEvents}
            goal={EVENTS_GOAL}
            suffix="eventos"
          />
          <GoalBar
            label="Usuários cadastrados"
            value={totalUsers}
            goal={USERS_GOAL}
            suffix="usuários"
          />
        </CardContent>
      </Card>

      {!reached && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-foreground">
              {closestIsEvents
                ? <>Faltam <span className="font-bold">{eventsMissing.toLocaleString('pt-BR')} eventos/semana</span> para atingir o gatilho mais próximo.</>
                : <>Faltam <span className="font-bold">{usersMissing.toLocaleString('pt-BR')} usuários</span> para atingir o gatilho mais próximo.</>}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Outro gatilho: {closestIsEvents
                ? `${usersMissing.toLocaleString('pt-BR')} usuários restantes`
                : `${eventsMissing.toLocaleString('pt-BR')} eventos/semana restantes`}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Eventos ativos por semana — últimas 12 semanas (Valença/RJ)</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="events" name="Eventos ativos" stroke={BRAND} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
