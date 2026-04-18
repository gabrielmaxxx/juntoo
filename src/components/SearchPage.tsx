import { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { Search, Calendar as CalendarIcon, MapPin, Tag, X, Loader2, Sparkles, ChevronRight, Users, ArrowUpDown, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EventCard } from '@/components/EventCard';
import { Event } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BRAZIL_STATES } from '@/data/brazilStatesAndCities';
import { useCities } from '@/hooks/useCities';
import { CATEGORIES } from '@/constants/categories';
import { useInfiniteEvents, type EventSortBy } from '@/hooks/useInfiniteEvents';
import { useRecommendedEvents } from '@/hooks/useEvents';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Skeleton } from '@/components/ui/skeleton';
import { LiveRegion } from '@/components/ui/live-region';
import { LazyImage } from '@/components/ui/lazy-image';

interface SearchPageProps {
  onEventClick: (event: Event) => void;
  onCreateEvent?: () => void;
}

interface SearchFilters {
  text: string;
  category: string;
  state: string;
  city: string;
  date: Date | undefined;
  priceRange: 'all' | 'free' | 'paid';
  today: boolean;
  hasAvailability: boolean;
  sortBy: EventSortBy;
}

const SEARCH_CATEGORIES = ['Todos', ...CATEGORIES];

const SORT_OPTIONS: { value: EventSortBy; label: string }[] = [
  { value: 'date_asc', label: 'Mais próximos da data' },
  { value: 'recent', label: 'Mais recentes' },
  { value: 'most_vacancies', label: 'Com mais vagas' },
];

export const SearchPage = ({ onEventClick, onCreateEvent }: SearchPageProps) => {
  const BRAZIL_STATES_AND_CITIES = useCities();
  const { user, profile } = useAuth();
  const { city: geoCity, stateCode: geoState } = useGeolocation();

  const { data: recommendedEvents = [], isLoading: loadingRecommended } = useRecommendedEvents(
    user?.id,
    profile?.interests || null,
    10
  );

  // Default city: geolocation > profile city. Persisted in component state so user can clear.
  const defaultCity = geoCity || profile?.city || '';
  const [filters, setFilters] = useState<SearchFilters>({
    text: '',
    category: 'Todos',
    state: '',
    city: defaultCity,
    date: undefined,
    priceRange: 'all',
    today: false,
    hasAvailability: false,
    sortBy: 'date_asc',
  });
  const [cityManuallyChanged, setCityManuallyChanged] = useState(false);

  // Once geolocation resolves, set the city if user hasn't manually overridden
  useEffect(() => {
    if (!cityManuallyChanged && geoCity && filters.city !== geoCity) {
      setFilters((prev) => ({ ...prev, city: geoCity, state: geoState || prev.state }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoCity, geoState]);

  const [debouncedText, setDebouncedText] = useState('');
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedText(filters.text), 300);
    return () => clearTimeout(timer);
  }, [filters.text]);

  const filtersForQuery = useMemo(
    () => ({ ...filters, text: debouncedText }),
    [
      filters.category,
      filters.state,
      filters.city,
      filters.date,
      filters.priceRange,
      filters.today,
      filters.hasAvailability,
      filters.sortBy,
      debouncedText,
    ]
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInfiniteEvents(filtersForQuery);

  const allEvents = useMemo(() => data?.pages.flatMap((p) => p.events) ?? [], [data]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleObserver, { rootMargin: '100px' });
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [handleObserver]);

  const clearFilters = () => {
    setCityManuallyChanged(true);
    setFilters({
      text: '',
      category: 'Todos',
      state: '',
      city: '',
      date: undefined,
      priceRange: 'all',
      today: false,
      hasAvailability: false,
      sortBy: 'date_asc',
    });
  };

  const activeFiltersCount = [
    filters.category !== 'Todos',
    filters.date !== undefined,
    filters.today,
    filters.hasAvailability,
    filters.priceRange !== 'all',
  ].filter(Boolean).length;

  const hasNoFilters = activeFiltersCount === 0 && !filters.text;

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
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Buscar Atividades</h1>

        {/* City banner — primary location context */}
        {filters.city ? (
          <div className="bg-primary/10 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
              <span className="text-xs sm:text-sm text-foreground truncate">
                Exibindo atividades em{' '}
                <span className="font-semibold">
                  {filters.city}
                  {filters.state ? `/${filters.state}` : ''}
                </span>
              </span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="text-xs text-primary font-medium hover:underline flex-shrink-0"
                  aria-label="Mudar cidade"
                >
                  Mudar
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2 bg-background z-50">
                <div className="space-y-1 max-h-[280px] overflow-y-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setCityManuallyChanged(true);
                      setFilters((prev) => ({ ...prev, city: '', state: '' }));
                    }}
                  >
                    Todas as cidades
                  </Button>
                  {filters.state && BRAZIL_STATES_AND_CITIES[filters.state]?.map((c) => (
                    <Button
                      key={c}
                      variant={filters.city === c ? 'default' : 'ghost'}
                      size="sm"
                      className="w-full justify-start text-left"
                      onClick={() => {
                        setCityManuallyChanged(true);
                        setFilters((prev) => ({ ...prev, city: c }));
                      }}
                    >
                      {c}
                    </Button>
                  ))}
                  {!filters.state && (
                    <p className="text-xs text-muted-foreground px-2 py-2">
                      Selecione um estado abaixo para listar cidades.
                    </p>
                  )}
                </div>
                <div className="border-t mt-2 pt-2 max-h-[180px] overflow-y-auto space-y-1">
                  {BRAZIL_STATES.map((s) => (
                    <Button
                      key={s.value}
                      variant={filters.state === s.value ? 'default' : 'ghost'}
                      size="sm"
                      className="w-full justify-start text-left text-xs"
                      onClick={() => {
                        setCityManuallyChanged(true);
                        setFilters((prev) => ({ ...prev, state: s.value, city: '' }));
                      }}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <div className="bg-muted/50 rounded-xl px-3 py-2.5 text-xs text-muted-foreground">
            Mostrando atividades de todas as cidades.{' '}
            <button
              onClick={() => {
                if (geoCity) {
                  setCityManuallyChanged(false);
                  setFilters((prev) => ({ ...prev, city: geoCity, state: geoState || '' }));
                }
              }}
              className="text-primary font-medium hover:underline"
            >
              {geoCity ? `Filtrar por ${geoCity}` : 'Defina sua cidade no perfil'}
            </button>
          </div>
        )}

        {/* Main Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          <Input
            placeholder="Buscar atividades..."
            value={filters.text}
            onChange={(e) => setFilters((prev) => ({ ...prev, text: e.target.value }))}
            className="pl-9 sm:pl-10 h-10 sm:h-12 text-sm sm:text-base"
            aria-label="Buscar atividades"
          />
        </div>

        {/* Quick filters: Hoje shortcut */}
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={filters.today ? 'default' : 'outline'}
            className="cursor-pointer h-7 px-2.5 text-xs"
            onClick={() =>
              setFilters((prev) => ({ ...prev, today: !prev.today, date: undefined }))
            }
          >
            <Clock className="w-3 h-3 mr-1" aria-hidden="true" />
            Hoje
          </Badge>
          <Badge
            variant={filters.hasAvailability ? 'default' : 'outline'}
            className="cursor-pointer h-7 px-2.5 text-xs"
            onClick={() =>
              setFilters((prev) => ({ ...prev, hasAvailability: !prev.hasAvailability }))
            }
          >
            <Users className="w-3 h-3 mr-1" aria-hidden="true" />
            Com vagas
          </Badge>
        </div>

        {/* Filters in order: Categoria → Data → Vagas */}
        <nav className="flex flex-wrap gap-1.5 sm:gap-2" aria-label="Filtros de busca">
          {/* Category */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={filters.category !== 'Todos' ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs sm:text-sm"
              >
                <Tag className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                {filters.category === 'Todos' ? 'Categoria' : filters.category}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 bg-background z-50">
              <div className="space-y-1 max-h-[280px] overflow-y-auto">
                {SEARCH_CATEGORIES.map((category) => (
                  <Button
                    key={category}
                    variant={filters.category === category ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setFilters((prev) => ({ ...prev, category }))}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={filters.date ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs sm:text-sm"
              >
                <CalendarIcon className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                {filters.date ? format(filters.date, 'dd/MM', { locale: ptBR }) : 'Data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
              <CalendarComponent
                mode="single"
                selected={filters.date}
                onSelect={(date) => setFilters((prev) => ({ ...prev, date, today: false }))}
                initialFocus
                className="pointer-events-auto p-3"
              />
            </PopoverContent>
          </Popover>

          {/* Price */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={filters.priceRange !== 'all' ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs sm:text-sm"
              >
                {filters.priceRange === 'all'
                  ? 'Preço'
                  : filters.priceRange === 'free'
                    ? 'Gratuito'
                    : 'Pago'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-2 bg-background z-50">
              <div className="space-y-1">
                {[
                  { value: 'all', label: 'Todos' },
                  { value: 'free', label: 'Gratuito' },
                  { value: 'paid', label: 'Pago' },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    variant={filters.priceRange === opt.value ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, priceRange: opt.value as any }))
                    }
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Sort */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                {SORT_OPTIONS.find((s) => s.value === filters.sortBy)?.label.split(' ')[0]}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 bg-background z-50" align="end">
              <div className="space-y-1">
                {SORT_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={filters.sortBy === opt.value ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => setFilters((prev) => ({ ...prev, sortBy: opt.value }))}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-xs sm:text-sm text-destructive"
            >
              <X className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              Limpar ({activeFiltersCount})
            </Button>
          )}
        </nav>
      </header>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {allEvents.length}{' '}
          {allEvents.length === 1 ? 'atividade encontrada' : 'atividades encontradas'}
        </p>
        {filters.text && (
          <Badge variant="secondary" className="text-xs">
            "{filters.text}"
          </Badge>
        )}
      </div>

      <LiveRegion
        message={
          isLoading
            ? 'Buscando atividades...'
            : `${allEvents.length} ${allEvents.length === 1 ? 'atividade encontrada' : 'atividades encontradas'}`
        }
      />

      {/* Recommended */}
      {hasNoFilters && recommendedEvents.length > 0 && (
        <section aria-label="Atividades recomendadas">
          <div className="mb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              Recomendado para você
              <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Com base nos seus interesses</p>
          </div>
          <div className="space-y-2.5">
            {recommendedEvents.map((event) => (
              <article
                key={event.id}
                onClick={() => onEventClick(event)}
                className="flex gap-3 cursor-pointer group bg-card rounded-2xl p-3 transition-all duration-200 hover:shadow-md"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onEventClick(event)}
                aria-label={`${event.title} em ${event.location} às ${event.time}`}
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden">
                  <LazyImage
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                    aspectRatio="square"
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="font-semibold text-sm text-foreground line-clamp-1">{event.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{event.location}</p>
                  <p className="text-xs text-primary font-medium mt-0.5">{event.time}</p>
                </div>
                <ChevronRight className="flex-shrink-0 w-4 h-4 text-muted-foreground/50 self-center group-hover:text-primary transition-colors" aria-hidden="true" />
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Results */}
      <section className="space-y-3" aria-label="Resultados da busca">
        {isError ? (
          <div className="text-center py-12">
            <p className="text-destructive">Erro ao carregar atividades. Tente novamente.</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
              Recarregar
            </Button>
          </div>
        ) : allEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-5 relative">
              <Search className="w-9 h-9 text-primary" aria-hidden="true" />
              <span className="absolute -top-2 -right-2 text-2xl animate-bounce" aria-hidden="true">🔍</span>
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">Nenhuma atividade encontrada</h2>
            <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed mb-6">
              {filters.text
                ? `Não achamos nada para "${filters.text}". Tente outros filtros ou seja o primeiro a criar esta atividade${filters.city ? ` em ${filters.city}` : ''}!`
                : `Tente outros filtros ou seja o primeiro a criar uma atividade${filters.city ? ` em ${filters.city}` : ' na sua cidade'}!`}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 w-full max-w-[280px]">
              {activeFiltersCount > 0 || filters.text ? (
                <Button variant="outline" onClick={clearFilters} className="flex-1">
                  Limpar filtros
                </Button>
              ) : null}
              <Button onClick={() => onCreateEvent?.()} className="flex-1">
                Criar atividade
              </Button>
            </div>
          </div>
        ) : (
          <>
            {allEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                variant="compact"
                onEventClick={onEventClick}
              />
            ))}

            <div ref={loadMoreRef} className="flex justify-center py-4">
              {isFetchingNextPage && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  <span>Carregando mais atividades...</span>
                </div>
              )}
              {!hasNextPage && allEvents.length > 0 && (
                <p className="text-sm text-muted-foreground">Você viu todas as atividades</p>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
};
