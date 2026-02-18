import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate that the caller provides the project anon key — prevents
  // anonymous internet users from consuming AI credits.
  const apiKey = req.headers.get("apikey") || req.headers.get("x-api-key");
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!apiKey && !bearerToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const providedKey = apiKey || bearerToken;
  if (providedKey !== SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { topTracks, topArtists, recentTracks } = body;

    // Basic input validation
    if (!Array.isArray(topTracks) && !Array.isArray(topArtists) && !Array.isArray(recentTracks)) {
      return new Response(JSON.stringify({ error: "Invalid input: expected arrays" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const trackNames = (topTracks || []).slice(0, 10).map((t: any) => `${t.name} by ${t.artists?.[0]?.name || "Unknown"}`).join(", ");
    const artistNames = (topArtists || []).slice(0, 10).map((a: any) => a.name).join(", ");
    const recentNames = (recentTracks || []).slice(0, 5).map((t: any) => `${t.track?.name || t.name} by ${t.track?.artists?.[0]?.name || t.artists?.[0]?.name || "Unknown"}`).join(", ");

    const systemPrompt = `You are a music recommendation AI. Based on the user's listening history, suggest 10 songs they might enjoy. 
For each song, provide ONLY a JSON array with objects containing: "name", "artist", "reason" (a short 1-sentence reason why they'd like it).
Return ONLY the JSON array, no markdown, no explanation.`;

    const userPrompt = `My top tracks: ${trackNames || "None available"}
My top artists: ${artistNames || "None available"}  
Recently played: ${recentNames || "None available"}

Suggest 10 songs I might enjoy based on my taste. Include a mix of similar artists and new discoveries. Focus on Telugu, Tamil, and English music.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ error: "AI recommendation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";
    
    let recommendations = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse AI recommendations");
    }

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-recommendations error:", e instanceof Error ? e.message : "Unknown");
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
