import { useState } from "react";
import { mockTracks, Track } from "@/data/tracks";
import { Heart, X, Play, SkipForward } from "lucide-react";

const Discover = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  const track = mockTracks[currentIndex % mockTracks.length];

  const handleSwipe = (dir: "left" | "right") => {
    setDirection(dir);
    setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setDirection(null);
    }, 300);
  };

  return (
    <div className="flex flex-col items-center px-4 pt-6 pb-4 min-h-[calc(100vh-4rem)]">
      <h1 className="text-xl font-bold text-foreground mb-1">Discover</h1>
      <p className="text-sm text-muted-foreground mb-6">Swipe to find your next favorite</p>

      {/* Card */}
      <div className="relative w-full max-w-xs aspect-[3/4] mb-8">
        <div
          className={`absolute inset-0 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
            direction === "left"
              ? "-translate-x-full rotate-[-15deg] opacity-0"
              : direction === "right"
              ? "translate-x-full rotate-[15deg] opacity-0"
              : "animate-slide-up"
          }`}
        >
          <img src={track.cover} alt={track.album} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="text-2xl font-bold text-foreground">{track.title}</p>
            <p className="text-sm text-muted-foreground mt-1">{track.artist} · {track.album}</p>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                <Play size={14} className="text-primary-foreground ml-0.5" fill="currentColor" />
              </div>
              <span className="text-xs text-muted-foreground">Preview</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => handleSwipe("left")}
          className="w-14 h-14 rounded-full border-2 border-destructive/50 flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
        >
          <X size={24} />
        </button>
        <button
          onClick={() => handleSwipe("right")}
          className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
        >
          <Heart size={28} fill="currentColor" />
        </button>
        <button
          onClick={() => handleSwipe("left")}
          className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
        >
          <SkipForward size={22} />
        </button>
      </div>
    </div>
  );
};

export default Discover;
