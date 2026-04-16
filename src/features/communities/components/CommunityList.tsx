import { useState } from 'react';
import { Search, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CommunityCard } from './CommunityCard';
import { Community, useCommunities, useMyCommunities } from '../hooks/useCommunities';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { CATEGORIES } from '@/constants/categories';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface CommunityListProps {
  onCommunityClick: (community: Community) => void;
  onCreateClick: () => void;
}

export const CommunityList = ({ onCommunityClick, onCreateClick }: CommunityListProps) => {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [tab, setTab] = useState<'discover' | 'mine'>('discover');

  const { data: allCommunities = [], isLoading: loadingAll } = useCommunities(profile?.city, selectedCategory);
  const { data: myCommunities = [], isLoading: loadingMine } = useMyCommunities();

  const communities = tab === 'mine' ? myCommunities : allCommunities;
  const loading = tab === 'mine' ? loadingMine : loadingAll;

  const filtered = search
    ? communities.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : communities;

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="px-5 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Comunidades</h1>
          <Button size="sm" onClick={onCreateClick} className="rounded-xl">
            <Plus className="w-4 h-4 mr-1" />
            Criar
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['discover', 'mine'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}
            >
              {t === 'discover' ? 'Descobrir' : 'Minhas'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar comunidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Category filter */}
        {tab === 'discover' && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
                !selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}
            >
              Todas
            </button>
            {CATEGORIES.filter(c => c !== 'Outro').map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? undefined : cat)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
                  selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="px-5 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-card">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🏘️"
            title={tab === 'mine' ? 'Nenhuma comunidade' : 'Nenhuma comunidade encontrada'}
            description={tab === 'mine' ? 'Você ainda não participa de nenhuma comunidade.' : 'Tente outros filtros ou crie uma nova!'}
          />
        ) : (
          filtered.map(community => (
            <CommunityCard
              key={community.id}
              community={community}
              onClick={onCommunityClick}
            />
          ))
        )}
      </div>
    </div>
  );
};
