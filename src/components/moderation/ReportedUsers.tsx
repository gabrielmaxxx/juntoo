import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserModerationProfile } from './UserModerationProfile';
import { toast } from 'sonner';
import { Shield, AlertTriangle, User } from 'lucide-react';

interface ReportedUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  report_count: number;
  pending_count: number;
  trust_score: number;
  reputation: { average_overall: number; total_reviews: number };
  is_suspended: boolean;
}

const getTrustLabel = (score: number) => {
  if (score >= 90) return { label: 'Excelente', variant: 'secondary' as const };
  if (score >= 70) return { label: 'Confiável', variant: 'default' as const };
  if (score >= 50) return { label: 'Atenção', variant: 'outline' as const };
  if (score >= 30) return { label: 'Alto risco', variant: 'destructive' as const };
  return { label: 'Crítico', variant: 'destructive' as const };
};

export const ReportedUsers = () => {
  const [users, setUsers] = useState<ReportedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_reported_users');
      if (error) throw error;
      setUsers((data as unknown as ReportedUser[]) || []);
    } catch {
      toast.error('Erro ao carregar usuários denunciados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  if (selectedUserId) {
    return <UserModerationProfile userId={selectedUserId} onBack={() => { setSelectedUserId(null); fetchUsers(); }} />;
  }

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (users.length === 0) return <p className="text-center py-12 text-muted-foreground">Nenhum usuário denunciado.</p>;

  return (
    <div className="space-y-2">
      {users.map(u => {
        const trust = getTrustLabel(u.trust_score);
        return (
          <Card key={u.user_id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedUserId(u.user_id)}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.avatar_url || ''} />
                  <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{u.full_name}</p>
                    {u.is_suspended && <Badge variant="destructive" className="text-xs">Suspenso</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{u.report_count} denúncia(s)</span>
                    {u.pending_count > 0 && <Badge variant="destructive" className="text-xs">{u.pending_count} pendente(s)</Badge>}
                    <Badge variant={trust.variant} className="text-xs">{trust.label} ({u.trust_score})</Badge>
                    {u.reputation.total_reviews > 0 && (
                      <span className="text-xs text-muted-foreground">⭐ {u.reputation.average_overall}</span>
                    )}
                  </div>
                </div>
                <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
