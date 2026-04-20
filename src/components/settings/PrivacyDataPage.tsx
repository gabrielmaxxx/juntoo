import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Trash2, Eye, FileText, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';

interface PrivacyDataPageProps {
  onBack: () => void;
}

export const PrivacyDataPage = ({ onBack }: PrivacyDataPageProps) => {
  const { user, signOut } = useAuth();
  const { profile } = useAuthContext();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();
  const [requests, setRequests] = useState<any[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_data_requests' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }: any) => setRequests(data || []));
  }, [user]);

  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const [profileRes, createdEventsRes, participatedEventsRes, reviewsGivenRes, consentsRes] = await Promise.all([
        supabase.from('profiles').select('full_name, username, bio, city, interests, created_at, updated_at').eq('user_id', user.id).single(),
        supabase.from('events').select('id, title, category, date, time, location, city, state, created_at').eq('created_by', user.id).order('date', { ascending: false }),
        supabase.from('event_participants').select('joined_at, event_id, events(id, title, category, date, time, location, city, state)').eq('user_id', user.id),
        supabase.from('user_reviews').select('id, event_id, reviewed_user_id, respect_rating, punctuality_rating, reliability_rating, communication_rating, safety_rating, overall_rating, comment, created_at').eq('reviewer_user_id', user.id),
        supabase.from('user_consents' as any).select('accepted_terms_version, accepted_privacy_version, created_at').eq('user_id', user.id),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        perfil: profileRes.data,
        interesses: profileRes.data?.interests || [],
        eventosCriados: createdEventsRes.data || [],
        eventosParticipados: participatedEventsRes.data || [],
        avaliacoesDadas: reviewsGivenRes.data || [],
        consentimentos: (consentsRes as any).data || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `juntoo-meus-dados-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      await supabase.from('user_data_requests' as any).insert({
        user_id: user.id,
        request_type: 'export',
        status: 'completed',
        completed_at: new Date().toISOString(),
      } as any);

      logActivity('data_export', { type: 'lgpd_export' });
      toast({ title: 'Dados exportados', description: 'Seus dados foram baixados com sucesso.' });
    } catch {
      toast({ title: 'Erro ao exportar', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'EXCLUIR' || !user) return;

    const { error } = await supabase.functions.invoke('delete-account', { body: {} });

    if (error) {
      toast({ title: 'Erro ao excluir conta', description: error.message, variant: 'destructive' });
      return;
    }

    logActivity('account_deleted_anonymized');
    toast({
      title: 'Conta excluída',
      description: 'Sua conta foi excluída. Seus dados pessoais foram removidos.',
    });
    setShowDeleteDialog(false);
    await signOut();
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    processing: 'Processando',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };

  return (
    <div className="pb-20 bg-background min-h-screen">
      <div className="bg-card border-b border-border p-4 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Privacidade e Dados</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* View registered data */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Seus Dados Cadastrados
            </CardTitle>
            <CardDescription>Informações armazenadas no Juntoo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Nome:</span>
              <span className="font-medium">{profile?.full_name || '—'}</span>
              <span className="text-muted-foreground">E-mail:</span>
              <span className="font-medium">{user?.email || '—'}</span>
              <span className="text-muted-foreground">Cidade:</span>
              <span className="font-medium">{profile?.city || '—'}</span>
              <span className="text-muted-foreground">Conta criada:</span>
              <span className="font-medium">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR') : '—'}
              </span>
              <span className="text-muted-foreground">Interesses:</span>
              <span className="font-medium">
                {profile?.interests?.join(', ') || '—'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Export data */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Exportar Dados (LGPD)
            </CardTitle>
            <CardDescription>Baixe uma cópia completa dos seus dados pessoais</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleExportData} disabled={exporting} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              {exporting ? 'Exportando...' : 'Baixar meus dados'}
            </Button>
          </CardContent>
        </Card>

        {/* Delete account */}
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir Conta
            </CardTitle>
            <CardDescription>
              Solicita a remoção dos seus dados pessoais. Dados necessários para compliance serão anonimizados e mantidos conforme a LGPD.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} className="w-full">
              Solicitar exclusão de conta
            </Button>
          </CardContent>
        </Card>

        {/* Request history */}
        {requests.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Histórico de Solicitações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {requests.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    {req.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      {req.request_type === 'export' ? 'Exportação de dados' : 'Exclusão de conta'}
                    </span>
                  </div>
                  <Badge variant={req.status === 'completed' ? 'default' : 'secondary'}>
                    {statusLabels[req.status] || req.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Excluir conta permanentemente</DialogTitle>
            <DialogDescription>
              Todos os seus dados pessoais serão removidos. Logs de auditoria serão anonimizados conforme a LGPD.
              Digite <strong>EXCLUIR</strong> para confirmar.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Digite EXCLUIR"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'EXCLUIR'}>
              Confirmar exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
