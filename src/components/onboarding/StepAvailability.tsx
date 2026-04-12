import { Button } from '@/components/ui/button';
import { useOnboarding } from './OnboardingContext';
import { ArrowRight, Sun, Sunset, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

const PERIODS = [
  { id: 'Manhã', icon: Sun, label: 'Manhã', sub: '6h–12h' },
  { id: 'Tarde', icon: Sunset, label: 'Tarde', sub: '12h–18h' },
  { id: 'Noite', icon: Moon, label: 'Noite', sub: '18h–00h' },
] as const;

const DAYS = [
  { id: 'Seg', label: 'S' },
  { id: 'Ter', label: 'T' },
  { id: 'Qua', label: 'Q' },
  { id: 'Qui', label: 'Q' },
  { id: 'Sex', label: 'S' },
  { id: 'Sáb', label: 'S' },
  { id: 'Dom', label: 'D' },
] as const;

export const StepAvailability = () => {
  const { data, updateData, setStep } = useOnboarding();
  const { periods, days } = data.availability;

  const togglePeriod = (id: string) => {
    const next = periods.includes(id) ? periods.filter(p => p !== id) : [...periods, id];
    updateData({ availability: { ...data.availability, periods: next } });
  };

  const toggleDay = (id: string) => {
    const next = days.includes(id) ? days.filter(d => d !== id) : [...days, id];
    updateData({ availability: { ...data.availability, days: next } });
  };

  const canProceed = periods.length > 0 && days.length > 0;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-heading font-bold text-foreground">
          Quando você costuma estar livre?
        </h2>
        <p className="text-sm text-muted-foreground font-body">
          Assim mostramos eventos que encaixam na sua rotina.
        </p>
      </div>

      {/* Periods */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground font-body">Período do dia</label>
        <div className="grid grid-cols-3 gap-2">
          {PERIODS.map((p, i) => {
            const active = periods.includes(p.id);
            const Icon = p.icon;
            return (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => togglePeriod(p.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                  active
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium font-body ${active ? 'text-primary' : 'text-foreground'}`}>{p.label}</span>
                <span className="text-[10px] text-muted-foreground">{p.sub}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Days */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground font-body">Dias da semana</label>
        <div className="flex justify-between gap-1.5">
          {DAYS.map((d, i) => {
            const active = days.includes(d.id);
            return (
              <motion.button
                key={d.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => toggleDay(d.id)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium font-body border-2 transition-all ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:border-primary/40'
                }`}
              >
                {d.label}
              </motion.button>
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground px-1">
          {DAYS.map(d => <span key={d.id} className="w-10 text-center">{d.id}</span>)}
        </div>
      </div>

      <Button onClick={() => setStep(4)} className="w-full" disabled={!canProceed}>
        Ver eventos para mim <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </div>
  );
};
