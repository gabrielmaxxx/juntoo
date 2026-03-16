import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Eye, AlertTriangle, Clock, CheckCircle, XCircle, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

const CATEGORY_LABELS: Record<string, string> = {
  harassment: 'Assédio',
  hate_speech: 'Discurso de ódio',
  sexual_content: 'Conteúdo sexual',
  spam: 'Spam',
  fraud: 'Fraude',
  fake_profile: 'Perfil falso',
  suspicious_behavior: 'Comportamento suspeito',
  dangerous_event: 'Evento perigoso',
  misleading_event: 'Evento enganoso',
  other: 'Outro',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  created: { label: 'Pendente', variant: 'destructive', icon: AlertTriangle },
  under_review: { label: 'Em análise', variant: 'default', icon: Clock },
  resolved: { label: 'Resolvido', variant: 'secondary', icon: CheckCircle },
  dismissed: { label: 'Descartado', variant: 'outline', icon: XCircle },
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
  reviewed_at: string | null;
  reviewer_notes: string | null;
  reviewed_by: string | null;
}

export const ReportsList = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchUser, setSearchUser] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportedProfile, setReportedProfile] = useState<any>(null);
  const [reporterProfile, setReporterProfile] = useState<any>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [userPenalties, setUserPenalties] = useState<any[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase.from('reports').select('*').order('is_urgent', { ascending: false }).order('created_at', { ascending: false });
      if (filterCategory !== 'all') query = query.eq('category', filterCategory as any);
      if (filterStatus !== 'all') query = query.eq('status', filterStatus as any);
      const { data, error } = await query;
      if (error) throw error;
      setReports((data as Report[]) || []);
    } catch {
      toast.error('Erro ao carregar denúncias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, [filterCategory, filterStatus]);

  const openDetail = async (report: Report) => {
    setSelectedReport(report);
    setReviewerNotes(report.reviewer_notes || '');
    setUserPenalties([]);
    if (report.reported_user_id) {
      const [profileRes, penaltiesRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, avatar_url').eq('user_id', report.reported_user_id).single(),
        supabase.from('user_penalties').select('*').eq('user_id', report.reported_user_id).eq('is_active', true).order('created_at', { ascending: false }),
      ]);
      setReportedProfile(profileRes.data);
      setUserPenalties(penaltiesRes.data || []);
    } else { setReportedProfile(null); }
    const { data: reporter } = await supabase.from('profiles').select('user_id, full_name, avatar_url').eq('user_id', report.reporter_user_id).single();
    setReporterProfile(reporter);
  };

  const revokePenalty = async (penaltyId: string) => {
    if (!user) return;
    setRevokingId(penaltyId);
    try {
      const { error } = await supabase.rpc('revoke_penalty', { p_penalty_id: penaltyId, p_moderator_id: user.id });
      if (error) throw error;
      toast.success('Punição revogada com sucesso');
      setUserPenalties(prev => prev.filter(p => p.id !== penaltyId));
    } catch (err: any) {
      toast.error('Erro ao revogar: ' + (err.message || ''));
    } finally {
      setRevokingId(null);
    }
  };

  const updateStatus = async (status: string) => {
    if (!selectedReport || !user) return;
    setUpdating(true);
    try {
      const { error } = await supabase.from('reports').update({
        status: status as any,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        reviewer_notes: reviewerNotes.trim() || null,
      }).eq('id', selectedReport.id);
      if (error) throw error;
      toast.success(`Denúncia marcada como: ${STATUS_CONFIG[status]?.label || status}`);
      setSelectedReport(null);
      fetchReports();
    } catch {
      toast.error('Erro ao atualizar denúncia');
    } finally {
      setUpdating(false);
    }
  };

  const filtered = searchUser
    ? reports.filter(r => r.reported_user_id?.includes(searchUser) || r.reporter_user_id.includes(searchUser))
    : reports;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por ID..." value={searchUser} onChange={e => setSearchUser(e.target.value)} className="pl-8" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">Nenhuma denúncia encontrada.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(report => {
            const cfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.created;
            const Icon = cfg.icon;
            return (
              <Card key={report.id} className={`cursor-pointer hover:shadow-md transition-shadow ${report.is_urgent ? 'border-destructive/50' : ''}`} onClick={() => openDetail(report)}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {report.is_urgent && <Badge variant="destructive" className="text-xs">Urgente</Badge>}
                        <Badge variant={cfg.variant} className="text-xs gap-1"><Icon className="w-3 h-3" />{cfg.label}</Badge>
                        <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[report.category] || report.category}</Badge>
                      </div>
                      <p className="text-sm text-foreground line-clamp-1">{report.description || 'Sem descrição'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(report.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    </div>
                    <Eye className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedReport} onOpenChange={v => !v && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhes da Denúncia</DialogTitle></DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {selectedReport.is_urgent && <Badge variant="destructive">Urgente</Badge>}
                <Badge variant="outline">{CATEGORY_LABELS[selectedReport.category] || selectedReport.category}</Badge>
                <Badge variant={STATUS_CONFIG[selectedReport.status]?.variant || 'outline'}>{STATUS_CONFIG[selectedReport.status]?.label || selectedReport.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">Denunciante:</p>
                  <p className="text-muted-foreground">{reporterProfile?.full_name || 'Anônimo'}</p>
                </div>
                {reportedProfile && (
                  <div>
                    <p className="font-medium text-foreground">Denunciado:</p>
                    <div className="flex items-center gap-2">
                      {reportedProfile.avatar_url ? (
                        <img src={reportedProfile.avatar_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">{reportedProfile.full_name?.charAt(0)}</div>
                      )}
                      <span className="text-muted-foreground">{reportedProfile.full_name}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-1">Descrição:</p>
                <p className="text-sm text-muted-foreground">{selectedReport.description || 'Sem descrição'}</p>
              </div>

              {selectedReport.evidence_image_url && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Evidência:</p>
                  <img src={selectedReport.evidence_image_url} alt="Evidência" className="rounded-lg max-h-48 object-contain border border-border" />
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-foreground mb-1">Data:</p>
                <p className="text-sm text-muted-foreground">{format(new Date(selectedReport.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Notas do moderador:</p>
                <Textarea value={reviewerNotes} onChange={e => setReviewerNotes(e.target.value)} placeholder="Observações..." className="min-h-[80px]" />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => updateStatus('under_review')} disabled={updating || selectedReport.status === 'under_review'}>
                  <Clock className="w-4 h-4 mr-1" /> Em análise
                </Button>
                <Button size="sm" onClick={() => updateStatus('resolved')} disabled={updating || selectedReport.status === 'resolved'}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Resolver
                </Button>
                <Button size="sm" variant="secondary" onClick={() => updateStatus('dismissed')} disabled={updating || selectedReport.status === 'dismissed'}>
                  <XCircle className="w-4 h-4 mr-1" /> Descartar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
