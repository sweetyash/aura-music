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
  deviceId: string | null;
  player: SpotifyPlayer | null;
  playerReady: boolean;
  isPlaying: boolean;
  nowPlaying: NowPlaying | null;
  connect: () => Promise<void>;
  refresh: () => Promise<void>;
  playTrack: (uri: string, title: string, artist: string, cover: string) => Promise<void>;
  togglePlayback: () => Promise<void>;
}

const SpotifyContext = createContext<SpotifyAuthCtx>({
  token: null,
  isConnected: false,
  deviceId: null,
  player: null,
  playerReady: false,
  isPlaying: false,
  nowPlaying: null,
  connect: async () => {},
  refresh: async () => {},
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

export const SpotifyProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const tokenExpiresAt = useRef<number>(0); // epoch ms

  useEffect(() => {
    const urlToken = extractSpotifyTokenFromUrl();
    if (urlToken) {
      setToken(urlToken);
      // Assume tokens from callback last ~1 hour
      tokenExpiresAt.current = Date.now() + 3600 * 1000;
    }
  }, []);

  /** Returns a valid token, refreshing first if expired */
  const ensureToken = useCallback(async (): Promise<string | null> => {
    // If token exists and not expiring within 60s, use it
    if (token && tokenExpiresAt.current > Date.now() + 60_000) {
      return token;
    }
    // Attempt refresh
    try {
      const data = await refreshSpotifyToken();
      // refreshSpotifyToken returns access_token; edge fn also returns expires_in
      setToken(data);
      tokenExpiresAt.current = Date.now() + 3600 * 1000;
      return data;
    } catch {
      setToken(null);
      tokenExpiresAt.current = 0;
      return null;
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const init = async () => {
      await loadSpotifySdk();
      if (cancelled) return;

      const player = new window.Spotify.Player({
        name: "Lovable Music Player",
        getOAuthToken: async (cb: (t: string) => void) => {
          // SDK calls this when it needs a token — auto-refresh here
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
        setToken(null);
        setPlayerReady(false);
      });
      player.addListener("account_error", ({ message }: { message: string }) => {
        console.error("[Spotify] Account error (Premium required):", message);
        toast({ title: "Spotify Premium Required", description: "A Spotify Premium account is needed for playback.", variant: "destructive" });
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
  }, [token]);

  const connect = useCallback(async () => {
    await loginWithSpotify();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const newToken = await refreshSpotifyToken();
      setToken(newToken);
      tokenExpiresAt.current = Date.now() + 3600 * 1000;
    } catch {
      setToken(null);
      tokenExpiresAt.current = 0;
    }
  }, []);

  /** Call Spotify play API with auto-refresh + one retry on 401 */
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
    if (!deviceId) {
      toast({ title: "Player not ready", description: "Please wait for Spotify to connect or log in first.", variant: "destructive" });
      return;
    }

    // Get a fresh token before playback
    let currentToken = await ensureToken();
    if (!currentToken) {
      toast({ title: "Session Expired", description: "Please log in with Spotify again.", variant: "destructive" });
      return;
    }

    let res = await spotifyPlayRequest(currentToken, deviceId, uri);

    // If 401, refresh and retry once
    if (res.status === 401) {
      console.log("[Spotify] Token expired during playback, refreshing…");
      try {
        currentToken = await refreshSpotifyToken();
        setToken(currentToken);
        tokenExpiresAt.current = Date.now() + 3600 * 1000;
        res = await spotifyPlayRequest(currentToken, deviceId, uri);
      } catch {
        toast({ title: "Session Expired", description: "Could not refresh token. Please log in again.", variant: "destructive" });
        setToken(null);
        return;
      }
    }

    if (res.status === 403) {
      toast({ title: "Playback Restricted", description: "Spotify Premium is required, or the track is unavailable.", variant: "destructive" });
      return;
    }
    if (res.status === 404) {
      toast({ title: "Device Not Found", description: "The player device was lost. Reconnecting…", variant: "destructive" });
      playerRef.current?.connect();
      return;
    }
    if (!res.ok) {
      const err = await res.text();
      console.error("[Spotify] Play error:", res.status, err);
      toast({ title: "Playback Error", description: "Could not start playback. Please try again.", variant: "destructive" });
      return;
    }

    setNowPlaying({ trackUri: uri, title, artist, cover });
  }, [deviceId, ensureToken, spotifyPlayRequest]);

  const togglePlayback = useCallback(async () => {
    if (!playerRef.current) return;
    await playerRef.current.togglePlay();
  }, []);

  return (
    <SpotifyContext.Provider
      value={{
        token,
        isConnected: !!token,
        deviceId,
        player: playerRef.current,
        playerReady,
        isPlaying,
        nowPlaying,
        connect,
        refresh,
        playTrack,
        togglePlayback,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
};
