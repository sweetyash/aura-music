import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("SPOTIFY_CLIENT_ID")!;
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/spotify-callback`;

    const scopes = [
      "streaming",
      "user-read-playback-state",
      "user-modify-playback-state",
      "user-read-private",
      "user-read-email",
      "user-read-recently-played",
      "user-top-read",
      "user-library-read",
      "user-library-modify",
      "playlist-read-private",
      "playlist-read-collaborative",
      "playlist-modify-public",
      "playlist-modify-private",
    ].join(" ");

    // Extract origin from request body so callback knows where to redirect
    let appOrigin = "";
    try {
      const body = await req.json();
      if (body?.origin) appOrigin = body.origin;
    } catch {}

    // Encode origin in state (base64)
    const state = btoa(appOrigin);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      state,
    });

    const spotifyUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

    return new Response(JSON.stringify({ url: spotifyUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
