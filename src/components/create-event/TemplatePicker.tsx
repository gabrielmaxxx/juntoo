import { memo } from 'react';
import { Dumbbell, Wine, BookOpen, Users, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EventFormData } from '@/lib/validations/eventSchema';

export interface EventTemplate {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  prefill: Partial<EventFormData>;
}

const TEMPLATES: EventTemplate[] = [
  {
    id: 'sport',
    icon: <Dumbbell className="w-6 h-6" />,
    label: 'Esporte',
    description: 'Partida de futebol, corrida, treino em grupo',
    prefill: { category: 'Esportes', title: 'Partida de futebol' },
  },
  {
    id: 'happy-hour',
    icon: <Wine className="w-6 h-6" />,
    label: 'Happy Hour',
    description: 'Encontro em bar ou restaurante',
    prefill: { category: 'Social', title: 'Happy hour' },
  },
  {
    id: 'study',
    icon: <BookOpen className="w-6 h-6" />,
    label: 'Estudo',
    description: 'Grupo de estudo ou coworking',
    prefill: { category: 'Educação', title: 'Grupo de estudo' },
  },
  {
    id: 'networking',
    icon: <Users className="w-6 h-6" />,
    label: 'Networking',
    description: 'Conhecer pessoas e trocar ideias',
    prefill: { category: 'Negócios', title: 'Networking' },
  },
  {
    id: 'custom',
    icon: <Sparkles className="w-6 h-6" />,
    label: 'Outro',
    description: 'Criar evento personalizado',
    prefill: {},
  },
];

interface TemplatePickerProps {
  onSelect: (prefill: Partial<EventFormData>) => void;
  onSkip: () => void;
}

export const TemplatePicker = memo(({ onSelect, onSkip }: TemplatePickerProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Que tipo de evento você quer criar?</h2>
        <p className="text-sm text-muted-foreground">Escolha um modelo para começar mais rápido</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.prefill)}
            className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border bg-card text-left transition-all duration-200 hover:border-primary/40 hover:shadow-sm active:scale-[0.98]"
          >
            <span className="text-primary">{t.icon}</span>
            <span className="text-sm font-semibold text-foreground">{t.label}</span>
            <span className="text-xs text-muted-foreground leading-snug">{t.description}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
      >
        Criar evento do zero
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});
TemplatePicker.displayName = 'TemplatePicker';
