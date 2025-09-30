import { useState, useEffect, useMemo } from 'react';
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
import { supabase } from '@/integrations/supabase/client';

interface SearchPageProps {
  onEventClick: (event: Event) => void;
}

interface SearchFilters {
  text: string;
  category: string;
  location: string;
  date: Date | undefined;
  priceRange: 'all' | 'free' | 'paid';
}

const CATEGORIES = ['Todos', 'Esportes', 'Estudos', 'Eventos', 'Encontros', 'Jogos', 'Outro'];
const LOCATIONS = ['Todos', 'Parque Central', 'Parque das Águas', 'Café Literário', 'Arena UNIFAA', 'Biblioteca Central', 'UNIFAA - Auditório B'];

export const SearchPage = ({ onEventClick }: SearchPageProps) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({
    text: '',
    category: 'Todos',
    location: 'Todos',
    date: undefined,
    priceRange: 'all'
  });

  // Fetch events from Supabase
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('is_private', false)
          .order('date', { ascending: true });

        if (error) throw error;

        // Transform Supabase data to match Event interface
        const transformedEvents: Event[] = data.map(event => ({
          id: event.id,
          title: event.title,
          category: event.category,
          location: event.location,
          date: event.date,
          time: event.time,
          price: event.price?.toString() || 'Gratuito',
          description: event.description || '',
          imageUrl: event.image_url || 'https://images.pexels.com/photos/1916817/pexels-photo-1916817.jpeg',
          attendees: [],
          createdBy: event.created_by
        }));

        setEvents(transformedEvents);
      } catch (error) {
        console.error('Erro ao carregar eventos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

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

      // Location filter
      if (filters.location !== 'Todos' && !event.location.includes(filters.location)) {
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
      location: 'Todos',
      date: undefined,
      priceRange: 'all'
    });
  };

  const activeFiltersCount = [
    filters.category !== 'Todos',
    filters.location !== 'Todos',
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
    <div className="p-4 space-y-4">
      {/* Search Header */}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-gray-900">Buscar Eventos</h1>
        
        {/* Main Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Buscar por eventos, lugares, categorias..."
            value={filters.text}
            onChange={(e) => setFilters(prev => ({ ...prev, text: e.target.value }))}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {/* Category Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={filters.category !== 'Todos' ? 'default' : 'outline'} size="sm" className="h-8">
                <Tag className="w-4 h-4 mr-1" />
                {filters.category}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2">
              <div className="space-y-1">
                {CATEGORIES.map(category => (
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

          {/* Location Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={filters.location !== 'Todos' ? 'default' : 'outline'} size="sm" className="h-8">
                <MapPin className="w-4 h-4 mr-1" />
                {filters.location === 'Todos' ? 'Local' : filters.location.split(' ')[0]}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2">
              <div className="space-y-1">
                {LOCATIONS.map(location => (
                  <Button
                    key={location}
                    variant={filters.location === location ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => setFilters(prev => ({ ...prev, location }))}
                  >
                    {location}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Date Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={filters.date ? 'default' : 'outline'} size="sm" className="h-8">
                <Calendar className="w-4 h-4 mr-1" />
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
              <Button variant={filters.priceRange !== 'all' ? 'default' : 'outline'} size="sm" className="h-8">
                <Filter className="w-4 h-4 mr-1" />
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
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-red-600">
              <X className="w-4 h-4 mr-1" />
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