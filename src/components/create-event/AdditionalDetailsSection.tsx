import { Upload, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { EventFormData } from '@/lib/validations/eventSchema';

interface AdditionalDetailsSectionProps {
  formData: EventFormData;
  errors: Record<string, string>;
  uploadingImage: boolean;
  onInputChange: (field: keyof EventFormData, value: string | boolean) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
}

export const AdditionalDetailsSection = ({
  formData,
  errors,
  uploadingImage,
  onInputChange,
  onImageUpload,
  onRemoveImage
}: AdditionalDetailsSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Detalhes Adicionais</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Preço (R$)</Label>
            <Input
              id="price"
              type="number"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => onInputChange('price', e.target.value)}
              className={errors.price ? 'border-destructive' : ''}
            />
            {errors.price && (
              <p className="text-sm text-destructive">{errors.price}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxParticipants">Máx. Participantes</Label>
            <Input
              id="maxParticipants"
              type="number"
              placeholder="Ilimitado"
              min="1"
              value={formData.maxParticipants}
              onChange={(e) => onInputChange('maxParticipants', e.target.value)}
              className={errors.maxParticipants ? 'border-destructive' : ''}
            />
            {errors.maxParticipants && (
              <p className="text-sm text-destructive">{errors.maxParticipants}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Foto de Capa do Evento</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Uma imagem será gerada automaticamente se você não fizer upload
          </p>
          
          {formData.imageUrl ? (
            <div className="relative">
              <img 
                src={formData.imageUrl} 
                alt="Preview" 
                className="w-full h-48 object-cover rounded-lg"
              />
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={onRemoveImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
              <input
                id="imageUpload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onImageUpload}
                className="hidden"
                disabled={uploadingImage}
              />
              <label htmlFor="imageUpload" className="cursor-pointer block">
                <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-foreground font-medium mb-1">
                  {uploadingImage ? 'Carregando imagem...' : 'Clique para adicionar foto de capa (opcional)'}
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG até 5MB
                </p>
              </label>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
