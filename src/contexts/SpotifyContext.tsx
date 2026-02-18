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

interface QueueTrack {
  uri: string;
  title: string;
  artist: string;
  cover: string;
  previewUrl?: string | null;
  durationMs?: number;
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
  queue: QueueTrack[];
  queueIndex: number;
  shuffleOn: boolean;
  repeatOn: boolean;
  connect: () => Promise<void>;
  refresh: () => Promise<void>;
  disconnect: () => void;
  playTrack: (uri: string, title: string, artist: string, cover: string, previewUrl?: string | null, durationMs?: number) => void;
  playTrackWithQueue: (tracks: QueueTrack[], startIndex: number) => void;
  togglePlayback: () => void;
  seek: (time: number) => void;
  skipNext: () => void;
  skipPrev: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
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
  queue: [],
  queueIndex: -1,
  shuffleOn: false,
  repeatOn: false,
  connect: async () => {},
  refresh: async () => {},
  disconnect: () => {},
  playTrack: () => {},
  playTrackWithQueue: () => {},
  togglePlayback: () => {},
  seek: () => {},
  skipNext: () => {},
  skipPrev: () => {},
  toggleShuffle: () => {},
  toggleRepeat: () => {},
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
  const [queue, setQueue] = useState<QueueTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [repeatOn, setRepeatOn] = useState(false);

  const tokenExpiresAt = useRef<number>(Number(localStorage.getItem(STORAGE_KEY_EXPIRES) || "0"));
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenRef = useRef<string | null>(token);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<QueueTrack[]>([]);
  const queueIndexRef = useRef<number>(-1);
  const repeatRef = useRef(false);
  const shuffleRef = useRef(false);
  const progressRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { repeatRef.current = repeatOn; }, [repeatOn]);
  useEffect(() => { shuffleRef.current = shuffleOn; }, [shuffleOn]);
  useEffect(() => { progressRef.current = progress; }, [progress]);

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
    setQueue([]);
    setQueueIndex(-1);
    tokenExpiresAt.current = 0;
    localStorage.removeItem(STORAGE_KEY_EXPIRES);
  }, [setToken, stopProgressTracking, stopAudioPreview]);

  // Stable ref for internal play so the `ended` handler always has a fresh reference
  const playTrackInternalRef = useRef<(
    uri: string, title: string, artist: string, cover: string,
    previewUrl?: string | null, durationMs?: number
  ) => Promise<void>>(async () => {});

  // Core play function (internal)
  const playTrackInternal = useCallback(async (
    uri: string, title: string, artist: string, cover: string,
    previewUrl?: string | null, durationMs?: number
  ) => {
    const trackId = uri.replace("spotify:track:", "");
    log("play_track", { trackId, title, deviceId: deviceIdRef.current });

    setNowPlaying({
      trackUri: uri, trackId, title, artist, cover,
      previewUrl: previewUrl || null,
      durationMs: durationMs || 0,
    });

    // Use Web Playback SDK if device is ready
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

        // Device not found or forbidden — clear deviceId so we fall back to audio preview
        if (res.status === 404 || res.status === 403) {
          log("device_lost_clearing", { status: res.status });
          deviceIdRef.current = null;
          setPlayerReady(false);
        }
      } catch (err) {
        log("play_fetch_error", { error: String(err) });
        deviceIdRef.current = null;
        setPlayerReady(false);
      }
    }

    // Fallback: HTML5 Audio with preview URL
    if (previewUrl) {
      stopAudioPreview();
      const audio = new Audio(previewUrl);
      audio.preload = "auto";
      audioRef.current = audio;

      audio.addEventListener("timeupdate", () => {
        setProgress(audio.currentTime);
        progressRef.current = audio.currentTime;
        setDuration(audio.duration || 30);
      });

      audio.addEventListener("ended", () => {
        if (repeatRef.current) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        } else {
          setIsPlaying(false);
          setProgress(0);
          progressRef.current = 0;
          // Auto-advance to next track using stable refs
          const nextIdx = queueIndexRef.current + 1;
          if (nextIdx < queueRef.current.length) {
            const next = queueRef.current[nextIdx];
            setQueueIndex(nextIdx);
            queueIndexRef.current = nextIdx;
            setTimeout(() => {
              playTrackInternalRef.current(next.uri, next.title, next.artist, next.cover, next.previewUrl, next.durationMs);
            }, 300);
          }
        }
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

    toast({ title: "Playback unavailable", description: "Waiting for player to connect. Try again in a moment.", variant: "destructive" });
  }, [startProgressTracking, stopAudioPreview]);

  // Keep the ref up to date so `ended` handler always calls the latest version
  useEffect(() => {
    playTrackInternalRef.current = playTrackInternal;
  }, [playTrackInternal]);

  // Initialize Web Playback SDK
  const initPlayer = useCallback((accessToken: string) => {
    if (playerRef.current) return;

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

  // On mount: check for callback token in URL OR restore from localStorage
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

  const playTrack = useCallback(async (
    uri: string, title: string, artist: string, cover: string,
    previewUrl?: string | null, durationMs?: number
  ) => {
    const track: QueueTrack = { uri, title, artist, cover, previewUrl, durationMs };
    setQueue([track]);
    setQueueIndex(0);
    queueRef.current = [track];
    queueIndexRef.current = 0;
    await playTrackInternalRef.current(uri, title, artist, cover, previewUrl, durationMs);
  }, []);

  const playTrackWithQueue = useCallback(async (tracks: QueueTrack[], startIndex: number) => {
    setQueue(tracks);
    setQueueIndex(startIndex);
    queueRef.current = tracks;
    queueIndexRef.current = startIndex;
    const t = tracks[startIndex];
    if (t) {
      await playTrackInternalRef.current(t.uri, t.title, t.artist, t.cover, t.previewUrl, t.durationMs);
    }
  }, []);

  const togglePlayback = useCallback(async () => {
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
    const currentQueue = queueRef.current;
    const currentIdx = queueIndexRef.current;

    // If SDK device is confirmed active AND no audio fallback running, use SDK
    if (playerRef.current && deviceIdRef.current && !audioRef.current) {
      await playerRef.current.nextTrack();
      return;
    }

    // Queue-based navigation (works for both audio fallback and when SDK device is lost)
    if (currentQueue.length === 0) return;
    let nextIdx: number;
    if (shuffleRef.current) {
      nextIdx = Math.floor(Math.random() * currentQueue.length);
    } else {
      nextIdx = currentIdx + 1;
      if (nextIdx >= currentQueue.length) {
        if (repeatRef.current) nextIdx = 0;
        else return;
      }
    }
    setQueueIndex(nextIdx);
    queueIndexRef.current = nextIdx;
    const next = currentQueue[nextIdx];
    stopAudioPreview();
    await playTrackInternalRef.current(next.uri, next.title, next.artist, next.cover, next.previewUrl, next.durationMs);
  }, [stopAudioPreview]);

  const skipPrev = useCallback(async () => {
    const currentQueue = queueRef.current;
    const currentIdx = queueIndexRef.current;
    const currentProgress = progressRef.current;

    // If progress > 3s, restart current track
    if (currentProgress > 3) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setProgress(0);
        progressRef.current = 0;
      } else if (playerRef.current && deviceIdRef.current) {
        await playerRef.current.seek(0);
        setProgress(0);
        progressRef.current = 0;
      }
      return;
    }

    // If SDK device is confirmed active AND no audio fallback running, use SDK
    if (playerRef.current && deviceIdRef.current && !audioRef.current) {
      await playerRef.current.previousTrack();
      return;
    }

    // Queue-based navigation
    if (currentQueue.length === 0) return;
    let prevIdx = currentIdx - 1;
    if (prevIdx < 0) {
      if (repeatRef.current) prevIdx = currentQueue.length - 1;
      else {
        // Restart current track
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          setProgress(0);
          progressRef.current = 0;
        }
        return;
      }
    }
    setQueueIndex(prevIdx);
    queueIndexRef.current = prevIdx;
    const prev = currentQueue[prevIdx];
    stopAudioPreview();
    await playTrackInternalRef.current(prev.uri, prev.title, prev.artist, prev.cover, prev.previewUrl, prev.durationMs);
  }, [stopAudioPreview]);

  const toggleShuffle = useCallback(() => {
    setShuffleOn(s => !s);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatOn(r => !r);
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
        queue,
        queueIndex,
        shuffleOn,
        repeatOn,
        connect,
        refresh,
        disconnect,
        playTrack,
        playTrackWithQueue,
        togglePlayback,
        seek,
        skipNext,
        skipPrev,
        toggleShuffle,
        toggleRepeat,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
};
