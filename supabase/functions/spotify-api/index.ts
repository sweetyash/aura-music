const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SPOTIFY_API_BASE = "https://api.spotify.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate caller provides the project anon key
  const apiKey = req.headers.get("apikey") || req.headers.get("x-api-key");
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const providedKey = apiKey || bearerToken;

  if (!providedKey || providedKey !== SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { endpoint, method = "GET", body, token } = await req.json();

    if (!token || typeof token !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing Spotify access token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!endpoint || typeof endpoint !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing endpoint" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only allow requests to the Spotify API domain
    let url: string;
    if (endpoint.startsWith("http")) {
      const parsed = new URL(endpoint);
      if (parsed.hostname !== "api.spotify.com") {
        return new Response(
          JSON.stringify({ error: "Invalid endpoint domain" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      url = endpoint;
    } else {
      url = `${SPOTIFY_API_BASE}${endpoint}`;
    }

    // Validate HTTP method
    const allowedMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
    const upperMethod = method.toUpperCase();
    if (!allowedMethods.includes(upperMethod)) {
      return new Response(
        JSON.stringify({ error: "Invalid method" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fetchOptions: RequestInit = {
      method: upperMethod,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    if (body && upperMethod !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(url, fetchOptions);

    if (res.status === 204) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      return new Response(JSON.stringify(data ?? { error: { status: res.status, message: res.statusText } }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data ?? {}), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[spotify-api] Error:", error instanceof Error ? error.message : "Unknown");
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
