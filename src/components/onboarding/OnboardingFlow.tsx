import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { OnboardingProvider, useOnboarding, clearOnboardingStorage } from './OnboardingContext';
import { ProgressBar } from './ProgressBar';
import { StepIdentity } from './StepIdentity';
import { StepInterests } from './StepInterests';
import { StepAvailability } from './StepAvailability';
import { StepFirstEvent } from './StepFirstEvent';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Event } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface OnboardingFlowProps {
  onComplete: () => void;
  onEventClick?: (event: Event) => void;
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

const OnboardingInner = ({ onComplete, onEventClick }: OnboardingFlowProps) => {
  const { step, setStep, canSkip } = useOnboarding();
  const [direction, setDirection] = useState(1);
  const [showSkipDialog, setShowSkipDialog] = useState(false);

  const goToStep = useCallback((s: number) => {
    setDirection(s > step ? 1 : -1);
    setStep(s);
  }, [step, setStep]);

  const handleComplete = useCallback(() => {
    clearOnboardingStorage();
    onComplete();
  }, [onComplete]);

  const handleSkip = () => {
    setShowSkipDialog(true);
  };

  const confirmSkip = () => {
    setShowSkipDialog(false);
    goToStep(4);
  };

  const renderStep = () => {
    switch (step) {
      case 1: return <StepIdentity />;
      case 2: return <StepInterests />;
      case 3: return <StepAvailability />;
      case 4: return <StepFirstEvent onComplete={handleComplete} onEventClick={(e) => { handleComplete(); onEventClick?.(e); }} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex-1"><ProgressBar /></div>
        {canSkip && step < 4 && (
          <Button variant="ghost" size="sm" className="mr-4 mt-3 text-xs text-muted-foreground" onClick={handleSkip}>
            Pular
          </Button>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-6 max-w-md mx-auto w-full overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {step > 1 && step < 4 && (
        <div className="px-6 pb-4 max-w-md mx-auto w-full">
          <button
            onClick={() => goToStep(step - 1)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors font-body"
          >
            ← Voltar
          </button>
        </div>
      )}

      <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Pular configuração?</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              Sem seus interesses, suas recomendações serão menos precisas. Você pode configurar depois nas configurações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSkip}>Pular mesmo assim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export const OnboardingFlow = ({ onComplete, onEventClick }: OnboardingFlowProps) => {
  const { profile } = useAuthContext();

  return (
    <OnboardingProvider
      initialName={profile?.full_name}
      initialAvatar={profile?.avatar_url}
      initialInterests={profile?.interests || []}
    >
      <OnboardingInner onComplete={onComplete} onEventClick={onEventClick} />
    </OnboardingProvider>
  );
};
