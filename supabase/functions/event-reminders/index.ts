import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log(`Running event reminders check at ${now.toISOString()}`);

    // Define reminder windows (in hours before event)
    const reminderWindows = [
      { hours: 24, label: '24 horas' },
      { hours: 1, label: '1 hora' },
    ];

    for (const window of reminderWindows) {
      // Calculate the time range for this reminder window
      // We check for events starting within a 15-minute window around the target time
      const targetTime = new Date(now.getTime() + window.hours * 60 * 60 * 1000);
      const windowStart = new Date(targetTime.getTime() - 7.5 * 60 * 1000); // 7.5 minutes before
      const windowEnd = new Date(targetTime.getTime() + 7.5 * 60 * 1000); // 7.5 minutes after

      console.log(`Checking for events ${window.hours}h away (${windowStart.toISOString()} to ${windowEnd.toISOString()})`);

      // Get events that fall within this reminder window
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, title, date, time')
        .gte('date', windowStart.toISOString().split('T')[0])
        .lte('date', windowEnd.toISOString().split('T')[0]);

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        continue;
      }

      if (!events || events.length === 0) {
        console.log(`No events found for ${window.label} reminder window`);
        continue;
      }

      // Filter events by exact datetime
      const matchingEvents = events.filter(event => {
        const eventDateTime = new Date(`${event.date}T${event.time}`);
        return eventDateTime >= windowStart && eventDateTime <= windowEnd;
      });

      console.log(`Found ${matchingEvents.length} events for ${window.label} reminder`);

      for (const event of matchingEvents) {
        // Get all participants for this event
        const { data: participants, error: participantsError } = await supabase
          .from('event_participants')
          .select('user_id')
          .eq('event_id', event.id);

        if (participantsError) {
          console.error(`Error fetching participants for event ${event.id}:`, participantsError);
          continue;
        }

        if (!participants || participants.length === 0) {
          console.log(`No participants for event ${event.id}`);
          continue;
        }

        console.log(`Sending ${window.label} reminders to ${participants.length} participants for event "${event.title}"`);

        // Check for existing reminders to avoid duplicates
        const notificationType = `event_reminder_${window.hours}h`;
        
        for (const participant of participants) {
          // Check if reminder already sent
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', participant.user_id)
            .eq('event_id', event.id)
            .eq('type', notificationType)
            .single();

          if (existingNotification) {
            console.log(`Reminder already sent to user ${participant.user_id} for event ${event.id}`);
            continue;
          }

          // Create reminder notification
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: participant.user_id,
              type: notificationType,
              title: `Lembrete: ${window.label} para o evento!`,
              message: `O evento "${event.title}" começa em ${window.label}. Prepare-se!`,
              event_id: event.id,
              read: false,
            });

          if (notificationError) {
            console.error(`Error creating notification for user ${participant.user_id}:`, notificationError);
          } else {
            console.log(`Reminder sent to user ${participant.user_id}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Event reminders processed' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: unknown) {
    console.error('Error in event-reminders function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
