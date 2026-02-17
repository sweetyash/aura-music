import { Play, Pause, ExternalLink, Lock } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import album1 from "@/assets/album-1.jpg";

const MiniPlayer = () => {
  const { isConnected, isPlaying, nowPlaying, playerReady, connect, togglePlayback } = useSpotify();

  const handlePlay = () => {
    if (!isConnected) {
      connect();
      return;
    }
    togglePlayback();
  };

  const cover = nowPlaying?.cover || album1;
  const title = nowPlaying?.title || "No track selected";
  const artist = nowPlaying?.artist || "Connect Spotify to play";

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40">
      <div className="glass border-t border-border px-3 py-2">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <img src={cover} alt="Now playing" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{title}</p>
            <p className="text-[11px] text-muted-foreground truncate">{artist}</p>
          </div>

          <button
            onClick={handlePlay}
            disabled={isConnected && !playerReady && !nowPlaying}
            className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground flex-shrink-0 active:scale-90 transition-transform shadow-md shadow-primary/20 disabled:opacity-50"
          >
            {!isConnected ? (
              <Lock size={14} />
            ) : isPlaying ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <a
            href={nowPlaying ? `https://open.spotify.com/track/${nowPlaying.trackUri.replace("spotify:track:", "")}` : "https://open.spotify.com"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-secondary text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors flex-shrink-0"
          >
            <ExternalLink size={12} />
            <span className="hidden sm:inline">Spotify</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
