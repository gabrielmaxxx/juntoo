import { useMemo, memo } from 'react';
import { Upload, X, RefreshCw, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EventFormData } from '@/lib/validations/eventSchema';
import { EventCard } from '@/components/EventCard';
import { Event } from '@/types';

interface StepDetailsProps {
  formData: EventFormData;
  errors: Record<string, string>;
  uploadingImage: boolean;
  generatingImage: boolean;
  onInputChange: (field: keyof EventFormData, value: string | boolean) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onGenerateCover: () => void;
}

const EventPreview = memo(({ formData }: { formData: EventFormData }) => {
  const hasEnoughData = formData.title.trim().length >= 3 && formData.date && formData.location.trim().length >= 3;

  const previewEvent: Event | null = useMemo(() => {
    if (!hasEnoughData) return null;
    return {
      id: 'preview',
      title: formData.title,
      description: formData.description || '',
      category: formData.category || 'Outro',
      location: formData.location,
      city: formData.city,
      state: formData.state,
      date: formData.date,
      time: formData.time || '00:00',
      imageUrl: formData.imageUrl || '',
      createdBy: '',
      creatorName: 'Você',
      creatorAvatar: '',
      participantsCount: 0,
      price: formData.price ? `R$ ${formData.price}` : undefined,
      maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
      isPrivate: formData.isPrivate,
    };
  }, [formData.title, formData.description, formData.category, formData.location, formData.city, formData.state, formData.date, formData.time, formData.imageUrl, formData.price, formData.maxParticipants, formData.isPrivate]);

  if (!previewEvent) return null;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-muted-foreground">Como vai aparecer no feed</Label>
      <div className="pointer-events-none opacity-90 scale-[0.92] origin-top-left">
        <EventCard event={previewEvent} variant="default" />
      </div>
    </div>
  );
});
EventPreview.displayName = 'EventPreview';

export const StepDetails = ({
  formData,
  errors,
  uploadingImage,
  generatingImage,
  onInputChange,
  onImageUpload,
  onRemoveImage,
  onGenerateCover
}: StepDetailsProps) => {
  return (
    <div className="space-y-5">
      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-sm font-medium text-foreground">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Conte o que vai acontecer no evento, quem pode participar e o que esperar."
          value={formData.description}
          onChange={(e) => onInputChange('description', e.target.value)}
          rows={3}
          className={errors.description ? 'border-destructive' : ''}
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
      </div>

      {/* Recurring */}
      <div className="space-y-3">
        <div className="flex items-center justify-between py-1">
          <div className="space-y-0.5">
            <Label htmlFor="recurring" className="text-sm font-medium text-foreground">Evento Recorrente</Label>
            <p className="text-xs text-muted-foreground">Repete automaticamente</p>
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
          <div className="space-y-3 pl-1 border-l-2 border-primary/20 ml-1">
            <div className="space-y-1.5 pl-3">
              <Label htmlFor="recurrenceType" className="text-sm font-medium text-foreground">Frequência</Label>
              <Select
                value={formData.recurrenceType}
                onValueChange={(value) => onInputChange('recurrenceType', value)}
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
            <div className="space-y-1.5 pl-3">
              <Label htmlFor="recurrenceEndDate" className="text-sm font-medium text-foreground">Término (opcional)</Label>
              <Input
                id="recurrenceEndDate"
                type="date"
                value={formData.recurrenceEndDate}
                onChange={(e) => onInputChange('recurrenceEndDate', e.target.value)}
                min={formData.date}
              />
              <p className="text-xs text-muted-foreground">
                {formData.recurrenceEndDate
                  ? 'Repete até esta data'
                  : 'Sem término — até 52 ocorrências'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Price + Max Participants */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="price" className="text-sm font-medium text-foreground">Preço (R$)</Label>
          <Input
            id="price"
            type="number"
            placeholder="Grátis"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => onInputChange('price', e.target.value)}
            className={errors.price ? 'border-destructive' : ''}
          />
          {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maxParticipants" className="text-sm font-medium text-foreground">Máx. Participantes</Label>
          <Input
            id="maxParticipants"
            type="number"
            placeholder="Ilimitado"
            min="1"
            value={formData.maxParticipants}
            onChange={(e) => onInputChange('maxParticipants', e.target.value)}
            className={errors.maxParticipants ? 'border-destructive' : ''}
          />
          {errors.maxParticipants && <p className="text-xs text-destructive">{errors.maxParticipants}</p>}
        </div>
      </div>

      {/* Cover Image — compact */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-foreground">Foto de Capa</Label>
        {formData.imageUrl ? (
          <div className="relative rounded-lg overflow-hidden">
            <img src={formData.imageUrl} alt="Preview" className="w-full h-36 object-cover" />
            <div className="absolute top-2 right-2 flex gap-1.5">
              <Button type="button" size="icon" variant="secondary" className="h-7 w-7" onClick={onGenerateCover} disabled={generatingImage} title="Gerar nova capa">
                <RefreshCw className={`w-3.5 h-3.5 ${generatingImage ? 'animate-spin' : ''}`} />
              </Button>
              <Button type="button" size="icon" variant="destructive" className="h-7 w-7" onClick={onRemoveImage}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1">
              <input id="imageUpload" type="file" accept="image/jpeg,image/png,image/webp" onChange={onImageUpload} className="hidden" disabled={uploadingImage || generatingImage} />
              <label htmlFor="imageUpload" className="flex items-center justify-center gap-2 cursor-pointer rounded-lg border border-dashed border-input py-3 px-4 text-sm text-muted-foreground hover:border-primary transition-colors">
                <Upload className="w-4 h-4" />
                {uploadingImage ? 'Carregando...' : 'Upload'}
              </label>
            </div>
            <Button type="button" variant="outline" className="flex-1" onClick={onGenerateCover} disabled={generatingImage || uploadingImage}>
              <Sparkles className={`w-4 h-4 mr-1.5 ${generatingImage ? 'animate-pulse' : ''}`} />
              {generatingImage ? 'Gerando...' : 'Gerar com IA'}
            </Button>
          </div>
        )}
      </div>

      {/* Privacy */}
      <div className="flex items-center justify-between py-1">
        <div className="space-y-0.5">
          <Label htmlFor="private" className="text-sm font-medium text-foreground">Evento Privado</Label>
          <p className="text-xs text-muted-foreground">Apenas pessoas com o link podem participar</p>
        </div>
        <Switch
          id="private"
          checked={formData.isPrivate}
          onCheckedChange={(checked) => onInputChange('isPrivate', checked)}
        />
      </div>

      {/* Live Preview */}
      <EventPreview formData={formData} />
    </div>
  );
};
