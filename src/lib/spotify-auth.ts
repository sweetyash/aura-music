import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY_REFRESH = "spotify_refresh_token";
const STORAGE_KEY_TOKEN = "spotify_access_token";
const STORAGE_KEY_EXPIRES = "spotify_token_expires";

/** Initiate Spotify login – opens in new tab to handle iframe sandbox restrictions */
export async function loginWithSpotify() {
  const { data, error } = await supabase.functions.invoke("spotify-login", {
    body: { origin: getAppOrigin() },
  });
  if (error) throw error;

  // Open in a new tab/window — this bypasses iframe sandbox restrictions
  // and lets the OAuth callback redirect back to the real app origin.
  const popup = window.open(data.url, "_blank", "noopener,noreferrer");
  if (!popup) {
    // If popup was blocked, fall back to direct navigation
    window.location.href = data.url;
  }
}

/** Get the real app origin (not the iframe sandbox origin) */
function getAppOrigin(): string {
  // On the published app, window.location.origin is the real origin.
  // Inside Lovable preview iframe, we still use window.location.origin
  // which correctly points to the preview URL that the callback can redirect back to.
  return window.location.origin;
}

/** Refresh the access token using the stored refresh token */
export async function refreshSpotifyToken(): Promise<{ accessToken: string; refreshToken: string }> {
  const refreshToken = localStorage.getItem(STORAGE_KEY_REFRESH);
  if (!refreshToken) throw new Error("No refresh token stored");

  const { data, error } = await supabase.functions.invoke("spotify-refresh", {
    body: { refresh_token: refreshToken },
  });
  if (error) throw error;
  if (!data?.access_token) throw new Error("No access token in refresh response");

  // Update stored refresh token if Spotify rotated it
  if (data.refresh_token) {
    localStorage.setItem(STORAGE_KEY_REFRESH, data.refresh_token);
  }
  // Persist the new access token
  localStorage.setItem(STORAGE_KEY_TOKEN, data.access_token);
  localStorage.setItem(STORAGE_KEY_EXPIRES, String(Date.now() + (data.expires_in || 3600) * 1000));

  return { accessToken: data.access_token, refreshToken: data.refresh_token || refreshToken };
}

/** Check URL params for spotify_token after callback redirect */
export function extractSpotifyTokenFromUrl(): { token: string; refreshToken: string | null; expiresIn: number } | null {
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
  if (!token) return null;

  const refreshToken = params.get("spotify_refresh_token");
  const expiresIn = parseInt(params.get("spotify_expires_in") || "3600", 10);

  // Persist tokens immediately
  localStorage.setItem(STORAGE_KEY_TOKEN, token);
  localStorage.setItem(STORAGE_KEY_EXPIRES, String(Date.now() + expiresIn * 1000));
  if (refreshToken) {
    localStorage.setItem(STORAGE_KEY_REFRESH, refreshToken);
  }

  // Clean URL
  const url = new URL(window.location.href);
  url.searchParams.delete("spotify_token");
  url.searchParams.delete("spotify_refresh_token");
  url.searchParams.delete("spotify_expires_in");
  window.history.replaceState({}, "", url.pathname);

  return { token, refreshToken, expiresIn };
}

/** Check for spotify_error in URL (denied permissions) */
export function extractSpotifyErrorFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("spotify_error");
}
