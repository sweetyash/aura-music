import { useState, useRef, useCallback } from "react";
import { ChevronDown, Heart, ExternalLink, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, ListMusic } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import album1 from "@/assets/album-1.jpg";

interface ExpandedPlayerProps {
  open: boolean;
  onClose: () => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const ExpandedPlayer = ({ open, onClose }: ExpandedPlayerProps) => {
  const {
    nowPlaying, isPlaying, progress, duration,
    togglePlayback, seek, skipNext, skipPrev,
    shuffleOn, repeatOn, toggleShuffle, toggleRepeat,
    queue, queueIndex, playTrackWithQueue,
  } = useSpotify();
  const [liked, setLiked] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isSeeking = useRef(false);

  const seekFromClientX = useCallback((clientX: number) => {
    if (!duration || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const percent = x / rect.width;
    seek(percent * duration);
  }, [duration, seek]);

  if (!open) return null;

  const cover = nowPlaying?.cover || album1;
  const title = nowPlaying?.title || "No track selected";
  const artist = nowPlaying?.artist || "Connect Spotify";
  const trackId = nowPlaying?.trackId || "";
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    seekFromClientX(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    isSeeking.current = true;
    seekFromClientX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isSeeking.current) return;
    e.preventDefault();
    seekFromClientX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    isSeeking.current = false;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in slide-in-from-bottom duration-300">
      {/* Background blur cover */}
      <div className="absolute inset-0 overflow-hidden">
        <img src={cover} alt="" className="w-full h-full object-cover scale-110 blur-3xl opacity-25" />
        <div className="absolute inset-0 bg-background/75" />
      </div>

      {/* Queue panel overlay */}
      {showQueue && (
        <div className="absolute inset-0 z-20 bg-background/95 flex flex-col">
          <div className="flex items-center justify-between px-6 pt-6 pb-3">
            <h3 className="text-base font-bold text-foreground">Up Next</h3>
            <button onClick={() => setShowQueue(false)} className="p-2 rounded-full hover:bg-secondary/60 text-muted-foreground">
              <ChevronDown size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-8">
            {queue.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center mt-8">No queue</p>
            ) : (
              queue.map((t, i) => (
                <div
                  key={i}
                  onClick={() => playTrackWithQueue(queue, i)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-colors cursor-pointer ${
                    i === queueIndex
                      ? "bg-primary/15 border border-primary/30"
                      : "hover:bg-secondary/60 active:scale-[0.98]"
                  }`}
                >
                  <img src={t.cover} alt={t.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${i === queueIndex ? "text-primary" : "text-foreground"}`}>{t.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.artist}</p>
                  </div>
                  {i === queueIndex ? (
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map(bar => (
                        <div
                          key={bar}
                          className="w-1 rounded-full bg-primary animate-bounce"
                          style={{ height: `${12 + bar * 4}px`, animationDelay: `${bar * 0.15}s` }}
                        />
                      ))}
                    </div>
                  ) : (
                    <Play size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative flex flex-col flex-1 px-6 pt-4 pb-8 max-w-lg mx-auto w-full z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-secondary/60 transition-colors">
            <ChevronDown size={24} className="text-foreground" />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Now Playing</p>
            {queue.length > 1 && (
              <p className="text-[10px] text-muted-foreground">{queueIndex + 1} / {queue.length}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowQueue(!showQueue)}
              className="p-2 rounded-full hover:bg-secondary/60 transition-colors"
            >
              <ListMusic size={18} className={showQueue ? "text-primary" : "text-muted-foreground"} />
            </button>
            <a
              href={trackId ? `https://open.spotify.com/track/${trackId}` : "https://open.spotify.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-secondary/60 transition-colors"
            >
              <ExternalLink size={18} className="text-muted-foreground" />
            </a>
          </div>
        </div>

        {/* Album Art */}
        <div className="flex items-center justify-center flex-1 mb-5">
          <div
            className="w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-black/60 transition-transform duration-300"
            style={{ transform: isPlaying ? "scale(1.04)" : "scale(0.96)" }}
          >
            <img
              src={cover}
              alt={title}
              className="w-full h-full object-cover"
              style={{ filter: isPlaying ? "brightness(1.05) saturate(1.1)" : "brightness(0.85) saturate(0.9)" }}
            />
          </div>
        </div>

        {/* Track Info */}
        <div className="mb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-foreground truncate">{title}</h2>
              <p className="text-sm text-muted-foreground truncate mt-0.5">{artist}</p>
            </div>
            <button
              onClick={() => setLiked(!liked)}
              className="p-2 flex-shrink-0 transition-transform active:scale-75"
            >
              <Heart
                size={22}
                className={liked ? "text-primary" : "text-muted-foreground"}
                fill={liked ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div
            ref={progressBarRef}
            className="relative h-5 flex items-center cursor-pointer group touch-none"
            onClick={handleSeek}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="absolute inset-x-0 h-2 rounded-full bg-secondary/60 top-1/2 -translate-y-1/2">
              <div
                className="h-full rounded-full bg-primary relative"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-md opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] text-muted-foreground tabular-nums">{formatTime(progress)}</span>
            <span className="text-[11px] text-muted-foreground tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          {/* Shuffle */}
          <button
            onClick={toggleShuffle}
            className={`p-2 transition-colors relative ${shuffleOn ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Shuffle size={20} />
            {shuffleOn && <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
          </button>

          {/* Skip Prev */}
          <button
            onClick={skipPrev}
            className="p-2 text-foreground hover:text-primary transition-colors active:scale-90"
          >
            <SkipBack size={28} fill="currentColor" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlayback}
            className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/30 active:scale-95 transition-transform"
          >
            {isPlaying
              ? <Pause size={28} fill="currentColor" />
              : <Play size={28} className="ml-1" fill="currentColor" />
            }
          </button>

          {/* Skip Next */}
          <button
            onClick={skipNext}
            className="p-2 text-foreground hover:text-primary transition-colors active:scale-90"
          >
            <SkipForward size={28} fill="currentColor" />
          </button>

          {/* Repeat */}
          <button
            onClick={toggleRepeat}
            className={`p-2 transition-colors relative ${repeatOn ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Repeat size={20} />
            {repeatOn && <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpandedPlayer;
