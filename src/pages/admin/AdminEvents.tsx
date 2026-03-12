import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Eye, Trash2, AlertTriangle } from 'lucide-react';

interface EventRow {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  created_by: string;
  creator_name: string | null;
  participants_count: number | null;
  is_private: boolean | null;
}

export default function AdminEvents() {
  const { user, logAction } = useAdminAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EventRow | null>(null);
  const [reportsCount, setReportsCount] = useState(0);
  const [reason, setReason] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    let q = supabase.from('events_with_details').select('id, title, date, time, location, category, created_by, creator_name, participants_count, is_private').order('created_at', { ascending: false }).limit(100);
    if (search) q = q.ilike('title', `%${search}%`);
    const { data } = await q;
    setEvents((data as EventRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const openDetail = async (e: EventRow) => {
    setSelected(e);
    setReason('');
    const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('reported_event_id', e.id);
    setReportsCount(count || 0);
  };

  const deleteEvent = async () => {
    if (!selected || !reason) { toast.error('Informe o motivo'); return; }
    const { error } = await supabase.from('events').delete().eq('id', selected.id);
    if (error) { toast.error('Erro ao remover evento'); return; }
    await logAction('delete_event', 'event', selected.id, reason);
    toast.success('Evento removido');
    setSelected(null);
    fetchEvents();
  };

  const warnOrganizer = async () => {
    if (!selected || !user || !reason) { toast.error('Informe o motivo'); return; }
    await supabase.rpc('apply_penalty', {
      p_user_id: selected.created_by,
      p_moderator_id: user.id,
      p_penalty_type: 'warning',
      p_reason: reason,
    });
    await logAction('warn_organizer', 'user', selected.created_by, reason);
    toast.success('Organizador advertido');
  };

  const suspendOrganizer = async () => {
    if (!selected || !user || !reason) { toast.error('Informe o motivo'); return; }
    await supabase.rpc('apply_penalty', {
      p_user_id: selected.created_by,
      p_moderator_id: user.id,
      p_penalty_type: 'suspension',
      p_reason: reason,
      p_duration_days: 7,
    });
    await logAction('suspend_organizer', 'user', selected.created_by, reason);
    toast.success('Organizador suspenso');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Gestão de Eventos</h1>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por título..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" onKeyDown={e => e.key === 'Enter' && fetchEvents()} />
        </div>
        <Button onClick={fetchEvents}>Buscar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Organizador</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Participantes</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{e.title}</TableCell>
                    <TableCell className="text-sm">{e.creator_name || '—'}</TableCell>
                    <TableCell className="text-xs">{e.date ? format(new Date(e.date), 'dd/MM/yy', { locale: ptBR }) : '—'}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{e.location}</TableCell>
                    <TableCell>{e.participants_count || 0}</TableCell>
                    <TableCell><Badge variant="outline">{e.is_private ? 'Privado' : 'Público'}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => openDetail(e)}><Eye className="w-4 h-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhes do Evento</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Título:</span> {selected.title}</div>
                <div><span className="text-muted-foreground">Categoria:</span> {selected.category}</div>
                <div><span className="text-muted-foreground">Organizador:</span> {selected.creator_name}</div>
                <div><span className="text-muted-foreground">Participantes:</span> {selected.participants_count || 0}</div>
                <div><span className="text-muted-foreground">Denúncias:</span> {reportsCount}</div>
                <div><span className="text-muted-foreground">Data:</span> {selected.date ? format(new Date(selected.date), 'dd/MM/yyyy', { locale: ptBR }) : '—'}</div>
              </div>
              <Textarea placeholder="Motivo da ação..." value={reason} onChange={e => setReason(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="destructive" onClick={deleteEvent}><Trash2 className="w-3 h-3 mr-1" />Remover Evento</Button>
                <Button size="sm" variant="outline" onClick={warnOrganizer}><AlertTriangle className="w-3 h-3 mr-1" />Advertir Organizador</Button>
                <Button size="sm" variant="outline" onClick={suspendOrganizer}>Suspender Organizador</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
