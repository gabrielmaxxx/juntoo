import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BRAZIL_STATES } from '@/data/brazilStatesAndCities';
import { useCities } from '@/hooks/useCities';
import { CATEGORIES } from '@/constants/categories';
import { profileSchema } from '@/lib/validations/commonSchemas';

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editedName: string;
  setEditedName: (name: string) => void;
  editedBio: string;
  setEditedBio: (bio: string) => void;
  editedBirthDate: string;
  setEditedBirthDate: (date: string) => void;
  selectedState: string;
  setSelectedState: (state: string) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedInterests: string[];
  toggleInterest: (interest: string) => void;
  onSave: () => void;
}


export const ProfileEditDialog = ({
  open,
  onOpenChange,
  editedName,
  setEditedName,
  editedBio,
  setEditedBio,
  selectedState,
  setSelectedState,
  selectedCity,
  setSelectedCity,
  selectedInterests,
  toggleInterest,
  onSave,
}: ProfileEditDialogProps) => {
  const BRAZIL_STATES_AND_CITIES = useCities();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = () => {
    const city = selectedCity && selectedState
      ? `${selectedCity}, ${selectedState}`
      : '';

    const validation = profileSchema.safeParse({
      full_name: editedName,
      city,
      interests: selectedInterests,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach(err => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (editedBio.length > 150) {
      setErrors(prev => ({ ...prev, bio: 'Bio deve ter no máximo 150 caracteres' }));
      return;
    }

    setErrors({});
    onSave();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={editedName}
              onChange={(e) => {
                setEditedName(e.target.value);
                if (errors.full_name) setErrors(prev => ({ ...prev, full_name: '' }));
              }}
              aria-invalid={!!errors.full_name}
              aria-describedby={errors.full_name ? 'name-error' : undefined}
            />
            {errors.full_name && (
              <p id="name-error" className="text-sm text-destructive mt-1" role="alert">
                {errors.full_name}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={editedBio}
              onChange={(e) => {
                setEditedBio(e.target.value);
                if (errors.bio) setErrors(prev => ({ ...prev, bio: '' }));
              }}
              placeholder="Conte um pouco sobre você..."
              rows={2}
              maxLength={150}
              className="resize-none min-h-[60px]"
            />
            <div className="flex justify-between mt-1">
              {errors.bio ? (
                <p className="text-sm text-destructive" role="alert">{errors.bio}</p>
              ) : (
                <span />
              )}
              <span className={`text-xs ${editedBio.length > 140 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {editedBio.length}/150
              </span>
            </div>
          </div>
          
          <div>
            <Label htmlFor="state">Estado</Label>
            <Select value={selectedState} onValueChange={(value) => {
              setSelectedState(value);
              setSelectedCity('');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione seu estado" />
              </SelectTrigger>
              <SelectContent>
                {BRAZIL_STATES.map((state) => (
                  <SelectItem key={state.value} value={state.value}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="city">Cidade</Label>
            <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
              <SelectTrigger>
                <SelectValue placeholder={selectedState ? "Selecione sua cidade" : "Primeiro selecione o estado"} />
              </SelectTrigger>
              <SelectContent>
                {selectedState && BRAZIL_STATES_AND_CITIES[selectedState as keyof typeof BRAZIL_STATES_AND_CITIES]?.map((cityName) => (
                  <SelectItem key={cityName} value={cityName}>
                    {cityName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Interesses</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CATEGORIES.map((interest) => (
                <Badge
                  key={interest}
                  variant={selectedInterests.includes(interest) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}
                </Badge>
              ))}
            </div>
            {errors.interests && (
              <p className="text-sm text-destructive mt-1" role="alert">
                {errors.interests}
              </p>
            )}
          </div>
          
          <Button onClick={handleSave} className="w-full">
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
