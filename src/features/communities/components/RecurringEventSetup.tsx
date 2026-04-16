import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIES } from '@/constants/categories';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const DAY_OPTIONS = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda' },
  { value: '2', label: 'Terça' },
  { value: '3', label: 'Quarta' },
  { value: '4', label: 'Quinta' },
  { value: '5', label: 'Sexta' },
  { value: '6', label: 'Sábado' },
];

interface RecurringEventSetupProps {
  communityId: string;
  onBack: () => void;
}

export const RecurringEventSetup = ({ communityId, onBack }: RecurringEventSetupProps) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState('6');
  const [time, setTime] = useState('14:00');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim().length >= 3 && location.trim() && category && time;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('recurring_community_events').insert({
        community_id: communityId,
        title: title.trim(),
        description: description.trim() || null,
        recurrence,
        day_of_week: parseInt(dayOfWeek),
        time,
        location: location.trim(),
        category,
        max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      } as any);
      if (error) throw error;
      toast.success('Evento recorrente criado!');
      queryClient.invalidateQueries({ queryKey: ['community-recurring-events', communityId] });
      onBack();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar evento');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-lg font-bold text-foreground">Novo Evento Recorrente</h1>
      </div>

      <div className="p-5 space-y-5">
        <div className="space-y-2">
          <Label>Título *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Futebol semanal" maxLength={100} className="rounded-xl" />
        </div>

        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes do evento..." maxLength={500} className="rounded-xl min-h-[60px]" />
        </div>

        <div className="space-y-2">
          <Label>Categoria *</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter(c => c !== 'Outro').map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  category === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                {category === cat && <Check className="w-3 h-3 inline mr-1" />}
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Frequência</Label>
            <Select value={recurrence} onValueChange={v => setRecurrence(v as any)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="biweekly">Quinzenal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dia da semana</Label>
            <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAY_OPTIONS.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Horário *</Label>
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>Máx. participantes</Label>
            <Input type="number" value={maxParticipants} onChange={e => setMaxParticipants(e.target.value)} placeholder="Sem limite" className="rounded-xl" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Local *</Label>
          <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex: Parque Ibirapuera" className="rounded-xl" />
        </div>

        <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full h-12 rounded-xl text-base font-semibold">
          {submitting ? 'Criando...' : 'Criar Evento Recorrente'}
        </Button>
      </div>
    </div>
  );
};
