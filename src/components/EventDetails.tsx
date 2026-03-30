import { useMemo, useState } from 'react';
import { Event } from '@/types';
import { SafetyModal } from '@/components/SafetyModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEventDetails } from '@/hooks/useEventDetails';
import { useAuthContext } from '@/contexts/AuthContext';
import { ReportButton } from '@/components/reports';
import { Crown, Pencil, Trash2, Users } from 'lucide-react';
import {
  EventHero,
  EventInfo,
  EventCreator,
  EventParticipants,
  EventReviewsSection,
  EventChat,
  EventEditDialog,
} from './event-details';
import { EventParticipantReview } from './reputation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EventDetailsProps {
  event: Event;
  onBack: () => void;
}

export const EventDetails = ({ event, onBack }: EventDetailsProps) => {
  const { user: authUser } = useAuthContext();
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
    isFull,
    messagesEndRef,
    sendMessage,
    handleParticipate,
    handleDeleteReview,
    fetchReviews,
    cancelEvent,
    updateEvent,
  } = useEventDetails(event);

  const isCreator = useMemo(() => authUser?.id === event.createdBy, [authUser, event.createdBy]);
  const [activeTab, setActiveTab] = useState('details');
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const onParticipateClick = () => {
    if (isParticipating) {
      handleParticipate();
    } else {
      setShowSafetyModal(true);
    }
  };

  const onSafetyAccept = () => {
    setShowSafetyModal(false);
    handleParticipate();
  };

  const handleCancel = async () => {
    const success = await cancelEvent();
    if (success) onBack();
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <EventHero 
        imageUrl={event.imageUrl} 
        title={event.title} 
        onBack={onBack} 
      />

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-background rounded-t-3xl -mt-5 z-10 relative">
        <Tabs defaultValue="details" className="h-full flex flex-col" onValueChange={(v) => setActiveTab(v)}>
          <TabsList className="w-full justify-start rounded-none border-b border-border/50 px-4 pt-2">
            <TabsTrigger value="details" className="text-sm font-semibold">Detalhes</TabsTrigger>
            {isParticipating && <TabsTrigger value="chat" className="text-sm font-semibold">Chat</TabsTrigger>}
            <div className="ml-auto flex items-center gap-1">
              {isCreator && (
                <>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowEditDialog(true)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setShowCancelDialog(true)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
              <ReportButton
                reportedEventId={event.id}
                reportedUserId={event.createdBy}
                contextLabel={`Denunciar evento: ${event.title}`}
                showLabel
              />
            </div>
          </TabsList>

          <TabsContent value="details" className="flex-1 p-4 sm:p-5 space-y-5 overflow-y-auto mt-0 pb-24">
            {/* Creator badge */}
            {isCreator && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-semibold gap-1.5 px-3 py-1 border-primary/30 text-primary bg-primary/5">
                  <Crown className="w-3.5 h-3.5" aria-hidden="true" />
                  Você é o organizador
                </Badge>
              </div>
            )}

            {/* Full event badge */}
            {isFull && !isParticipating && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <Users className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  Evento lotado — {event.maxParticipants}/{event.maxParticipants} participantes
                </span>
              </div>
            )}

            {/* Capacity indicator */}
            {event.maxParticipants && !isFull && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>{participants.length}/{event.maxParticipants} vagas preenchidas</span>
              </div>
            )}

            <EventInfo event={event} />

            {creator && (
              <EventCreator creator={creator} currentUser={user} />
            )}

            <EventParticipants participants={participants} currentUser={user} createdBy={event.createdBy} />

            <EventParticipantReview
              eventId={event.id}
              eventTitle={event.title}
              participants={participants.map(p => ({
                user_id: p.user_id,
                full_name: p.profiles?.full_name || 'Usuário',
                avatar_url: p.profiles?.avatar_url || null,
              }))}
              isEventCompleted={isEventCompleted}
              isParticipating={isParticipating}
            />

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
            <TabsContent value="chat" className="flex-1 flex flex-col mt-0 h-full pb-0">
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

      {/* Action Button - hidden on chat tab */}
      {activeTab !== 'chat' && (
        <div className="p-4 bg-background/95 backdrop-blur-sm border-t border-border/50 fixed bottom-0 left-0 right-0 z-20 safe-area-inset-bottom">
          {(() => {
            const eventDateTime = new Date(`${event.date}T${event.time}`);
            const isPast = !event.isRecurring && new Date() >= eventDateTime;
            if (isPast) {
              return (
                <Button 
                  variant="outline" 
                  className="w-full h-12 text-sm font-semibold rounded-2xl opacity-60" 
                  disabled
                >
                  Evento encerrado
                </Button>
              );
            }
            if (isFull && !isParticipating) {
              return (
                <Button 
                  variant="outline" 
                  className="w-full h-12 text-sm font-semibold rounded-2xl opacity-60" 
                  disabled
                >
                  Evento lotado
                </Button>
              );
            }
            return (
              <Button 
                variant={isParticipating ? "outline" : "hero"} 
                className="w-full h-12 text-sm font-semibold rounded-2xl" 
                onClick={onParticipateClick}
                disabled={loading}
              >
                {loading ? 'Carregando...' : isParticipating ? 'Sair do Evento' : 'Participar'}
              </Button>
            );
          })()}
        </div>
      )}

      <SafetyModal
        open={showSafetyModal}
        onAccept={onSafetyAccept}
        onCancel={() => setShowSafetyModal(false)}
      />

      {/* Edit Dialog */}
      {showEditDialog && (
        <EventEditDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          event={{
            title: event.title,
            description: event.description || '',
            location: event.location,
            date: event.date,
            time: event.time,
          }}
          onSave={updateEvent}
        />
      )}

      {/* Cancel Confirmation */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O evento será removido e todos os participantes serão notificados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancelar evento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
