import { Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { EventFormData } from '@/lib/validations/eventSchema';

interface PrivacySectionProps {
  formData: EventFormData;
  onInputChange: (field: keyof EventFormData, value: string | boolean) => void;
}

export const PrivacySection = ({ formData, onInputChange }: PrivacySectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Privacidade
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="private">Evento Privado</Label>
            <p className="text-sm text-muted-foreground">
              Apenas pessoas com o link podem ver e participar
            </p>
          </div>
          <Switch
            id="private"
            checked={formData.isPrivate}
            onCheckedChange={(checked) => onInputChange('isPrivate', checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
