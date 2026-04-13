import { memo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, MapPin } from 'lucide-react';
import { BRAZIL_STATES } from '@/data/brazilStatesAndCities';
import { useCities } from '@/hooks/useCities';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getCitiesSync, loadCities } from '@/data/brazilStatesAndCities';

interface WizardLocationProps {
  state: string;
  city: string;
  location: string;
  onChange: (field: string, value: string) => void;
  onNext: () => void;
}

export const WizardLocation = memo(({ state, city, location, onChange, onNext }: WizardLocationProps) => {
  const CITIES = useCities();
  const { stateCode: geoState, city: geoCity, requestLocation } = useGeolocation();
  const isValid = state.length >= 2 && city.length >= 2 && location.trim().length >= 3;

  useEffect(() => { loadCities(); }, []);

  const handleUseLocation = () => {
    requestLocation();
  };

  useEffect(() => {
    if (geoState && !state) {
      onChange('state', geoState);
      const cities = getCitiesSync();
      if (geoCity && cities[geoState]?.includes(geoCity)) {
        onChange('city', geoCity);
      }
    }
  }, [geoState, geoCity]);

  return (
    <div className="flex flex-col items-center px-2">
      <h2 className="text-xl font-heading font-bold text-foreground text-center mb-2">
        Onde vai ser?
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Informe a localização do evento
      </p>

      <div className="w-full space-y-5">
        {/* Use current location button */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 gap-2"
          onClick={handleUseLocation}
        >
          <MapPin className="w-4 h-4 text-primary" />
          Usar minha localização atual
        </Button>

        {/* State + City */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Estado *</Label>
            <Select
              value={state}
              onValueChange={(v) => {
                onChange('state', v);
                onChange('city', '');
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {BRAZIL_STATES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Cidade *</Label>
            <Select
              value={city}
              onValueChange={(v) => onChange('city', v)}
              disabled={!state}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder={state ? 'Selecione' : 'UF primeiro'} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-[250px]">
                {state && CITIES[state]?.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Endereço ou local *</Label>
          <Input
            value={location}
            onChange={(e) => onChange('location', e.target.value)}
            placeholder="Ex: Parque da Cidade, Quadra 1"
            className="h-11"
            autoFocus={!!state}
          />
          <button
            type="button"
            onClick={() => onChange('location', 'Local a combinar')}
            className="text-xs text-primary hover:underline"
          >
            Local a combinar
          </button>
        </div>

        <Button type="button" className="w-full h-12" disabled={!isValid} onClick={onNext}>
          Continuar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
});
WizardLocation.displayName = 'WizardLocation';
