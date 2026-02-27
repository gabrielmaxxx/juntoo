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
        'A professional soccer field with green grass, white lines, goalposts, stadium lights at sunset, ultra high resolution photo',
        'An indoor futsal court with wooden floor, colorful markings, sports atmosphere, professional photography',
        'A basketball court outdoors with hoop and backboard, urban setting, golden hour lighting, realistic photo',
        'A running track in a stadium with lanes, athletic field, clear sky, professional sports photography',
        'A volleyball net on a beach with sand, ocean in background, sunny day, vibrant photo',
        'A tennis court with clay surface, racket and balls, sunny day, professional sports venue photography',
        'A swimming pool with lane dividers, crystal clear water, indoor aquatic center, bright lighting',
        'A skateboard park with ramps and rails, urban graffiti walls, dynamic action sports setting'
      ],
      'Música': [
        'A concert stage with colorful spotlights, microphone stand, guitar on stage, smoke effects, professional concert photography',
        'A DJ booth with turntables, colorful LED lights, nightclub atmosphere, neon glow, ultra high resolution',
        'An acoustic guitar resting on a wooden stage, warm ambient lighting, intimate venue, professional photo',
        'A grand piano on an elegant stage, concert hall, dramatic lighting, classical music atmosphere',
        'A vinyl record player spinning in a cozy room, warm amber lighting, retro music atmosphere',
        'A drum set on stage with cymbals gleaming under blue and red spotlights, rock concert vibe',
        'A street musician playing saxophone on a cobblestone sidewalk, golden hour, urban jazz atmosphere'
      ],
      'Arte': [
        'An art gallery with white walls, colorful abstract paintings hanging, wooden floor, natural lighting, museum photography',
        'A painters easel with canvas, paintbrushes and palette with oil paints, creative studio, natural light from window',
        'A street art mural on a brick wall, vibrant graffiti colors, urban setting, professional photography',
        'A pottery wheel with wet clay being shaped, hands creating art, warm studio lighting',
        'A sculpture garden with modern metal sculptures, green lawn, blue sky, outdoor art exhibition',
        'Watercolor paints splashing on paper, artistic close-up, vibrant pigments mixing, creative chaos',
        'A mosaic artwork in progress, colorful glass tiles, Mediterranean art style, artisan workshop'
      ],
      'Tecnologia': [
        'A modern tech conference room with large screens showing code, laptops on tables, futuristic blue lighting',
        'A hackathon workspace with developers at computers, multiple monitors, neon accents, startup atmosphere',
        'A robotics workshop with circuit boards, electronic components, 3D printers, modern lab setting',
        'A VR headset on a table in a futuristic room with holographic displays, technology showcase',
        'A drone hovering in a tech lab, LED lights, modern engineering workspace, innovation atmosphere',
        'A server room with rows of blinking lights, blue glow, data center infrastructure photography',
        'A smartwatch and smartphone on a sleek desk, minimalist tech accessories, modern product photography'
      ],
      'Culinária': [
        'A professional kitchen with chefs cooking, fresh ingredients on counter, steam rising from pans, warm lighting',
        'A rustic wooden table with homemade bread, fresh herbs, olive oil, Mediterranean cooking atmosphere',
        'A sushi preparation station with fresh fish, bamboo mat, Japanese knives, elegant food photography',
        'A colorful farmers market with fresh fruits, vegetables, spices, vibrant outdoor market scene',
        'A pizza being pulled from a wood-fired oven, melted cheese, rustic Italian kitchen, warm glow',
        'A pastry workshop with decorated cakes, piping bags, flour dusted counter, bakery atmosphere',
        'A barbecue grill with smoke rising, grilled meats and vegetables, outdoor cooking, summer vibes'
      ],
      'Viagem': [
        'A scenic mountain landscape with hiking trail, backpack resting on rock, golden hour, adventure photography',
        'A tropical beach with turquoise water, palm trees, hammock, paradise travel destination photo',
        'A charming European cobblestone street with cafe tables, historic buildings, warm sunset lighting',
        'A camping tent in a forest clearing with campfire, starry night sky, wilderness adventure',
        'A vintage van parked by the ocean, surfboards on roof, road trip adventure, sunset',
        'An airplane window view showing clouds and sunrise, travel excitement, wanderlust photography',
        'A hot air balloon floating over green valleys, misty morning, aerial landscape, adventure travel'
      ],
      'Fotografia': [
        'A professional camera on tripod capturing sunset landscape, lens flare, golden hour photography',
        'A photography studio with softbox lights, backdrop, camera equipment, professional setup',
        'A vintage film camera with developed photos scattered on wooden table, nostalgic atmosphere',
        'A darkroom with red light, photos hanging to dry on clothesline, analog photography process',
        'A photographer silhouette against a dramatic sunset, camera in hand, landscape photography',
        'Macro photography setup capturing a dewdrop on a flower, extreme close-up, nature photography'
      ],
      'Leitura': [
        'A cozy reading corner with stacked books, warm lamp light, comfortable armchair, bookshelf background',
        'An old library with tall wooden bookshelves, ladder, warm ambient lighting, academic atmosphere',
        'A book club setup with coffee cups, open books on table, cozy cafe environment',
        'An open book with reading glasses on a sunlit window seat, peaceful morning, literary atmosphere',
        'A vintage bookstore with floor-to-ceiling shelves, cozy aisles, warm golden lighting',
        'A stack of colorful books with a steaming cup of tea, rainy window background, relaxing mood'
      ],
      'Cinema': [
        'A movie theater with red velvet seats, large screen glowing, dramatic cinema lighting',
        'A film set with clapperboard, camera on dolly track, professional movie production scene',
        'An outdoor cinema screen in a park at dusk, string lights, blankets on grass, movie night',
        'A directors chair with megaphone and script on set, Hollywood production atmosphere',
        'A vintage cinema marquee with neon lights, classic movie theater facade, retro evening',
        'Popcorn bucket and 3D glasses on a red cinema seat, movie premiere atmosphere'
      ],
      'Dança': [
        'A dance studio with wooden floor, wall mirrors, ballet barre, elegant dancer silhouette',
        'A salsa dance floor with couples dancing, colorful lighting, Latin music atmosphere',
        'A street dance battle scene, urban setting, dynamic movement, energetic atmosphere',
        'A ballroom with chandelier, polished floor reflecting lights, elegant waltz atmosphere',
        'A hip-hop dance crew in an urban warehouse, graffiti walls, boombox, street culture vibe',
        'A flamenco stage with wooden floor, red dress details, dramatic spotlight, passionate dance'
      ],
      'Natureza': [
        'A lush green forest trail with sunlight filtering through trees, ferns, peaceful hiking path',
        'A serene lake surrounded by mountains, reflection on water, early morning mist, nature photography',
        'A botanical garden with exotic flowers, butterflies, stone pathway, vibrant colors',
        'A waterfall cascading into a crystal clear pool, tropical jungle, lush vegetation, paradise',
        'A wildflower meadow at golden hour, bees and butterflies, rolling hills, countryside beauty',
        'A coral reef underwater with colorful tropical fish, clear ocean water, marine life photography'
      ],
      'Fitness': [
        'A modern gym with weights, kettlebells, workout benches, motivational atmosphere, professional photo',
        'An outdoor yoga session in a park at sunrise, yoga mats on grass, peaceful morning light',
        'A CrossFit box with ropes, pull-up bars, tires, gritty industrial gym atmosphere',
        'A spinning class with bikes in a row, neon-lit room, high energy cycling workout',
        'A martial arts dojo with tatami mats, punching bags, Japanese decor, discipline atmosphere',
        'A trail runner on a mountain path, misty morning, athletic endurance, nature fitness'
      ],
      'Educação': [
        'A modern classroom with whiteboard, desks, educational materials, bright natural lighting',
        'A university lecture hall with tiered seating, projector screen, academic environment',
        'A workshop table with notebooks, colored pens, collaborative learning materials, creative space',
        'A science laboratory with microscopes, test tubes, beakers, STEM education setting',
        'A coding bootcamp with students at laptops, instructor at whiteboard, tech education',
        'A mentoring session in a library, books and notes spread out, one-on-one learning'
      ],
      'Social': [
        'A rooftop party with string lights, people socializing, city skyline in background, evening atmosphere',
        'A community barbecue in a park with picnic tables, people gathering, warm sunny day',
        'A cozy bar with friends at a table, warm lighting, casual social gathering atmosphere',
        'A brunch table with mimosas, pastries, and friends laughing, sunny patio, weekend vibes',
        'A bonfire on the beach at night with people sitting around, sparks flying, social gathering',
        'A karaoke room with colorful lights, microphone, fun party atmosphere, friends night out'
      ],
      'Negócios': [
        'A modern coworking space with glass walls, standing desks, professionals networking, contemporary office',
        'A business conference stage with podium, large screen, professional audience, corporate event',
        'A startup office with whiteboards full of ideas, laptops, coffee cups, entrepreneurial energy',
        'A business lunch meeting at a restaurant, handshake moment, professional networking',
        'A pitch presentation with investor panel, startup demo day, professional business setting',
        'An executive boardroom with skyline view, leather chairs, corporate strategy meeting'
      ],
      'Jogos': [
        'A gaming setup with RGB keyboard, multiple monitors, gaming headset, neon purple and blue lights',
        'A board game night with dice, cards, game pieces on wooden table, warm cozy lighting',
        'An esports arena with large screens, gaming chairs, competitive tournament atmosphere',
        'A tabletop RPG session with miniatures, maps, dice sets, fantasy adventure atmosphere',
        'A retro arcade with classic cabinet games, neon signs, 80s nostalgia, pixel art vibes',
        'A LAN party setup with multiple PCs, snacks, team gaming, competitive multiplayer atmosphere'
      ],
      'Outro': [
        'A vibrant community festival with colorful decorations, diverse activities, joyful outdoor gathering',
        'A creative workshop space with art supplies, comfortable seating, collaborative atmosphere',
        'An elegant event venue with decorative lighting, tables set up, celebration atmosphere',
        'A charity fundraiser gala with elegant decor, auction items, philanthropic community event',
        'A weekend fair with food trucks, craft booths, live entertainment, family-friendly atmosphere',
        'A cultural celebration with traditional decorations, music, dance, diverse community gathering'
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
