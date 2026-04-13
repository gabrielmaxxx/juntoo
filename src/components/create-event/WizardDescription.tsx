import { memo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowRight, SkipForward } from 'lucide-react';

interface WizardDescriptionProps {
  description: string;
  onChange: (value: string) => void;
  onNext: () => void;
  onSkip: () => void;
}

export const WizardDescription = memo(({ description, onChange, onNext, onSkip }: WizardDescriptionProps) => {
  return (
    <div className="flex flex-col items-center px-2">
      <h2 className="text-xl font-heading font-bold text-foreground text-center mb-2">
        Conta mais sobre o que vai rolar
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-8">
        Uma boa descrição atrai mais pessoas
      </p>

      <div className="w-full space-y-4">
        <Textarea
          value={description}
          onChange={(e) => onChange(e.target.value.slice(0, 500))}
          placeholder="Descreva a atividade, o nível de habilidade necessário, o que levar..."
          rows={5}
          className="text-base resize-none"
          autoFocus
        />
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>{description.length}/500 caracteres</span>
          {description.length > 20 && <span className="text-primary">✓ Boa descrição!</span>}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12"
            onClick={onSkip}
          >
            <SkipForward className="w-4 h-4 mr-2" />
            Pular por agora
          </Button>
          <Button
            type="button"
            className="flex-1 h-12"
            onClick={onNext}
          >
            Continuar
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
});
WizardDescription.displayName = 'WizardDescription';
