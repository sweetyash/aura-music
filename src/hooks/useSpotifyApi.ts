import { useCallback } from "react";
import { useSpotify } from "@/contexts/SpotifyContext";

// ─── Session-level cache (survives component remounts, resets on page refresh) ───
const apiCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute

function getCached(key: string): any | null {
  const entry = apiCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  apiCache.delete(key);
  return null;
}

function setCache(key: string, data: any) {
  apiCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// In-flight deduplication: prevent simultaneous identical GET requests
const inFlight = new Map<string, Promise<any>>();

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  preview_url: string | null;
  album: {
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  artists: { id: string; name: string }[];
  popularity: number;
  explicit: boolean;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  genres: string[];
  popularity: number;
  followers: { total: number };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { display_name: string };
  public: boolean;
}

export interface RecentTrack {
  track: SpotifyTrack;
  played_at: string;
}

export function getTrackCover(track: SpotifyTrack): string {
  return track.album?.images?.[0]?.url || "/placeholder.svg";
}

export function getArtistImage(artist: SpotifyArtist): string {
  return artist.images?.[0]?.url || "/placeholder.svg";
}

export function formatDuration(ms: number): string {
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function useSpotifyApi() {
  const { token } = useSpotify();

  const callApi = useCallback(
    async (endpoint: string, method = "GET", body?: any) => {
      if (!token) throw new Error("Not connected to Spotify");

      const url = endpoint.startsWith("http")
        ? endpoint
        : `https://api.spotify.com${endpoint}`;

      // Only cache GET requests
      if (method === "GET") {
        const cached = getCached(url);
        if (cached) return cached;

        // Deduplicate in-flight requests for same URL
        if (inFlight.has(url)) return inFlight.get(url);

        const promise = (async () => {
          const res = await fetch(url, {
            method,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (res.status === 204) return { success: true };

          const text = await res.text();
          let data: any;
          try { data = text ? JSON.parse(text) : null; } catch { data = null; }

          if (!res.ok) {
            inFlight.delete(url);
            throw new Error(data?.error?.message || data?.error || `Spotify API error ${res.status}`);
          }

          setCache(url, data);
          inFlight.delete(url);
          return data;
        })();

        inFlight.set(url, promise);
        return promise;
      }

      // Non-GET: no caching, just fetch
      const fetchOptions: RequestInit = {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };
      if (body) fetchOptions.body = JSON.stringify(body);

      const res = await fetch(url, fetchOptions);
      if (res.status === 204) return { success: true };

      const text = await res.text();
      let data: any;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }

      if (!res.ok) throw new Error(data?.error?.message || data?.error || `Spotify API error ${res.status}`);
      return data;
    },
    [token]
  );

  const search = useCallback(
    async (query: string, types = "track", limit = 10) => {
      const params = new URLSearchParams({ q: query, type: types, limit: String(limit) });
      return callApi(`/v1/search?${params}`);
    },
    [callApi]
  );

  const getRecentlyPlayed = useCallback(
    (limit = 20) => callApi(`/v1/me/player/recently-played?limit=${limit}`),
    [callApi]
  );

  const getTopTracks = useCallback(
    (timeRange = "medium_term", limit = 20) =>
      callApi(`/v1/me/top/tracks?time_range=${timeRange}&limit=${limit}`),
    [callApi]
  );

  const getTopArtists = useCallback(
    (timeRange = "medium_term", limit = 20) =>
      callApi(`/v1/me/top/artists?time_range=${timeRange}&limit=${limit}`),
    [callApi]
  );

  const getPlaylists = useCallback(
    (limit = 50) => callApi(`/v1/me/playlists?limit=${limit}`),
    [callApi]
  );

  const getPlaylistTracks = useCallback(
    (playlistId: string, limit = 100) =>
      callApi(`/v1/playlists/${playlistId}/tracks?limit=${limit}`),
    [callApi]
  );

  const createPlaylist = useCallback(
    async (userId: string, name: string, description = "", isPublic = false) =>
      callApi(`/v1/users/${userId}/playlists`, "POST", {
        name,
        description,
        public: isPublic,
      }),
    [callApi]
  );

  const addToPlaylist = useCallback(
    (playlistId: string, uris: string[]) =>
      callApi(`/v1/playlists/${playlistId}/tracks`, "POST", { uris }),
    [callApi]
  );

  const getSavedTracks = useCallback(
    (limit = 50, offset = 0) =>
      callApi(`/v1/me/tracks?limit=${limit}&offset=${offset}`),
    [callApi]
  );

  const saveTrack = useCallback(
    (trackId: string) => callApi(`/v1/me/tracks`, "PUT", { ids: [trackId] }),
    [callApi]
  );

  const removeTrack = useCallback(
    (trackId: string) => callApi(`/v1/me/tracks`, "DELETE", { ids: [trackId] }),
    [callApi]
  );

  const checkSavedTracks = useCallback(
    (trackIds: string[]) =>
      callApi(`/v1/me/tracks/contains?ids=${trackIds.join(",")}`),
    [callApi]
  );

  const getCurrentUser = useCallback(
    () => callApi("/v1/me"),
    [callApi]
  );

  const getAiRecommendations = useCallback(
    async (topTracks: any[], topArtists: any[], recentTracks: any[]) => {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-recommendations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ topTracks, topArtists, recentTracks }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "AI recommendations error");
      return data;
    },
    []
  );

  const getRecommendations = useCallback(
    (seedTracks: string[], seedArtists: string[], limit = 20) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (seedTracks.length) params.set("seed_tracks", seedTracks.slice(0, 3).join(","));
      if (seedArtists.length) params.set("seed_artists", seedArtists.slice(0, 2).join(","));
      if (!seedTracks.length && !seedArtists.length) {
        params.set("seed_genres", "pop,indie,bollywood");
      }
      return callApi(`/v1/recommendations?${params}`);
    },
    [callApi]
  );

  const getNewReleases = useCallback(
    (limit = 20) => callApi(`/v1/browse/new-releases?limit=${limit}`),
    [callApi]
  );

  return {
    search,
    getRecentlyPlayed,
    getTopTracks,
    getTopArtists,
    getPlaylists,
    getPlaylistTracks,
    createPlaylist,
    addToPlaylist,
    getSavedTracks,
    saveTrack,
    removeTrack,
    checkSavedTracks,
    getCurrentUser,
    getAiRecommendations,
    getRecommendations,
    getNewReleases,
  };
}
