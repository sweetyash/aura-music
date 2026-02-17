import { useState, useEffect, useRef } from "react";
import { Play, Pause, ExternalLink } from "lucide-react";
import album1 from "@/assets/album-1.jpg";

const PREVIEW_DURATION = 30;

const MiniPlayer = () => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= PREVIEW_DURATION) {
            setPlaying(false);
            return 0;
          }
          return p + 0.1;
        });
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing]);

  const pct = (progress / PREVIEW_DURATION) * 100;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40">
      {/* Progress bar on top edge */}
      <div className="h-[2px] bg-secondary">
        <div className="h-full gradient-primary transition-all duration-100" style={{ width: `${pct}%` }} />
      </div>

      <div className="glass border-t border-border px-3 py-2">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {/* Album art */}
          <img src={album1} alt="Now playing" className="w-10 h-10 rounded-md object-cover flex-shrink-0" />

          {/* Track info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">Nee Kannu Neeli Samudram</p>
            <p className="text-[11px] text-muted-foreground truncate">Anup Rubens</p>
          </div>

          {/* Play / Pause */}
          <button
            onClick={() => setPlaying(!playing)}
            className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground flex-shrink-0 active:scale-90 transition-transform shadow-md shadow-primary/20"
          >
            {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>

          {/* Open in Spotify */}
          <a
            href="https://open.spotify.com"
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
