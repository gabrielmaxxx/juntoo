import { Button } from '@/components/ui/button';
import { useOnboarding } from './OnboardingContext';
import { ArrowRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const INTEREST_OPTIONS = [
  { id: 'Futebol', icon: '⚽', label: 'Futebol' },
  { id: 'Vôlei', icon: '🏐', label: 'Vôlei' },
  { id: 'Corrida', icon: '🏃', label: 'Corrida' },
  { id: 'Trilha', icon: '🥾', label: 'Trilha' },
  { id: 'Cinema', icon: '🎬', label: 'Cinema' },
  { id: 'Teatro', icon: '🎭', label: 'Teatro' },
  { id: 'Barzinho', icon: '🍻', label: 'Barzinho' },
  { id: 'Gastronomia', icon: '🍽️', label: 'Gastronomia' },
  { id: 'Estudos', icon: '📚', label: 'Estudos' },
  { id: 'Música', icon: '🎵', label: 'Música' },
  { id: 'Jogos', icon: '🎮', label: 'Jogos' },
  { id: 'Viagem', icon: '✈️', label: 'Viagem' },
] as const;

export const StepInterests = () => {
  const { data, updateData, setStep } = useOnboarding();
  const selected = data.interests;

  const toggle = (id: string) => {
    updateData({
      interests: selected.includes(id)
        ? selected.filter(i => i !== id)
        : [...selected, id],
    });
  };

  const canProceed = selected.length >= 3;

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-heading font-bold text-foreground">
          O que você gosta de fazer?
        </h2>
        <p className="text-sm text-muted-foreground font-body">
          Escolha pelo menos 3 para recomendações certeiras.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {INTEREST_OPTIONS.map((opt, i) => {
          const isSelected = selected.includes(opt.id);
          return (
            <motion.button
              key={opt.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              onClick={() => toggle(opt.id)}
              className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border bg-card hover:border-primary/30'
              }`}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full p-0.5"
                >
                  <Check className="w-3 h-3" />
                </motion.div>
              )}
              <span className="text-2xl">{opt.icon}</span>
              <span className={`text-xs font-medium font-body ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                {opt.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="text-center">
        <p className={`text-xs font-body transition-colors ${canProceed ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
          {selected.length}/3 selecionados {canProceed ? '✅' : ''}
        </p>
      </div>

      <Button onClick={() => setStep(3)} className="w-full" disabled={!canProceed}>
        Próximo <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </div>
  );
};
