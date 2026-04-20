import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Eye, Clock, CheckCircle, XCircle, Undo2, Trash2 } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  created: { label: 'Aberta', variant: 'destructive' },
  under_review: { label: 'Em análise', variant: 'default' },
  resolved: { label: 'Resolvida', variant: 'secondary' },
  dismissed: { label: 'Descartada', variant: 'outline' },
};

const CATEGORY_LABELS: Record<string, string> = {
  harassment: 'Assédio', hate_speech: 'Discurso de ódio', sexual_content: 'Conteúdo sexual',
  spam: 'Spam', fraud: 'Fraude', fake_profile: 'Perfil falso', suspicious_behavior: 'Comportamento suspeito',
  dangerous_event: 'Evento perigoso', misleading_event: 'Evento enganoso', other: 'Outro',
};

interface Report {
  id: string;
  reporter_user_id: string;
  reported_user_id: string | null;
  reported_event_id: string | null;
  reported_message_id: string | null;
  category: string;
  description: string;
  evidence_image_url: string | null;
  status: string;
  is_urgent: boolean;
  created_at: string;
  reviewer_notes: string | null;
  reviewed_by: string | null;
}

export default function AdminReports() {
  const { logAction } = useAdminAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Report | null>(null);
  const [notes, setNotes] = useState('');
  const [reporterProfile, setReporterProfile] = useState<{ full_name: string } | null>(null);
  const [reportedProfile, setReportedProfile] = useState<{ full_name: string } | null>(null);
  const [reviewerProfile, setReviewerProfile] = useState<{ full_name: string } | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    let q = supabase.from('reports').select('*').order('is_urgent', { ascending: false }).order('created_at', { ascending: false }).limit(200);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter as any);
    if (categoryFilter !== 'all') q = q.eq('category', categoryFilter as any);
    if (search) q = q.or(`reported_user_id.eq.${search},reporter_user_id.eq.${search}`);
    const { data } = await q;
    setReports((data as Report[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, [statusFilter, categoryFilter]);

  // Realtime sync between admins
  useEffect(() => {
    const channel = supabase.channel('admin-reports-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchReports();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [statusFilter, categoryFilter]);

  const openDetail = async (r: Report) => {
    setSelected(r);
    setNotes(r.reviewer_notes || '');
    const [reporter, reported, reviewer] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('user_id', r.reporter_user_id).single(),
      r.reported_user_id ? supabase.from('profiles').select('full_name').eq('user_id', r.reported_user_id).single() : Promise.resolve({ data: null }),
      r.reviewed_by ? supabase.from('profiles').select('full_name').eq('user_id', r.reviewed_by).single() : Promise.resolve({ data: null }),
    ]);
    setReporterProfile(reporter.data);
    setReportedProfile(reported.data);
    setReviewerProfile(reviewer.data);
  };

  const updateStatus = async (status: string) => {
    if (!selected) return;
    const { error } = await supabase.from('reports').update({
      status: status as any, reviewer_notes: notes, reviewed_at: new Date().toISOString(),
      reviewed_by: (await supabase.auth.getUser()).data.user!.id,
    }).eq('id', selected.id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    await logAction(`report_${status}`, 'report', selected.id, notes);
    toast.success('Denúncia atualizada');
    setSelected(null);
    fetchReports();
  };

  const reopenReport = async () => {
    if (!selected) return;
    const { error } = await supabase.from('reports').update({
      status: 'created' as any, reviewer_notes: null, reviewed_at: null, reviewed_by: null,
    }).eq('id', selected.id);
    if (error) { toast.error('Erro ao reabrir'); return; }
    await logAction('report_reopened', 'report', selected.id, 'Denúncia reaberta');
    toast.success('Denúncia reaberta');
    setSelected(null);
    fetchReports();
  };

  const suspendUser = async () => {
    if (!selected?.reported_user_id) return;
    await supabase.rpc('apply_penalty', {
      p_user_id: selected.reported_user_id,
      p_moderator_id: (await supabase.auth.getUser()).data.user!.id,
      p_penalty_type: 'suspension',
      p_reason: `Denúncia #${selected.id}: ${notes}`,
      p_duration_days: 7,
    });
    await logAction('suspend_user', 'user', selected.reported_user_id, notes);
    toast.success('Usuário suspenso por 7 dias');
    await updateStatus('resolved');
  };

  const banUser = async () => {
    if (!selected?.reported_user_id) return;
    await supabase.rpc('apply_penalty', {
      p_user_id: selected.reported_user_id,
      p_moderator_id: (await supabase.auth.getUser()).data.user!.id,
      p_penalty_type: 'ban',
      p_reason: `Denúncia #${selected.id}: ${notes}`,
    });
    await logAction('ban_user', 'user', selected.reported_user_id, notes);
    toast.success('Usuário banido');
    await updateStatus('resolved');
  };

  const removeEvent = async () => {
    if (!selected?.reported_event_id || !notes.trim()) { toast.error('Informe o motivo'); return; }
    const { error } = await supabase.from('events').delete().eq('id', selected.reported_event_id);
    if (error) { toast.error('Erro ao remover evento'); return; }
    await logAction('delete_reported_event', 'event', selected.reported_event_id, notes);
    toast.success('Evento removido');
    await updateStatus('resolved');
  };

  const targetLabel = (r: Report) => {
    if (r.reported_message_id) return 'Mensagem';
    if (r.reported_event_id) return 'Evento';
    return 'Usuário';
  };

  const isResolved = selected?.status === 'resolved' || selected?.status === 'dismissed';

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Central de Denúncias</h1>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="created">Abertas</SelectItem>
            <SelectItem value="under_review">Em análise</SelectItem>
            <SelectItem value="resolved">Resolvidas</SelectItem>
            <SelectItem value="dismissed">Descartadas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Buscar por ID do usuário..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" onKeyDown={e => e.key === 'Enter' && fetchReports()} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : reports.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhuma denúncia encontrada.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.is_urgent && <AlertTriangle className="w-4 h-4 text-destructive" />}</TableCell>
                    <TableCell><Badge variant="outline">{targetLabel(r)}</Badge></TableCell>
                    <TableCell className="text-sm">{CATEGORY_LABELS[r.category] || r.category}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{r.description}</TableCell>
                    <TableCell><Badge variant={STATUS_CONFIG[r.status]?.variant}>{STATUS_CONFIG[r.status]?.label || r.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => openDetail(r)}><Eye className="w-4 h-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhes da Denúncia</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Categoria:</span> {CATEGORY_LABELS[selected.category]}</div>
                <div><span className="text-muted-foreground">Tipo:</span> {targetLabel(selected)}</div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={STATUS_CONFIG[selected.status]?.variant}>{STATUS_CONFIG[selected.status]?.label}</Badge></div>
                <div><span className="text-muted-foreground">Denunciante:</span> {reporterProfile?.full_name || 'N/A'}</div>
                <div><span className="text-muted-foreground">Denunciado:</span> {reportedProfile?.full_name || 'N/A'}</div>
              </div>

              {isResolved && reviewerProfile && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Revisado por:</span> {reviewerProfile.full_name}
                  </p>
                  {selected.reviewer_notes && (
                    <p className="text-muted-foreground mt-1">
                      <span className="font-medium text-foreground">Notas:</span> {selected.reviewer_notes}
                    </p>
                  )}
                </div>
              )}

              <div><p className="text-sm font-medium mb-1">Descrição</p><p className="text-sm text-muted-foreground">{selected.description}</p></div>
              {selected.evidence_image_url && <img src={selected.evidence_image_url} alt="Evidência" className="rounded-lg max-h-48 object-cover" />}

              {isResolved ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={reopenReport} className="gap-1">
                    <Undo2 className="w-3 h-3" />Reabrir denúncia
                  </Button>
                </div>
              ) : (
                <>
                  <Textarea placeholder="Notas do moderador..." value={notes} onChange={e => setNotes(e.target.value)} />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => updateStatus('under_review')}><Clock className="w-3 h-3 mr-1" />Em análise</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus('resolved')}><CheckCircle className="w-3 h-3 mr-1" />Resolver</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus('dismissed')}><XCircle className="w-3 h-3 mr-1" />Descartar</Button>
                    {selected.reported_user_id && (
                      <>
                        <Button size="sm" variant="destructive" onClick={suspendUser}>Suspender</Button>
                        <Button size="sm" variant="destructive" onClick={banUser}>Banir</Button>
                      </>
                    )}
                    {selected.reported_event_id && (
                      <Button size="sm" variant="destructive" onClick={removeEvent}>
                        <Trash2 className="w-3 h-3 mr-1" />Remover evento
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
