import { useState, useCallback, useEffect } from "react";

export interface DiscoverLikedTrack {
  id: string;
  uri: string;
  title: string;
  artist: string;
  cover: string;
  previewUrl: string | null;
  durationMs: number;
  likedAt: number;
}

const STORAGE_KEY = "discover_liked_tracks";

function loadLikes(): DiscoverLikedTrack[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DiscoverLikedTrack[];
  } catch {
    return [];
  }
}

function saveLikes(likes: DiscoverLikedTrack[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(likes));
}

export function useDiscoverLikes() {
  const [likedTracks, setLikedTracks] = useState<DiscoverLikedTrack[]>(loadLikes);

  // Keep state fresh across tabs/sessions
  useEffect(() => {
    const handler = () => setLikedTracks(loadLikes());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const likeTrack = useCallback((track: DiscoverLikedTrack) => {
    setLikedTracks((prev) => {
      if (prev.some((t) => t.id === track.id)) return prev;
      const updated = [{ ...track, likedAt: Date.now() }, ...prev];
      saveLikes(updated);
      return updated;
    });
  }, []);

  const unlikeTrack = useCallback((trackId: string) => {
    setLikedTracks((prev) => {
      const updated = prev.filter((t) => t.id !== trackId);
      saveLikes(updated);
      return updated;
    });
  }, []);

  const isLiked = useCallback(
    (trackId: string) => likedTracks.some((t) => t.id === trackId),
    [likedTracks]
  );

  return { likedTracks, likeTrack, unlikeTrack, isLiked };
}
