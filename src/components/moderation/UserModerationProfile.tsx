import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, User, Shield, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PenaltyActions } from './PenaltyActions';
import { toast } from 'sonner';

interface Props {
  userId: string;
  onBack: () => void;
}

const getTrustLabel = (score: number) => {
  if (score >= 90) return { label: 'Excelente', color: 'text-green-600' };
  if (score >= 70) return { label: 'Confiável', color: 'text-blue-600' };
  if (score >= 50) return { label: 'Atenção', color: 'text-yellow-600' };
  if (score >= 30) return { label: 'Alto risco', color: 'text-orange-600' };
  return { label: 'Crítico', color: 'text-destructive' };
};

const PENALTY_LABELS: Record<string, string> = {
  warning: 'Advertência',
  reputation_loss: 'Perda de reputação',
  suspension: 'Suspensão',
  feature_block: 'Bloqueio de função',
  ban: 'Banimento',
};

export const UserModerationProfile = ({ userId, onBack }: Props) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [trustScore, setTrustScore] = useState(100);
  const [reputation, setReputation] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [penalties, setPenalties] = useState<any[]>([]);
  const [eventCount, setEventCount] = useState(0);
  const [participationCount, setParticipationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPenalty, setShowPenalty] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [profileRes, trustRes, repRes, reportsRes, penaltiesRes, eventsRes, participationsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase.from('user_trust_scores').select('score').eq('user_id', userId).single(),
      supabase.rpc('get_user_reputation', { target_user_id: userId }),
      supabase.from('reports').select('*').eq('reported_user_id', userId).order('created_at', { ascending: false }),
      supabase.from('user_penalties').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('created_by', userId),
      supabase.from('event_participants').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);
    setProfile(profileRes.data);
    setTrustScore(trustRes.data?.score ?? 100);
    setReputation(repRes.data);
    setReports(reportsRes.data || []);
    setPenalties(penaltiesRes.data || []);
    setEventCount(eventsRes.count || 0);
    setParticipationCount(participationsRes.count || 0);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [userId]);

  const handleRevoke = async (penaltyId: string) => {
    if (!user) return;
    setRevokingId(penaltyId);
    try {
      const { error } = await supabase.rpc('revoke_penalty', {
        p_penalty_id: penaltyId,
        p_moderator_id: user.id,
      });
      if (error) throw error;
      toast.success('Punição revogada com sucesso');
      fetchAll();
    } catch (err: any) {
      toast.error('Erro ao revogar: ' + (err.message || ''));
    } finally {
      setRevokingId(null);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const trust = getTrustLabel(trustScore);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Button>

      {/* Profile header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback><User className="w-6 h-6" /></AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-bold text-foreground">{profile?.full_name}</h2>
              <p className="text-xs text-muted-foreground">{profile?.city || 'Sem cidade'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className={`text-xl font-bold ${trust.color}`}>{trustScore}</p>
              <p className="text-xs text-muted-foreground">Trust Score</p>
              <Badge variant="outline" className="text-xs mt-0.5">{trust.label}</Badge>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">⭐ {reputation?.average_overall || 0}</p>
              <p className="text-xs text-muted-foreground">Reputação</p>
              <p className="text-xs text-muted-foreground">{reputation?.total_reviews || 0} avaliações</p>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{reports.length}</p>
              <p className="text-xs text-muted-foreground">Denúncias</p>
              <p className="text-xs text-muted-foreground">{reports.filter(r => r.status === 'created').length} pendentes</p>
            </div>
          </div>

          <div className="flex gap-2 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{eventCount} eventos criados</span>
            <span>•</span>
            <span>{participationCount} participações</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Button onClick={() => setShowPenalty(true)} className="w-full gap-2">
        <Shield className="w-4 h-4" /> Aplicar Ação
      </Button>

      {showPenalty && (
        <PenaltyActions
          userId={userId}
          userName={profile?.full_name || ''}
          onClose={() => setShowPenalty(false)}
          onApplied={fetchAll}
        />
      )}

      {/* Disciplinary History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Histórico Disciplinar</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {penalties.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro.</p>
          ) : (
            <div className="space-y-3">
              {penalties.map(p => (
                <div key={p.id} className="border-l-2 border-destructive/30 pl-3 py-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={p.penalty_type === 'ban' ? 'destructive' : 'outline'} className="text-xs">
                        {PENALTY_LABELS[p.penalty_type] || p.penalty_type}
                      </Badge>
                      {p.duration_days && <span className="text-xs text-muted-foreground">{p.duration_days} dia(s)</span>}
                      {!p.is_active && <Badge variant="secondary" className="text-xs">Revogada</Badge>}
                    </div>
                    {p.is_active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleRevoke(p.id)}
                        disabled={revokingId === p.id}
                        title="Revogar punição"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-foreground mt-1">{p.reason}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(p.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    {p.reputation_impact ? ` • Reputação: ${p.reputation_impact}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reports */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Denúncias Recebidas ({reports.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma denúncia.</p>
          ) : (
            <div className="space-y-2">
              {reports.slice(0, 10).map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="text-foreground">{r.category}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{r.description || 'Sem descrição'}</p>
                  </div>
                  <Badge variant={r.status === 'created' ? 'destructive' : 'outline'} className="text-xs shrink-0">{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
