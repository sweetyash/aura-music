import { supabase } from "@/integrations/supabase/client";

/** Initiate Spotify login – opens Spotify authorize page */
export async function loginWithSpotify() {
  const { data, error } = await supabase.functions.invoke("spotify-login", {
    body: { origin: window.location.origin },
  });
  if (error) throw error;
  window.location.href = data.url;
}

/** Refresh the access token using the stored refresh token */
export async function refreshSpotifyToken(): Promise<string> {
  const { data, error } = await supabase.functions.invoke("spotify-refresh");
  if (error) throw error;
  return data.access_token;
}

/** Check URL params for spotify_token after callback redirect */
export function extractSpotifyTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);

  // Handle denied permissions
  const spotifyError = params.get("spotify_error");
  if (spotifyError) {
    const url = new URL(window.location.href);
    url.searchParams.delete("spotify_error");
    window.history.replaceState({}, "", url.pathname);
    return null;
  }

  const token = params.get("spotify_token");
  if (token) {
    const url = new URL(window.location.href);
    url.searchParams.delete("spotify_token");
    window.history.replaceState({}, "", url.pathname);
  }
  return token;
}

/** Check for spotify_error in URL (denied permissions) */
export function extractSpotifyErrorFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("spotify_error");
}
