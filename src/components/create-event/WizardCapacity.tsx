import { memo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ArrowRight, Lock, Globe, Users } from 'lucide-react';

interface WizardCapacityProps {
  maxParticipants: string;
  isPrivate: boolean;
  price: string;
  onChange: (field: string, value: string | boolean) => void;
  onNext: () => void;
}

export const WizardCapacity = memo(({ maxParticipants, isPrivate, price, onChange, onNext }: WizardCapacityProps) => {
  const [hasLimit, setHasLimit] = useState(!!maxParticipants);
  const [isPaid, setIsPaid] = useState(!!price && price !== '0');
  const sliderValue = maxParticipants ? parseInt(maxParticipants) : 10;

  return (
    <div className="flex flex-col items-center px-2">
      <h2 className="text-xl font-heading font-bold text-foreground text-center mb-2">
        Quantas pessoas podem participar?
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-8">
        Defina vagas, privacidade e valor
      </p>

      <div className="w-full space-y-6">
        {/* Capacity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Limitar vagas
            </Label>
            <Switch
              checked={hasLimit}
              onCheckedChange={(checked) => {
                setHasLimit(checked);
                if (!checked) onChange('maxParticipants', '');
              }}
            />
          </div>

          {hasLimit && (
            <div className="space-y-3 px-1">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-heading font-bold text-primary">{sliderValue}</span>
                <span className="text-sm text-muted-foreground">pessoas</span>
              </div>
              <Slider
                value={[sliderValue]}
                onValueChange={([v]) => onChange('maxParticipants', String(v))}
                min={2}
                max={50}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>2</span>
                <span>50</span>
              </div>
            </div>
          )}

          {!hasLimit && (
            <p className="text-sm text-muted-foreground text-center py-2 bg-muted/50 rounded-lg">
              Sem limite de participantes
            </p>
          )}
        </div>

        {/* Privacy */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3">
            {isPrivate ? (
              <Lock className="w-5 h-5 text-amber-500" />
            ) : (
              <Globe className="w-5 h-5 text-primary" />
            )}
            <div>
              <Label className="text-sm font-medium">{isPrivate ? 'Privado' : 'Público'}</Label>
              <p className="text-xs text-muted-foreground">
                {isPrivate ? 'Apenas com link de convite' : 'Visível para todos'}
              </p>
            </div>
          </div>
          <Switch
            checked={isPrivate}
            onCheckedChange={(checked) => onChange('isPrivate', checked)}
          />
        </div>

        {/* Price */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{isPaid ? 'Evento pago' : 'Evento gratuito'}</Label>
            <Switch
              checked={isPaid}
              onCheckedChange={(checked) => {
                setIsPaid(checked);
                if (!checked) onChange('price', '');
              }}
            />
          </div>

          {isPaid && (
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium text-muted-foreground">R$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => onChange('price', e.target.value)}
                placeholder="0,00"
                className="h-12 text-lg"
                autoFocus
              />
            </div>
          )}
        </div>

        <Button type="button" className="w-full h-12" onClick={onNext}>
          Revisar evento
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
});
WizardCapacity.displayName = 'WizardCapacity';
