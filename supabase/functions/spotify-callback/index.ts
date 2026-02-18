import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const stateParam = url.searchParams.get("state");

    // Decode origin from state
    let appOrigin = "https://1ba59472-62e4-40d4-93f8-e6fefe6a57a6.lovableproject.com";
    try {
      if (stateParam) appOrigin = atob(stateParam);
    } catch {}

    // Handle Spotify denied/revoked permissions
    if (error) {
      const redirectTo = new URL("/", appOrigin);
      redirectTo.searchParams.set("spotify_error", error === "access_denied" ? "denied" : "error");
      return Response.redirect(redirectTo.toString(), 302);
    }

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Missing authorization code." }),
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

    // Redirect back to the app using origin from state.
    // We keep this flow stateless by returning tokens directly to the client.
    const redirectTo = new URL("/", appOrigin);
    redirectTo.searchParams.set("spotify_token", access_token);
    if (refresh_token) {
      redirectTo.searchParams.set("spotify_refresh", refresh_token);
    }
    if (typeof expires_in === "number") {
      redirectTo.searchParams.set("spotify_expires_in", String(expires_in));
    }

    return Response.redirect(redirectTo.toString(), 302);
  } catch (error) {
    console.error("[spotify-callback] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
