import { useState, useEffect } from 'react';
import { ArrowLeft, Eye, MapPin, Users, MessageCircle, Shield, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PrivacySettingsProps {
  onBack: () => void;
}

interface PrivacyPrefs {
  show_profile_public: boolean;
  show_location: boolean;
  allow_friend_requests: boolean;
  allow_direct_messages: boolean;
  show_online_status: boolean;
  show_events_participated: boolean;
}

const DEFAULT_PREFS: PrivacyPrefs = {
  show_profile_public: true,
  show_location: true,
  allow_friend_requests: true,
  allow_direct_messages: true,
  show_online_status: true,
  show_events_participated: true,
};

const PRIVACY_ITEMS = [
  {
    key: 'show_profile_public' as const,
    label: 'Perfil público',
    description: 'Permitir que qualquer pessoa veja seu perfil',
    icon: Eye,
    color: 'text-blue-500',
  },
  {
    key: 'show_location' as const,
    label: 'Mostrar localização',
    description: 'Exibir sua cidade no perfil',
    icon: MapPin,
    color: 'text-green-500',
  },
  {
    key: 'allow_friend_requests' as const,
    label: 'Solicitações de amizade',
    description: 'Permitir que outros usuários enviem solicitações',
    icon: Users,
    color: 'text-purple-500',
  },
  {
    key: 'allow_direct_messages' as const,
    label: 'Mensagens diretas',
    description: 'Permitir que qualquer pessoa envie mensagens',
    icon: MessageCircle,
    color: 'text-orange-500',
  },
  {
    key: 'show_online_status' as const,
    label: 'Status online',
    description: 'Mostrar quando você está ativo na plataforma',
    icon: Shield,
    color: 'text-cyan-500',
  },
  {
    key: 'show_events_participated' as const,
    label: 'Eventos participados',
    description: 'Exibir no perfil os eventos que você participou',
    icon: Lock,
    color: 'text-amber-500',
  },
];

export const PrivacySettings = ({ onBack }: PrivacySettingsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<PrivacyPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPrefs = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('privacy_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setPrefs({
            show_profile_public: data.show_profile_public,
            show_location: data.show_location,
            allow_friend_requests: data.allow_friend_requests,
            allow_direct_messages: data.allow_direct_messages,
            show_online_status: data.show_online_status,
            show_events_participated: data.show_events_participated,
          });
        }
      } catch (err) {
        console.error('Error fetching privacy preferences:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, [user]);

  const handleToggle = async (key: keyof PrivacyPrefs) => {
    if (!user) return;

    const newValue = !prefs[key];
    const updated = { ...prefs, [key]: newValue };
    setPrefs(updated);

    setSaving(true);
    try {
      const { error } = await supabase
        .from('privacy_preferences')
        .upsert({
          user_id: user.id,
          ...updated,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: 'Preferência atualizada',
        description: newValue ? 'Ativado' : 'Desativado',
      });
    } catch (err) {
      console.error('Error saving privacy preference:', err);
      setPrefs({ ...prefs }); // rollback
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar a preferência.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="pb-20 bg-background min-h-screen">
      <div className="bg-card border-b border-border p-4 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Privacidade</h1>
      </div>

      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Controle de Privacidade
            </CardTitle>
            <CardDescription>
              Gerencie quem pode ver suas informações e interagir com você
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {PRIVACY_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className={`h-5 w-5 mt-0.5 ${item.color}`} />
                    <div className="flex-1">
                      <Label htmlFor={item.key} className="text-sm font-medium text-foreground cursor-pointer">
                        {item.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                  </div>
                  <Switch
                    id={item.key}
                    checked={prefs[item.key]}
                    onCheckedChange={() => handleToggle(item.key)}
                    disabled={saving}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
