import { useState } from "react";
import { Play, Pause, Lock, SkipBack, SkipForward } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import ExpandedPlayer from "@/components/ExpandedPlayer";
import album1 from "@/assets/album-1.jpg";

const MiniPlayer = () => {
  const { isConnected, nowPlaying, isPlaying, progress, duration, connect, togglePlayback, skipNext, skipPrev } = useSpotify();
  const [expanded, setExpanded] = useState(false);

  const cover = nowPlaying?.cover || album1;
  const title = nowPlaying?.title || "No track selected";
  const artist = nowPlaying?.artist || "Connect Spotify to play";
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <>
      <ExpandedPlayer open={expanded} onClose={() => setExpanded(false)} />

      <div className="fixed bottom-16 left-0 right-0 z-40">
        {/* Progress bar on top */}
        {nowPlaying && duration > 0 && (
          <div className="h-[2px] bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        <div
          className="glass border-t border-border cursor-pointer"
          onClick={() => nowPlaying ? setExpanded(true) : undefined}
        >
          <div className="px-3 py-2">
            <div className="max-w-lg mx-auto flex items-center gap-2">
              {/* Album art */}
              <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                <img src={cover} alt="Now playing" className="w-full h-full object-cover" />
              </div>

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{artist}</p>
              </div>

              {/* Controls */}
              {!isConnected ? (
                <button
                  onClick={(e) => { e.stopPropagation(); connect(); }}
                  className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground flex-shrink-0 active:scale-90 transition-transform shadow-md shadow-primary/20"
                >
                  <Lock size={14} />
                </button>
              ) : nowPlaying ? (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={skipPrev}
                    className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-90"
                  >
                    <SkipBack size={16} fill="currentColor" />
                  </button>
                  <button
                    onClick={togglePlayback}
                    className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground flex-shrink-0 active:scale-90 transition-transform shadow-md shadow-primary/20"
                  >
                    {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} className="ml-0.5" fill="currentColor" />}
                  </button>
                  <button
                    onClick={skipNext}
                    className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-90"
                  >
                    <SkipForward size={16} fill="currentColor" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MiniPlayer;
