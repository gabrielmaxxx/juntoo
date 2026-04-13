import { Bell, Calendar, Users, AlertTriangle, Star, XCircle, Clock, Trophy, Sparkles, UserPlus, UserCheck, RefreshCw, MessageCircle } from 'lucide-react';

/**
 * Notification trigger types and their display configuration.
 * Used for rendering notifications in the panel and for push payloads.
 */

export const NOTIFICATION_TRIGGERS = {
  // Event lifecycle
  event_join: {
    key: 'event_join',
    template: 'Participação confirmada! Você está em: {eventTitle}',
    icon: Calendar,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    category: 'events',
  },
  event_reminder: {
    key: 'event_reminder',
    template: 'Lembrete: {eventTitle} é amanhã às {time} 🎯',
    icon: Bell,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    category: 'events',
  },
  event_updated: {
    key: 'event_updated',
    template: 'O evento "{eventTitle}" teve alterações',
    icon: RefreshCw,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    category: 'events',
  },
  event_cancelled: {
    key: 'event_cancelled',
    template: '{eventTitle} foi cancelado. Veja atividades similares',
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    category: 'events',
  },
  vagas_acabando: {
    key: 'vagas_acabando',
    template: 'Restam apenas {remaining} vagas em {eventTitle}!',
    icon: AlertTriangle,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    category: 'events',
  },

  // Social
  new_event: {
    key: 'new_event',
    template: 'Nova atividade de {category} perto de você!',
    icon: Sparkles,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    category: 'social',
  },
  participant_joined: {
    key: 'participant_joined',
    template: '{userName} vai participar do seu evento {eventTitle}',
    icon: Users,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    category: 'social',
  },
  friend_request: {
    key: 'friend_request',
    template: '{userName} quer ser seu amigo!',
    icon: UserPlus,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    category: 'social',
  },
  friend_request_accepted: {
    key: 'friend_request_accepted',
    template: '{userName} aceitou seu pedido de amizade!',
    icon: UserCheck,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    category: 'social',
  },

  // Messaging
  new_message: {
    key: 'new_message',
    template: '{userName} enviou uma mensagem',
    icon: MessageCircle,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    category: 'messages',
  },

  // Engagement
  event_review_reminder: {
    key: 'event_review_reminder',
    template: 'Como foi {eventTitle}? Avalie sua experiência ⭐',
    icon: Star,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    category: 'engagement',
  },
  semana_sem_evento: {
    key: 'semana_sem_evento',
    template: 'Faz 7 dias que você não participa de nada. Que tal hoje?',
    icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    category: 'engagement',
  },
  conquista_desbloqueada: {
    key: 'conquista_desbloqueada',
    template: 'Parabéns! Você ganhou o badge {badgeName} 🏆',
    icon: Trophy,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10',
    category: 'engagement',
  },

  // Moderation
  penalty_applied: {
    key: 'penalty_applied',
    template: 'Ação disciplinar aplicada. Verifique os detalhes.',
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    category: 'system',
  },
  penalty_revoked: {
    key: 'penalty_revoked',
    template: 'Uma punição foi revogada.',
    icon: AlertTriangle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    category: 'system',
  },
} as const;

export type NotificationType = keyof typeof NOTIFICATION_TRIGGERS;

/**
 * Get display config for a notification type, with fallback for unknown types.
 */
export function getNotificationConfig(type: string) {
  return (
    NOTIFICATION_TRIGGERS[type as NotificationType] ?? {
      key: type,
      template: '',
      icon: Bell,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      category: 'system',
    }
  );
}

/**
 * Notification categories for filtering in the notification center.
 */
export const NOTIFICATION_CATEGORIES = [
  { key: 'all', label: 'Todas' },
  { key: 'events', label: 'Eventos' },
  { key: 'social', label: 'Social' },
  { key: 'messages', label: 'Mensagens' },
  { key: 'engagement', label: 'Engajamento' },
  { key: 'system', label: 'Sistema' },
] as const;
