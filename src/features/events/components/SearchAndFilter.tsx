import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  X,
  CalendarDays,
  Tag,
  DollarSign,
  Users,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { EventCard } from '@/components/EventCard';
import { EventCardSkeleton } from '@/components/skeletons/EventCardSkeleton';
import { useSearchEvents } from '../hooks/useEventDiscovery';
import { useUIStore } from '@/stores/uiStore';
import { CATEGORIES } from '@/constants/categories';
import type { Event } from '@/types';

interface SearchAndFilterProps {
  onEventClick: (event: Event) => void;
}

type DatePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

const getDateRange = (preset: DatePreset) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  switch (preset) {
    case 'today':
      return { dateFrom: todayStr, dateTo: todayStr };
    case 'week': {
      const end = new Date(now);
      end.setDate(end.getDate() + 7);
      return { dateFrom: todayStr, dateTo: end.toISOString().split('T')[0] };
    }
    case 'month': {
      const end = new Date(now);
      end.setMonth(end.getMonth() + 1);
      return { dateFrom: todayStr, dateTo: end.toISOString().split('T')[0] };
    }
    default:
      return {};
  }
};

export const SearchAndFilter = ({ onEventClick }: SearchAndFilterProps) => {
  const { searchFilters, setSearchFilters, resetSearchFilters } = useUIStore();

  const [searchText, setSearchText] = useState(searchFilters.text);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [hasAvailability, setHasAvailability] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchFilters({ text: searchText });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, setSearchFilters]);

  // Build query filters
  const queryFilters = useMemo(() => {
    const dateRange = getDateRange(datePreset);
    return {
      text: searchFilters.text || undefined,
      category: searchFilters.category || undefined,
      state: searchFilters.state || undefined,
      city: searchFilters.city || undefined,
      priceRange: searchFilters.priceRange,
      hasAvailability,
      ...dateRange,
    };
  }, [searchFilters, datePreset, hasAvailability]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useSearchEvents(queryFilters);

  const allEvents = data?.pages.flatMap((p) => p.events) || [];
  const totalCount = data?.pages[0]?.totalCount || 0;

  // Infinite scroll observer
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const activeCount = [
    searchFilters.category,
    searchFilters.priceRange !== 'all' ? searchFilters.priceRange : '',
    datePreset !== 'all' ? datePreset : '',
    hasAvailability ? 'avail' : '',
  ].filter(Boolean).length;

  const handleClear = useCallback(() => {
    setSearchText('');
    setDatePreset('all');
    setHasAvailability(false);
    resetSearchFilters();
  }, [resetSearchFilters]);

  const categoryChips = ['Todos', ...CATEGORIES.filter((c) => c !== 'Outro')];

  return (
    <div className="space-y-4 pb-24">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar eventos..."
            className="pl-9 pr-8"
            aria-label="Buscar eventos"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="relative flex-shrink-0"
          onClick={() => setDrawerOpen(true)}
          aria-label="Filtros avançados"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {categoryChips.map((cat) => {
          const isActive =
            cat === 'Todos'
              ? !searchFilters.category
              : searchFilters.category === cat;
          return (
            <button
              key={cat}
              onClick={() =>
                setSearchFilters({ category: cat === 'Todos' ? '' : cat })
              }
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Quick filters row */}
      <div className="flex gap-2 flex-wrap">
        {(['today', 'week', 'month'] as DatePreset[]).map((preset) => {
          const labels = { today: 'Hoje', week: 'Esta semana', month: 'Este mês' };
          return (
            <Badge
              key={preset}
              variant={datePreset === preset ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setDatePreset(datePreset === preset ? 'all' : preset)}
            >
              <CalendarDays className="h-3 w-3 mr-1" />
              {labels[preset]}
            </Badge>
          );
        })}
        {(['free', 'paid'] as const).map((pr) => (
          <Badge
            key={pr}
            variant={searchFilters.priceRange === pr ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() =>
              setSearchFilters({
                priceRange: searchFilters.priceRange === pr ? 'all' : pr,
              })
            }
          >
            <DollarSign className="h-3 w-3 mr-1" />
            {pr === 'free' ? 'Gratuito' : 'Pago'}
          </Badge>
        ))}
      </div>

      {/* Results count */}
      {!isLoading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {totalCount} {totalCount === 1 ? 'atividade encontrada' : 'atividades encontradas'}
          </p>
          {activeCount > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-primary hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <EventCardSkeleton key={i} variant="compact" />
          ))}
        </div>
      ) : allEvents.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold text-foreground">Nenhum resultado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Tente outros filtros ou termos de busca
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {allEvents.map((event, idx) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <EventCard event={event} variant="compact" onEventClick={onEventClick} />
            </motion.div>
          ))}

          <div ref={loadMoreRef} className="h-8 flex items-center justify-center">
            {isFetchingNextPage && (
              <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>
      )}

      {/* Advanced filters drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filtros avançados</DrawerTitle>
          </DrawerHeader>

          <div className="px-4 space-y-5 pb-4">
            {/* Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Período
              </label>
              <div className="flex gap-2 flex-wrap">
                {(['all', 'today', 'week', 'month'] as DatePreset[]).map((p) => {
                  const labels = { all: 'Qualquer', today: 'Hoje', week: 'Semana', month: 'Mês' };
                  return (
                    <Button
                      key={p}
                      size="sm"
                      variant={datePreset === p ? 'default' : 'outline'}
                      onClick={() => setDatePreset(p)}
                    >
                      {labels[p]}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Preço
              </label>
              <div className="flex gap-2">
                {(['all', 'free', 'paid'] as const).map((p) => {
                  const labels = { all: 'Todos', free: 'Gratuito', paid: 'Pago' };
                  return (
                    <Button
                      key={p}
                      size="sm"
                      variant={searchFilters.priceRange === p ? 'default' : 'outline'}
                      onClick={() => setSearchFilters({ priceRange: p })}
                    >
                      {labels[p]}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Availability */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                Vagas
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={!hasAvailability ? 'default' : 'outline'}
                  onClick={() => setHasAvailability(false)}
                >
                  Qualquer
                </Button>
                <Button
                  size="sm"
                  variant={hasAvailability ? 'default' : 'outline'}
                  onClick={() => setHasAvailability(true)}
                >
                  Com vagas
                </Button>
              </div>
            </div>
          </div>

          <DrawerFooter>
            <Button
              onClick={() => {
                handleClear();
                setDrawerOpen(false);
              }}
              variant="outline"
            >
              Limpar tudo
            </Button>
            <DrawerClose asChild>
              <Button>Aplicar filtros</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
