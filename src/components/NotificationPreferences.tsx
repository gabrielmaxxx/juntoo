import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell, Users, RefreshCw, MessageCircle, Sparkles, UserPlus, Clock } from 'lucide-react';

interface NotificationPreferences {
  event_join: boolean;
  participant_joined: boolean;
  event_updated: boolean;
  new_message: boolean;
  new_event: boolean;
  friend_request: boolean;
  event_reminder: boolean;
}

interface NotificationPreferencesPageProps {
  onBack: () => void;
}

const PREFERENCE_CONFIG = [
  {
    key: 'event_join' as const,
    label: 'Confirmação de presença',
    description: 'Receber notificação ao confirmar presença em um evento',
    icon: Bell,
    color: 'text-blue-500'
  },
  {
    key: 'participant_joined' as const,
    label: 'Novos participantes',
    description: 'Receber notificação quando alguém entra em um evento que você participa',
    icon: Users,
    color: 'text-orange-500'
  },
  {
    key: 'event_updated' as const,
    label: 'Atualizações de eventos',
    description: 'Receber notificação quando um evento que você participa é alterado',
    icon: RefreshCw,
    color: 'text-amber-500'
  },
  {
    key: 'new_message' as const,
    label: 'Mensagens no chat',
    description: 'Receber notificação de novas mensagens nos eventos que você participa',
    icon: MessageCircle,
    color: 'text-purple-500'
  },
  {
    key: 'new_event' as const,
    label: 'Novos eventos',
    description: 'Receber notificação de novos eventos que combinam com seus interesses',
    icon: Sparkles,
    color: 'text-pink-500'
  },
  {
    key: 'friend_request' as const,
    label: 'Solicitações de amizade',
    description: 'Receber notificação quando alguém envia uma solicitação de amizade',
    icon: UserPlus,
    color: 'text-green-500'
  },
  {
    key: 'event_reminder' as const,
    label: 'Lembretes de eventos',
    description: 'Receber lembretes antes dos eventos que você participa',
    icon: Clock,
    color: 'text-red-500'
  },
];

export const NotificationPreferencesPage = ({ onBack }: NotificationPreferencesPageProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    event_join: true,
    participant_joined: true,
    event_updated: true,
    new_message: true,
    new_event: true,
    friend_request: true,
    event_reminder: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!profile?.user_id) return;

      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', profile.user_id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setPreferences({
            event_join: data.event_join,
            participant_joined: data.participant_joined,
            event_updated: data.event_updated,
            new_message: data.new_message,
            new_event: data.new_event,
            friend_request: data.friend_request,
            event_reminder: data.event_reminder,
          });
        }
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [profile]);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    if (!profile?.user_id) return;

    const newValue = !preferences[key];
    const newPreferences = { ...preferences, [key]: newValue };
    setPreferences(newPreferences);

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: profile.user_id,
          ...newPreferences,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Preferência atualizada",
        description: newValue ? "Notificação ativada" : "Notificação desativada",
      });
    } catch (error) {
      console.error('Error updating preference:', error);
      setPreferences(preferences);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar a preferência.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="pb-20 bg-background min-h-screen">
      <div className="bg-card border-b border-border p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Preferências de Notificação</h1>
      </div>

      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notificações
            </CardTitle>
            <CardDescription>
              Escolha quais notificações você deseja receber
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {PREFERENCE_CONFIG.map((config) => {
              const Icon = config.icon;
              return (
                <div 
                  key={config.key}
                  className="flex items-center justify-between py-3 border-b border-border last:border-0"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                    <div className="flex-1">
                      <Label 
                        htmlFor={config.key} 
                        className="text-sm font-medium text-foreground cursor-pointer"
                      >
                        {config.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {config.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={config.key}
                    checked={preferences[config.key]}
                    onCheckedChange={() => handleToggle(config.key)}
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
