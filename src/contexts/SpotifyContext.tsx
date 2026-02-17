import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { loginWithSpotify, refreshSpotifyToken, extractSpotifyTokenFromUrl } from "@/lib/spotify-auth";
import { toast } from "@/hooks/use-toast";

interface NowPlaying {
  trackUri: string;
  trackId: string;
  title: string;
  artist: string;
  cover: string;
  previewUrl: string | null;
  durationMs: number;
}

interface SpotifyAuthCtx {
  token: string | null;
  isConnected: boolean;
  isPremium: boolean | null;
  playerReady: boolean;
  isPlaying: boolean;
  nowPlaying: NowPlaying | null;
  progress: number;
  duration: number;
  connect: () => Promise<void>;
  refresh: () => Promise<void>;
  disconnect: () => void;
  playTrack: (uri: string, title: string, artist: string, cover: string, previewUrl?: string | null, durationMs?: number) => void;
  togglePlayback: () => void;
  seek: (time: number) => void;
}

const SpotifyContext = createContext<SpotifyAuthCtx>({
  token: null,
  isConnected: false,
  isPremium: null,
  playerReady: true,
  isPlaying: false,
  nowPlaying: null,
  progress: 0,
  duration: 0,
  connect: async () => {},
  refresh: async () => {},
  disconnect: () => {},
  playTrack: () => {},
  togglePlayback: () => {},
  seek: () => {},
});

export const useSpotify = () => useContext(SpotifyContext);

const log = (event: string, data?: Record<string, unknown>) => {
  console.log(`[Spotify] ${event}`, data ? JSON.stringify(data) : "");
};

async function validateToken(accessToken: string): Promise<{ valid: boolean; premium: boolean }> {
  try {
    const res = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { valid: false, premium: false };
    const data = await res.json();
    return { valid: true, premium: data.product === "premium" };
  } catch {
    return { valid: false, premium: false };
  }
}

const STORAGE_KEY_TOKEN = "spotify_access_token";
const STORAGE_KEY_EXPIRES = "spotify_token_expires";

export const SpotifyProvider = ({ children }: { children: ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TOKEN);
    const exp = Number(localStorage.getItem(STORAGE_KEY_EXPIRES) || "0");
    if (saved && exp > Date.now()) return saved;
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_EXPIRES);
    return null;
  });
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const tokenExpiresAt = useRef<number>(Number(localStorage.getItem(STORAGE_KEY_EXPIRES) || "0"));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const setToken = useCallback((t: string | null) => {
    setTokenState(t);
    if (t) {
      localStorage.setItem(STORAGE_KEY_TOKEN, t);
    } else {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_EXPIRES);
    }
  }, []);

  const setTokenExpiry = useCallback((exp: number) => {
    tokenExpiresAt.current = exp;
    localStorage.setItem(STORAGE_KEY_EXPIRES, String(exp));
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  const clearState = useCallback(() => {
    stopAudio();
    setToken(null);
    setIsPremium(null);
    setIsPlaying(false);
    setNowPlaying(null);
    setProgress(0);
    setDuration(0);
    setTokenExpiry(0);
  }, [setToken, setTokenExpiry, stopAudio]);

  // On mount, check for callback token in URL OR restore from localStorage
  useEffect(() => {
    const urlToken = extractSpotifyTokenFromUrl();
    const activeToken = urlToken || token;
    if (!activeToken) return;

    if (urlToken) {
      setToken(urlToken);
      setTokenExpiry(Date.now() + 3600 * 1000);
    }

    validateToken(activeToken).then(({ valid, premium }) => {
      if (!valid) {
        toast({ title: "Spotify Connection Issue", description: "Try disconnecting and reconnecting from Profile.", variant: "destructive" });
        return;
      }
      setIsPremium(premium);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ensureToken = useCallback(async (): Promise<string | null> => {
    if (token && tokenExpiresAt.current > Date.now() + 60_000) return token;
    try {
      const freshToken = await refreshSpotifyToken();
      const { valid, premium } = await validateToken(freshToken);
      if (!valid) { clearState(); return null; }
      setToken(freshToken);
      setIsPremium(premium);
      setTokenExpiry(Date.now() + 3600 * 1000);
      return freshToken;
    } catch {
      clearState();
      return null;
    }
  }, [token, clearState, setToken, setTokenExpiry]);

  const connect = useCallback(async () => { await loginWithSpotify(); }, []);

  const refresh = useCallback(async () => {
    const fresh = await ensureToken();
    if (!fresh) toast({ title: "Refresh Failed", description: "Please reconnect Spotify.", variant: "destructive" });
  }, [ensureToken]);

  const disconnect = useCallback(() => {
    clearState();
    toast({ title: "Spotify Disconnected", description: "You have been disconnected from Spotify." });
  }, [clearState]);

  const startProgressTracking = useCallback(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      if (audioRef.current) {
        setProgress(audioRef.current.currentTime);
        setDuration(audioRef.current.duration || 0);
      }
    }, 250);
  }, []);

  const playTrack = useCallback((uri: string, title: string, artist: string, cover: string, previewUrl?: string | null, durationMs?: number) => {
    const trackId = uri.replace("spotify:track:", "");
    log("play_track", { trackId, title, hasPreview: !!previewUrl });

    stopAudio();

    const np: NowPlaying = { trackUri: uri, trackId, title, artist, cover, previewUrl: previewUrl || null, durationMs: durationMs || 0 };
    setNowPlaying(np);

    if (previewUrl) {
      const audio = new Audio(previewUrl);
      audioRef.current = audio;
      audio.volume = 1;

      audio.addEventListener("canplay", () => {
        audio.play().catch(() => {});
        setIsPlaying(true);
        startProgressTracking();
      });

      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setProgress(0);
        if (progressInterval.current) clearInterval(progressInterval.current);
      });

      audio.addEventListener("error", () => {
        log("audio_error", { trackId });
        setIsPlaying(false);
      });

      audio.load();
    } else {
      // No preview available — show track info but can't play
      setIsPlaying(false);
      setProgress(0);
      setDuration(durationMs ? durationMs / 1000 : 0);
    }
  }, [stopAudio, startProgressTracking]);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      startProgressTracking();
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
  }, [startProgressTracking]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopAudio(); };
  }, [stopAudio]);

  return (
    <SpotifyContext.Provider
      value={{
        token,
        isConnected: !!token,
        isPremium,
        playerReady: true,
        isPlaying,
        nowPlaying,
        progress,
        duration,
        connect,
        refresh,
        disconnect,
        playTrack,
        togglePlayback,
        seek,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
};
