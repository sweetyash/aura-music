import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY_REFRESH = "spotify_refresh_token";

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
  const refreshToken = localStorage.getItem(STORAGE_KEY_REFRESH);
  if (!refreshToken) throw new Error("No refresh token stored");

  const { data, error } = await supabase.functions.invoke("spotify-refresh", {
    body: { refresh_token: refreshToken },
  });
  if (error) throw error;
  if (!data?.access_token) throw new Error("No access token returned");

  // Update stored refresh token if a new one was issued
  if (data.refresh_token) {
    localStorage.setItem(STORAGE_KEY_REFRESH, data.refresh_token);
  }

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

  // Save refresh token if present
  const refreshToken = params.get("spotify_refresh_token");
  if (refreshToken) {
    localStorage.setItem(STORAGE_KEY_REFRESH, refreshToken);
  }

  const token = params.get("spotify_token");
  if (token || refreshToken) {
    const url = new URL(window.location.href);
    url.searchParams.delete("spotify_token");
    url.searchParams.delete("spotify_refresh_token");
    window.history.replaceState({}, "", url.pathname);
  }
  return token;
}

/** Check for spotify_error in URL (denied permissions) */
export function extractSpotifyErrorFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("spotify_error");
}
