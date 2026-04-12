import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useOnboarding } from './OnboardingContext';
import { useCities } from '@/hooks/useCities';
import { BRAZIL_STATES } from '@/data/brazilStatesAndCities';
import { Camera, ArrowRight, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const StepIdentity = () => {
  const { data, updateData, setStep } = useOnboarding();
  const { toast } = useToast();
  const cities = useCities();
  const [nameError, setNameError] = useState('');

  const cityOptions = useMemo(() => {
    if (!data.state) return [];
    return cities[data.state] || [];
  }, [data.state, cities]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Selecione uma imagem válida', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Imagem muito grande (máx 5MB)', variant: 'destructive' });
      return;
    }
    updateData({ avatarFile: file, avatarPreview: URL.createObjectURL(file) });
  };

  const handleNext = () => {
    const name = data.fullName.trim();
    if (!name || name.length < 2) {
      setNameError('Digite pelo menos 2 caracteres');
      return;
    }
    setNameError('');
    setStep(2);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-heading font-bold text-foreground leading-tight">
          Sua próxima aventura<br />começa aqui ✨
        </h1>
        <p className="text-sm text-muted-foreground font-body">
          Conta pra gente quem é você — leva menos de 1 minuto.
        </p>
      </div>

      {/* Avatar */}
      <div className="flex justify-center">
        <label className="relative cursor-pointer group">
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center overflow-hidden bg-muted group-hover:border-primary transition-colors">
            {data.avatarPreview ? (
              <img src={data.avatarPreview} alt="Foto" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <Camera className="w-7 h-7 text-muted-foreground mx-auto" />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">Foto</span>
              </div>
            )}
          </div>
          {data.avatarPreview && (
            <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md">
              <Camera className="w-3.5 h-3.5" />
            </div>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </label>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground font-body">Como quer ser chamado? *</label>
        <Input
          value={data.fullName}
          onChange={e => { updateData({ fullName: e.target.value }); setNameError(''); }}
          placeholder="Seu nome ou apelido"
          maxLength={60}
          className={nameError ? 'border-destructive' : ''}
          autoFocus
        />
        {nameError && <p className="text-xs text-destructive">{nameError}</p>}
      </div>

      {/* Location */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <label className="text-sm font-medium text-foreground font-body">Sua cidade</label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={data.state} onValueChange={v => updateData({ state: v, city: '' })}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              {BRAZIL_STATES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={data.city} onValueChange={v => updateData({ city: v })} disabled={!data.state}>
            <SelectTrigger><SelectValue placeholder="Cidade" /></SelectTrigger>
            <SelectContent>
              {cityOptions.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={handleNext} className="w-full" variant="hero">
        Próximo <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </div>
  );
};
