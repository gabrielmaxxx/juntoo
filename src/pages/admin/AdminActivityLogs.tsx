import { useState, useEffect } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Activity } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  signup: 'Cadastro',
  event_created: 'Evento criado',
  event_joined: 'Participou de evento',
  event_left: 'Saiu de evento',
  report_submitted: 'Denúncia enviada',
  data_export: 'Exportação de dados',
  account_deletion_request: 'Solicitação de exclusão',
  password_changed: 'Senha alterada',
};

export default function AdminActivityLogs() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('activity_logs' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (actionFilter !== 'all') {
      query = query.eq('action', actionFilter);
    }
    if (search.trim()) {
      query = query.eq('user_id', search.trim());
    }

    const { data } = await query;
    const items = (data as any[]) || [];
    setLogs(items);

    // Fetch profile names
    const userIds = [...new Set(items.map((l: any) => l.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      const map: Record<string, string> = {};
      profileData?.forEach((p) => { map[p.user_id] = p.full_name; });
      setProfiles(map);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchLogs();
  }, [isAdmin, actionFilter]);

  if (authLoading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  if (!isAdmin) return <div className="p-8 text-center text-muted-foreground">Acesso negado</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Logs de Atividade
        </h1>
        <p className="text-muted-foreground">Auditoria de ações dos usuários</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {Object.entries(ACTION_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar por user_id..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              />
              <Button size="icon" onClick={fetchLogs}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{logs.length} registros</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum log encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {profiles[log.user_id] || log.user_id?.slice(0, 8) || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.metadata && Object.keys(log.metadata).length > 0
                          ? JSON.stringify(log.metadata)
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
