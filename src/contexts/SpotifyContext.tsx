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

  useEffect(() => {
    const urlToken = extractSpotifyTokenFromUrl();
    if (urlToken) setToken(urlToken);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const init = async () => {
      await loadSpotifySdk();
      if (cancelled) return;

      const player = new window.Spotify.Player({
        name: "Lovable Music Player",
        getOAuthToken: (cb: (t: string) => void) => cb(token),
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
    } catch {
      setToken(null);
    }
  }, []);

  const playTrack = useCallback(async (uri: string, title: string, artist: string, cover: string) => {
    if (!token || !deviceId) {
      toast({ title: "Player not ready", description: "Please wait for Spotify to connect or log in first.", variant: "destructive" });
      return;
    }

    const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: [uri] }),
    });

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
  }, [token, deviceId]);

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
