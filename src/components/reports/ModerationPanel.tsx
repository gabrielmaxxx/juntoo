import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Shield, FileText, Users, BarChart3, BadgeCheck } from 'lucide-react';
import { ReportsList } from '@/components/moderation/ReportsList';
import { ReportedUsers } from '@/components/moderation/ReportedUsers';
import { ModerationStats } from '@/components/moderation/ModerationStats';
import { VerificationReviews } from '@/components/moderation/VerificationReviews';
import { ReportsList } from '@/components/moderation/ReportsList';
import { ReportedUsers } from '@/components/moderation/ReportedUsers';
import { ModerationStats } from '@/components/moderation/ModerationStats';

interface ModerationPanelProps {
  onBack: () => void;
}

export const ModerationPanel = ({ onBack }: ModerationPanelProps) => {
  const { user } = useAuth();
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('user_roles').select('role').eq('user_id', user.id).in('role', ['moderator', 'admin']).then(({ data }) => {
      setIsModerator(!!(data && data.length > 0));
      setLoading(false);
    });
  }, [user]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  if (!isModerator) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={onBack} className="mb-4 gap-2"><ArrowLeft className="w-4 h-4" /> Voltar</Button>
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Acesso restrito a moderadores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold text-foreground">Moderação</h1>
      </div>

      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="reports" className="flex-1 gap-1 text-xs"><FileText className="w-3.5 h-3.5" />Denúncias</TabsTrigger>
          <TabsTrigger value="users" className="flex-1 gap-1 text-xs"><Users className="w-3.5 h-3.5" />Usuários</TabsTrigger>
          <TabsTrigger value="verifications" className="flex-1 gap-1 text-xs"><BadgeCheck className="w-3.5 h-3.5" />Verificações</TabsTrigger>
          <TabsTrigger value="stats" className="flex-1 gap-1 text-xs"><BarChart3 className="w-3.5 h-3.5" />Stats</TabsTrigger>
        </TabsList>
        <TabsContent value="reports"><ReportsList /></TabsContent>
        <TabsContent value="users"><ReportedUsers /></TabsContent>
        <TabsContent value="verifications"><VerificationReviews /></TabsContent>
        <TabsContent value="stats"><ModerationStats /></TabsContent>
      </Tabs>
    </div>
  );
};
