import { useState } from "react";
import { Play, Pause, ExternalLink, Lock, AlertTriangle } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import ExpandedPlayer from "@/components/ExpandedPlayer";
import album1 from "@/assets/album-1.jpg";

const MiniPlayer = () => {
  const { isConnected, isPremium, isPlaying, nowPlaying, connect, togglePlayback } = useSpotify();
  const [expanded, setExpanded] = useState(false);

  const cover = nowPlaying?.cover || album1;
  const title = nowPlaying?.title || "No track selected";
  const artist = nowPlaying?.artist || "Connect Spotify to play";
  const showPremiumWarning = false; // Embed works for all accounts
  const trackId = nowPlaying?.trackId || "";

  return (
    <>
      <ExpandedPlayer open={expanded} onClose={() => setExpanded(false)} />

      <div className="fixed bottom-16 left-0 right-0 z-40">
        <div className="glass border-t border-border cursor-pointer" onClick={() => setExpanded(true)}>
          <div className="px-3 py-2">
            <div className="max-w-lg mx-auto flex items-center gap-3">
              <img src={cover} alt="Now playing" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{artist}</p>
              </div>

              {!isConnected && (
                <button
                  onClick={(e) => { e.stopPropagation(); connect(); }}
                  className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground flex-shrink-0 active:scale-90 transition-transform shadow-md shadow-primary/20"
                >
                  <Lock size={14} />
                </button>
              )}

              <a
                href={trackId ? `https://open.spotify.com/track/${trackId}` : "https://open.spotify.com"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-secondary text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors flex-shrink-0"
              >
                <ExternalLink size={12} />
                <span className="hidden sm:inline">Spotify</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MiniPlayer;
