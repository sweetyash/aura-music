import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { loginWithSpotify, refreshSpotifyToken, extractSpotifyTokenFromUrl } from "@/lib/spotify-auth";

// Use any for the SDK player type since Spotify types are loaded at runtime
type SpotifyPlayer = any;

interface SpotifyAuthCtx {
  token: string | null;
  isConnected: boolean;
  deviceId: string | null;
  player: SpotifyPlayer | null;
  playerReady: boolean;
  connect: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SpotifyContext = createContext<SpotifyAuthCtx>({
  token: null,
  isConnected: false,
  deviceId: null,
  player: null,
  playerReady: false,
  connect: async () => {},
  refresh: async () => {},
});

export const useSpotify = () => useContext(SpotifyContext);

/** Dynamically inject the Spotify Web Playback SDK script once */
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
  const playerRef = useRef<SpotifyPlayer | null>(null);

  // On mount, check for callback token in URL
  useEffect(() => {
    const urlToken = extractSpotifyTokenFromUrl();
    if (urlToken) setToken(urlToken);
  }, []);

  // Initialize Web Playback SDK when token is available
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

      // Error handling
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
      });
      player.addListener("playback_error", ({ message }: { message: string }) => {
        console.error("[Spotify] Playback error:", message);
      });

      // Ready
      player.addListener("ready", ({ device_id }: { device_id: string }) => {
        console.log("[Spotify] Player ready, device:", device_id);
        setDeviceId(device_id);
        setPlayerReady(true);
      });

      player.addListener("not_ready", ({ device_id }: { device_id: string }) => {
        console.log("[Spotify] Player not ready, device:", device_id);
        setPlayerReady(false);
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

  return (
    <SpotifyContext.Provider
      value={{
        token,
        isConnected: !!token,
        deviceId,
        player: playerRef.current,
        playerReady,
        connect,
        refresh,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
};
