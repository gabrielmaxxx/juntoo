import { Event } from '@/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEventDetails } from '@/hooks/useEventDetails';
import { ReportButton } from '@/components/reports';
import {
  EventHero,
  EventInfo,
  EventCreator,
  EventParticipants,
  EventReviewsSection,
  EventChat,
} from './event-details';

interface EventDetailsProps {
  event: Event;
  onBack: () => void;
}

export const EventDetails = ({ event, onBack }: EventDetailsProps) => {
  const {
    user,
    isParticipating,
    loading,
    participants,
    messages,
    newMessage,
    setNewMessage,
    creator,
    reviews,
    averageRating,
    userHasReviewed,
    isEventCompleted,
    messagesEndRef,
    sendMessage,
    handleParticipate,
    handleDeleteReview,
    fetchReviews,
  } = useEventDetails(event);

  return (
    <div className="h-full flex flex-col bg-background">
      <EventHero 
        imageUrl={event.imageUrl} 
        title={event.title} 
        onBack={onBack} 
      />

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-background rounded-t-2xl -mt-4 z-10 relative">
        <Tabs defaultValue="details" className="h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b px-3 sm:px-4">
            <TabsTrigger value="details" className="text-sm sm:text-base">Detalhes</TabsTrigger>
            {isParticipating && <TabsTrigger value="chat" className="text-sm sm:text-base">Chat</TabsTrigger>}
          </TabsList>

          <TabsContent value="details" className="flex-1 p-3 sm:p-4 space-y-4 sm:space-y-6 overflow-y-auto mt-0 pb-20">
            <EventInfo event={event} />

            {creator && (
              <EventCreator creator={creator} currentUser={user} />
            )}

            <EventParticipants participants={participants} currentUser={user} />

            <EventReviewsSection
              eventId={event.id}
              reviews={reviews}
              averageRating={averageRating}
              isEventCompleted={isEventCompleted}
              isParticipating={isParticipating}
              userHasReviewed={userHasReviewed}
              currentUser={user}
              onReviewSubmitted={fetchReviews}
              onDeleteReview={handleDeleteReview}
            />
          </TabsContent>

          {isParticipating && (
            <TabsContent value="chat" className="flex-1 flex flex-col mt-0 h-full">
              <EventChat
                messages={messages}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                sendMessage={sendMessage}
                currentUser={user}
                messagesEndRef={messagesEndRef}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Action Button */}
      <div className="p-3 sm:p-4 bg-background border-t border-border fixed bottom-0 left-0 right-0 z-20">
        <Button 
          variant={isParticipating ? "outline" : "hero"} 
          className="w-full h-11 sm:h-12 text-sm sm:text-base" 
          onClick={handleParticipate}
          disabled={loading}
        >
          {loading ? 'Carregando...' : isParticipating ? 'Sair do Evento' : 'Participar'}
        </Button>
      </div>
    </div>
  );
};
