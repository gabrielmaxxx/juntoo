import { MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BRAZIL_STATES, BRAZIL_STATES_AND_CITIES } from '@/data/brazilStatesAndCities';
import { EventFormData } from '@/lib/validations/eventSchema';

interface LocationSectionProps {
  formData: EventFormData;
  errors: Record<string, string>;
  onInputChange: (field: keyof EventFormData, value: string | boolean) => void;
}

export const LocationSection = ({ formData, errors, onInputChange }: LocationSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Localização
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="state">Estado *</Label>
            <Select 
              value={formData.state} 
              onValueChange={(value) => {
                onInputChange('state', value);
                onInputChange('city', ''); // Reset city when state changes
              }} 
              required
            >
              <SelectTrigger className={errors.state ? 'border-destructive' : ''}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {BRAZIL_STATES.map((state) => (
                  <SelectItem key={state.value} value={state.value}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && (
              <p className="text-sm text-destructive">{errors.state}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Cidade *</Label>
            <Select 
              value={formData.city} 
              onValueChange={(value) => onInputChange('city', value)} 
              required
              disabled={!formData.state}
            >
              <SelectTrigger className={errors.city ? 'border-destructive' : ''}>
                <SelectValue placeholder={formData.state ? "Selecione" : "Escolha estado"} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-[300px]">
                {formData.state && BRAZIL_STATES_AND_CITIES[formData.state]?.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.city && (
              <p className="text-sm text-destructive">{errors.city}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Endereço/Local Específico *</Label>
          <Input
            id="location"
            placeholder="Ex: Parque da Cidade, Quadra 1"
            value={formData.location}
            onChange={(e) => onInputChange('location', e.target.value)}
            className={errors.location ? 'border-destructive' : ''}
            required
          />
          {errors.location && (
            <p className="text-sm text-destructive">{errors.location}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
