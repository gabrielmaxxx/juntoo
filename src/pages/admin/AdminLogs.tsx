import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

interface LogEntry {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  reason: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  suspend_user: 'Suspender Usuário',
  ban_user: 'Banir Usuário',
  warn_organizer: 'Advertir Organizador',
  suspend_organizer: 'Suspender Organizador',
  delete_event: 'Remover Evento',
  revoke_penalty: 'Revogar Punição',
  report_resolved: 'Resolver Denúncia',
  report_dismissed: 'Descartar Denúncia',
  report_under_review: 'Analisar Denúncia',
  approve_user_verification: 'Aprovar Verificação',
  reject_user_verification: 'Rejeitar Verificação',
  approve_business_verification: 'Aprovar Verificação Empresarial',
  reject_business_verification: 'Rejeitar Verificação Empresarial',
  remove_verification: 'Remover Verificação',
  warning_user: 'Advertir Usuário',
};

export default function AdminLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [adminProfiles, setAdminProfiles] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    let q = supabase.from('moderation_logs').select('*').order('created_at', { ascending: false }).limit(200);
    if (actionFilter !== 'all') q = q.eq('action', actionFilter);
    if (search) q = q.or(`target_id.eq.${search},admin_id.eq.${search}`);
    const { data } = await q;
    const entries = (data as LogEntry[]) || [];
    setLogs(entries);

    // Fetch admin names
    const adminIds = [...new Set(entries.map(l => l.admin_id))];
    if (adminIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', adminIds);
      const map: Record<string, string> = {};
      profiles?.forEach(p => { map[p.user_id] = p.full_name; });
      setAdminProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [actionFilter]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Logs Administrativos</h1>

      <div className="flex flex-wrap gap-3">
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Ação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {Object.entries(ACTION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Buscar por ID..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" onKeyDown={e => e.key === 'Enter' && fetchLogs()} />
        <Button variant="outline" onClick={fetchLogs}>Buscar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : logs.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum log encontrado.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Administrador</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Alvo</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{format(new Date(l.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</TableCell>
                    <TableCell className="text-sm">{adminProfiles[l.admin_id] || l.admin_id.slice(0, 8)}</TableCell>
                    <TableCell><Badge variant="outline">{ACTION_LABELS[l.action] || l.action}</Badge></TableCell>
                    <TableCell className="text-xs">{l.target_type}</TableCell>
                    <TableCell className="text-xs font-mono">{l.target_id?.slice(0, 8) || '—'}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{l.reason || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
