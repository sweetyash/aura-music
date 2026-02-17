import { useRef, useState, useCallback } from "react";
import { mockTracks } from "@/data/tracks";
import { Heart, X, Play, Music, TrendingUp, Calendar } from "lucide-react";
import GlobalSearch from "@/components/GlobalSearch";

const SWIPE_THRESHOLD = 100;
const ROTATION_FACTOR = 0.12;

const langColors: Record<string, string> = {
  Telugu: "bg-amber-500/20 text-amber-400",
  Tamil: "bg-rose-500/20 text-rose-400",
  English: "bg-sky-500/20 text-sky-400",
};

const PopularityBar = ({ value }: { value: number }) => (
  <div className="flex items-center gap-2">
    <TrendingUp size={13} className="text-primary" />
    <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
      <div
        className="h-full rounded-full gradient-primary transition-all duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
    <span className="text-[11px] text-muted-foreground font-semibold tabular-nums">{value}%</span>
  </div>
);

const Discover = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const [searchActive, setSearchActive] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const track = mockTracks[currentIndex % mockTracks.length];
  const nextTrack = mockTracks[(currentIndex + 1) % mockTracks.length];

  const handleStart = useCallback((clientX: number, clientY: number) => {
    startPos.current = { x: clientX, y: clientY };
    setIsDragging(true);
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    setOffset({
      x: clientX - startPos.current.x,
      y: (clientY - startPos.current.y) * 0.3,
    });
  }, [isDragging]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    if (Math.abs(offset.x) > SWIPE_THRESHOLD) {
      const dir = offset.x > 0 ? "right" : "left";
      setExitDir(dir);
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        setOffset({ x: 0, y: 0 });
        setExitDir(null);
      }, 350);
    } else {
      setOffset({ x: 0, y: 0 });
    }
  }, [offset.x]);

  const swipeButton = (dir: "left" | "right") => {
    setExitDir(dir);
    setOffset({ x: dir === "right" ? 300 : -300, y: 0 });
    setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setOffset({ x: 0, y: 0 });
      setExitDir(null);
    }, 350);
  };

  const rotation = isDragging ? offset.x * ROTATION_FACTOR : exitDir === "right" ? 20 : exitDir === "left" ? -20 : 0;
  const likeOpacity = Math.min(Math.max(offset.x / SWIPE_THRESHOLD, 0), 1);
  const skipOpacity = Math.min(Math.max(-offset.x / SWIPE_THRESHOLD, 0), 1);

  const cardStyle = exitDir
    ? {
        transform: `translateX(${exitDir === "right" ? 600 : -600}px) rotate(${rotation}deg)`,
        transition: "transform 0.35s ease-out, opacity 0.35s ease-out",
        opacity: 0,
      }
    : {
        transform: `translateX(${offset.x}px) translateY(${offset.y}px) rotate(${offset.x * ROTATION_FACTOR}deg)`,
        transition: isDragging ? "none" : "transform 0.4s cubic-bezier(.17,.67,.2,1.2)",
      };

  return (
    <div className="flex flex-col items-center px-4 pt-6 pb-4 min-h-[calc(100vh-4rem)]">
      <h1 className="text-xl font-bold text-foreground mb-0.5">Discover</h1>
      <p className="text-sm text-muted-foreground mb-4">Swipe to find your next favorite</p>

      {/* Search */}
      <div className="w-full mb-4">
        <GlobalSearch active={searchActive} onActiveChange={setSearchActive} />
      </div>

      {searchActive ? null : (<>

      {/* Card Stack */}
      <div className="relative w-full max-w-[320px] aspect-[3/4.2] mb-6">
        {/* Background card (next) */}
        <div className="absolute inset-2 rounded-2xl overflow-hidden bg-card shadow-xl scale-[0.96] opacity-60">
          <img src={nextTrack.cover} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>

        {/* Active card */}
        <div
          ref={cardRef}
          className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing select-none z-10"
          style={cardStyle}
          onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={handleEnd}
          onMouseDown={(e) => { e.preventDefault(); handleStart(e.clientX, e.clientY); }}
          onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
          onMouseUp={handleEnd}
          onMouseLeave={() => { if (isDragging) handleEnd(); }}
        >
          <img src={track.cover} alt={track.album} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

          {/* Like / Skip overlays */}
          <div
            className="absolute top-6 left-5 z-20 px-4 py-2 rounded-xl border-[3px] border-primary text-primary font-black text-2xl -rotate-12 tracking-wider"
            style={{ opacity: likeOpacity }}
          >
            LIKE
          </div>
          <div
            className="absolute top-6 right-5 z-20 px-4 py-2 rounded-xl border-[3px] border-destructive text-destructive font-black text-2xl rotate-12 tracking-wider"
            style={{ opacity: skipOpacity }}
          >
            SKIP
          </div>

          {/* Info */}
          <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
            {/* Language tag */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${langColors[track.language] || "bg-secondary text-secondary-foreground"}`}>
                {track.language}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar size={11} />
                {track.year}
              </span>
            </div>

            <p className="text-2xl font-bold text-foreground leading-tight">{track.title}</p>
            <p className="text-sm text-muted-foreground mt-1 mb-3">{track.artist} · {track.album}</p>

            {/* Popularity */}
            <PopularityBar value={track.popularity} />

            {/* Preview button */}
            <div className="flex items-center gap-2 mt-3">
              <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shadow-lg shadow-primary/25">
                <Play size={15} className="text-primary-foreground ml-0.5" fill="currentColor" />
              </div>
              <span className="text-xs text-muted-foreground">Preview · {track.duration}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => swipeButton("left")}
          className="w-14 h-14 rounded-full border-2 border-destructive/40 flex items-center justify-center text-destructive hover:bg-destructive/10 transition-all active:scale-90"
        >
          <X size={26} />
        </button>
        <button
          onClick={() => swipeButton("right")}
          className="w-[68px] h-[68px] rounded-full gradient-primary flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-transform"
        >
          <Heart size={30} fill="currentColor" />
        </button>
        <button
          onClick={() => swipeButton("left")}
          className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-all active:scale-90"
        >
          <Music size={22} />
        </button>
      </div>
      </>)}
    </div>
  );
};

export default Discover;
