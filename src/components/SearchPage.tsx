import { useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, Calendar, MapPin, Tag, Filter, X, Loader2, Sparkles, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EventCard } from '@/components/EventCard';
import { Event } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BRAZIL_STATES, BRAZIL_STATES_AND_CITIES } from '@/data/brazilStatesAndCities';
import { CATEGORIES } from '@/constants/categories';
import { useInfiniteEvents } from '@/hooks/useInfiniteEvents';
import { useRecommendedEvents } from '@/hooks/useEvents';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { LiveRegion } from '@/components/ui/live-region';
import { LazyImage } from '@/components/ui/lazy-image';

interface SearchPageProps {
  onEventClick: (event: Event) => void;
}

interface SearchFilters {
  text: string;
  category: string;
  state: string;
  city: string;
  date: Date | undefined;
  priceRange: 'all' | 'free' | 'paid';
}

const SEARCH_CATEGORIES = ['Todos', ...CATEGORIES];

export const SearchPage = ({ onEventClick }: SearchPageProps) => {
  const [filters, setFilters] = useState<SearchFilters>({
    text: '',
    category: 'Todos',
    state: '',
    city: '',
    date: undefined,
    priceRange: 'all'
  });

  const [debouncedText, setDebouncedText] = useState('');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce text search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedText(filters.text);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.text]);

  const filtersForQuery = useMemo(() => ({
    ...filters,
    text: debouncedText
  }), [filters.category, filters.state, filters.city, filters.date, filters.priceRange, debouncedText]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteEvents(filtersForQuery);

  // Flatten all pages into a single array
  const allEvents = useMemo(() => {
    return data?.pages.flatMap(page => page.events) ?? [];
  }, [data]);

  // Infinite scroll observer
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleObserver, {
      rootMargin: '100px',
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [handleObserver]);

  const clearFilters = () => {
    setFilters({
      text: '',
      category: 'Todos',
      state: '',
      city: '',
      date: undefined,
      priceRange: 'all'
    });
  };

  const activeFiltersCount = [
    filters.category !== 'Todos',
    filters.state !== '',
    filters.city !== '',
    filters.date !== undefined,
    filters.priceRange !== 'all'
  ].filter(Boolean).length;

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="p-3 sm:p-4 space-y-4 pb-24">
      {/* Search Header */}
      <header className="space-y-3">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Buscar Eventos</h1>
        
        {/* Main Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          <Input
            placeholder="Buscar eventos..."
            value={filters.text}
            onChange={(e) => setFilters(prev => ({ ...prev, text: e.target.value }))}
            className="pl-9 sm:pl-10 h-10 sm:h-12 text-sm sm:text-base"
            aria-label="Buscar eventos"
          />
        </div>

        {/* Filter Chips */}
        <nav className="flex flex-wrap gap-1.5 sm:gap-2" aria-label="Filtros de busca">
          {/* Category Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={filters.category !== 'Todos' ? 'default' : 'outline'} size="sm" className="h-7 sm:h-8 text-xs sm:text-sm">
                <Tag className="w-3 h-3 sm:w-4 sm:h-4 mr-1" aria-hidden="true" />
                {filters.category}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2">
              <div className="space-y-1">
                {SEARCH_CATEGORIES.map(category => (
                  <Button
                    key={category}
                    variant={filters.category === category ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setFilters(prev => ({ ...prev, category }))}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* State Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={filters.state ? 'default' : 'outline'} size="sm" className="h-7 sm:h-8 text-xs sm:text-sm">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1" aria-hidden="true" />
                {filters.state || 'Estado'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 bg-background z-50">
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                <Button
                  variant={!filters.state ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setFilters(prev => ({ ...prev, state: '', city: '' }));
                  }}
                >
                  Todos os estados
                </Button>
                {BRAZIL_STATES.map((state) => (
                  <Button
                    key={state.value}
                    variant={filters.state === state.value ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => {
                      setFilters(prev => ({ ...prev, state: state.value, city: '' }));
                    }}
                  >
                    {state.label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* City Filter */}
          {filters.state && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={filters.city ? 'default' : 'outline'} size="sm" className="h-7 sm:h-8 text-xs sm:text-sm">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1" aria-hidden="true" />
                  {filters.city || 'Cidade'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 bg-background z-50">
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  <Button
                    variant={!filters.city ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setFilters(prev => ({ ...prev, city: '' }))}
                  >
                    Todas as cidades
                  </Button>
                  {BRAZIL_STATES_AND_CITIES[filters.state]?.map((city) => (
                    <Button
                      key={city}
                      variant={filters.city === city ? 'default' : 'ghost'}
                      size="sm"
                      className="w-full justify-start text-left"
                      onClick={() => setFilters(prev => ({ ...prev, city }))}
                    >
                      {city}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Date Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={filters.date ? 'default' : 'outline'} size="sm" className="h-7 sm:h-8 text-xs sm:text-sm">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" aria-hidden="true" />
                {filters.date ? format(filters.date, 'dd/MM', { locale: ptBR }) : 'Data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.date}
                onSelect={(date) => setFilters(prev => ({ ...prev, date }))}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Price Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={filters.priceRange !== 'all' ? 'default' : 'outline'} size="sm" className="h-7 sm:h-8 text-xs sm:text-sm">
                <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1" aria-hidden="true" />
                {filters.priceRange === 'all' ? 'Preço' : filters.priceRange === 'free' ? 'Gratuito' : 'Pago'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-2">
              <div className="space-y-1">
                {[
                  { value: 'all', label: 'Todos' },
                  { value: 'free', label: 'Gratuito' },
                  { value: 'paid', label: 'Pago' }
                ].map(option => (
                  <Button
                    key={option.value}
                    variant={filters.priceRange === option.value ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setFilters(prev => ({ ...prev, priceRange: option.value as any }))}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 sm:h-8 text-xs sm:text-sm text-destructive">
              <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1" aria-hidden="true" />
              Limpar ({activeFiltersCount})
            </Button>
          )}
        </nav>
      </header>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {allEvents.length} {allEvents.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
        </p>
        {filters.text && (
          <Badge variant="secondary" className="text-xs">
            "{filters.text}"
          </Badge>
        )}
      </div>

      {/* Accessible announcement for search results */}
      <LiveRegion
        message={
          isLoading
            ? 'Buscando eventos...'
            : `${allEvents.length} ${allEvents.length === 1 ? 'evento encontrado' : 'eventos encontrados'}`
        }
      />

      {/* Results */}
      <section className="space-y-3" aria-label="Resultados da busca">
        {isError ? (
          <div className="text-center py-12">
            <p className="text-destructive">Erro ao carregar eventos. Tente novamente.</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
              Recarregar
            </Button>
          </div>
        ) : allEvents.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Search className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-2">Nenhum evento encontrado</h2>
            <p className="text-muted-foreground mb-4">
              Tente ajustar seus filtros ou termos de busca
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        ) : (
          <>
            {allEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                variant="compact"
                onEventClick={onEventClick}
              />
            ))}
            
            {/* Load more trigger */}
            <div ref={loadMoreRef} className="flex justify-center py-4">
              {isFetchingNextPage && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  <span>Carregando mais eventos...</span>
                </div>
              )}
              {!hasNextPage && allEvents.length > 0 && (
                <p className="text-sm text-muted-foreground">Você viu todos os eventos</p>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
};
