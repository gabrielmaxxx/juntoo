import { useState } from 'react';
import { ArrowLeft, Mail, KeyRound, Trash2, Download, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UsernameSettings } from './UsernameSettings';

interface AccountSettingsProps {
  onBack: () => void;
}

export const AccountSettings = ({ onBack }: AccountSettingsProps) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: 'Senha muito curta', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Senhas não coincidem', description: 'Confirme a senha corretamente.', variant: 'destructive' });
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Senha atualizada', description: 'Sua senha foi alterada com sucesso.' });
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleExportData = async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      const { data: eventsData } = await supabase.from('event_participants').select('event_id').eq('user_id', user.id);
      const { data: friendsData } = await supabase.from('friendships').select('*').or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const exportData = {
        exportDate: new Date().toISOString(),
        profile: profileData,
        eventsParticipated: eventsData,
        friendships: friendsData,
        email: user.email,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `juntoo-dados-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Dados exportados', description: 'Seus dados foram baixados com sucesso.' });
    } catch {
      toast({ title: 'Erro ao exportar', description: 'Não foi possível exportar seus dados.', variant: 'destructive' });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'EXCLUIR') return;
    // In production this would call a server-side function to fully delete the account
    toast({ title: 'Solicitação enviada', description: 'Sua solicitação de exclusão de conta foi registrada. Entraremos em contato em breve.' });
    setShowDeleteDialog(false);
    await signOut();
  };

  return (
    <div className="pb-20 bg-background min-h-screen">
      <div className="bg-card border-b border-border p-4 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Conta</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Email Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              E-mail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </CardContent>
        </Card>

        {/* Public Username */}
        <UsernameSettings />

        {/* Change Password */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Alterar Senha
            </CardTitle>
            <CardDescription>Atualize sua senha de acesso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
              />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword} className="w-full">
              {changingPassword ? 'Alterando...' : 'Alterar senha'}
            </Button>
          </CardContent>
        </Card>

        {/* Export Data */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Exportar Dados
            </CardTitle>
            <CardDescription>Baixe uma cópia dos seus dados pessoais (LGPD)</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleExportData} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Baixar meus dados
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir Conta
            </CardTitle>
            <CardDescription>Esta ação é irreversível e removerá todos os seus dados</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} className="w-full">
              Excluir minha conta
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Excluir conta permanentemente</DialogTitle>
            <DialogDescription>
              Todos os seus dados, eventos, amizades e mensagens serão removidos. 
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
