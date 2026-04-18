import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, CalendarDays } from 'lucide-react';
import { Event } from '@/types';
import { EmptyState } from '@/components/ui/empty-state';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface ProfileEventsProps {
  events: Event[];
  loading: boolean;
  type: 'upcoming' | 'completed';
}

export const ProfileEvents = ({ events, loading, type }: ProfileEventsProps) => {
  const [, setSearchParams] = useSearchParams();

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="w-9 h-9 text-primary" aria-hidden="true" />}
        emoji="📅"
        title={
          type === 'upcoming'
            ? 'Você ainda não participou de nenhuma atividade'
            : 'Nenhum evento no histórico ainda'
        }
        description={
          type === 'upcoming'
            ? 'Explore atividades perto de você e comece sua história no Juntoo!'
            : 'Quando você participar de eventos, eles aparecerão aqui como memórias.'
        }
        actionLabel="Explorar atividades"
        onAction={() => setSearchParams({ tab: 'search' })}
      />
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <Card key={event.id} className={type === 'completed' ? 'opacity-75' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <img
                src={event.imageUrl}
                alt={event.title}
                className={`w-16 h-16 rounded-lg object-cover ${type === 'completed' ? 'grayscale' : ''}`}
              />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{event.title}</h3>
                <p className="text-sm text-muted-foreground flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(event.date).toLocaleDateString('pt-BR')} às {event.time}
                </p>
                <p className="text-sm text-muted-foreground flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {event.location}
                </p>
              </div>
              {type === 'upcoming' ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  A realizar
                </Badge>
              ) : (
                <Badge className="bg-muted text-muted-foreground hover:bg-muted">
                  Concluído
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
