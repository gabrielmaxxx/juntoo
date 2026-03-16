import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, CheckCircle, XCircle, Undo2 } from 'lucide-react';

interface UserVerification {
  id: string;
  user_id: string;
  document_url: string;
  selfie_url: string;
  status: string;
  created_at: string;
  reviewer_notes: string | null;
  reviewed_by: string | null;
}

interface BusinessVerification {
  id: string;
  user_id: string;
  company_name: string;
  trade_name: string | null;
  cnpj: string;
  status: string;
  created_at: string;
  reviewer_notes: string | null;
  reviewed_by: string | null;
}

export default function AdminVerifications() {
  const { user, logAction } = useAdminAuth();
  const [userVerifs, setUserVerifs] = useState<UserVerification[]>([]);
  const [bizVerifs, setBizVerifs] = useState<BusinessVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserVerification | null>(null);
  const [selectedBiz, setSelectedBiz] = useState<BusinessVerification | null>(null);
  const [notes, setNotes] = useState('');
  const [profileName, setProfileName] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    const [uv, bv] = await Promise.all([
      supabase.from('user_verifications').select('*').order('created_at', { ascending: false }),
      supabase.from('business_verifications').select('*').order('created_at', { ascending: false }),
    ]);
    setUserVerifs((uv.data as UserVerification[]) || []);
    setBizVerifs((bv.data as BusinessVerification[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Realtime sync between admins
  useEffect(() => {
    const channel = supabase.channel('admin-verifications-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_verifications' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_verifications' }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const openUserVerif = async (v: UserVerification) => {
    setSelectedUser(v);
    setNotes(v.reviewer_notes || '');
    const [profileRes, reviewerRes, doc, selfie] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('user_id', v.user_id).single(),
      v.reviewed_by ? supabase.from('profiles').select('full_name').eq('user_id', v.reviewed_by).single() : Promise.resolve({ data: null }),
      supabase.storage.from('verification-documents').createSignedUrl(v.document_url.replace('verification-documents/', ''), 300),
      supabase.storage.from('verification-documents').createSignedUrl(v.selfie_url.replace('verification-documents/', ''), 300),
    ]);
    setProfileName(profileRes.data?.full_name || 'N/A');
    setReviewerName(reviewerRes.data?.full_name || '');
    setDocUrl(doc.data?.signedUrl || '');
    setSelfieUrl(selfie.data?.signedUrl || '');
  };

  const approveUser = async () => {
    if (!selectedUser || !user) return;
    try {
      const { error } = await supabase.rpc('approve_user_verification', { p_verification_id: selectedUser.id, p_moderator_id: user.id });
      if (error) throw error;
      await logAction('approve_user_verification', 'verification', selectedUser.id, notes);
      toast.success('Verificação aprovada');
      setSelectedUser(null);
      fetchAll();
    } catch (e: any) { 
      toast.error(e.message || 'Erro ao aprovar'); 
    }
  };

  const rejectUser = async () => {
    if (!selectedUser) return;
    await supabase.from('user_verifications').update({ status: 'rejected', reviewer_notes: notes, reviewed_at: new Date().toISOString(), reviewed_by: user!.id }).eq('id', selectedUser.id);
    await logAction('reject_user_verification', 'verification', selectedUser.id, notes);
    toast.success('Verificação rejeitada');
    setSelectedUser(null);
    fetchAll();
  };

  const resetUserVerif = async () => {
    if (!selectedUser) return;
    await supabase.from('user_verifications').update({ status: 'pending', reviewer_notes: null, reviewed_at: null, reviewed_by: null }).eq('id', selectedUser.id);
    // If it was approved, also revert profile verification
    if (selectedUser.status === 'approved') {
      await supabase.from('profiles').update({ verified: false, verification_level: 0 }).eq('user_id', selectedUser.user_id);
    }
    await logAction('reset_user_verification', 'verification', selectedUser.id, 'Verificação redefinida');
    toast.success('Verificação redefinida para pendente');
    setSelectedUser(null);
    fetchAll();
  };

  const approveBiz = async () => {
    if (!selectedBiz || !user) return;
    try {
      const { error } = await supabase.rpc('approve_business_verification', { p_verification_id: selectedBiz.id, p_moderator_id: user.id });
      if (error) throw error;
      await logAction('approve_business_verification', 'verification', selectedBiz.id, notes);
      toast.success('Verificação empresarial aprovada');
      setSelectedBiz(null);
      fetchAll();
    } catch (e: any) { 
      toast.error(e.message || 'Erro ao aprovar'); 
    }
  };

  const rejectBiz = async () => {
    if (!selectedBiz) return;
    await supabase.from('business_verifications').update({ status: 'rejected', reviewer_notes: notes, reviewed_at: new Date().toISOString(), reviewed_by: user!.id }).eq('id', selectedBiz.id);
    await logAction('reject_business_verification', 'verification', selectedBiz.id, notes);
    toast.success('Verificação rejeitada');
    setSelectedBiz(null);
    fetchAll();
  };

  const resetBizVerif = async () => {
    if (!selectedBiz) return;
    await supabase.from('business_verifications').update({ status: 'pending', reviewer_notes: null, reviewed_at: null, reviewed_by: null }).eq('id', selectedBiz.id);
    if (selectedBiz.status === 'approved') {
      await supabase.from('profiles').update({ business_verified: false, verification_level: 0 }).eq('user_id', selectedBiz.user_id);
    }
    await logAction('reset_business_verification', 'verification', selectedBiz.id, 'Verificação redefinida');
    toast.success('Verificação redefinida para pendente');
    setSelectedBiz(null);
    fetchAll();
  };

  const statusBadge = (s: string) => {
    if (s === 'approved') return <Badge variant="secondary">Aprovada</Badge>;
    if (s === 'rejected') return <Badge variant="destructive">Rejeitada</Badge>;
    return <Badge variant="default">Pendente</Badge>;
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Central de Verificação</h1>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Usuários ({userVerifs.length})</TabsTrigger>
          <TabsTrigger value="business">Empresas ({bizVerifs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {userVerifs.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="text-xs font-mono">{v.user_id.slice(0, 8)}...</TableCell>
                      <TableCell>{statusBadge(v.status)}</TableCell>
                      <TableCell className="text-xs">{format(new Date(v.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</TableCell>
                      <TableCell><Button variant="ghost" size="sm" onClick={() => openUserVerif(v)}><Eye className="w-4 h-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Empresa</TableHead><TableHead>CNPJ</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {bizVerifs.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.company_name}</TableCell>
                      <TableCell className="text-xs font-mono">{v.cnpj}</TableCell>
                      <TableCell>{statusBadge(v.status)}</TableCell>
                      <TableCell className="text-xs">{format(new Date(v.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</TableCell>
                      <TableCell><Button variant="ghost" size="sm" onClick={() => { setSelectedBiz(v); setNotes(v.reviewer_notes || ''); }}><Eye className="w-4 h-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User verification dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Verificação de Usuário</DialogTitle></DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <p className="text-sm"><span className="text-muted-foreground">Usuário:</span> {profileName}</p>
              <p className="text-sm"><span className="text-muted-foreground">Status:</span> {statusBadge(selectedUser.status)}</p>

              {selectedUser.status !== 'pending' && reviewerName && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Revisado por:</span> {reviewerName}
                  </p>
                  {selectedUser.reviewer_notes && (
                    <p className="text-muted-foreground mt-1">
                      <span className="font-medium text-foreground">Notas:</span> {selectedUser.reviewer_notes}
                    </p>
                  )}
                </div>
              )}

              {docUrl && <div><p className="text-xs font-medium mb-1">Documento</p><img src={docUrl} alt="Documento" className="rounded-lg max-h-48 object-contain" /></div>}
              {selfieUrl && <div><p className="text-xs font-medium mb-1">Selfie</p><img src={selfieUrl} alt="Selfie" className="rounded-lg max-h-48 object-contain" /></div>}

              {selectedUser.status === 'pending' ? (
                <>
                  <Textarea placeholder="Notas..." value={notes} onChange={e => setNotes(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={approveUser}><CheckCircle className="w-3 h-3 mr-1" />Aprovar</Button>
                    <Button size="sm" variant="destructive" onClick={rejectUser}><XCircle className="w-3 h-3 mr-1" />Rejeitar</Button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={resetUserVerif} className="gap-1">
                    <Undo2 className="w-3 h-3" />Redefinir para pendente
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Business verification dialog */}
      <Dialog open={!!selectedBiz} onOpenChange={() => setSelectedBiz(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Verificação Empresarial</DialogTitle></DialogHeader>
          {selectedBiz && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Empresa:</span> {selectedBiz.company_name}</div>
                <div><span className="text-muted-foreground">Nome Fantasia:</span> {selectedBiz.trade_name || '—'}</div>
                <div><span className="text-muted-foreground">CNPJ:</span> {selectedBiz.cnpj}</div>
                <div><span className="text-muted-foreground">Status:</span> {statusBadge(selectedBiz.status)}</div>
              </div>

              {selectedBiz.status !== 'pending' && selectedBiz.reviewer_notes && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Notas:</span> {selectedBiz.reviewer_notes}
                  </p>
                </div>
              )}

              {selectedBiz.status === 'pending' ? (
                <>
                  <Textarea placeholder="Notas..." value={notes} onChange={e => setNotes(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={approveBiz}><CheckCircle className="w-3 h-3 mr-1" />Aprovar</Button>
                    <Button size="sm" variant="destructive" onClick={rejectBiz}><XCircle className="w-3 h-3 mr-1" />Rejeitar</Button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={resetBizVerif} className="gap-1">
                    <Undo2 className="w-3 h-3" />Redefinir para pendente
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
