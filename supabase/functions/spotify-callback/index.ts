import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const userId = url.searchParams.get("state");

    // Handle Spotify denied/revoked permissions
    if (error) {
      const appOrigin = Deno.env.get("APP_ORIGIN") || "https://lovable.app";
      const redirectTo = new URL("/", appOrigin);
      redirectTo.searchParams.set("spotify_error", error === "access_denied" ? "denied" : "error");
      return Response.redirect(redirectTo.toString(), 302);
    }

    if (!code || !userId || userId === "anonymous") {
      return new Response(
        JSON.stringify({ error: "Missing authorization code or user context." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("SPOTIFY_CLIENT_ID")!;
    const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/spotify-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      console.error("[spotify-callback] Token exchange failed:", JSON.stringify(tokenData));
      return new Response(
        JSON.stringify({ error: "Failed to exchange authorization code. Please try again." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Save tokens using service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: dbError } = await supabase
      .from("spotify_tokens")
      .upsert(
        {
          user_id: userId,
          access_token,
          refresh_token,
          expires_at: expiresAt,
        },
        { onConflict: "user_id" }
      );

    if (dbError) {
      console.error("[spotify-callback] DB error:", dbError.message);
      return new Response(
        JSON.stringify({ error: "Internal error saving your credentials." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Redirect back to the app — use referer or fallback
    const origin = req.headers.get("origin") || req.headers.get("referer") || "/";
    const redirectTo = new URL("/", origin.startsWith("http") ? origin : `https://${origin}`);
    redirectTo.searchParams.set("spotify_token", access_token);

    return Response.redirect(redirectTo.toString(), 302);
  } catch (error) {
    console.error("[spotify-callback] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
