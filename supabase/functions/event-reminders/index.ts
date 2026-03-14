import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization - only allow service_role or cron calls
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Only allow service_role key or anon key (for cron)
    const token = authHeader.replace('Bearer ', '');
    if (token !== supabaseServiceKey && token !== supabaseAnonKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log(`Running event reminders check at ${now.toISOString()}`);

    const reminderWindows = [
      { hours: 24, label: '24 horas' },
      { hours: 1, label: '1 hora' },
    ];

    for (const window of reminderWindows) {
      const targetTime = new Date(now.getTime() + window.hours * 60 * 60 * 1000);
      const windowStart = new Date(targetTime.getTime() - 7.5 * 60 * 1000);
      const windowEnd = new Date(targetTime.getTime() + 7.5 * 60 * 1000);

      console.log(`Checking for events ${window.hours}h away (${windowStart.toISOString()} to ${windowEnd.toISOString()})`);

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

      const matchingEvents = events.filter(event => {
        const eventDateTime = new Date(`${event.date}T${event.time}`);
        return eventDateTime >= windowStart && eventDateTime <= windowEnd;
      });

      console.log(`Found ${matchingEvents.length} events for ${window.label} reminder`);

      for (const event of matchingEvents) {
        const { data: participants, error: participantsError } = await supabase
          .from('event_participants')
          .select('user_id')
          .eq('event_id', event.id);

        if (participantsError) {
          console.error(`Error fetching participants for event ${event.id}:`, participantsError);
          continue;
        }

        if (!participants || participants.length === 0) continue;

        console.log(`Sending ${window.label} reminders to ${participants.length} participants for event "${event.title}"`);

        const notificationType = `event_reminder_${window.hours}h`;
        
        for (const participant of participants) {
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', participant.user_id)
            .eq('event_id', event.id)
            .eq('type', notificationType)
            .single();

          if (existingNotification) continue;

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
          }
        }
      }
    }

    // === Post-event review reminders ===
    // Send notification to participants of events that ended ~24h ago
    {
      const reviewWindowCenter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const reviewWindowStart = new Date(reviewWindowCenter.getTime() - 30 * 60 * 1000);
      const reviewWindowEnd = new Date(reviewWindowCenter.getTime() + 30 * 60 * 1000);

      console.log(`Checking for completed events to send review reminders (${reviewWindowStart.toISOString()} to ${reviewWindowEnd.toISOString()})`);

      const { data: completedEvents, error: completedError } = await supabase
        .from('events')
        .select('id, title, date, time')
        .gte('date', reviewWindowStart.toISOString().split('T')[0])
        .lte('date', reviewWindowEnd.toISOString().split('T')[0])
        .eq('is_recurring', false);

      if (completedError) {
        console.error('Error fetching completed events:', completedError);
      } else if (completedEvents && completedEvents.length > 0) {
        const matchingCompleted = completedEvents.filter(event => {
          const eventDateTime = new Date(`${event.date}T${event.time}`);
          return eventDateTime >= reviewWindowStart && eventDateTime <= reviewWindowEnd;
        });

        console.log(`Found ${matchingCompleted.length} completed events for review reminders`);

        for (const event of matchingCompleted) {
          const { data: participants } = await supabase
            .from('event_participants')
            .select('user_id')
            .eq('event_id', event.id);

          if (!participants || participants.length === 0) continue;

          const notificationType = 'event_review_reminder';

          for (const participant of participants) {
            const { data: existing } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', participant.user_id)
              .eq('event_id', event.id)
              .eq('type', notificationType)
              .single();

            if (existing) continue;

            await supabase.from('notifications').insert({
              user_id: participant.user_id,
              type: notificationType,
              title: 'Como foi o evento? ⭐',
              message: `O evento "${event.title}" já acabou! Avalie sua experiência e os participantes.`,
              event_id: event.id,
              read: false,
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Event reminders processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in event-reminders function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
