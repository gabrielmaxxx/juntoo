import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();

    // 1. Find users who signed up 3+ days ago but never joined an event
    const { data: inactiveUsers } = await supabase
      .from("profiles")
      .select("user_id, full_name, interests, onboarding_completed")
      .eq("onboarding_completed", true)
      .lt("created_at", new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString());

    if (!inactiveUsers || inactiveUsers.length === 0) {
      return new Response(JSON.stringify({ success: true, reengaged: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let reengaged = 0;

    for (const user of inactiveUsers) {
      // Check if user has ever joined an event
      const { count } = await supabase
        .from("event_participants")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.user_id);

      if ((count ?? 0) > 0) continue;

      // Check if we already sent a re-engagement notification in the last 7 days
      const { count: recentNotif } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.user_id)
        .eq("type", "new_event")
        .gt("created_at", new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if ((recentNotif ?? 0) > 0) continue;

      // Find a relevant event based on user interests
      let eventTitle = null;
      let eventId = null;

      if (user.interests && user.interests.length > 0) {
        const { data: events } = await supabase
          .from("events")
          .select("id, title, category")
          .eq("is_private", false)
          .gte("date", now.toISOString().split("T")[0])
          .in("category", user.interests)
          .order("date", { ascending: true })
          .limit(1);

        if (events && events.length > 0) {
          eventTitle = events[0].title;
          eventId = events[0].id;
        }
      }

      // Send notification
      const message = eventTitle
        ? `Tem um evento que combina com você: "${eventTitle}". Participe!`
        : "Há eventos esperando por você! Explore e participe da sua primeira atividade.";

      await supabase.from("notifications").insert({
        user_id: user.user_id,
        type: "new_event",
        title: "🎯 Hora de participar!",
        message,
        event_id: eventId,
      });

      reengaged++;
    }

    return new Response(JSON.stringify({ success: true, reengaged }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
