import { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Shield, HelpCircle, Info, Palette, UserCog, LogOut, ChevronRight, Moon, Sun, Lock, Eye, EyeOff, Users, MapPin, MessageCircle, Bug, FileText, Star, Heart, ExternalLink, Smartphone, Trash2, Download, Globe, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { NotificationPreferencesPage } from '@/components/NotificationPreferences';
import { PrivacySettings } from './PrivacySettings';
import { AccountSettings } from './AccountSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { SupportPage } from './SupportPage';
import { AboutPage } from './AboutPage';
import { ModerationPanel } from '@/components/reports/ModerationPanel';
import { supabase } from '@/integrations/supabase/client';

type SettingsView = 'main' | 'notifications' | 'privacy' | 'account' | 'appearance' | 'support' | 'about' | 'moderation';

interface SettingsPageProps {
  onBack: () => void;
}

interface SettingsItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
}

const SettingsItem = ({ icon, label, description, onClick, trailing, destructive }: SettingsItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors text-left ${destructive ? 'text-destructive' : ''}`}
  >
    <div className={`shrink-0 ${destructive ? 'text-destructive' : 'text-muted-foreground'}`}>{icon}</div>
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-medium ${destructive ? 'text-destructive' : 'text-foreground'}`}>{label}</p>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    {trailing || (onClick && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />)}
  </button>
);

const SettingsGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-2">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2">{title}</p>
    <Card className="mx-3 overflow-hidden">
      <CardContent className="p-0 divide-y divide-border">
        {children}
      </CardContent>
    </Card>
  </div>
);

export const SettingsPage = ({ onBack }: SettingsPageProps) => {
  const [view, setView] = useState<SettingsView>('main');
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('user_roles').select('role').eq('user_id', user.id).in('role', ['moderator', 'admin']).then(({ data }) => {
      setIsModerator(!!(data && data.length > 0));
    });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Sessão encerrada', description: 'Você saiu da sua conta com sucesso.' });
  };

  if (view === 'notifications') {
    return <NotificationPreferencesPage onBack={() => setView('main')} />;
  }
  if (view === 'privacy') {
    return <PrivacySettings onBack={() => setView('main')} />;
  }
  if (view === 'account') {
    return <AccountSettings onBack={() => setView('main')} />;
  }
  if (view === 'appearance') {
    return <AppearanceSettings onBack={() => setView('main')} />;
  }
  if (view === 'support') {
    return <SupportPage onBack={() => setView('main')} />;
  }
  if (view === 'about') {
    return <AboutPage onBack={() => setView('main')} />;
  }
  if (view === 'moderation') {
    return <ModerationPanel onBack={() => setView('main')} />;
  }

  return (
    <div className="pb-20 bg-background min-h-screen">
      <div className="bg-card border-b border-border p-4 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Configurações</h1>
      </div>

      {/* User info summary */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 px-1">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Conta pessoal</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 pb-8">
        <SettingsGroup title="Preferências">
          <SettingsItem
            icon={<Bell className="w-5 h-5" />}
            label="Notificações"
            description="Push, sons e preferências de alerta"
            onClick={() => setView('notifications')}
          />
          <SettingsItem
            icon={<Palette className="w-5 h-5" />}
            label="Aparência"
            description="Tema, idioma e personalização"
            onClick={() => setView('appearance')}
          />
        </SettingsGroup>

        <SettingsGroup title="Privacidade e Segurança">
          <SettingsItem
            icon={<Shield className="w-5 h-5" />}
            label="Privacidade"
            description="Visibilidade do perfil e dados"
            onClick={() => setView('privacy')}
          />
          <SettingsItem
            icon={<UserCog className="w-5 h-5" />}
            label="Conta"
            description="E-mail, senha e gerenciamento"
            onClick={() => setView('account')}
          />
        </SettingsGroup>

        <SettingsGroup title="Suporte">
          <SettingsItem
            icon={<HelpCircle className="w-5 h-5" />}
            label="Ajuda e Suporte"
            description="FAQ, contato e reportar problemas"
            onClick={() => setView('support')}
          />
          <SettingsItem
            icon={<Info className="w-5 h-5" />}
            label="Sobre o Juntoo"
            description="Versão, termos e políticas"
            onClick={() => setView('about')}
          />
        </SettingsGroup>

        {isModerator && (
          <SettingsGroup title="Moderação">
            <SettingsItem
              icon={<Flag className="w-5 h-5" />}
              label="Painel de Moderação"
              description="Visualizar e gerenciar denúncias"
              onClick={() => setView('moderation')}
            />
          </SettingsGroup>
        )}

        <SettingsGroup title="Sessão">
          <SettingsItem
            icon={<LogOut className="w-5 h-5" />}
            label="Sair da conta"
            description="Encerrar sessão atual"
            onClick={handleSignOut}
            destructive
          />
        </SettingsGroup>
      </div>
    </div>
  );
};
