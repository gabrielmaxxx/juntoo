import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PushPayload {
  user_id: string;
  title: string;
  message: string;
  url?: string;
  event_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller is authenticated (service role or valid user)
    const token = authHeader.replace('Bearer ', '');
    const isServiceRole = token === supabaseServiceKey;

    if (!isServiceRole) {
      // Validate user token
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: claims, error: claimsError } = await userClient.auth.getUser(token);
      if (claimsError || !claims?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    console.log('Received push notification request for user:', payload.user_id);

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', payload.user_id);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has push notifications enabled
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('push_enabled')
      .eq('user_id', payload.user_id)
      .single();

    if (prefs && !prefs.push_enabled) {
      return new Response(
        JSON.stringify({ success: true, message: 'Push disabled by user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Note: Full Web Push encryption (RFC 8291) requires a library like web-push.
    // Without proper aes128gcm encryption, push endpoints will reject the payload.
    // For now, we send a notification without payload body — the SW will show a generic notification.
    // TODO: Add a proper web-push library (e.g., npm:web-push) for encrypted payloads.
    
    const expiredSubscriptions: string[] = [];

    for (const sub of subscriptions) {
      try {
        // Send empty push to trigger SW — the SW can fetch notification details from the API
        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'TTL': '86400',
            'Content-Length': '0',
          },
        });

        if (response.status === 410 || response.status === 404) {
          // Subscription expired
          expiredSubscriptions.push(sub.id);
        } else if (!response.ok) {
          console.error(`Push failed for subscription ${sub.id}: ${response.status}`);
        }
      } catch (error) {
        console.error(`Error sending push to subscription ${sub.id}:`, error);
      }
    }

    // Clean up expired subscriptions
    if (expiredSubscriptions.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', expiredSubscriptions);
      console.log('Removed', expiredSubscriptions.length, 'expired subscriptions');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: subscriptions.length - expiredSubscriptions.length, 
        total: subscriptions.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in send-push-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
