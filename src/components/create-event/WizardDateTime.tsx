import { memo, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Calendar, Clock } from 'lucide-react';

const TIME_SLOTS = (() => {
  const slots: string[] = [];
  for (let h = 6; h <= 23; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
})();

interface WizardDateTimeProps {
  date: string;
  time: string;
  isRecurring: boolean;
  recurrenceType: string;
  recurrenceEndDate: string;
  onChange: (field: string, value: string | boolean) => void;
  onNext: () => void;
}

export const WizardDateTime = memo(({ date, time, isRecurring, recurrenceType, recurrenceEndDate, onChange, onNext }: WizardDateTimeProps) => {
  const isValid = !!date && !!time;
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  return (
    <div className="flex flex-col items-center px-2">
      <h2 className="text-xl font-heading font-bold text-foreground text-center mb-2">
        Quando vai acontecer?
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-8">
        Escolha a data e horário do evento
      </p>

      <div className="w-full space-y-6">
        {/* Date */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Data
          </Label>
          <Input
            type="date"
            value={date}
            min={todayStr}
            onChange={(e) => onChange('date', e.target.value)}
            className="h-12 text-base"
          />
        </div>

        {/* Time grid */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Horário
          </Label>
          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => onChange('time', slot)}
                className={`py-2 rounded-lg text-sm font-medium transition-all ${
                  time === slot
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border text-foreground hover:border-primary/40'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        {/* Recurring toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Evento recorrente</Label>
              <p className="text-xs text-muted-foreground">Repete automaticamente</p>
            </div>
            <Switch
              checked={isRecurring}
              onCheckedChange={(checked) => {
                onChange('isRecurring', checked);
                if (!checked) {
                  onChange('recurrenceType', 'none');
                  onChange('recurrenceEndDate', '');
                }
              }}
            />
          </div>

          {isRecurring && (
            <div className="space-y-3 pl-3 border-l-2 border-primary/20">
              <Select value={recurrenceType} onValueChange={(v) => onChange('recurrenceType', v)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Frequência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanalmente</SelectItem>
                  <SelectItem value="biweekly">Quinzenalmente</SelectItem>
                  <SelectItem value="monthly">Mensalmente</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Término (opcional)</Label>
                <Input
                  type="date"
                  value={recurrenceEndDate}
                  min={date}
                  onChange={(e) => onChange('recurrenceEndDate', e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          )}
        </div>

        <Button type="button" className="w-full h-12" disabled={!isValid} onClick={onNext}>
          Continuar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
});
WizardDateTime.displayName = 'WizardDateTime';
