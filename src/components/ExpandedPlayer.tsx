import { useState } from "react";
import { ChevronDown, Heart, ExternalLink, Play, Pause, SkipBack, SkipForward, Music } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import album1 from "@/assets/album-1.jpg";

interface ExpandedPlayerProps {
  open: boolean;
  onClose: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const ExpandedPlayer = ({ open, onClose }: ExpandedPlayerProps) => {
  const { nowPlaying, isPlaying, progress, duration, togglePlayback, seek } = useSpotify();
  const [liked, setLiked] = useState(false);

  if (!open) return null;

  const cover = nowPlaying?.cover || album1;
  const title = nowPlaying?.title || "No track selected";
  const artist = nowPlaying?.artist || "Connect Spotify";
  const trackId = nowPlaying?.trackId || "";
  const hasPreview = !!nowPlaying?.previewUrl;
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    seek(percent * duration);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in slide-in-from-bottom duration-300">
      {/* Background blur cover */}
      <div className="absolute inset-0 overflow-hidden">
        <img src={cover} alt="" className="w-full h-full object-cover scale-110 blur-3xl opacity-30" />
        <div className="absolute inset-0 bg-background/70" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col flex-1 px-6 pt-4 pb-8 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-secondary/60 transition-colors">
            <ChevronDown size={24} className="text-foreground" />
          </button>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Now Playing
          </p>
          <a
            href={trackId ? `https://open.spotify.com/track/${trackId}` : "https://open.spotify.com"}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 -mr-2 rounded-full hover:bg-secondary/60 transition-colors"
          >
            <ExternalLink size={20} className="text-muted-foreground" />
          </a>
        </div>

        {/* Album Art */}
        <div className="flex items-center justify-center flex-1 mb-6">
          <div className="w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
            <img src={cover} alt={title} className="w-full h-full object-cover discover-card-art" />
            <div className="discover-card-glow" />
          </div>
        </div>

        {/* Track Info */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-foreground truncate">{title}</h2>
              <p className="text-sm text-muted-foreground truncate mt-0.5">{artist}</p>
            </div>
            <button onClick={() => setLiked(!liked)} className="p-2 flex-shrink-0">
              <Heart
                size={22}
                className={liked ? "text-primary" : "text-muted-foreground"}
                fill={liked ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div
            className="h-1.5 rounded-full bg-secondary cursor-pointer"
            onClick={handleSeek}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-200 relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary shadow-md" />
            </div>
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] text-muted-foreground tabular-nums">{formatTime(progress)}</span>
            <span className="text-[11px] text-muted-foreground tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-8 mb-4">
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <SkipBack size={24} fill="currentColor" />
          </button>

          {hasPreview ? (
            <button
              onClick={togglePlayback}
              className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/30 active:scale-95 transition-transform"
            >
              {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} className="ml-1" fill="currentColor" />}
            </button>
          ) : (
            <div className="w-16 h-16 rounded-full bg-secondary flex flex-col items-center justify-center">
              <Music size={20} className="text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground mt-0.5">No preview</span>
            </div>
          )}

          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <SkipForward size={24} fill="currentColor" />
          </button>
        </div>

        {!hasPreview && nowPlaying && (
          <p className="text-xs text-muted-foreground text-center">
            Preview not available · <a href={`https://open.spotify.com/track/${trackId}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">Listen on Spotify</a>
          </p>
        )}
      </div>
    </div>
  );
};

export default ExpandedPlayer;
