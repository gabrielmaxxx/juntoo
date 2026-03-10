import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, User, Building2, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserVerification {
  id: string;
  user_id: string;
  document_url: string;
  selfie_url: string;
  status: string;
  created_at: string;
  reviewer_notes: string | null;
}

interface BusinessVerification {
  id: string;
  user_id: string;
  company_name: string;
  trade_name: string | null;
  cnpj: string;
  company_document_url: string;
  owner_document_url: string;
  status: string;
  created_at: string;
  reviewer_notes: string | null;
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'destructive' },
  approved: { label: 'Aprovado', variant: 'secondary' },
  rejected: { label: 'Rejeitado', variant: 'outline' },
};

export const VerificationReviews = () => {
  const { user } = useAuth();
  const [userVerifs, setUserVerifs] = useState<(UserVerification & { profile?: any })[]>([]);
  const [bizVerifs, setBizVerifs] = useState<(BusinessVerification & { profile?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<(UserVerification & { profile?: any }) | null>(null);
  const [selectedBiz, setSelectedBiz] = useState<(BusinessVerification & { profile?: any }) | null>(null);
  const [notes, setNotes] = useState('');
  const [acting, setActing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: uv }, { data: bv }] = await Promise.all([
      supabase.from('user_verifications').select('*').order('created_at', { ascending: false }),
      supabase.from('business_verifications').select('*').order('created_at', { ascending: false }),
    ]);

    // Fetch profiles
    const userIds = new Set([
      ...(uv || []).map(v => v.user_id),
      ...(bv || []).map(v => v.user_id),
    ]);
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, avatar_url').in('user_id', [...userIds]);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    setUserVerifs((uv || []).map(v => ({ ...v, profile: profileMap.get(v.user_id) })));
    setBizVerifs((bv || []).map(v => ({ ...v, profile: profileMap.get(v.user_id) })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getDocUrl = (path: string) => {
    const { data } = supabase.storage.from('verification-documents').getPublicUrl(path);
    return data.publicUrl;
  };

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage.from('verification-documents').createSignedUrl(path, 3600);
    return data?.signedUrl || '';
  };

  const handleUserAction = async (action: 'approve' | 'reject') => {
    if (!selectedUser || !user) return;
    setActing(true);
    try {
      if (action === 'approve') {
        const { error } = await supabase.rpc('approve_user_verification', {
          p_verification_id: selectedUser.id,
          p_moderator_id: user.id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_verifications').update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          reviewer_notes: notes || null,
        }).eq('id', selectedUser.id);
        if (error) throw error;
      }
      toast.success(action === 'approve' ? 'Verificação aprovada!' : 'Verificação rejeitada');
      setSelectedUser(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Erro');
    } finally {
      setActing(false);
    }
  };

  const handleBizAction = async (action: 'approve' | 'reject') => {
    if (!selectedBiz || !user) return;
    setActing(true);
    try {
      if (action === 'approve') {
        const { error } = await supabase.rpc('approve_business_verification', {
          p_verification_id: selectedBiz.id,
          p_moderator_id: user.id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('business_verifications').update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          reviewer_notes: notes || null,
        }).eq('id', selectedBiz.id);
        if (error) throw error;
      }
      toast.success(action === 'approve' ? 'Verificação aprovada!' : 'Verificação rejeitada');
      setSelectedBiz(null);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Erro');
    } finally {
      setActing(false);
    }
  };

  const [docUrls, setDocUrls] = useState<Record<string, string>>({});

  const loadDocUrl = async (path: string) => {
    if (docUrls[path]) return;
    const url = await getSignedUrl(path);
    setDocUrls(prev => ({ ...prev, [path]: url }));
  };

  useEffect(() => {
    if (selectedUser) {
      loadDocUrl(selectedUser.document_url);
      loadDocUrl(selectedUser.selfie_url);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (selectedBiz) {
      loadDocUrl(selectedBiz.company_document_url);
      loadDocUrl(selectedBiz.owner_document_url);
    }
  }, [selectedBiz]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const renderList = (items: any[], type: 'user' | 'biz') => {
    if (items.length === 0) return <p className="text-center py-8 text-muted-foreground">Nenhuma solicitação.</p>;
    return (
      <div className="space-y-2">
        {items.map(item => {
          const cfg = STATUS_BADGE[item.status] || STATUS_BADGE.pending;
          return (
            <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
              setNotes(item.reviewer_notes || '');
              type === 'user' ? setSelectedUser(item) : setSelectedBiz(item);
            }}>
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {type === 'user' ? <User className="w-4 h-4 text-muted-foreground shrink-0" /> : <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.profile?.full_name || 'Usuário'}</p>
                    {type === 'biz' && <p className="text-xs text-muted-foreground truncate">{item.company_name}</p>}
                    <p className="text-xs text-muted-foreground">{format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                  <Eye className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="users" className="flex-1 gap-1 text-xs"><User className="w-3.5 h-3.5" />Usuários ({userVerifs.length})</TabsTrigger>
          <TabsTrigger value="business" className="flex-1 gap-1 text-xs"><Building2 className="w-3.5 h-3.5" />Empresas ({bizVerifs.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="users">{renderList(userVerifs, 'user')}</TabsContent>
        <TabsContent value="business">{renderList(bizVerifs, 'biz')}</TabsContent>
      </Tabs>

      {/* User Verification Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={v => !v && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Verificação de Usuário</DialogTitle></DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{selectedUser.profile?.full_name}</p>
                <Badge variant={STATUS_BADGE[selectedUser.status]?.variant}>{STATUS_BADGE[selectedUser.status]?.label}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Documento</p>
                  {docUrls[selectedUser.document_url] ? (
                    <img src={docUrls[selectedUser.document_url]} className="rounded-lg border border-border max-h-40 object-contain w-full" alt="Documento" />
                  ) : <div className="h-40 bg-muted rounded-lg animate-pulse" />}
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Selfie</p>
                  {docUrls[selectedUser.selfie_url] ? (
                    <img src={docUrls[selectedUser.selfie_url]} className="rounded-lg border border-border max-h-40 object-contain w-full" alt="Selfie" />
                  ) : <div className="h-40 bg-muted rounded-lg animate-pulse" />}
                </div>
              </div>
              {selectedUser.status === 'pending' && (
                <>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas do moderador..." className="min-h-[60px]" />
                  <div className="flex gap-2">
                    <Button onClick={() => handleUserAction('approve')} disabled={acting} className="flex-1">
                      <CheckCircle className="w-4 h-4 mr-1" /> Aprovar
                    </Button>
                    <Button variant="destructive" onClick={() => handleUserAction('reject')} disabled={acting} className="flex-1">
                      <XCircle className="w-4 h-4 mr-1" /> Rejeitar
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Business Verification Dialog */}
      <Dialog open={!!selectedBiz} onOpenChange={v => !v && setSelectedBiz(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Verificação Empresarial</DialogTitle></DialogHeader>
          {selectedBiz && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-foreground">{selectedBiz.profile?.full_name}</p>
                <Badge variant={STATUS_BADGE[selectedBiz.status]?.variant}>{STATUS_BADGE[selectedBiz.status]?.label}</Badge>
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium text-foreground">Razão Social:</span> <span className="text-muted-foreground">{selectedBiz.company_name}</span></p>
                {selectedBiz.trade_name && <p><span className="font-medium text-foreground">Nome Fantasia:</span> <span className="text-muted-foreground">{selectedBiz.trade_name}</span></p>}
                <p><span className="font-medium text-foreground">CNPJ:</span> <span className="text-muted-foreground">{selectedBiz.cnpj}</span></p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Doc. Empresa</p>
                  {docUrls[selectedBiz.company_document_url] ? (
                    <img src={docUrls[selectedBiz.company_document_url]} className="rounded-lg border border-border max-h-40 object-contain w-full" alt="Doc empresa" />
                  ) : <div className="h-40 bg-muted rounded-lg animate-pulse" />}
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground mb-1">Doc. Responsável</p>
                  {docUrls[selectedBiz.owner_document_url] ? (
                    <img src={docUrls[selectedBiz.owner_document_url]} className="rounded-lg border border-border max-h-40 object-contain w-full" alt="Doc responsável" />
                  ) : <div className="h-40 bg-muted rounded-lg animate-pulse" />}
                </div>
              </div>
              {selectedBiz.status === 'pending' && (
                <>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas do moderador..." className="min-h-[60px]" />
                  <div className="flex gap-2">
                    <Button onClick={() => handleBizAction('approve')} disabled={acting} className="flex-1">
                      <CheckCircle className="w-4 h-4 mr-1" /> Aprovar
                    </Button>
                    <Button variant="destructive" onClick={() => handleBizAction('reject')} disabled={acting} className="flex-1">
                      <XCircle className="w-4 h-4 mr-1" /> Rejeitar
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
