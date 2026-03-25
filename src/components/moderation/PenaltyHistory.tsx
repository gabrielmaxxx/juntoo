import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Trash2, User, Search, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Penalty {
  id: string;
  user_id: string;
  moderator_id: string;
  penalty_type: string;
  reason: string;
  reputation_impact: number | null;
  duration_days: number | null;
  blocked_feature: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface PenaltyWithProfiles extends Penalty {
  user_name: string;
  user_avatar: string | null;
  moderator_name: string;
}

const PENALTY_LABELS: Record<string, string> = {
  warning: 'Advertência',
  reputation_loss: 'Perda de reputação',
  suspension: 'Suspensão',
  feature_block: 'Bloqueio de função',
  ban: 'Banimento',
};

const PENALTY_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  warning: 'outline',
  reputation_loss: 'secondary',
  suspension: 'default',
  feature_block: 'secondary',
  ban: 'destructive',
};

export const PenaltyHistory = () => {
  const { user } = useAuth();
  const [penalties, setPenalties] = useState<PenaltyWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<PenaltyWithProfiles | null>(null);
  const [revoking, setRevoking] = useState(false);

  const fetchPenalties = async () => {
    setLoading(true);
    let query = supabase
      .from('user_penalties')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (filterType !== 'all') {
      query = query.eq('penalty_type', filterType);
    }
    if (filterStatus === 'active') {
      query = query.eq('is_active', true);
    } else if (filterStatus === 'revoked') {
      query = query.eq('is_active', false);
    }

    const { data, error } = await query;
    if (error) {
      toast.error('Erro ao carregar punições');
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setPenalties([]);
      setLoading(false);
      return;
    }

    // Gather unique user_ids and moderator_ids
    const userIds = [...new Set(data.flatMap(p => [p.user_id, p.moderator_id]))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const enriched: PenaltyWithProfiles[] = data.map(p => ({
      ...p,
      user_name: profileMap.get(p.user_id)?.full_name || 'Desconhecido',
      user_avatar: profileMap.get(p.user_id)?.avatar_url || null,
      moderator_name: profileMap.get(p.moderator_id)?.full_name || 'Sistema',
    }));

    // Client-side search filter
    const filtered = search.trim()
      ? enriched.filter(p =>
          p.user_name.toLowerCase().includes(search.toLowerCase()) ||
          p.reason.toLowerCase().includes(search.toLowerCase())
        )
      : enriched;

    setPenalties(filtered);
    setLoading(false);
  };

  useEffect(() => {
    fetchPenalties();
  }, [filterType, filterStatus]);

  const handleSearch = () => fetchPenalties();

  const handleRevoke = async () => {
    if (!revokeTarget || !user) return;
    setRevoking(true);
    try {
      const { error } = await supabase.rpc('revoke_penalty', {
        p_penalty_id: revokeTarget.id,
        p_moderator_id: user.id,
      });
      if (error) throw error;
      toast.success('Punição revogada com sucesso. O impacto na reputação foi revertido.');
      setRevokeTarget(null);
      fetchPenalties();
    } catch (err: any) {
      toast.error('Erro ao revogar: ' + (err.message || ''));
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Histórico de Punições</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="warning">Advertência</SelectItem>
            <SelectItem value="reputation_loss">Perda de reputação</SelectItem>
            <SelectItem value="suspension">Suspensão</SelectItem>
            <SelectItem value="feature_block">Bloqueio de função</SelectItem>
            <SelectItem value="ban">Banimento</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="revoked">Revogadas</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1 flex-1 min-w-[200px]">
          <Input
            placeholder="Buscar por nome ou motivo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : penalties.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma punição encontrada.</p>
      ) : (
        <div className="space-y-2">
          {penalties.map(p => (
            <Card key={p.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={p.user_avatar || ''} />
                    <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground">{p.user_name}</span>
                      <Badge variant={PENALTY_VARIANTS[p.penalty_type] || 'outline'} className="text-xs">
                        {PENALTY_LABELS[p.penalty_type] || p.penalty_type}
                      </Badge>
                      {!p.is_active && (
                        <Badge variant="secondary" className="text-xs">Revogada</Badge>
                      )}
                    </div>

                    <p className="text-sm text-foreground mt-1">{p.reason}</p>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                      <span>{format(new Date(p.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      {p.duration_days && <span>{p.duration_days} dia(s)</span>}
                      {p.reputation_impact ? <span>Reputação: {p.reputation_impact}</span> : null}
                      {p.blocked_feature && <span>Função: {p.blocked_feature}</span>}
                      <span>Por: {p.moderator_name}</span>
                      {p.expires_at && (
                        <span>Expira: {format(new Date(p.expires_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                      )}
                    </div>
                  </div>

                  {p.is_active && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setRevokeTarget(p)}
                      title="Revogar punição"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Revoke confirmation dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={open => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Revogar Punição
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja revogar esta punição? Isso irá:
            </DialogDescription>
          </DialogHeader>

          {revokeTarget && (
            <div className="space-y-2 text-sm">
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Desativar a punição de <strong>{PENALTY_LABELS[revokeTarget.penalty_type]}</strong></li>
                {revokeTarget.reputation_impact ? (
                  <li>Reverter o impacto de <strong>{Math.abs(revokeTarget.reputation_impact)}</strong> pontos na reputação</li>
                ) : null}
                {(revokeTarget.penalty_type === 'suspension' || revokeTarget.penalty_type === 'ban') && (
                  <li>Remover as restrições de acesso do usuário</li>
                )}
                {revokeTarget.penalty_type === 'feature_block' && (
                  <li>Desbloquear a função: <strong>{revokeTarget.blocked_feature}</strong></li>
                )}
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                Usuário: <strong>{revokeTarget.user_name}</strong> • Motivo original: {revokeTarget.reason}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={revoking}>
              {revoking ? 'Revogando...' : 'Confirmar Revogação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
