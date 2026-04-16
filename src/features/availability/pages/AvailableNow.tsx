import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, MessageSquare, Users, Zap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAvailability, AvailableUser } from '../hooks/useAvailability';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

interface AvailableNowProps {
  onBack: () => void;
  onCreateQuickEvent?: (withUser?: AvailableUser) => void;
  onNavigateToMessages?: (userId: string) => void;
}

export const AvailableNow = ({ onBack, onCreateQuickEvent, onNavigateToMessages }: AvailableNowProps) => {
  const { availableUsers, loadingUsers, isAvailable } = useAvailability();

  const formatTimeLeft = (expiresAt: string) => {
    const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now());
    const minutes = Math.floor(remaining / 60000);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}min`;
    }
    return `${minutes}min`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Disponíveis Agora</h1>
            <p className="text-xs text-muted-foreground">{availableUsers.length} pessoas compatíveis</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3 pb-28">
        {!isAvailable && (
          <div className="bg-muted/50 rounded-xl p-3 text-sm text-muted-foreground text-center">
            <Zap className="w-4 h-4 inline mr-1" />
            Ative o Modo Espontâneo para aparecer aqui também!
          </div>
        )}

        {loadingUsers ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-card">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))
        ) : availableUsers.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="Ninguém disponível agora"
            description="Aguarde ou ative sua disponibilidade para ser notificado quando alguém aparecer."
          />
        ) : (
          availableUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card rounded-2xl p-4 space-y-3"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <UserAvatar
                    name={user.full_name}
                    avatarUrl={user.avatar_url}
                    size="md"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{user.full_name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Disponível por mais {formatTimeLeft(user.expires_at)}</span>
                  </div>
                </div>
              </div>

              {/* Common interests */}
              {user.common_interests.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {user.common_interests.map(interest => (
                    <span
                      key={interest}
                      className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 text-xs rounded-xl"
                  onClick={() => onCreateQuickEvent?.(user)}
                >
                  <Users className="w-3.5 h-3.5 mr-1" />
                  Convidar para atividade
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs rounded-xl"
                  onClick={() => onNavigateToMessages?.(user.user_id)}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          ))
        )}

        {availableUsers.length > 0 && (
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => onCreateQuickEvent?.()}
          >
            <Zap className="w-4 h-4 mr-2" />
            Criar atividade e notificar compatíveis
          </Button>
        )}
      </div>
    </div>
  );
};
