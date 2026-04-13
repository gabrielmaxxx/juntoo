import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useNotifications } from '@/hooks/useNotifications';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationOptInProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationOptIn = ({ open, onOpenChange }: NotificationOptInProps) => {
  const { requestPermission, dismissOptIn } = useNotifications();
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    setLoading(true);
    const success = await requestPermission();
    setLoading(false);
    if (success) onOpenChange(false);
  };

  const handleDismiss = () => {
    dismissOptIn(true); // snooze for 24h
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm mx-auto">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center text-center gap-4"
            >
              {/* Icon */}
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="w-8 h-8 text-primary" />
              </div>

              <DialogHeader className="space-y-2">
                <DialogTitle className="text-lg font-heading">
                  Fique por dentro! 🔔
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                  Quer saber quando alguém confirmar no seu evento ou quando surgir algo 
                  do seu interesse? Ative as notificações para não perder nada.
                </DialogDescription>
              </DialogHeader>

              {/* Benefits */}
              <ul className="text-sm text-muted-foreground space-y-2 w-full text-left px-2">
                {[
                  'Saiba quando alguém participa do seu evento',
                  'Receba lembretes antes das atividades',
                  'Descubra novos eventos do seu interesse',
                ].map((text) => (
                  <li key={text} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>

              {/* Actions */}
              <div className="flex flex-col gap-2 w-full pt-2">
                <Button
                  onClick={handleActivate}
                  loading={loading}
                  className="w-full"
                  size="lg"
                >
                  Ativar notificações
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleDismiss}
                  className="w-full text-muted-foreground"
                  size="sm"
                >
                  Agora não
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
