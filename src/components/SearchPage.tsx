import { useMemo } from 'react';
import { Search, Calendar, MapPin, Tag, Filter, X } from 'lucide-react';
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
import { usePublicEvents } from '@/hooks/useEvents';
import { useState } from 'react';

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
  const { data: events = [], isLoading: loading } = usePublicEvents();
  const [filters, setFilters] = useState<SearchFilters>({
    text: '',
    category: 'Todos',
    state: '',
    city: '',
    date: undefined,
    priceRange: 'all'
  });

  // Filter events based on search criteria
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Text search
      if (filters.text) {
        const searchText = filters.text.toLowerCase();
        const matchesText = 
          event.title.toLowerCase().includes(searchText) ||
          event.description.toLowerCase().includes(searchText) ||
          event.location.toLowerCase().includes(searchText) ||
          event.category.toLowerCase().includes(searchText);
        
        if (!matchesText) return false;
      }

      // Category filter
      if (filters.category !== 'Todos' && event.category !== filters.category) {
        return false;
      }

      // State filter
      if (filters.state && event.state !== filters.state) {
        return false;
      }

      // City filter
      if (filters.city && event.city !== filters.city) {
        return false;
      }

      // Date filter
      if (filters.date) {
        const eventDate = new Date(event.date);
        const filterDate = filters.date;
        if (eventDate.toDateString() !== filterDate.toDateString()) {
          return false;
        }
      }

      // Price filter
      if (filters.priceRange === 'free' && event.price !== 'Gratuito' && !event.price.includes('0')) {
        return false;
      }
      if (filters.priceRange === 'paid' && (event.price === 'Gratuito' || event.price.includes('0'))) {
        return false;
      }

      return true;
    });
  }, [events, filters]);

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

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded-lg"></div>
          <div className="h-10 bg-gray-200 rounded-lg"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-4 pb-24">
      {/* Search Header */}
      <div className="space-y-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Buscar Eventos</h1>
        
        {/* Main Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <Input
            placeholder="Buscar eventos..."
            value={filters.text}
            onChange={(e) => setFilters(prev => ({ ...prev, text: e.target.value }))}
            className="pl-9 sm:pl-10 h-10 sm:h-12 text-sm sm:text-base"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {/* Category Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={filters.category !== 'Todos' ? 'default' : 'outline'} size="sm" className="h-7 sm:h-8 text-xs sm:text-sm">
                <Tag className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
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
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
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
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
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
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
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
                <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
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
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 sm:h-8 text-xs sm:text-sm text-red-600">
              <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Limpar ({activeFiltersCount})
            </Button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {filteredEvents.length} {filteredEvents.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
        </p>
        {filters.text && (
          <Badge variant="secondary" className="text-xs">
            "{filters.text}"
          </Badge>
        )}
      </div>

      {/* Results */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum evento encontrado</h3>
            <p className="text-gray-600 mb-4">
              Tente ajustar seus filtros ou termos de busca
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        ) : (
          filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              variant="compact"
              onEventClick={onEventClick}
            />
          ))
        )}
      </div>
    </div>
  );
};
