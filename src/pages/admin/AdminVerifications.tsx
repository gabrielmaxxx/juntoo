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
import { Eye, CheckCircle, XCircle } from 'lucide-react';

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
  status: string;
  created_at: string;
  reviewer_notes: string | null;
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

  const openUserVerif = async (v: UserVerification) => {
    setSelectedUser(v);
    setNotes(v.reviewer_notes || '');
    const { data: p } = await supabase.from('profiles').select('full_name').eq('user_id', v.user_id).single();
    setProfileName(p?.full_name || 'N/A');
    // Get signed URLs
    const [doc, selfie] = await Promise.all([
      supabase.storage.from('verification-documents').createSignedUrl(v.document_url.replace('verification-documents/', ''), 300),
      supabase.storage.from('verification-documents').createSignedUrl(v.selfie_url.replace('verification-documents/', ''), 300),
    ]);
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
      console.error('Approve error:', e);
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
      console.error('Approve biz error:', e);
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
              {docUrl && <div><p className="text-xs font-medium mb-1">Documento</p><img src={docUrl} alt="Documento" className="rounded-lg max-h-48 object-contain" /></div>}
              {selfieUrl && <div><p className="text-xs font-medium mb-1">Selfie</p><img src={selfieUrl} alt="Selfie" className="rounded-lg max-h-48 object-contain" /></div>}
              <Textarea placeholder="Notas..." value={notes} onChange={e => setNotes(e.target.value)} />
              {selectedUser.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={approveUser}><CheckCircle className="w-3 h-3 mr-1" />Aprovar</Button>
                  <Button size="sm" variant="destructive" onClick={rejectUser}><XCircle className="w-3 h-3 mr-1" />Rejeitar</Button>
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
              <Textarea placeholder="Notas..." value={notes} onChange={e => setNotes(e.target.value)} />
              {selectedBiz.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={approveBiz}><CheckCircle className="w-3 h-3 mr-1" />Aprovar</Button>
                  <Button size="sm" variant="destructive" onClick={rejectBiz}><XCircle className="w-3 h-3 mr-1" />Rejeitar</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
