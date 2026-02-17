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

/** Validate token and check Premium status via Spotify /v1/me */
async function validateToken(accessToken: string): Promise<{ valid: boolean; premium: boolean }> {
  try {
    const res = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401 || res.status === 403) {
      return { valid: false, premium: false };
    }
    if (!res.ok) {
      return { valid: false, premium: false };
    }
    const data = await res.json();
    return { valid: true, premium: data.product === "premium" };
  } catch {
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

    validateToken(urlToken).then(({ valid, premium }) => {
      if (!valid) {
        toast({
          title: "Spotify Login Failed",
          description: "The access token is invalid or permissions were revoked. Please try again.",
          variant: "destructive",
        });
        return;
      }
      setToken(urlToken);
      setIsPremium(premium);
      tokenExpiresAt.current = Date.now() + 3600 * 1000;

      if (!premium) {
        toast({
          title: "Spotify Premium Required",
          description: "Full playback requires a Spotify Premium account. You can still browse and discover music.",
          variant: "destructive",
        });
      }
    });
  }, []);

  /** Returns a valid token, refreshing first if expired */
  const ensureToken = useCallback(async (): Promise<string | null> => {
    if (token && tokenExpiresAt.current > Date.now() + 60_000) {
      return token;
    }
    try {
      const freshToken = await refreshSpotifyToken();
      // Validate the refreshed token
      const { valid, premium } = await validateToken(freshToken);
      if (!valid) {
        toast({
          title: "Spotify Permissions Revoked",
          description: "Your Spotify access was revoked. Please reconnect.",
          variant: "destructive",
        });
        clearState();
        return null;
      }
      setToken(freshToken);
      setIsPremium(premium);
      tokenExpiresAt.current = Date.now() + 3600 * 1000;
      return freshToken;
    } catch {
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
        console.error("[Spotify] Initialization error:", message);
      });

      player.addListener("authentication_error", ({ message }: { message: string }) => {
        console.error("[Spotify] Auth error:", message);
        toast({
          title: "Spotify Access Revoked",
          description: "Your Spotify session is no longer valid. Please reconnect from your Profile.",
          variant: "destructive",
        });
        clearState();
      });

      player.addListener("account_error", ({ message }: { message: string }) => {
        console.error("[Spotify] Account error:", message);
        setIsPremium(false);
        toast({
          title: "Spotify Premium Required",
          description: "Full playback requires a Spotify Premium subscription. Upgrade at spotify.com/premium.",
          variant: "destructive",
        });
      });

      player.addListener("playback_error", ({ message }: { message: string }) => {
        console.error("[Spotify] Playback error:", message);
      });

      player.addListener("ready", ({ device_id }: { device_id: string }) => {
        console.log("[Spotify] Player ready, device:", device_id);
        setDeviceId(device_id);
        setPlayerReady(true);
      });

      player.addListener("not_ready", () => setPlayerReady(false));

      player.addListener("player_state_changed", (state: any) => {
        if (!state) {
          setIsPlaying(false);
          return;
        }
        setIsPlaying(!state.paused);
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
    // Premium gate
    if (isPremium === false) {
      toast({
        title: "Spotify Premium Required",
        description: "Full track playback needs a Premium subscription. Visit spotify.com/premium to upgrade.",
        variant: "destructive",
      });
      return;
    }

    if (!deviceId) {
      toast({ title: "Player not ready", description: "Please wait for Spotify to connect or log in first.", variant: "destructive" });
      return;
    }

    let currentToken = await ensureToken();
    if (!currentToken) {
      toast({ title: "Session Expired", description: "Please reconnect Spotify from your Profile.", variant: "destructive" });
      return;
    }

    let res = await spotifyPlayRequest(currentToken, deviceId, uri);

    // 401 → refresh and retry once
    if (res.status === 401) {
      console.log("[Spotify] Token expired during playback, refreshing…");
      try {
        currentToken = await refreshSpotifyToken();
        const { valid, premium } = await validateToken(currentToken);
        if (!valid) {
          toast({ title: "Spotify Access Revoked", description: "Please reconnect from your Profile.", variant: "destructive" });
          clearState();
          return;
        }
        setToken(currentToken);
        setIsPremium(premium);
        tokenExpiresAt.current = Date.now() + 3600 * 1000;

        if (!premium) {
          toast({ title: "Spotify Premium Required", description: "Your account no longer has Premium. Playback is unavailable.", variant: "destructive" });
          return;
        }

        res = await spotifyPlayRequest(currentToken, deviceId, uri);
      } catch {
        toast({ title: "Session Expired", description: "Could not refresh token. Please reconnect Spotify.", variant: "destructive" });
        clearState();
        return;
      }
    }

    if (res.status === 403) {
      const body = await res.json().catch(() => ({}));
      const reason = body?.error?.reason;
      if (reason === "PREMIUM_REQUIRED") {
        setIsPremium(false);
        toast({ title: "Spotify Premium Required", description: "This feature requires a Premium subscription.", variant: "destructive" });
      } else {
        toast({ title: "Playback Restricted", description: "This track is unavailable in your region or account.", variant: "destructive" });
      }
      return;
    }
    if (res.status === 404) {
      toast({ title: "Device Not Found", description: "The player device was lost. Reconnecting…", variant: "destructive" });
      playerRef.current?.connect();
      return;
    }
    if (!res.ok) {
      await res.text();
      toast({ title: "Playback Error", description: "Could not start playback. Please try again.", variant: "destructive" });
      return;
    }

    setNowPlaying({ trackUri: uri, title, artist, cover });
  }, [deviceId, isPremium, ensureToken, spotifyPlayRequest, clearState]);

  const togglePlayback = useCallback(async () => {
    if (!playerRef.current) return;
    await playerRef.current.togglePlay();
  }, []);

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
