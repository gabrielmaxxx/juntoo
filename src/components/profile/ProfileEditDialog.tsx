import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BRAZIL_STATES, BRAZIL_STATES_AND_CITIES } from '@/data/brazilStatesAndCities';
import { CATEGORIES } from '@/constants/categories';

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editedName: string;
  setEditedName: (name: string) => void;
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
  selectedState,
  setSelectedState,
  selectedCity,
  setSelectedCity,
  selectedInterests,
  toggleInterest,
  onSave,
}: ProfileEditDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
            />
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
          </div>
          
          <Button onClick={onSave} className="w-full">
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
