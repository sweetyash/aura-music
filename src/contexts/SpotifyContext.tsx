import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { loginWithSpotify, refreshSpotifyToken, extractSpotifyTokenFromUrl } from "@/lib/spotify-auth";
import { toast } from "@/hooks/use-toast";

interface NowPlaying {
  trackUri: string;
  trackId: string;
  title: string;
  artist: string;
  cover: string;
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
  playTrack: (uri: string, title: string, artist: string, cover: string) => void;
  togglePlayback: () => void;
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
    if (!res.ok) {
      log("token_validation_failed", { status: res.status });
      return { valid: false, premium: false };
    }
    const data = await res.json();
    const premium = data.product === "premium";
    log("token_validated", { premium, userId: data.id });
    return { valid: true, premium };
  } catch (err) {
    log("token_validation_exception", { error: String(err) });
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

  const clearState = useCallback(() => {
    log("state_cleared");
    setToken(null);
    setIsPremium(null);
    setIsPlaying(false);
    setNowPlaying(null);
    setProgress(0);
    setDuration(0);
    setTokenExpiry(0);
  }, [setToken, setTokenExpiry]);

  // On mount, check for callback token in URL OR restore from localStorage
  useEffect(() => {
    const urlToken = extractSpotifyTokenFromUrl();
    const activeToken = urlToken || token;

    if (!activeToken) return;

    if (urlToken) {
      log("token_received_from_url", { tokenLength: urlToken.length });
      setToken(urlToken);
      setTokenExpiry(Date.now() + 3600 * 1000);
    } else {
      log("token_restored_from_storage");
    }

    validateToken(activeToken).then(({ valid, premium }) => {
      if (!valid) {
        log("initial_token_invalid");
        toast({
          title: "Spotify Connection Issue",
          description: "Try disconnecting and reconnecting from Profile.",
          variant: "destructive",
        });
        return;
      }
      log("initial_token_valid", { premium });
      setIsPremium(premium);
    }).catch((err) => {
      log("token_validation_error", { error: String(err) });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ensureToken = useCallback(async (): Promise<string | null> => {
    if (token && tokenExpiresAt.current > Date.now() + 60_000) {
      return token;
    }
    try {
      const freshToken = await refreshSpotifyToken();
      const { valid, premium } = await validateToken(freshToken);
      if (!valid) {
        clearState();
        return null;
      }
      setToken(freshToken);
      setIsPremium(premium);
      setTokenExpiry(Date.now() + 3600 * 1000);
      return freshToken;
    } catch (err) {
      log("token_refresh_failed", { error: String(err) });
      clearState();
      return null;
    }
  }, [token, clearState, setToken, setTokenExpiry]);

  const connect = useCallback(async () => {
    await loginWithSpotify();
  }, []);

  const refresh = useCallback(async () => {
    const fresh = await ensureToken();
    if (!fresh) {
      toast({ title: "Refresh Failed", description: "Please reconnect Spotify.", variant: "destructive" });
    }
  }, [ensureToken]);

  const disconnect = useCallback(() => {
    clearState();
    toast({ title: "Spotify Disconnected", description: "You have been disconnected from Spotify." });
  }, [clearState]);

  // Play track using Spotify Embed — just set nowPlaying state
  const playTrack = useCallback((uri: string, title: string, artist: string, cover: string) => {
    const trackId = uri.replace("spotify:track:", "");
    log("play_track", { trackId, title });
    setNowPlaying({ trackUri: uri, trackId, title, artist, cover });
    setIsPlaying(true);
    setProgress(0);
    setDuration(30); // Embed previews are ~30s
  }, []);

  const togglePlayback = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  return (
    <SpotifyContext.Provider
      value={{
        token,
        isConnected: !!token,
        isPremium,
        playerReady: true, // Always ready — embed handles playback
        isPlaying,
        nowPlaying,
        progress,
        duration,
        connect,
        refresh,
        disconnect,
        playTrack,
        togglePlayback,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
};
