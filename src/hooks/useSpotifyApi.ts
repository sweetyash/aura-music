import { useCallback } from "react";
import { useSpotify } from "@/contexts/SpotifyContext";
import { supabase } from "@/integrations/supabase/client";

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

      const { data, error } = await supabase.functions.invoke("spotify-api", {
        body: { endpoint, method, body, token },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error?.message || data.error);
      return data;
    },
    [token]
  );

  const search = useCallback(
    async (query: string, types = "track", limit = 20) => {
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
      const { data, error } = await supabase.functions.invoke("ai-recommendations", {
        body: { topTracks, topArtists, recentTracks },
      });
      if (error) throw error;
      return data;
    },
    []
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
  };
}
