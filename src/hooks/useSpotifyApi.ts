import { useCallback } from "react";
import { useSpotify } from "@/contexts/SpotifyContext";

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
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

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spotify-api`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ endpoint, method, body, token }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || data?.error || "Spotify API error");
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
