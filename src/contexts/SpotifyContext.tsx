import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { loginWithSpotify, refreshSpotifyToken, extractSpotifyTokenFromUrl } from "@/lib/spotify-auth";
import { toast } from "@/hooks/use-toast";

type SpotifyPlayer = any;

interface NowPlaying {
  trackUri: string;
  title: string;
  artist: string;
  cover: string;
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

export const SpotifyProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const tokenExpiresAt = useRef<number>(0);

  /** Clear all Spotify state */
  const clearState = useCallback(() => {
    log("state_cleared");
    playerRef.current?.disconnect();
    playerRef.current = null;
    setToken(null);
    setDeviceId(null);
    setPlayerReady(false);
    setIsPlaying(false);
    setIsPremium(null);
    setNowPlaying(null);
    tokenExpiresAt.current = 0;
  }, []);

  // On mount, check for callback token in URL and validate it
  useEffect(() => {
    const urlToken = extractSpotifyTokenFromUrl();
    if (!urlToken) return;

    // Set token immediately so the app becomes functional
    // Then validate in background
    log("token_received_from_url", { tokenLength: urlToken.length });
    setToken(urlToken);
    tokenExpiresAt.current = Date.now() + 3600 * 1000;

    validateToken(urlToken).then(({ valid, premium }) => {
      if (!valid) {
        log("initial_token_invalid");
        // Don't clear immediately — the token might still work for some endpoints
        // Only show a warning
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
      // Token was already set — don't block the user
    });
  }, []);

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
      tokenExpiresAt.current = Date.now() + 3600 * 1000;
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
          return;
        }
        const paused = state.paused;
        const trackName = state.track_window?.current_track?.name;
        log("playback_state", { paused, track: trackName });
        setIsPlaying(!paused);
      });

      player.connect();
      playerRef.current = player;
    };

    init();
    return () => {
      cancelled = true;
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
        tokenExpiresAt.current = Date.now() + 3600 * 1000;

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
      
      // Try to transfer playback to our device first, then play
      try {
        const transferRes = await fetch("https://api.spotify.com/v1/me/player", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ device_ids: [deviceId], play: false }),
        });
        log("transfer_playback", { status: transferRes.status });
        
        if (transferRes.ok || transferRes.status === 204) {
          // Wait for transfer to take effect
          await new Promise((r) => setTimeout(r, 1500));
          const retryRes = await spotifyPlayRequest(currentToken, deviceId, uri);
          if (retryRes.ok || retryRes.status === 204) {
            log("play_retry_after_transfer_success", { uri });
            setNowPlaying({ trackUri: uri, title, artist, cover });
            return;
          }
        }
      } catch (err) {
        log("transfer_failed", { error: String(err) });
      }
      
      // Fallback: set nowPlaying so user can open in Spotify
      setNowPlaying({ trackUri: uri, title, artist, cover });
      toast({
        title: "Opening in Spotify",
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
    setNowPlaying({ trackUri: uri, title, artist, cover });
  }, [deviceId, isPremium, ensureToken, spotifyPlayRequest, clearState]);

  const togglePlayback = useCallback(async () => {
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
