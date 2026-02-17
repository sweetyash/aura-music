import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { loginWithSpotify, refreshSpotifyToken, extractSpotifyTokenFromUrl } from "@/lib/spotify-auth";
import { toast } from "@/hooks/use-toast";

type SpotifyPlayer = any;

interface NowPlaying {
  trackUri: string;
  title: string;
  artist: string;
  cover: string;
  previewMode?: boolean;
}

interface SpotifyAuthCtx {
  token: string | null;
  isConnected: boolean;
  isPremium: boolean | null;
  deviceId: string | null;
  player: SpotifyPlayer | null;
  playerReady: boolean;
  isPlaying: boolean;
  nowPlaying: NowPlaying | null;
  progress: number;
  duration: number;
  connect: () => Promise<void>;
  refresh: () => Promise<void>;
  disconnect: () => void;
  playTrack: (uri: string, title: string, artist: string, cover: string) => Promise<void>;
  togglePlayback: () => Promise<void>;
}

const SpotifyContext = createContext<SpotifyAuthCtx>({
  token: null,
  isConnected: false,
  isPremium: null,
  deviceId: null,
  player: null,
  playerReady: false,
  isPlaying: false,
  nowPlaying: null,
  progress: 0,
  duration: 0,
  connect: async () => {},
  refresh: async () => {},
  disconnect: () => {},
  playTrack: async () => {},
  togglePlayback: async () => {},
});

export const useSpotify = () => useContext(SpotifyContext);

function loadSpotifySdk(): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById("spotify-sdk")) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "spotify-sdk";
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);
    (window as any).onSpotifyWebPlaybackSDKReady = () => resolve();
  });
}

/** Structured logger for Spotify events */
const log = (event: string, data?: Record<string, unknown>) => {
  console.log(`[Spotify] ${event}`, data ? JSON.stringify(data) : "");
};

/** Validate token and check Premium status via Spotify /v1/me */
async function validateToken(accessToken: string): Promise<{ valid: boolean; premium: boolean }> {
  try {
    const res = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401 || res.status === 403) {
      log("token_validation_failed", { status: res.status });
      return { valid: false, premium: false };
    }
    if (!res.ok) {
      log("token_validation_error", { status: res.status });
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
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const sdkProgressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenExpiresAt = useRef<number>(Number(localStorage.getItem(STORAGE_KEY_EXPIRES) || "0"));

  /** Wrapper to persist token */
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

  /** Stop preview audio */
  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    setProgress(0);
    setDuration(0);
  }, []);

  /** Clear all Spotify state */
  const clearState = useCallback(() => {
    log("state_cleared");
    stopPreview();
    playerRef.current?.disconnect();
    playerRef.current = null;
    setToken(null);
    setDeviceId(null);
    setPlayerReady(false);
    setIsPlaying(false);
    setIsPremium(null);
    setNowPlaying(null);
    setTokenExpiry(0);
  }, [stopPreview, setToken, setTokenExpiry]);

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
          description: "Some features may be limited. Try disconnecting and reconnecting from Profile.",
          variant: "destructive",
        });
        return;
      }
      log("initial_token_valid", { premium });
      setIsPremium(premium);

      if (!premium) {
        toast({
          title: "Spotify Premium Required",
          description: "Full playback requires a Spotify Premium account. You can still browse and discover music.",
          variant: "destructive",
        });
      }
    }).catch((err) => {
      log("token_validation_error", { error: String(err) });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Returns a valid token, refreshing first if expired */
  const ensureToken = useCallback(async (): Promise<string | null> => {
    if (token && tokenExpiresAt.current > Date.now() + 60_000) {
      return token;
    }
    log("token_refresh_started", { reason: token ? "expiring_soon" : "no_token" });
    try {
      const freshToken = await refreshSpotifyToken();
      const { valid, premium } = await validateToken(freshToken);
      if (!valid) {
        log("token_refresh_invalid");
        toast({
          title: "Spotify Permissions Revoked",
          description: "Your Spotify access was revoked. Please reconnect.",
          variant: "destructive",
        });
        clearState();
        return null;
      }
      log("token_refresh_success", { premium });
      setToken(freshToken);
      setIsPremium(premium);
      setTokenExpiry(Date.now() + 3600 * 1000);
      return freshToken;
    } catch (err) {
      log("token_refresh_failed", { error: String(err) });
      clearState();
      return null;
    }
  }, [token, clearState]);

  // Initialize Web Playback SDK
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const init = async () => {
      // Don't initialize player if not Premium
      if (isPremium === false) return;

      await loadSpotifySdk();
      if (cancelled) return;

      const player = new window.Spotify.Player({
        name: "Lovable Music Player",
        getOAuthToken: async (cb: (t: string) => void) => {
          const fresh = await ensureToken();
          if (fresh) cb(fresh);
        },
        volume: 0.5,
      });

      player.addListener("initialization_error", ({ message }: { message: string }) => {
        log("sdk_initialization_error", { message });
      });

      player.addListener("authentication_error", ({ message }: { message: string }) => {
        log("sdk_authentication_error", { message });
        toast({
          title: "Spotify Access Revoked",
          description: "Your Spotify session is no longer valid. Please reconnect from your Profile.",
          variant: "destructive",
        });
        clearState();
      });

      player.addListener("account_error", ({ message }: { message: string }) => {
        log("sdk_account_error", { message });
        setIsPremium(false);
        toast({
          title: "Spotify Premium Required",
          description: "Full playback requires a Spotify Premium subscription. Upgrade at spotify.com/premium.",
          variant: "destructive",
        });
      });

      player.addListener("playback_error", ({ message }: { message: string }) => {
        log("sdk_playback_error", { message });
      });

      player.addListener("ready", ({ device_id }: { device_id: string }) => {
        log("device_connected", { device_id });
        setDeviceId(device_id);
        setPlayerReady(true);
      });

      player.addListener("not_ready", ({ device_id }: { device_id: string }) => {
        log("device_not_ready", { device_id });
        setPlayerReady(false);
      });

      player.addListener("player_state_changed", (state: any) => {
        if (!state) {
          log("playback_state", { paused: true, reason: "no_state" });
          setIsPlaying(false);
          if (sdkProgressInterval.current) {
            clearInterval(sdkProgressInterval.current);
            sdkProgressInterval.current = null;
          }
          return;
        }
        const paused = state.paused;
        const trackName = state.track_window?.current_track?.name;
        log("playback_state", { paused, track: trackName });
        setIsPlaying(!paused);
        setDuration(state.duration / 1000);
        setProgress(state.position / 1000);

        // Start/stop SDK progress polling
        if (!paused) {
          if (sdkProgressInterval.current) clearInterval(sdkProgressInterval.current);
          sdkProgressInterval.current = setInterval(() => {
            player.getCurrentState().then((s: any) => {
              if (s) setProgress(s.position / 1000);
            });
          }, 500);
        } else {
          if (sdkProgressInterval.current) {
            clearInterval(sdkProgressInterval.current);
            sdkProgressInterval.current = null;
          }
        }
      });

      player.connect();
      playerRef.current = player;
    };

    init();
    return () => {
      cancelled = true;
      if (sdkProgressInterval.current) {
        clearInterval(sdkProgressInterval.current);
        sdkProgressInterval.current = null;
      }
      playerRef.current?.disconnect();
      playerRef.current = null;
      setDeviceId(null);
      setPlayerReady(false);
      setIsPlaying(false);
    };
  }, [token, isPremium]);

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

  const spotifyPlayRequest = useCallback(async (
    accessToken: string,
    device: string,
    uri: string
  ): Promise<Response> => {
    return fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: [uri] }),
    });
  }, []);

  /** Play a 30s preview via HTML5 Audio */
  const playPreview = useCallback(async (trackId: string, uri: string, title: string, artist: string, cover: string, accessToken: string) => {
    // Fetch track details to get preview_url
    try {
      const trackRes = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!trackRes.ok) {
        log("preview_fetch_failed", { status: trackRes.status });
        return false;
      }
      const trackData = await trackRes.json();
      const previewUrl = trackData.preview_url;
      if (!previewUrl) {
        log("no_preview_url", { trackId });
        return false;
      }

      // Stop any existing preview
      stopPreview();

      const audio = new Audio(previewUrl);
      audioRef.current = audio;

      audio.addEventListener("loadedmetadata", () => {
        setDuration(audio.duration);
      });
      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setProgress(0);
        if (progressInterval.current) clearInterval(progressInterval.current);
      });
      audio.addEventListener("error", () => {
        log("preview_audio_error");
        setIsPlaying(false);
      });

      await audio.play();
      setIsPlaying(true);
      setNowPlaying({ trackUri: uri, title, artist, cover, previewMode: true });

      // Update progress
      progressInterval.current = setInterval(() => {
        if (audio.currentTime && audio.duration) {
          setProgress(audio.currentTime);
        }
      }, 250);

      log("preview_started", { trackId, title });
      return true;
    } catch (err) {
      log("preview_error", { error: String(err) });
      return false;
    }
  }, [stopPreview]);

  const playTrack = useCallback(async (uri: string, title: string, artist: string, cover: string) => {
    log("play_requested", { uri, title });

    // Premium gate — prevents 403
    if (isPremium === false) {
      log("play_blocked", { reason: "not_premium" });
      toast({
        title: "Spotify Premium Required",
        description: "Full track playback needs a Premium subscription. Visit spotify.com/premium to upgrade.",
        variant: "destructive",
      });
      return;
    }

    if (!deviceId) {
      log("play_blocked", { reason: "no_device" });
      toast({ title: "Player not ready", description: "Please wait for Spotify to connect or log in first.", variant: "destructive" });
      return;
    }

    // Pre-validate token + Premium to prevent 403
    let currentToken = await ensureToken();
    if (!currentToken) {
      log("play_blocked", { reason: "no_valid_token" });
      toast({ title: "Session Expired", description: "Please reconnect Spotify from your Profile.", variant: "destructive" });
      return;
    }

    // Re-check Premium status before play (prevents 403 from stale isPremium)
    if (isPremium === null) {
      const { valid, premium } = await validateToken(currentToken);
      if (!valid) {
        log("play_blocked", { reason: "token_invalid_pre_play" });
        clearState();
        return;
      }
      setIsPremium(premium);
      if (!premium) {
        log("play_blocked", { reason: "premium_check_failed" });
        toast({ title: "Spotify Premium Required", description: "Upgrade to Premium for playback.", variant: "destructive" });
        return;
      }
    }

    log("play_api_call", { uri, deviceId });
    let res = await spotifyPlayRequest(currentToken, deviceId, uri);

    // 401 → refresh and retry once
    if (res.status === 401) {
      log("play_401_retry");
      try {
        currentToken = await refreshSpotifyToken();
        const { valid, premium } = await validateToken(currentToken);
        if (!valid) {
          log("play_retry_token_invalid");
          toast({ title: "Spotify Access Revoked", description: "Please reconnect from your Profile.", variant: "destructive" });
          clearState();
          return;
        }
        setToken(currentToken);
        setIsPremium(premium);
        setTokenExpiry(Date.now() + 3600 * 1000);

        if (!premium) {
          log("play_retry_not_premium");
          toast({ title: "Spotify Premium Required", description: "Your account no longer has Premium. Playback is unavailable.", variant: "destructive" });
          return;
        }

        res = await spotifyPlayRequest(currentToken, deviceId, uri);
      } catch {
        log("play_retry_refresh_failed");
        toast({ title: "Session Expired", description: "Could not refresh token. Please reconnect Spotify.", variant: "destructive" });
        clearState();
        return;
      }
    }

    if (res.status === 403) {
      const body = await res.json().catch(() => ({}));
      const reason = body?.error?.reason;
      log("play_403", { reason, body });
      if (reason === "PREMIUM_REQUIRED") {
        setIsPremium(false);
        toast({ title: "Spotify Premium Required", description: "This feature requires a Premium subscription.", variant: "destructive" });
      } else {
        toast({ title: "Playback Restricted", description: "This track is unavailable in your region or account.", variant: "destructive" });
      }
      return;
    }
    if (res.status === 404) {
      log("play_404_device_lost", { deviceId });
      
      // Try to transfer playback to our device and retry
      if (currentToken && deviceId) {
        try {
          log("play_404_transferring_device", { deviceId });
          await fetch("https://api.spotify.com/v1/me/player", {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${currentToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ device_ids: [deviceId], play: false }),
          });
          // Wait for transfer to complete
          await new Promise((r) => setTimeout(r, 1500));
          const retryRes = await spotifyPlayRequest(currentToken, deviceId, uri);
          if (retryRes.ok || retryRes.status === 204) {
            log("play_404_retry_success");
            stopPreview();
            setNowPlaying({ trackUri: uri, title, artist, cover });
            return;
          }
          log("play_404_retry_failed", { status: retryRes.status });
        } catch (e) {
          log("play_404_transfer_error", { error: String(e) });
        }
      }

      // Fallback: play 30s preview in-app
      const trackId = uri.replace("spotify:track:", "");
      if (currentToken) {
        const previewOk = await playPreview(trackId, uri, title, artist, cover, currentToken);
        if (previewOk) return;
      }
      
      // Last resort: set nowPlaying for "Open in Spotify" link
      setNowPlaying({ trackUri: uri, title, artist, cover });
      toast({
        title: "Preview Unavailable",
        description: "Tap the Spotify link to play this track in the Spotify app.",
      });
      return;
    }
    if (!res.ok) {
      const errBody = await res.text();
      log("play_error", { status: res.status, body: errBody });
      toast({ title: "Playback Error", description: "Could not start playback. Please try again.", variant: "destructive" });
      return;
    }

    log("play_started", { uri, title });
    stopPreview(); // Stop any preview when SDK playback starts
    setNowPlaying({ trackUri: uri, title, artist, cover });
  }, [deviceId, isPremium, ensureToken, spotifyPlayRequest, clearState, playPreview, stopPreview]);

  const togglePlayback = useCallback(async () => {
    // Handle preview audio toggle
    if (audioRef.current) {
      if (audioRef.current.paused) {
        await audioRef.current.play();
        setIsPlaying(true);
        progressInterval.current = setInterval(() => {
          if (audioRef.current) setProgress(audioRef.current.currentTime);
        }, 250);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
        if (progressInterval.current) clearInterval(progressInterval.current);
      }
      return;
    }
    // Handle SDK toggle
    if (!playerRef.current) return;
    log("toggle_playback", { wasPlaying: isPlaying });
    await playerRef.current.togglePlay();
  }, [isPlaying]);

  return (
    <SpotifyContext.Provider
      value={{
        token,
        isConnected: !!token,
        isPremium,
        deviceId,
        player: playerRef.current,
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
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
};
