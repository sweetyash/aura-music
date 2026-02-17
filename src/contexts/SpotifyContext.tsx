import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { loginWithSpotify, refreshSpotifyToken, extractSpotifyTokenFromUrl } from "@/lib/spotify-auth";

interface SpotifyAuthCtx {
  token: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SpotifyContext = createContext<SpotifyAuthCtx>({
  token: null,
  isConnected: false,
  connect: async () => {},
  refresh: async () => {},
});

export const useSpotify = () => useContext(SpotifyContext);

export const SpotifyProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);

  // On mount, check for callback token in URL
  useEffect(() => {
    const urlToken = extractSpotifyTokenFromUrl();
    if (urlToken) setToken(urlToken);
  }, []);

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
    <SpotifyContext.Provider value={{ token, isConnected: !!token, connect, refresh }}>
      {children}
    </SpotifyContext.Provider>
  );
};
