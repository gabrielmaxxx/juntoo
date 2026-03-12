import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TopOrganizer { full_name: string; count: number; }
interface TopCategory { category: string; count: number; }

export default function AdminMetrics() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [bannedUsers, setBannedUsers] = useState(0);
  const [topOrganizers, setTopOrganizers] = useState<TopOrganizer[]>([]);
  const [topCategories, setTopCategories] = useState<TopCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [
        { count: tu },
        { count: te },
        { count: bu },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('user_penalties').select('*', { count: 'exact', head: true }).eq('penalty_type', 'ban').eq('is_active', true),
      ]);

      setTotalUsers(tu || 0);
      setTotalEvents(te || 0);
      setBannedUsers(bu || 0);

      // Top organizers
      const { data: events } = await supabase.from('events_with_details').select('creator_name').limit(500);
      if (events) {
        const counts: Record<string, number> = {};
        events.forEach(e => { const n = e.creator_name || 'Anônimo'; counts[n] = (counts[n] || 0) + 1; });
        setTopOrganizers(Object.entries(counts).map(([full_name, count]) => ({ full_name, count })).sort((a, b) => b.count - a.count).slice(0, 10));
      }

      // Top categories
      const { data: catEvents } = await supabase.from('events').select('category').limit(500);
      if (catEvents) {
        const counts: Record<string, number> = {};
        catEvents.forEach(e => { counts[e.category] = (counts[e.category] || 0) + 1; });
        setTopCategories(Object.entries(counts).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count).slice(0, 10));
      }

      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Métricas da Plataforma</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Usuários</p><p className="text-2xl font-bold">{totalUsers}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Eventos</p><p className="text-2xl font-bold">{totalEvents}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Usuários Banidos</p><p className="text-2xl font-bold">{bannedUsers}</p></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Categorias Mais Populares</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topCategories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" />
                <YAxis dataKey="category" type="category" className="text-xs" width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Organizadores</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Organizador</TableHead><TableHead>Eventos</TableHead></TableRow></TableHeader>
              <TableBody>
                {topOrganizers.map((o, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{o.full_name}</TableCell>
                    <TableCell className="font-bold">{o.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
