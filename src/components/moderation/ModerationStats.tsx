import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Clock, Users, Gavel, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface Stats {
  reports_today: number;
  reports_week: number;
  reports_resolved: number;
  reports_pending: number;
  users_suspended: number;
  penalties_total: number;
  penalties_week: number;
  avg_resolution_hours: number;
}

export const ModerationStats = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.rpc('get_moderation_stats');
        if (error) throw error;
        setStats(data as unknown as Stats);
      } catch {
        toast.error('Erro ao carregar estatísticas');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!stats) return null;

  const cards = [
    { label: 'Denúncias hoje', value: stats.reports_today, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Denúncias na semana', value: stats.reports_week, icon: TrendingUp, color: 'text-primary' },
    { label: 'Pendentes', value: stats.reports_pending, icon: Clock, color: 'text-orange-500' },
    { label: 'Resolvidas', value: stats.reports_resolved, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Usuários suspensos', value: stats.users_suspended, icon: Users, color: 'text-destructive' },
    { label: 'Punições (semana)', value: stats.penalties_week, icon: Gavel, color: 'text-primary' },
    { label: 'Total de punições', value: stats.penalties_total, icon: Gavel, color: 'text-muted-foreground' },
    { label: 'Tempo médio (h)', value: stats.avg_resolution_hours, icon: Clock, color: 'text-muted-foreground' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(c => (
        <Card key={c.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <c.icon className={`w-5 h-5 ${c.color} shrink-0`} />
            <div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
