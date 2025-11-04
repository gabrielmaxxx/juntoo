import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    console.log(`Generating image for category: ${category}`);

    // Create varied prompts based on category to avoid repetition
    const promptVariations: Record<string, string[]> = {
      'Esportes': [
        'A vibrant sports scene with people playing and exercising outdoors, dynamic action, energetic atmosphere, modern illustration style',
        'Athletes in action, team sports, stadium setting, exciting competition, colorful and energetic',
        'Outdoor sports activities, people running and training together, sunrise lighting, motivational scene'
      ],
      'Música': [
        'Live music concert with band performing on stage, colorful lights, excited crowd, energetic atmosphere',
        'Musicians jamming together, instruments, music notes floating, vibrant colors, artistic style',
        'Outdoor music festival scene, stage with performers, sunset lighting, people enjoying'
      ],
      'Arte': [
        'Art exhibition gallery with colorful paintings and sculptures, modern art space, creative atmosphere',
        'Artists creating masterpieces, paintbrushes, canvases, creative studio, vibrant colors',
        'Street art scene with murals and graffiti, urban setting, colorful and expressive'
      ],
      'Tecnologia': [
        'Modern tech conference with people networking, digital screens, futuristic setting, innovation theme',
        'Programmers collaborating with laptops, code on screens, modern office, tech startup vibe',
        'Technology showcase with gadgets and devices, futuristic design, innovation hub'
      ],
      'Culinária': [
        'Chef cooking delicious food, professional kitchen, fresh ingredients, appetizing presentation',
        'Food workshop with people learning to cook, kitchen setting, colorful ingredients, fun atmosphere',
        'Outdoor food festival with various cuisines, food stalls, people enjoying meals'
      ],
      'Fitness': [
        'Group fitness class with people exercising, gym setting, energetic atmosphere, healthy lifestyle',
        'Outdoor workout session in park, people training together, sunrise, motivational scene',
        'Yoga and meditation group, peaceful setting, wellness theme, harmonious atmosphere'
      ],
      'Educação': [
        'Modern classroom with students learning, interactive session, educational materials, bright environment',
        'Workshop setting with people engaged in learning, collaboration, creative education',
        'Library or study space with people reading and studying, knowledge theme, inspiring'
      ],
      'Social': [
        'People gathering and socializing at casual meetup, friendly atmosphere, diverse group',
        'Community event with people connecting, outdoor setting, warm and welcoming vibe',
        'Social networking event, people talking and laughing, vibrant social atmosphere'
      ],
      'Negócios': [
        'Professional business meeting, modern office, people collaborating, corporate setting',
        'Networking event with professionals, conference hall, business attire, professional atmosphere',
        'Entrepreneurship workshop, startup environment, innovation and business growth theme'
      ],
      'Outro': [
        'Diverse group of people at community event, various activities, colorful and inclusive',
        'People gathered for special occasion, celebration atmosphere, joyful scene',
        'Community gathering with different activities, outdoor setting, vibrant and welcoming'
      ]
    };

    // Select a random prompt variation to add variety
    const variations = promptVariations[category] || promptVariations['Outro'];
    const randomIndex = Math.floor(Math.random() * variations.length);
    const prompt = variations[randomIndex];

    console.log(`Using prompt: ${prompt}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
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
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    console.log("Image generated successfully");

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
