import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    // Verify the caller is an authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { category } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!category) {
      return new Response(
        JSON.stringify({ error: "Category is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating image for category: ${category} by user: ${userData.user.id}`);

    // Create varied prompts based on category to avoid repetition
    const promptVariations: Record<string, string[]> = {
      'Esportes': [
        'A professional soccer field with green grass, white lines, goalposts, stadium lights at sunset, ultra high resolution photo',
        'An indoor futsal court with wooden floor, colorful markings, sports atmosphere, professional photography',
        'A basketball court outdoors with hoop and backboard, urban setting, golden hour lighting, realistic photo',
      ],
      'Música': [
        'A concert stage with colorful spotlights, microphone stand, guitar on stage, smoke effects, professional concert photography',
        'A DJ booth with turntables, colorful LED lights, nightclub atmosphere, neon glow, ultra high resolution',
        'An acoustic guitar resting on a wooden stage, warm ambient lighting, intimate venue, professional photo',
      ],
      'Arte': [
        'An art gallery with white walls, colorful abstract paintings hanging, wooden floor, natural lighting, museum photography',
        'A painters easel with canvas, paintbrushes and palette with oil paints, creative studio, natural light from window',
      ],
      'Tecnologia': [
        'A modern tech conference room with large screens showing code, laptops on tables, futuristic blue lighting',
        'A hackathon workspace with developers at computers, multiple monitors, neon accents, startup atmosphere',
      ],
      'Culinária': [
        'A professional kitchen with chefs cooking, fresh ingredients on counter, steam rising from pans, warm lighting',
        'A rustic wooden table with homemade bread, fresh herbs, olive oil, Mediterranean cooking atmosphere',
      ],
      'Outro': [
        'A vibrant community festival with colorful decorations, diverse activities, joyful outdoor gathering',
        'A creative workshop space with art supplies, comfortable seating, collaborative atmosphere',
        'An elegant event venue with decorative lighting, tables set up, celebration atmosphere',
      ]
    };

    const variations = promptVariations[category] || promptVariations['Outro'];
    const randomIndex = Math.floor(Math.random() * variations.length);
    const prompt = variations[randomIndex];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("No image generated");
    }

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
