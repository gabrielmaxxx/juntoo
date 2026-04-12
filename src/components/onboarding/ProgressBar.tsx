import { motion } from 'framer-motion';
import { useOnboarding } from './OnboardingContext';

export const ProgressBar = () => {
  const { step, totalSteps } = useOnboarding();
  const pct = (step / totalSteps) * 100;

  return (
    <div className="px-6 pt-4 pb-2">
      <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1.5 text-right font-body">
        {step}/{totalSteps}
      </p>
    </div>
  );
};
