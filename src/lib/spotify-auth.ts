import { supabase } from "@/integrations/supabase/client";

export interface SpotifyRefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Initiate Spotify login – opens Spotify authorize page */
export async function loginWithSpotify() {
  const { data, error } = await supabase.functions.invoke("spotify-login", {
    body: { origin: window.location.origin },
  });
  if (error) throw error;
  window.location.href = data.url;
}

/** Refresh the access token using the provided refresh token */
export async function refreshSpotifyToken(
  refreshToken: string
): Promise<SpotifyRefreshResponse> {
  const { data, error } = await supabase.functions.invoke("spotify-refresh", {
    body: { refresh_token: refreshToken },
  });
  if (error) throw error;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : 3600,
  };
}

export interface SpotifyAuthFromUrl {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
}

/** Check URL params for spotify auth details after callback redirect */
export function extractSpotifyAuthFromUrl(): SpotifyAuthFromUrl | null {
  const params = new URLSearchParams(window.location.search);

  // Handle denied permissions
  const spotifyError = params.get("spotify_error");
  if (spotifyError) {
    const url = new URL(window.location.href);
    url.searchParams.delete("spotify_error");
    window.history.replaceState({}, "", url.pathname);
    return null;
  }

  const accessToken = params.get("spotify_token");
  const refreshToken = params.get("spotify_refresh");
  const expiresInRaw = params.get("spotify_expires_in");

  if (accessToken || refreshToken || expiresInRaw) {
    const url = new URL(window.location.href);
    url.searchParams.delete("spotify_token");
    url.searchParams.delete("spotify_refresh");
    url.searchParams.delete("spotify_expires_in");
    window.history.replaceState({}, "", url.pathname);
  }

  if (!accessToken) return null;

  const expiresIn = expiresInRaw ? Number(expiresInRaw) || null : null;
  return {
    accessToken,
    refreshToken: refreshToken || null,
    expiresIn,
  };
}

/** Backwards-compatible helper that only returns the access token */
export function extractSpotifyTokenFromUrl(): string | null {
  const auth = extractSpotifyAuthFromUrl();
  return auth?.accessToken ?? null;
}

/** Check for spotify_error in URL (denied permissions) */
export function extractSpotifyErrorFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("spotify_error");
}
