import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Clock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAvailability } from '../hooks/useAvailability';
import { CATEGORIES } from '@/constants/categories';
import { cn } from '@/lib/utils';

interface ImAvailableButtonProps {
  onViewAvailable?: () => void;
}

export const ImAvailableButton = ({ onViewAvailable }: ImAvailableButtonProps) => {
  const { profile } = useAuth();
  const {
    isAvailable,
    timeRemaining,
    activate,
    activating,
    deactivate,
    deactivating,
    availableCount,
  } = useAvailability();

  const [showSheet, setShowSheet] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}min`;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleOpenSheet = () => {
    setSelectedInterests(profile?.interests || []);
    setShowSheet(true);
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleActivate = () => {
    if (selectedInterests.length === 0) return;
    activate(selectedInterests);
    setShowSheet(false);
  };

  if (isAvailable) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl p-4"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--accent) / 0.1))',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-green-500" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Você está disponível! 🟢</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatTime(timeRemaining)} restantes</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => deactivate()}
            disabled={deactivating}
            className="shrink-0 text-xs"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Desativar
          </Button>
        </div>

        {availableCount > 0 && (
          <p className="text-xs text-primary mt-2 font-medium">
            🎯 {availableCount} {availableCount === 1 ? 'pessoa disponível' : 'pessoas disponíveis'} perto de você!
          </p>
        )}
      </motion.div>
    );
  }

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleOpenSheet}
        className="w-full rounded-2xl p-4 text-left transition-all"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-primary-foreground">Estou disponível agora! 🟢</p>
            <p className="text-xs text-primary-foreground/70">Encontre pessoas para atividades espontâneas</p>
          </div>
        </div>
      </motion.button>

      {/* Bottom sheet */}
      <AnimatePresence>
        {showSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setShowSheet(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 z-50 bg-background rounded-t-3xl max-h-[80vh] overflow-auto"
              style={{ boxShadow: 'var(--shadow-elevated)' }}
            >
              <div className="p-6 space-y-5">
                <div className="w-10 h-1 rounded-full bg-muted mx-auto" />

                <div className="text-center">
                  <h3 className="text-lg font-bold text-foreground">Modo Espontâneo</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Selecione os interesses para os quais você está disponível agora
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.filter(c => c !== 'Outro').map(interest => {
                    const selected = selectedInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                          selected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        {selected && <Check className="w-3 h-3 inline mr-1" />}
                        {interest}
                      </button>
                    );
                  })}
                </div>

                <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 inline mr-1" />
                  Sua disponibilidade ficará ativa por <strong>2 horas</strong>. Você pode desativar a qualquer momento.
                </div>

                <Button
                  onClick={handleActivate}
                  disabled={selectedInterests.length === 0 || activating}
                  className="w-full h-12 text-base font-semibold rounded-xl"
                >
                  {activating ? 'Ativando...' : `Ativar com ${selectedInterests.length} interesses`}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
