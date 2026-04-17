/**
 * Edge Function: og-image
 *
 * Gera dinamicamente uma imagem PNG (1200x630) para uso como og:image em
 * meta tags de redes sociais. Usa Satori (JSX → SVG) + resvg-wasm (SVG → PNG).
 *
 * Endpoint: GET /functions/v1/og-image?username=joaosilva
 *           GET /functions/v1/og-image?userId=<uuid>
 *
 * Cache: 1 hora (público, CDN-friendly).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import satori, { init as satoriInit } from "https://esm.sh/satori@0.10.13/wasm";
import initYoga from "https://esm.sh/yoga-wasm-web@0.3.3";
import { Resvg, initWasm } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";
import { React } from "https://esm.sh/react@18.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize WASM modules once (cold start)
let wasmReady = false;
async function ensureWasm() {
  if (wasmReady) return;
  const yogaWasm = await fetch("https://esm.sh/yoga-wasm-web@0.3.3/dist/yoga.wasm").then((r) => r.arrayBuffer());
  const yoga = await initYoga(yogaWasm);
  satoriInit(yoga);
  const resvgWasm = await fetch("https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm").then((r) => r.arrayBuffer());
  await initWasm(resvgWasm);
  wasmReady = true;
}

// Load a font (Inter — bundled via Google Fonts CSS lookup)
let cachedFont: ArrayBuffer | null = null;
async function loadFont(): Promise<ArrayBuffer> {
  if (cachedFont) return cachedFont;
  // Use a reliable static font URL
  const fontUrl = "https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf";
  const res = await fetch(fontUrl);
  cachedFont = await res.arrayBuffer();
  return cachedFont;
}

// Reputation level map (mirrors REPUTATION_LEVELS in src/hooks/useReputationScore.ts)
function getLevel(score: number): { name: string; color: string } {
  if (score >= 900) return { name: "Lendário", color: "#d97706" };
  if (score >= 600) return { name: "Embaixador", color: "#9333ea" };
  if (score >= 300) return { name: "Conector", color: "#14b8a6" };
  if (score >= 100) return { name: "Explorador", color: "#3b82f6" };
  return { name: "Novato", color: "#94a3b8" };
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const username = url.searchParams.get("username");
    const userId = url.searchParams.get("userId");

    if (!username && !userId) {
      return new Response(JSON.stringify({ error: "username or userId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data, error } = username
      ? await supabase.rpc("get_public_profile_by_username", { p_username: username })
      : await supabase.rpc("get_public_profile_by_id", { p_user_id: userId });

    if (error || !data || (data as any).private) {
      return new Response(JSON.stringify({ error: "Profile not found or private" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profile = data as any;
    const score = profile.reputation?.score ?? 0;
    const eventsAttended = profile.reputation?.events_attended ?? 0;
    const level = getLevel(score);
    const topInterests: string[] = (profile.interests ?? []).slice(0, 3);
    const fullName = profile.full_name ?? "Usuário";
    const city = profile.city ?? "Brasil";
    const avatarUrl = profile.avatar_url;

    await ensureWasm();
    const fontData = await loadFont();

    // Build JSX tree using React.createElement (no JSX transform in Deno)
    const h = React.createElement;

    const tree = h(
      "div",
      {
        style: {
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #f97316 100%)",
          padding: "60px",
          fontFamily: "Inter",
          color: "white",
        },
      },
      // Header: logo + tagline
      h(
        "div",
        { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
        h(
          "div",
          { style: { display: "flex", fontSize: 36, fontWeight: 700, letterSpacing: "-1px" } },
          "Juntoo"
        ),
        h(
          "div",
          { style: { display: "flex", fontSize: 22, opacity: 0.9 } },
          "Conectando pessoas, criando momentos"
        )
      ),
      // Body: avatar + info
      h(
        "div",
        {
          style: {
            display: "flex",
            flex: 1,
            alignItems: "center",
            gap: "48px",
            marginTop: "40px",
          },
        },
        // Avatar
        avatarUrl
          ? h("img", {
              src: avatarUrl,
              width: 220,
              height: 220,
              style: {
                borderRadius: "50%",
                border: "6px solid white",
                objectFit: "cover",
              },
            })
          : h(
              "div",
              {
                style: {
                  width: 220,
                  height: 220,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.25)",
                  border: "6px solid white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 80,
                  fontWeight: 700,
                },
              },
              initials(fullName)
            ),
        // Text block
        h(
          "div",
          { style: { display: "flex", flexDirection: "column", flex: 1, gap: "12px" } },
          h(
            "div",
            { style: { display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.1 } },
            fullName
          ),
          h(
            "div",
            { style: { display: "flex", fontSize: 30, opacity: 0.9, marginTop: "4px" } },
            "📍 " + city
          ),
          // Reputation badge
          h(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginTop: "24px",
              },
            },
            h(
              "div",
              {
                style: {
                  display: "flex",
                  background: "white",
                  color: level.color,
                  padding: "12px 24px",
                  borderRadius: "999px",
                  fontSize: 26,
                  fontWeight: 700,
                },
              },
              "⭐ " + level.name
            ),
            h(
              "div",
              {
                style: {
                  display: "flex",
                  background: "rgba(0,0,0,0.25)",
                  padding: "12px 24px",
                  borderRadius: "999px",
                  fontSize: 24,
                  fontWeight: 600,
                },
              },
              eventsAttended + " evento" + (eventsAttended === 1 ? "" : "s")
            )
          ),
          // Interests
          topInterests.length > 0
            ? h(
                "div",
                {
                  style: {
                    display: "flex",
                    gap: "10px",
                    marginTop: "20px",
                    flexWrap: "wrap",
                  },
                },
                ...topInterests.map((interest) =>
                  h(
                    "div",
                    {
                      style: {
                        display: "flex",
                        background: "rgba(255,255,255,0.2)",
                        padding: "8px 18px",
                        borderRadius: "999px",
                        fontSize: 20,
                        fontWeight: 500,
                      },
                    },
                    interest
                  )
                )
              )
            : h("div", { style: { display: "flex" } }, "")
        )
      ),
      // Footer CTA
      h(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "center",
            fontSize: 22,
            opacity: 0.9,
            marginTop: "20px",
          },
        },
        "juntoo.lovable.app"
      )
    );

    const svg = await satori(tree as any, {
      width: 1200,
      height: 630,
      fonts: [{ name: "Inter", data: fontData, weight: 400, style: "normal" }],
    });

    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
    const png = resvg.render().asPng();

    return new Response(png, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("og-image error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
