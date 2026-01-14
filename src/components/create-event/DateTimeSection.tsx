import { Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EventFormData } from '@/lib/validations/eventSchema';

interface DateTimeSectionProps {
  formData: EventFormData;
  errors: Record<string, string>;
  onInputChange: (field: keyof EventFormData, value: string | boolean) => void;
}

export const DateTimeSection = ({ formData, errors, onInputChange }: DateTimeSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Data, Horário e Recorrência
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => onInputChange('date', e.target.value)}
              className={errors.date ? 'border-destructive' : ''}
              required
            />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Horário *</Label>
            <Input
              id="time"
              type="time"
              value={formData.time}
              onChange={(e) => onInputChange('time', e.target.value)}
              className={errors.time ? 'border-destructive' : ''}
              required
            />
            {errors.time && (
              <p className="text-sm text-destructive">{errors.time}</p>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="recurring">Evento Recorrente</Label>
              <p className="text-sm text-muted-foreground">
                O evento se repetirá automaticamente
              </p>
            </div>
            <Switch
              id="recurring"
              checked={formData.isRecurring}
              onCheckedChange={(checked) => {
                onInputChange('isRecurring', checked);
                if (!checked) {
                  onInputChange('recurrenceType', 'none');
                  onInputChange('recurrenceEndDate', '');
                }
              }}
            />
          </div>

          {formData.isRecurring && (
            <>
              <div className="space-y-2">
                <Label htmlFor="recurrenceType">Frequência de Repetição</Label>
                <Select 
                  value={formData.recurrenceType} 
                  onValueChange={(value) => onInputChange('recurrenceType', value)}
                  required={formData.isRecurring}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a frequência" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="weekly">Semanalmente</SelectItem>
                    <SelectItem value="biweekly">Quinzenalmente</SelectItem>
                    <SelectItem value="monthly">Mensalmente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recurrenceEndDate">Data de Término (Opcional)</Label>
                <Input
                  id="recurrenceEndDate"
                  type="date"
                  value={formData.recurrenceEndDate}
                  onChange={(e) => onInputChange('recurrenceEndDate', e.target.value)}
                  min={formData.date}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.recurrenceEndDate 
                    ? 'O evento se repetirá até esta data' 
                    : 'Sem data de término, o evento se repetirá por até 1 ano (52 ocorrências)'}
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
