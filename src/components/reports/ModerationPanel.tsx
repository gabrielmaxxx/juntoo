import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, FileText, Users, BarChart3, BadgeCheck } from 'lucide-react';
import { ReportsList } from '@/components/moderation/ReportsList';
import { ReportedUsers } from '@/components/moderation/ReportedUsers';
import { ModerationStats } from '@/components/moderation/ModerationStats';
import { VerificationReviews } from '@/components/moderation/VerificationReviews';
import { PenaltyHistory } from '@/components/moderation/PenaltyHistory';
import { cn } from '@/lib/utils';

interface ModerationPanelProps {
  onBack: () => void;
}

type ModerationView = 'reports' | 'users' | 'stats' | 'verifications';

interface NavSection {
  title: string;
  items: { key: ModerationView; label: string; icon: typeof FileText }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Denúncias',
    items: [
      { key: 'reports', label: 'Denúncias', icon: FileText },
      { key: 'users', label: 'Usuários', icon: Users },
      { key: 'stats', label: 'Estatísticas', icon: BarChart3 },
    ],
  },
  {
    title: 'Verificação',
    items: [
      { key: 'verifications', label: 'Verificações', icon: BadgeCheck },
    ],
  },
];

export const ModerationPanel = ({ onBack }: ModerationPanelProps) => {
  const { user } = useAuth();
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ModerationView>('reports');

  useEffect(() => {
    if (!user) return;
    supabase.from('user_roles').select('role').eq('user_id', user.id).in('role', ['moderator', 'admin']).then(({ data }) => {
      setIsModerator(!!(data && data.length > 0));
      setLoading(false);
    });
  }, [user]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  if (!isModerator) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={onBack} className="mb-4 gap-2"><ArrowLeft className="w-4 h-4" /> Voltar</Button>
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Acesso restrito a moderadores.</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeView) {
      case 'reports': return <ReportsList />;
      case 'users': return <ReportedUsers />;
      case 'stats': return <ModerationStats />;
      case 'verifications': return <VerificationReviews />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex items-center gap-2 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold text-foreground">Moderação</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-border bg-card overflow-y-auto hidden sm:block">
          <nav className="p-3 space-y-4">
            {NAV_SECTIONS.map(section => (
              <div key={section.title}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1.5">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const isActive = activeView === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setActiveView(item.key)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Mobile tabs (visible on small screens) */}
        <div className="sm:hidden w-full flex flex-col overflow-hidden">
          <div className="flex border-b border-border bg-card overflow-x-auto shrink-0">
            {NAV_SECTIONS.flatMap(s => s.items).map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveView(item.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-24">
            {renderContent()}
          </div>
        </div>

        {/* Desktop content */}
        <main className="flex-1 overflow-y-auto p-6 pb-24 hidden sm:block">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
