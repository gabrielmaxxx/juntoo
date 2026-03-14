import { useState, useEffect } from 'react';
import { ArrowLeft, Shield, CheckCircle, Upload, Camera, FileText, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VerificationSettingsProps {
  onBack: () => void;
}

type Step = 'info' | 'document' | 'selfie' | 'confirm' | 'business_form' | 'business_docs' | 'business_confirm';

export const VerificationSettings = ({ onBack }: VerificationSettingsProps) => {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<Step>('info');
  const [status, setStatus] = useState<string | null>(null);
  const [businessStatus, setBusinessStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // User verification
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  // Business verification
  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [companyDocFile, setCompanyDocFile] = useState<File | null>(null);
  const [ownerDocFile, setOwnerDocFile] = useState<File | null>(null);

  const isVerified = profile?.verified;
  const isBusinessVerified = profile?.business_verified;
  const accountType = profile?.account_type || 'user';

  useEffect(() => {
    if (!user) return;
    const fetchStatus = async () => {
      const { data: uv } = await supabase
        .from('user_verifications')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (uv && uv.length > 0) setStatus(uv[0].status);

      const { data: bv } = await supabase
        .from('business_verifications')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (bv && bv.length > 0) setBusinessStatus(bv[0].status);

      setLoading(false);
    };
    fetchStatus();

    // Subscribe to changes so approval/rejection reflects in real-time
    const channel = supabase
      .channel('verification-status')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'user_verifications', 
        filter: `user_id=eq.${user.id}` 
      }, (payload) => {
        setStatus((payload.new as any).status);
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'business_verifications', 
        filter: `user_id=eq.${user.id}` 
      }, (payload) => {
        setBusinessStatus((payload.new as any).status);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split('.').pop();
    const path = `${user!.id}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('verification-documents').upload(path, file);
    if (error) throw error;
    return path;
  };

  const handleUserSubmit = async () => {
    if (!documentFile || !selfieFile || !user) return;
    setSubmitting(true);
    try {
      const docPath = await uploadFile(documentFile, 'document');
      const selfiePath = await uploadFile(selfieFile, 'selfie');

      const { error } = await supabase.from('user_verifications').insert({
        user_id: user.id,
        document_url: docPath,
        selfie_url: selfiePath,
      });
      if (error) throw error;

      setStatus('pending');
      setStep('info');
      toast.success('Solicitação enviada! Sua verificação será analisada pela equipe.');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar verificação');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBusinessSubmit = async () => {
    if (!companyDocFile || !ownerDocFile || !user || !companyName || !cnpj) return;
    setSubmitting(true);
    try {
      const compDocPath = await uploadFile(companyDocFile, 'company-doc');
      const ownerDocPath = await uploadFile(ownerDocFile, 'owner-doc');

      const { error } = await supabase.from('business_verifications').insert({
        user_id: user.id,
        company_name: companyName,
        trade_name: tradeName || null,
        cnpj,
        company_document_url: compDocPath,
        owner_document_url: ownerDocPath,
      });
      if (error) throw error;

      setBusinessStatus('pending');
      setStep('info');
      toast.success('Verificação empresarial enviada!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar verificação empresarial');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Step-based flows
  if (step === 'document') {
    return (
      <div className="pb-20 bg-background min-h-screen">
        <div className="bg-card border-b border-border p-4 flex items-center gap-3 sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setStep('info')}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-lg font-semibold text-foreground">Etapa 1 — Documento</h1>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">Envie uma foto do seu documento de identidade (RG, CNH ou Passaporte).</p>
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <Label htmlFor="doc-upload" className="cursor-pointer">
              <span className="text-sm font-medium text-primary">{documentFile ? documentFile.name : 'Selecionar documento'}</span>
            </Label>
            <Input id="doc-upload" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => setDocumentFile(e.target.files?.[0] || null)} />
          </div>
          <Button className="w-full" disabled={!documentFile} onClick={() => setStep('selfie')}>Próximo</Button>
        </div>
      </div>
    );
  }

  if (step === 'selfie') {
    return (
      <div className="pb-20 bg-background min-h-screen">
        <div className="bg-card border-b border-border p-4 flex items-center gap-3 sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setStep('document')}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-lg font-semibold text-foreground">Etapa 2 — Selfie</h1>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">Tire uma selfie segurando o documento ao lado do rosto.</p>
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <Label htmlFor="selfie-upload" className="cursor-pointer">
              <span className="text-sm font-medium text-primary">{selfieFile ? selfieFile.name : 'Selecionar selfie'}</span>
            </Label>
            <Input id="selfie-upload" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => setSelfieFile(e.target.files?.[0] || null)} />
          </div>
          <Button className="w-full" disabled={!selfieFile} onClick={() => setStep('confirm')}>Próximo</Button>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="pb-20 bg-background min-h-screen">
        <div className="bg-card border-b border-border p-4 flex items-center gap-3 sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setStep('selfie')}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-lg font-semibold text-foreground">Etapa 3 — Confirmar</h1>
        </div>
        <div className="p-4 space-y-4">
          <Card><CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Documento: <span className="text-muted-foreground">{documentFile?.name}</span></p>
            <p className="text-sm font-medium text-foreground">Selfie: <span className="text-muted-foreground">{selfieFile?.name}</span></p>
          </CardContent></Card>
          <p className="text-xs text-muted-foreground">Seus documentos são confidenciais e acessíveis apenas pela equipe de moderação.</p>
          <Button className="w-full" onClick={handleUserSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            Enviar verificação
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'business_form') {
    return (
      <div className="pb-20 bg-background min-h-screen">
        <div className="bg-card border-b border-border p-4 flex items-center gap-3 sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setStep('info')}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-lg font-semibold text-foreground">Dados da Empresa</h1>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Razão Social *</Label>
            <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Nome legal da empresa" />
          </div>
          <div className="space-y-2">
            <Label>Nome Fantasia</Label>
            <Input value={tradeName} onChange={e => setTradeName(e.target.value)} placeholder="Nome comercial" />
          </div>
          <div className="space-y-2">
            <Label>CNPJ *</Label>
            <Input value={cnpj} onChange={e => setCnpj(formatCNPJ(e.target.value))} placeholder="00.000.000/0000-00" />
          </div>
          <Button className="w-full" disabled={!companyName || cnpj.replace(/\D/g, '').length !== 14} onClick={() => setStep('business_docs')}>Próximo</Button>
        </div>
      </div>
    );
  }

  if (step === 'business_docs') {
    return (
      <div className="pb-20 bg-background min-h-screen">
        <div className="bg-card border-b border-border p-4 flex items-center gap-3 sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setStep('business_form')}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-lg font-semibold text-foreground">Documentos da Empresa</h1>
        </div>
        <div className="p-4 space-y-4">
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
            <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-2">Documento da empresa (contrato social, alvará, etc.)</p>
            <Label htmlFor="comp-doc" className="cursor-pointer">
              <span className="text-sm font-medium text-primary">{companyDocFile ? companyDocFile.name : 'Selecionar'}</span>
            </Label>
            <Input id="comp-doc" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => setCompanyDocFile(e.target.files?.[0] || null)} />
          </div>
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground mb-2">Documento do responsável legal</p>
            <Label htmlFor="owner-doc" className="cursor-pointer">
              <span className="text-sm font-medium text-primary">{ownerDocFile ? ownerDocFile.name : 'Selecionar'}</span>
            </Label>
            <Input id="owner-doc" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => setOwnerDocFile(e.target.files?.[0] || null)} />
          </div>
          <Button className="w-full" disabled={!companyDocFile || !ownerDocFile} onClick={() => setStep('business_confirm')}>Próximo</Button>
        </div>
      </div>
    );
  }

  if (step === 'business_confirm') {
    return (
      <div className="pb-20 bg-background min-h-screen">
        <div className="bg-card border-b border-border p-4 flex items-center gap-3 sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setStep('business_docs')}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-lg font-semibold text-foreground">Confirmar</h1>
        </div>
        <div className="p-4 space-y-4">
          <Card><CardContent className="p-4 space-y-1 text-sm">
            <p><span className="font-medium text-foreground">Razão Social:</span> <span className="text-muted-foreground">{companyName}</span></p>
            {tradeName && <p><span className="font-medium text-foreground">Nome Fantasia:</span> <span className="text-muted-foreground">{tradeName}</span></p>}
            <p><span className="font-medium text-foreground">CNPJ:</span> <span className="text-muted-foreground">{cnpj}</span></p>
          </CardContent></Card>
          <p className="text-xs text-muted-foreground">Documentos são confidenciais e acessíveis apenas pela equipe de moderação.</p>
          <Button className="w-full" onClick={handleBusinessSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            Enviar verificação empresarial
          </Button>
        </div>
      </div>
    );
  }

  // Info / main screen
  const statusLabel: Record<string, { text: string; color: string }> = {
    pending: { text: 'Em análise', color: 'text-yellow-600' },
    approved: { text: 'Aprovado', color: 'text-green-600' },
    rejected: { text: 'Rejeitado', color: 'text-destructive' },
  };

  return (
    <div className="pb-20 bg-background min-h-screen">
      <div className="bg-card border-b border-border p-4 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-lg font-semibold text-foreground">Verificação de Identidade</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* User Verification */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Verificação Pessoal</h2>
            </div>

            {isVerified ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Verificado ✔</span>
              </div>
            ) : status ? (
              <div>
                <p className="text-sm">Status: <span className={`font-medium ${statusLabel[status]?.color || ''}`}>{statusLabel[status]?.text || status}</span></p>
                {status === 'rejected' && (
                  <Button size="sm" className="mt-2" onClick={() => setStep('document')}>Tentar novamente</Button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <p>✔ Selo de verificado no perfil</p>
                  <p>✔ Mais confiança na comunidade</p>
                  <p>✔ Maior visibilidade em eventos</p>
                  <p>✔ +5 de bônus na reputação</p>
                </div>
                <Button onClick={() => setStep('document')} className="w-full">
                  <Shield className="w-4 h-4 mr-2" /> Iniciar verificação
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Business Verification */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Verificação Empresarial</h2>
              <Badge variant="secondary" className="text-xs">Empresas</Badge>
            </div>

            {isBusinessVerified ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">🏢 Empresa Verificada</span>
              </div>
            ) : businessStatus ? (
              <div>
                <p className="text-sm">Status: <span className={`font-medium ${statusLabel[businessStatus]?.color || ''}`}>{statusLabel[businessStatus]?.text || businessStatus}</span></p>
                {businessStatus === 'rejected' && (
                  <Button size="sm" className="mt-2" onClick={() => setStep('business_form')}>Tentar novamente</Button>
                )}
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Verifique sua empresa para obter o selo 🏢 Empresa Verificada e mais credibilidade.</p>
                <Button variant="outline" onClick={() => setStep('business_form')} className="w-full">
                  <Building2 className="w-4 h-4 mr-2" /> Verificar empresa
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
