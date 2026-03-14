import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIES } from '@/constants/categories';
import { BRAZIL_STATES, BRAZIL_STATES_AND_CITIES } from '@/data/brazilStatesAndCities';
import { EventFormData } from '@/lib/validations/eventSchema';

interface StepEssentialsProps {
  formData: EventFormData;
  errors: Record<string, string>;
  onInputChange: (field: keyof EventFormData, value: string | boolean) => void;
}

export const StepEssentials = ({ formData, errors, onInputChange }: StepEssentialsProps) => {
  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-sm font-medium text-foreground">Título do Evento *</Label>
        <Input
          id="title"
          placeholder="Ex: Futebol no parque"
          value={formData.title}
          onChange={(e) => onInputChange('title', e.target.value)}
          className={errors.title ? 'border-destructive' : ''}
          required
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
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
        {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
      </div>

      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-sm font-medium text-foreground">Data *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => onInputChange('date', e.target.value)}
            className={errors.date ? 'border-destructive' : ''}
            required
          />
          {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
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
          {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
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
          {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
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
          {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
        </div>
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <Label htmlFor="location" className="text-sm font-medium text-foreground">Endereço / Local *</Label>
        <Input
          id="location"
          placeholder="Ex: Parque da Cidade, Quadra 1"
          value={formData.location}
          onChange={(e) => onInputChange('location', e.target.value)}
          className={errors.location ? 'border-destructive' : ''}
          required
        />
        {errors.location && <p className="text-xs text-destructive">{errors.location}</p>}
      </div>
    </div>
  );
};
