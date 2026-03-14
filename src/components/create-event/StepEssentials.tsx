import { useRef, useState, useCallback, memo } from 'react';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIES } from '@/constants/categories';
import { BRAZIL_STATES, BRAZIL_STATES_AND_CITIES } from '@/data/brazilStatesAndCities';
import { EventFormData } from '@/lib/validations/eventSchema';
import { useTitleSuggestions } from '@/hooks/useTitleSuggestions';

interface StepEssentialsProps {
  formData: EventFormData;
  errors: Record<string, string>;
  onInputChange: (field: keyof EventFormData, value: string | boolean) => void;
}

const FRIENDLY_ERRORS: Record<string, string> = {
  title: 'Adicione um título para o evento',
  category: 'Escolha uma categoria',
  date: 'Selecione a data do evento',
  time: 'Defina o horário do evento',
  state: 'Selecione o estado',
  city: 'Selecione a cidade',
  location: 'Informe o endereço ou local',
};

const FieldCheck = memo(({ filled }: { filled: boolean }) => {
  if (!filled) return null;
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/15 text-primary ml-1.5">
      <Check className="w-2.5 h-2.5" />
    </span>
  );
});
FieldCheck.displayName = 'FieldCheck';

export const StepEssentials = ({ formData, errors, onInputChange }: StepEssentialsProps) => {
  const titleRef = useRef<HTMLInputElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestions = useTitleSuggestions(formData.category, formData.title);

  const friendlyError = useCallback((field: string) => {
    if (!errors[field]) return null;
    return FRIENDLY_ERRORS[field] || errors[field];
  }, [errors]);

  // Auto-focus title on mount
  const setTitleRef = useCallback((el: HTMLInputElement | null) => {
    (titleRef as any).current = el;
    if (el) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => el.focus());
    }
  }, []);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    onInputChange('title', suggestion);
    setShowSuggestions(false);
  }, [onInputChange]);

  const filledTitle = formData.title.trim().length >= 3;
  const filledDate = !!formData.date;
  const filledLocation = formData.location.trim().length >= 3;
  const essentialsComplete = filledTitle && filledDate && filledLocation;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="space-y-1.5 relative">
        <Label htmlFor="title" className="text-sm font-medium text-foreground flex items-center">
          Título do Evento *
          <FieldCheck filled={filledTitle} />
        </Label>
        <Input
          id="title"
          ref={setTitleRef}
          placeholder="Ex: Futebol no parque às 19h"
          value={formData.title}
          onChange={(e) => onInputChange('title', e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          className={errors.title ? 'border-destructive' : ''}
          required
          autoComplete="off"
        />
        {errors.title && <p className="text-xs text-destructive">{friendlyError('title')}</p>}

        {/* Title suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-card border border-border rounded-lg shadow-md overflow-hidden">
            {suggestions.slice(0, 4).map((s) => (
              <button
                key={s}
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(s); }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label htmlFor="category" className="text-sm font-medium text-foreground">Categoria *</Label>
        <Select value={formData.category} onValueChange={(value) => onInputChange('category', value)}>
          <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && <p className="text-xs text-destructive">{friendlyError('category')}</p>}
      </div>

      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-sm font-medium text-foreground flex items-center">
            Data *
            <FieldCheck filled={filledDate} />
          </Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => onInputChange('date', e.target.value)}
            className={errors.date ? 'border-destructive' : ''}
            required
          />
          {errors.date && <p className="text-xs text-destructive">{friendlyError('date')}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="time" className="text-sm font-medium text-foreground">Horário *</Label>
          <Input
            id="time"
            type="time"
            value={formData.time}
            onChange={(e) => onInputChange('time', e.target.value)}
            className={errors.time ? 'border-destructive' : ''}
            required
          />
          {errors.time && <p className="text-xs text-destructive">{friendlyError('time')}</p>}
        </div>
      </div>

      {/* State + City */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="state" className="text-sm font-medium text-foreground">Estado *</Label>
          <Select
            value={formData.state}
            onValueChange={(value) => {
              onInputChange('state', value);
              onInputChange('city', '');
            }}
          >
            <SelectTrigger className={errors.state ? 'border-destructive' : ''}>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {BRAZIL_STATES.map((state) => (
                <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.state && <p className="text-xs text-destructive">{friendlyError('state')}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city" className="text-sm font-medium text-foreground">Cidade *</Label>
          <Select
            value={formData.city}
            onValueChange={(value) => onInputChange('city', value)}
            disabled={!formData.state}
          >
            <SelectTrigger className={errors.city ? 'border-destructive' : ''}>
              <SelectValue placeholder={formData.state ? "Selecione" : "Escolha estado"} />
            </SelectTrigger>
            <SelectContent className="bg-background z-50 max-h-[300px]">
              {formData.state && BRAZIL_STATES_AND_CITIES[formData.state]?.map((city) => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.city && <p className="text-xs text-destructive">{friendlyError('city')}</p>}
        </div>
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <Label htmlFor="location" className="text-sm font-medium text-foreground flex items-center">
          Endereço / Local *
          <FieldCheck filled={filledLocation} />
        </Label>
        <Input
          id="location"
          placeholder="Ex: Parque da Cidade, Quadra 1"
          value={formData.location}
          onChange={(e) => onInputChange('location', e.target.value)}
          className={errors.location ? 'border-destructive' : ''}
          required
        />
        {errors.location && <p className="text-xs text-destructive">{friendlyError('location')}</p>}
      </div>

      {/* Essentials complete indicator */}
      {essentialsComplete && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
          <Check className="w-4 h-4 text-primary" />
          <span className="text-xs text-primary font-medium">O essencial está preenchido — você já pode continuar!</span>
        </div>
      )}
    </div>
  );
};
