import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CATEGORIES } from '@/constants/categories';
import { useCreateCommunity } from '../hooks/useCommunities';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface CreateCommunityFormProps {
  onBack: () => void;
  onCreated: (communityId: string) => void;
}

export const CreateCommunityForm = ({ onBack, onCreated }: CreateCommunityFormProps) => {
  const { profile } = useAuth();
  const createMutation = useCreateCommunity();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState(profile?.city || '');
  const [isPublic, setIsPublic] = useState(true);
  const [rules, setRules] = useState('');

  const canSubmit = name.trim().length >= 3 && category;

  const handleSubmit = () => {
    if (!canSubmit) return;
    createMutation.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        city: city.trim() || undefined,
        is_public: isPublic,
        rules: rules.trim() || undefined,
      },
      {
        onSuccess: (data: any) => {
          onCreated(data.id);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-lg font-bold text-foreground">Nova Comunidade</h1>
      </div>

      <div className="p-5 space-y-5">
        <div className="space-y-2">
          <Label>Nome da comunidade *</Label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Futebol de Domingo"
            maxLength={60}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Do que se trata sua comunidade?"
            maxLength={500}
            className="rounded-xl min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Categoria *</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter(c => c !== 'Outro').map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                  category === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                {category === cat && <Check className="w-3 h-3 inline mr-1" />}
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Cidade</Label>
          <Input
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="Ex: São Paulo"
            className="rounded-xl"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Comunidade pública</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPublic ? 'Qualquer pessoa pode entrar' : 'Novos membros precisam de aprovação'}
            </p>
          </div>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </div>

        <div className="space-y-2">
          <Label>Regras da comunidade</Label>
          <Textarea
            value={rules}
            onChange={e => setRules(e.target.value)}
            placeholder="Defina as regras de convivência..."
            maxLength={1000}
            className="rounded-xl min-h-[80px]"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || createMutation.isPending}
          className="w-full h-12 rounded-xl text-base font-semibold"
        >
          {createMutation.isPending ? 'Criando...' : 'Criar Comunidade'}
        </Button>
      </div>
    </div>
  );
};
