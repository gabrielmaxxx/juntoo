import { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { EventCard } from '@/components/EventCard';
import { Event } from '@/types';
import { EventFormData } from '@/lib/validations/eventSchema';
import { Check, AlertCircle, Pencil, Upload, Sparkles, RefreshCw, X } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface WizardPreviewProps {
  formData: EventFormData;
  isSubmitting: boolean;
  generatingImage: boolean;
  uploadingImage: boolean;
  onSubmit: () => void;
  onEdit: (step: number) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerateCover: () => void;
  onRemoveImage: () => void;
}

interface CheckItem {
  label: string;
  filled: boolean;
  step: number;
  required: boolean;
}

export const WizardPreview = memo(({
  formData,
  isSubmitting,
  generatingImage,
  uploadingImage,
  onSubmit,
  onEdit,
  onImageUpload,
  onGenerateCover,
  onRemoveImage,
}: WizardPreviewProps) => {
  const previewEvent: Event = useMemo(() => ({
    id: 'preview',
    title: formData.title || 'Sem título',
    description: formData.description || '',
    category: formData.category || 'Outro',
    location: formData.location || 'Local não definido',
    city: formData.city,
    state: formData.state,
    date: formData.date || new Date().toISOString().split('T')[0],
    time: formData.time || '00:00',
    imageUrl: formData.imageUrl || '',
    createdBy: '',
    creatorName: 'Você',
    creatorAvatar: '',
    participantsCount: 0,
    price: formData.price ? `R$ ${formData.price}` : undefined,
    maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
    isPrivate: formData.isPrivate,
  }), [formData]);

  const checks: CheckItem[] = [
    { label: 'Categoria', filled: !!formData.category, step: 0, required: true },
    { label: 'Título', filled: formData.title.trim().length >= 3, step: 1, required: true },
    { label: 'Descrição', filled: !!formData.description?.trim(), step: 2, required: false },
    { label: 'Data e horário', filled: !!formData.date && !!formData.time, step: 3, required: true },
    { label: 'Localização', filled: !!formData.state && !!formData.city && formData.location.trim().length >= 3, step: 4, required: true },
    { label: 'Foto de capa', filled: !!formData.imageUrl, step: 6, required: false },
  ];

  const requiredComplete = checks.filter(c => c.required).every(c => c.filled);

  return (
    <div className="flex flex-col items-center px-2">
      <h2 className="text-xl font-heading font-bold text-foreground text-center mb-2">
        Tudo pronto para publicar! 🎉
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Revise seu evento antes de publicar
      </p>

      <div className="w-full space-y-6">
        {/* Live preview */}
        <div className="pointer-events-none">
          <EventCard event={previewEvent} variant="default" />
        </div>

        {/* Cover image controls */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Foto de Capa</Label>
          {formData.imageUrl ? (
            <div className="relative rounded-lg overflow-hidden">
              <img src={formData.imageUrl} alt="Capa" className="w-full h-32 object-cover" />
              <div className="absolute top-2 right-2 flex gap-1.5">
                <Button type="button" size="icon" variant="secondary" className="h-7 w-7" onClick={onGenerateCover} disabled={generatingImage}>
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
                <input id="wizardImageUpload" type="file" accept="image/jpeg,image/png,image/webp" onChange={onImageUpload} className="hidden" disabled={uploadingImage || generatingImage} />
                <label htmlFor="wizardImageUpload" className="flex items-center justify-center gap-2 cursor-pointer rounded-lg border border-dashed border-input py-3 text-sm text-muted-foreground hover:border-primary transition-colors">
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
          <p className="text-xs text-muted-foreground">
            {formData.imageUrl ? 'Capa adicionada' : 'Opcional — uma capa será gerada automaticamente se não adicionar'}
          </p>
        </div>

        {/* Checklist */}
        <div className="space-y-2 bg-card rounded-xl border border-border p-4">
          <p className="text-sm font-medium text-foreground mb-3">Checklist do evento</p>
          {checks.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => item.step < 6 && onEdit(item.step)}
              className="flex items-center gap-3 w-full text-left py-1.5 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
            >
              {item.filled ? (
                <Check className="w-4 h-4 text-primary shrink-0" />
              ) : (
                <AlertCircle className={`w-4 h-4 shrink-0 ${item.required ? 'text-destructive' : 'text-muted-foreground'}`} />
              )}
              <span className={`text-sm ${item.filled ? 'text-foreground' : item.required ? 'text-destructive' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
              {!item.filled && item.step < 6 && (
                <Pencil className="w-3 h-3 text-muted-foreground ml-auto" />
              )}
              {!item.required && !item.filled && (
                <span className="text-xs text-muted-foreground ml-auto">Opcional</span>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3 pb-8">
          <Button
            type="button"
            className="w-full h-14 text-base font-semibold"
            disabled={!requiredComplete || isSubmitting || generatingImage}
            onClick={onSubmit}
          >
            {generatingImage ? 'Gerando capa...' : isSubmitting ? 'Publicando...' : 'Publicar atividade 🚀'}
          </Button>
        </div>
      </div>
    </div>
  );
});
WizardPreview.displayName = 'WizardPreview';
