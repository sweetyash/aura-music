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
  skipNext: () => void;
  skipPrev: () => void;
}

const SpotifyContext = createContext<SpotifyAuthCtx>({
  token: null,
  isConnected: false,
  isPremium: null,
  playerReady: false,
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
  skipNext: () => {},
  skipPrev: () => {},
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
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const tokenExpiresAt = useRef<number>(Number(localStorage.getItem(STORAGE_KEY_EXPIRES) || "0"));
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenRef = useRef<string | null>(token);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Keep tokenRef in sync
  useEffect(() => { tokenRef.current = token; }, [token]);

  const setToken = useCallback((t: string | null) => {
    setTokenState(t);
    tokenRef.current = t;
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

  const stopProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  const stopAudioPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }, []);

  const startProgressTracking = useCallback(() => {
    stopProgressTracking();
    progressInterval.current = setInterval(async () => {
      if (playerRef.current) {
        const state = await playerRef.current.getCurrentState();
        if (state) {
          setProgress(state.position / 1000);
          setDuration(state.duration / 1000);
          setIsPlaying(!state.paused);
        }
      }
    }, 500);
  }, [stopProgressTracking]);

  const clearState = useCallback(() => {
    stopProgressTracking();
    stopAudioPreview();
    if (playerRef.current) {
      playerRef.current.disconnect();
      playerRef.current = null;
    }
    deviceIdRef.current = null;
    setToken(null);
    setIsPremium(null);
    setPlayerReady(false);
    setIsPlaying(false);
    setNowPlaying(null);
    setProgress(0);
    setDuration(0);
    tokenExpiresAt.current = 0;
    localStorage.removeItem(STORAGE_KEY_EXPIRES);
  }, [setToken, stopProgressTracking, stopAudioPreview]);

  // Initialize Web Playback SDK
  const initPlayer = useCallback((accessToken: string) => {
    if (playerRef.current) return; // Already initialized

    const initSDK = () => {
      if (!window.Spotify) {
        log("sdk_not_loaded");
        return;
      }

      const player = new window.Spotify.Player({
        name: "Aura Music Player",
        getOAuthToken: (cb) => {
          cb(tokenRef.current || accessToken);
        },
        volume: 1,
      });

      player.addListener("ready", ({ device_id }) => {
        log("player_ready", { device_id });
        deviceIdRef.current = device_id;
        setPlayerReady(true);
      });

      player.addListener("not_ready", ({ device_id }) => {
        log("player_not_ready", { device_id });
        setPlayerReady(false);
      });

      player.addListener("player_state_changed", (state) => {
        if (!state) return;
        const track = state.track_window.current_track;
        setIsPlaying(!state.paused);
        setProgress(state.position / 1000);
        setDuration(state.duration / 1000);

        setNowPlaying({
          trackUri: track.uri,
          trackId: track.id,
          title: track.name,
          artist: track.artists.map(a => a.name).join(", "),
          cover: track.album.images[0]?.url || "",
          previewUrl: null,
          durationMs: track.duration_ms,
        });

        if (!state.paused) {
          startProgressTracking();
        } else {
          stopProgressTracking();
        }
      });

      player.addListener("initialization_error", ({ message }) => {
        log("init_error", { message });
        toast({ title: "Player Error", description: message, variant: "destructive" });
      });

      player.addListener("authentication_error", ({ message }) => {
        log("auth_error", { message });
        toast({ title: "Auth Error", description: "Please reconnect Spotify.", variant: "destructive" });
      });

      player.addListener("account_error", ({ message }) => {
        log("account_error", { message });
        toast({ title: "Account Error", description: "Spotify Premium is required for playback.", variant: "destructive" });
      });

      player.connect().then(success => {
        log("player_connect", { success });
        if (!success) {
          toast({ title: "Player Connection Failed", description: "Could not connect to Spotify.", variant: "destructive" });
        }
      });

      playerRef.current = player;
    };

    if (window.Spotify) {
      initSDK();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initSDK;
    }
  }, [startProgressTracking, stopProgressTracking]);

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
      if (premium) {
        initPlayer(activeToken);
      }
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

  const playTrack = useCallback(async (uri: string, title: string, artist: string, cover: string, previewUrl?: string | null, durationMs?: number) => {
    const trackId = uri.replace("spotify:track:", "");
    log("play_track", { trackId, title, deviceId: deviceIdRef.current });

    // Set now playing immediately for UI
    setNowPlaying({
      trackUri: uri, trackId, title, artist, cover,
      previewUrl: previewUrl || null,
      durationMs: durationMs || 0,
    });

    // Use Web Playback SDK if device is ready
    if (deviceIdRef.current && tokenRef.current) {
      try {
        const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceIdRef.current}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${tokenRef.current}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uris: [uri] }),
        });

        if (res.ok || res.status === 204) {
          setIsPlaying(true);
          startProgressTracking();
          return;
        }

        const errorData = await res.json().catch(() => ({}));
        log("play_error", { status: res.status, error: errorData });

        // If 403/premium required, fall back to preview
        if (res.status === 403) {
          log("sdk_403_fallback", { trackId });
          // Don't return - fall through to preview/audio fallback below
        }
      } catch (err) {
        log("play_fetch_error", { error: String(err) });
      }
    }

    // Fallback: use HTML5 Audio with preview URL
    if (previewUrl) {
      stopAudioPreview();
      const audio = new Audio(previewUrl);
      audioRef.current = audio;
      
      audio.addEventListener("timeupdate", () => {
        setProgress(audio.currentTime);
        setDuration(audio.duration || 30);
      });
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setProgress(0);
      });
      audio.addEventListener("error", () => {
        log("audio_preview_error", { trackId });
        toast({ title: "Preview unavailable", description: "This track cannot be played in-app.", variant: "destructive" });
      });

      audio.play().then(() => {
        setIsPlaying(true);
        setDuration(audio.duration || 30);
      }).catch(() => {
        toast({ title: "Playback failed", description: "Could not play this track.", variant: "destructive" });
      });
      return;
    }

    // Last fallback: show error, do NOT redirect
    toast({ title: "Playback unavailable", description: "Waiting for player to connect. Try again in a moment.", variant: "destructive" });
  }, [startProgressTracking, stopAudioPreview]);

  const togglePlayback = useCallback(async () => {
    // Handle HTML5 Audio preview
    if (audioRef.current) {
      if (audioRef.current.paused) {
        await audioRef.current.play();
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }
    if (playerRef.current) {
      await playerRef.current.togglePlay();
    }
  }, []);

  const seek = useCallback(async (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
      return;
    }
    if (playerRef.current) {
      await playerRef.current.seek(time * 1000);
      setProgress(time);
    }
  }, []);

  const skipNext = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.nextTrack();
    }
  }, []);

  const skipPrev = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.previousTrack();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProgressTracking();
      stopAudioPreview();
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, [stopProgressTracking, stopAudioPreview]);

  return (
    <SpotifyContext.Provider
      value={{
        token,
        isConnected: !!token,
        isPremium,
        playerReady,
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
        skipNext,
        skipPrev,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
};
