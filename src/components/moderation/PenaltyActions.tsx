import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  userId: string;
  userName: string;
  onClose: () => void;
  onApplied: () => void;
}

type PenaltyType = 'warning' | 'reputation_loss' | 'suspension' | 'feature_block' | 'ban';

export const PenaltyActions = ({ userId, userName, onClose, onApplied }: Props) => {
  const { user } = useAuth();
  const [penaltyType, setPenaltyType] = useState<PenaltyType>('warning');
  const [reason, setReason] = useState('');
  const [repImpact, setRepImpact] = useState('0');
  const [duration, setDuration] = useState('0');
  const [blockedFeature, setBlockedFeature] = useState('');
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    if (!user || !reason.trim()) {
      toast.error('Informe o motivo da ação');
      return;
    }
    setApplying(true);
    try {
      const { error } = await supabase.rpc('apply_penalty', {
        p_user_id: userId,
        p_moderator_id: user.id,
        p_penalty_type: penaltyType,
        p_reason: reason.trim(),
        p_reputation_impact: parseInt(repImpact) || 0,
        p_duration_days: parseInt(duration) || null,
        p_blocked_feature: blockedFeature || null,
      });
      if (error) throw error;
      toast.success('Ação aplicada com sucesso');
      onClose();
      onApplied();
    } catch (err: any) {
      toast.error('Erro ao aplicar ação: ' + (err.message || ''));
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Aplicar Ação — {userName}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6"><X className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs font-medium text-foreground">Tipo de ação</label>
          <Select value={penaltyType} onValueChange={v => setPenaltyType(v as PenaltyType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="warning">Advertência</SelectItem>
              <SelectItem value="reputation_loss">Reduzir reputação</SelectItem>
              <SelectItem value="suspension">Suspender conta</SelectItem>
              <SelectItem value="feature_block">Bloquear função</SelectItem>
              <SelectItem value="ban">Banir usuário</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-foreground">Motivo</label>
          <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Descreva o motivo..." className="min-h-[60px]" />
        </div>

        {penaltyType === 'reputation_loss' && (
          <div>
            <label className="text-xs font-medium text-foreground">Impacto na reputação</label>
            <Select value={repImpact} onValueChange={setRepImpact}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5">-5</SelectItem>
                <SelectItem value="10">-10</SelectItem>
                <SelectItem value="20">-20</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {(penaltyType === 'suspension' || penaltyType === 'feature_block') && (
          <div>
            <label className="text-xs font-medium text-foreground">Duração</label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 dia</SelectItem>
                <SelectItem value="3">3 dias</SelectItem>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {penaltyType === 'feature_block' && (
          <div>
            <label className="text-xs font-medium text-foreground">Função a bloquear</label>
            <Select value={blockedFeature} onValueChange={setBlockedFeature}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="create_events">Criação de eventos</SelectItem>
                <SelectItem value="messages">Mensagens privadas</SelectItem>
                <SelectItem value="comments">Comentários</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button size="sm" variant="destructive" onClick={handleApply} disabled={applying || !reason.trim()} className="flex-1">
            {applying ? 'Aplicando...' : 'Aplicar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
