import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Shield, Eye, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  created: { label: 'Novo', variant: 'destructive', icon: AlertTriangle },
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
}

interface ReportedProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface ModerationPanelProps {
  onBack: () => void;
}

export const ModerationPanel = ({ onBack }: ModerationPanelProps) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportedProfile, setReportedProfile] = useState<ReportedProfile | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    checkModeratorRole();
  }, [user]);

  const checkModeratorRole = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['moderator', 'admin']);
    
    if (data && data.length > 0) {
      setIsModerator(true);
      fetchReports();
    } else {
      setIsModerator(false);
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase.from('reports').select('*').order('is_urgent', { ascending: false }).order('created_at', { ascending: false });
      
      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory as any);
      }
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReports((data as Report[]) || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
      toast.error('Erro ao carregar denúncias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isModerator) fetchReports();
  }, [filterCategory, filterStatus, isModerator]);

  const openReportDetail = async (report: Report) => {
    setSelectedReport(report);
    setReviewerNotes(report.reviewer_notes || '');
    
    if (report.reported_user_id) {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .eq('user_id', report.reported_user_id)
        .single();
      setReportedProfile(data);
    } else {
      setReportedProfile(null);
    }
  };

  const updateReportStatus = async (status: string) => {
    if (!selectedReport || !user) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: status as any,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          reviewer_notes: reviewerNotes.trim() || null,
        })
        .eq('id', selectedReport.id);

      if (error) throw error;
      toast.success(`Denúncia marcada como: ${STATUS_CONFIG[status]?.label || status}`);
      setSelectedReport(null);
      fetchReports();
    } catch (err) {
      console.error('Error updating report:', err);
      toast.error('Erro ao atualizar denúncia');
    } finally {
      setUpdating(false);
    }
  };

  if (!isModerator && !loading) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={onBack} className="mb-4 gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Acesso restrito a moderadores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold text-foreground">Painel de Moderação</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
              <SelectItem key={value} value={value}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhuma denúncia encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.created;
            const StatusIcon = statusCfg.icon;
            return (
              <Card
                key={report.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${report.is_urgent ? 'border-destructive/50' : ''}`}
                onClick={() => openReportDetail(report)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {report.is_urgent && (
                          <Badge variant="destructive" className="text-xs">Urgente</Badge>
                        )}
                        <Badge variant={statusCfg.variant} className="text-xs gap-1">
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {CATEGORY_LABELS[report.category] || report.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2 mt-1">
                        {report.description || 'Sem descrição'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(report.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Report Detail Modal */}
      <Dialog open={!!selectedReport} onOpenChange={(v) => !v && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Detalhes da Denúncia
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {selectedReport.is_urgent && (
                  <Badge variant="destructive">Urgente</Badge>
                )}
                <Badge variant="outline">
                  {CATEGORY_LABELS[selectedReport.category] || selectedReport.category}
                </Badge>
                <Badge variant={STATUS_CONFIG[selectedReport.status]?.variant || 'outline'}>
                  {STATUS_CONFIG[selectedReport.status]?.label || selectedReport.status}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-1">Descrição:</p>
                <p className="text-sm text-muted-foreground">{selectedReport.description || 'Sem descrição'}</p>
              </div>

              {reportedProfile && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Usuário denunciado:</p>
                  <div className="flex items-center gap-2">
                    {reportedProfile.avatar_url ? (
                      <img src={reportedProfile.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">{reportedProfile.full_name.charAt(0)}</span>
                      </div>
                    )}
                    <span className="text-sm text-foreground">{reportedProfile.full_name}</span>
                  </div>
                </div>
              )}

              {selectedReport.reported_event_id && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Evento denunciado:</p>
                  <p className="text-xs text-muted-foreground font-mono">{selectedReport.reported_event_id}</p>
                </div>
              )}

              {selectedReport.evidence_image_url && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Evidência:</p>
                  <img
                    src={selectedReport.evidence_image_url}
                    alt="Evidência"
                    className="rounded-lg max-h-48 object-contain border border-border"
                  />
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-foreground mb-1">Data:</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedReport.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>

              {/* Reviewer notes */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Notas do moderador:</p>
                <Textarea
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="Adicione observações sobre esta denúncia..."
                  className="min-h-[80px]"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateReportStatus('under_review')}
                  disabled={updating || selectedReport.status === 'under_review'}
                >
                  <Clock className="w-4 h-4 mr-1" /> Em análise
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateReportStatus('resolved')}
                  disabled={updating || selectedReport.status === 'resolved'}
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Resolver
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => updateReportStatus('dismissed')}
                  disabled={updating || selectedReport.status === 'dismissed'}
                >
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
