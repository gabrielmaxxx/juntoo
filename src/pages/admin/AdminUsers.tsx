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
import { Search, Eye, ShieldCheck, ShieldX } from 'lucide-react';

interface UserRow {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  verified: boolean;
  business_verified: boolean;
  account_type: string;
  created_at: string;
}

export default function AdminUsers() {
  const { user, logAction } = useAdminAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [penalties, setPenalties] = useState<any[]>([]);
  const [reportsCount, setReportsCount] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [participations, setParticipations] = useState(0);
  const [trustScore, setTrustScore] = useState<number | null>(null);
  const [actionReason, setActionReason] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    let q = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100);
    if (search) q = q.ilike('full_name', `%${search}%`);
    const { data } = await q;
    setUsers((data as UserRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  // Realtime sync: penalties/restrictions changes refresh the list
  useEffect(() => {
    const channel = supabase.channel('admin-users-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_penalties' }, () => {
        if (selected) openDetail(selected);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_restrictions' }, () => {
        if (selected) openDetail(selected);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected]);

  const openDetail = async (u: UserRow) => {
    setSelected(u);
    setActionReason('');
    const [p, r, e, ep, ts] = await Promise.all([
      supabase.from('user_penalties').select('*').eq('user_id', u.user_id).order('created_at', { ascending: false }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('reported_user_id', u.user_id),
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('created_by', u.user_id),
      supabase.from('event_participants').select('*', { count: 'exact', head: true }).eq('user_id', u.user_id),
      supabase.from('user_trust_scores').select('score').eq('user_id', u.user_id).single(),
    ]);
    setPenalties(p.data || []);
    setReportsCount(r.count || 0);
    setEventsCount(e.count || 0);
    setParticipations(ep.count || 0);
    setTrustScore(ts.data?.score ?? null);
  };

  const applyPenalty = async (type: string, duration?: number) => {
    if (!selected || !user || !actionReason) { toast.error('Informe o motivo'); return; }
    await supabase.rpc('apply_penalty', {
      p_user_id: selected.user_id,
      p_moderator_id: user.id,
      p_penalty_type: type,
      p_reason: actionReason,
      p_duration_days: duration || undefined,
    });
    await logAction(`${type}_user`, 'user', selected.user_id, actionReason);
    toast.success('Ação aplicada');
    openDetail(selected);
  };

  const revokePenalty = async (penaltyId: string) => {
    if (!user) return;
    await supabase.rpc('revoke_penalty', { p_penalty_id: penaltyId, p_moderator_id: user.id });
    await logAction('revoke_penalty', 'penalty', penaltyId);
    toast.success('Punição revogada');
    if (selected) openDetail(selected);
  };

  const removeVerification = async () => {
    if (!selected) return;
    await supabase.from('profiles').update({ verified: false, verification_level: 0, business_verified: false }).eq('user_id', selected.user_id);
    await logAction('remove_verification', 'user', selected.user_id, actionReason);
    toast.success('Verificação removida');
    fetchUsers();
  };

  const getStatus = () => {
    const activePenalty = penalties.find(p => p.is_active && (p.penalty_type === 'ban' || p.penalty_type === 'suspension'));
    if (activePenalty?.penalty_type === 'ban') return { label: 'Banido', variant: 'destructive' as const };
    if (activePenalty?.penalty_type === 'suspension') return { label: 'Suspenso', variant: 'default' as const };
    if (penalties.some(p => p.penalty_type === 'warning' && p.is_active)) return { label: 'Advertido', variant: 'outline' as const };
    return { label: 'Ativo', variant: 'secondary' as const };
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" onKeyDown={e => e.key === 'Enter' && fetchUsers()} />
        </div>
        <Button onClick={fetchUsers}>Buscar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Verificado</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.city || '—'}</TableCell>
                    <TableCell><Badge variant="outline">{u.account_type}</Badge></TableCell>
                    <TableCell>
                      {u.verified ? <ShieldCheck className="w-4 h-4 text-primary" /> : u.business_verified ? <ShieldCheck className="w-4 h-4 text-green-500" /> : <ShieldX className="w-4 h-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(u.created_at), 'dd/MM/yy', { locale: ptBR })}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => openDetail(u)}><Eye className="w-4 h-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Perfil Administrativo</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Nome:</span> {selected.full_name}</div>
                <div><span className="text-muted-foreground">Tipo:</span> {selected.account_type}</div>
                <div><span className="text-muted-foreground">Cidade:</span> {selected.city || '—'}</div>
                <div><span className="text-muted-foreground">Trust Score:</span> {trustScore ?? 'N/A'}</div>
                <div><span className="text-muted-foreground">Eventos criados:</span> {eventsCount}</div>
                <div><span className="text-muted-foreground">Participações:</span> {participations}</div>
                <div><span className="text-muted-foreground">Denúncias recebidas:</span> {reportsCount}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={getStatus().variant}>{getStatus().label}</Badge></div>
              </div>

              {penalties.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Histórico de Punições</p>
                  <div className="space-y-2">
                    {penalties.map(p => (
                      <div key={p.id} className="text-xs p-2 rounded bg-muted flex items-center justify-between">
                        <div>
                          <Badge variant={p.is_active ? 'destructive' : 'outline'} className="mr-2">{p.penalty_type}</Badge>
                          {p.reason}
                        </div>
                        {p.is_active && <Button variant="ghost" size="sm" onClick={() => revokePenalty(p.id)}>Revogar</Button>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Textarea placeholder="Motivo da ação..." value={actionReason} onChange={e => setActionReason(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => applyPenalty('warning')}>Advertência</Button>
                <Button size="sm" variant="outline" onClick={() => applyPenalty('suspension', 7)}>Suspender 7d</Button>
                <Button size="sm" variant="destructive" onClick={() => applyPenalty('ban')}>Banir</Button>
                {(selected.verified || selected.business_verified) && (
                  <Button size="sm" variant="outline" onClick={removeVerification}>Remover Verificação</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
