import { useState } from "react";
import { ChevronDown, Play, Pause, Heart, ExternalLink, SkipBack, SkipForward } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import album1 from "@/assets/album-1.jpg";

interface ExpandedPlayerProps {
  open: boolean;
  onClose: () => void;
}

const ExpandedPlayer = ({ open, onClose }: ExpandedPlayerProps) => {
  const { isPlaying, nowPlaying, progress, duration, togglePlayback } = useSpotify();
  const [liked, setLiked] = useState(false);

  if (!open) return null;

  const cover = nowPlaying?.cover || album1;
  const title = nowPlaying?.title || "No track selected";
  const artist = nowPlaying?.artist || "Connect Spotify";
  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const trackId = nowPlaying?.trackUri?.replace("spotify:track:", "") || "";

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
        <div className="flex items-center justify-between mb-8">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-secondary/60 transition-colors">
            <ChevronDown size={24} className="text-foreground" />
          </button>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {nowPlaying?.previewMode ? "Preview" : "Now Playing"}
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
        <div className="flex-1 flex items-center justify-center mb-8">
          <div className="w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
            <img src={cover} alt={title} className="w-full h-full object-cover" />
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

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="h-1 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full gradient-primary transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] text-muted-foreground tabular-nums">{formatTime(progress)}</span>
            <span className="text-[11px] text-muted-foreground tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-8">
          <button className="p-3 text-muted-foreground hover:text-foreground transition-colors">
            <SkipBack size={24} fill="currentColor" />
          </button>
          <button
            onClick={togglePlayback}
            className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/30 active:scale-95 transition-transform"
          >
            {isPlaying ? (
              <Pause size={28} fill="currentColor" />
            ) : (
              <Play size={28} fill="currentColor" className="ml-1" />
            )}
          </button>
          <button className="p-3 text-muted-foreground hover:text-foreground transition-colors">
            <SkipForward size={24} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpandedPlayer;
