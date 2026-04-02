import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessFeedbackProps {
  message: string;
  show: boolean;
  onDone?: () => void;
  duration?: number;
}

export const SuccessFeedback = ({ message, show, onDone, duration = 2000 }: SuccessFeedbackProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onDone]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-3 animate-scale-in">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <p className="text-lg font-semibold text-foreground">{message}</p>
      </div>
    </div>
  );
};
