import { useRef, useState, useCallback, useEffect } from "react";
import { Heart, X, Play, Pause, Music, TrendingUp, Lock, Loader2, RefreshCw, Disc } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import { useSpotifyApi, SpotifyTrack, getTrackCover, formatDuration } from "@/hooks/useSpotifyApi";
import GlobalSearch from "@/components/GlobalSearch";

const SWIPE_THRESHOLD = 100;
const ROTATION_FACTOR = 0.12;

interface DiscoverCard {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: string;
  popularity: number;
  uri: string;
  year: number;
}

function trackToCard(t: SpotifyTrack): DiscoverCard {
  return {
    id: t.id,
    title: t.name,
    artist: t.artists?.map((a) => a.name).join(", ") || "Unknown",
    album: t.album?.name || "",
    cover: getTrackCover(t),
    duration: formatDuration(t.duration_ms),
    popularity: t.popularity || 0,
    uri: t.uri,
    year: (t.album as any)?.release_date ? parseInt((t.album as any).release_date) : 0,
  };
}

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
  const { isConnected, playerReady, isPlaying, nowPlaying, connect, playTrack, togglePlayback } = useSpotify();
  const { getTopTracks, getRecommendations, getTopArtists, saveTrack, search } = useSpotifyApi();
  const [cards, setCards] = useState<DiscoverCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const [searchActive, setSearchActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);

  // Fetch personalized recommendations
  const fetchCards = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      // Get user's top tracks and artists for seeds
      const [topTracksRes, topArtistsRes] = await Promise.all([
        getTopTracks("short_term", 5).catch(() => ({ items: [] })),
        getTopArtists("short_term", 5).catch(() => ({ items: [] })),
      ]);

      const topTracks: SpotifyTrack[] = topTracksRes?.items || [];
      const topArtists = topArtistsRes?.items || [];

      const seedTrackIds = topTracks.slice(0, 3).map((t) => t.id);
      const seedArtistIds = topArtists.slice(0, 2).map((a: any) => a.id);

      // Try recommendations first
      const recsRes = await getRecommendations(seedTrackIds, seedArtistIds, 30).catch(() => ({ tracks: [] }));
      const recTracks: SpotifyTrack[] = recsRes?.tracks || [];

      if (recTracks.length > 0) {
        const shuffled = recTracks.sort(() => Math.random() - 0.5);
        setCards(shuffled.map(trackToCard));
      } else if (topTracks.length > 0) {
        // Fallback to top tracks
        setCards(topTracks.map(trackToCard));
      } else {
        // Fallback: search for popular tracks across multiple queries
        const queries = ["top hits 2025", "trending music", "popular songs", "new music friday", "viral hits", "bollywood hits"];
        const picked = queries.sort(() => Math.random() - 0.5).slice(0, 2);
        const results = await Promise.all(
          picked.map((q) => search(q, "track", 10).catch(() => ({ tracks: { items: [] } })))
        );

        const allTracks: SpotifyTrack[] = results
          .flatMap((r) => r?.tracks?.items || [])
          .filter((t: any, i: number, arr: any[]) => arr.findIndex((a: any) => a.id === t.id) === i)
          .sort(() => Math.random() - 0.5);

        if (allTracks.length > 0) {
          setCards(allTracks.map(trackToCard));
        }
      }
      setCurrentIndex(0);
    } catch (err) {
      console.error("Discover fetch error:", err);
    }
    setLoading(false);
  }, [isConnected, getTopTracks, getTopArtists, getRecommendations, search]);

  useEffect(() => {
    if (isConnected && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchCards();
    }
    if (!isConnected) {
      fetchedRef.current = false;
      setCards([]);
    }
  }, [isConnected, fetchCards]);

  const card = cards[currentIndex];
  const nextCard = cards[currentIndex + 1];

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
      // If swiped right (liked), save the track
      if (dir === "right" && card) {
        saveTrack(card.id).catch(() => {});
      }
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        setOffset({ x: 0, y: 0 });
        setExitDir(null);
      }, 350);
    } else {
      setOffset({ x: 0, y: 0 });
    }
  }, [offset.x, card, saveTrack]);

  const swipeButton = (dir: "left" | "right") => {
    if (dir === "right" && card) {
      saveTrack(card.id).catch(() => {});
    }
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

  // Not connected state
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center px-4 pt-6 pb-4 min-h-[calc(100vh-4rem)]">
        <h1 className="text-xl font-bold text-foreground mb-0.5">Discover</h1>
        <p className="text-sm text-muted-foreground mb-6">Connect Spotify to get personalized suggestions</p>
        <div className="flex flex-col items-center justify-center flex-1">
          <Music size={48} className="text-muted-foreground/30 mb-4" />
          <button
            onClick={connect}
            className="px-8 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20"
          >
            Login with Spotify
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 pt-6 pb-4 min-h-[calc(100vh-4rem)]">
      <h1 className="text-xl font-bold text-foreground mb-0.5">Discover</h1>
      <p className="text-sm text-muted-foreground mb-4">Personalized picks just for you</p>

      {/* Search */}
      <div className="w-full mb-4">
        <GlobalSearch active={searchActive} onActiveChange={setSearchActive} />
      </div>

      {searchActive ? null : (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Loading your recommendations...</p>
            </div>
          ) : !card ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Music size={48} className="text-muted-foreground/30 mb-4" />
              <p className="text-base font-semibold text-foreground mb-1">No more cards!</p>
              <p className="text-sm text-muted-foreground mb-4">Refresh for new suggestions</p>
              <button
                onClick={() => { fetchedRef.current = false; fetchCards(); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20"
              >
                <RefreshCw size={16} />
                Get More
              </button>
            </div>
          ) : (
            <>
              {/* Card Stack */}
              <div className="relative w-full max-w-[320px] aspect-[3/4.2] mb-6">
                {/* Background card (next) */}
                {nextCard && (
                  <div className="absolute inset-2 rounded-2xl overflow-hidden bg-card shadow-xl scale-[0.96] opacity-60">
                    <img src={nextCard.cover} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  </div>
                )}

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
                  {/* Animated album art - Ken Burns effect */}
                  <img src={card.cover} alt={card.album} className="w-full h-full object-cover discover-card-art" />
                  {/* Shimmer glow overlay */}
                  <div className="discover-card-glow" />
                  {/* Gradient overlay for text readability */}
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
                    <p className="text-2xl font-bold text-foreground leading-tight">{card.title}</p>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">{card.artist} · {card.album}</p>

                    {/* Popularity */}
                    <PopularityBar value={card.popularity} />

                    {/* Play/Pause button + vinyl disc */}
                    {(() => {
                      const isCurrentTrackPlaying = isPlaying && nowPlaying?.trackUri === card.uri;
                      return (
                        <div className="flex items-center gap-3 mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isCurrentTrackPlaying) {
                                togglePlayback();
                              } else {
                                playTrack(card.uri, card.title, card.artist, card.cover);
                              }
                            }}
                            className="flex items-center gap-2"
                          >
                            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shadow-lg shadow-primary/25">
                              {!playerReady ? (
                                <Lock size={14} className="text-primary-foreground" />
                              ) : isCurrentTrackPlaying ? (
                                <Pause size={15} className="text-primary-foreground" fill="currentColor" />
                              ) : (
                                <Play size={15} className="text-primary-foreground ml-0.5" fill="currentColor" />
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {!playerReady ? "Connecting…" : isCurrentTrackPlaying ? `Playing · ${card.duration}` : `Play · ${card.duration}`}
                            </span>
                          </button>
                          {/* Vinyl disc indicator */}
                          {isCurrentTrackPlaying && (
                            <Disc size={20} className="text-primary discover-vinyl" />
                          )}
                        </div>
                      );
                    })()}
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
                  onClick={() => { fetchedRef.current = false; fetchCards(); }}
                  className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center text-muted-foreground hover:bg-secondary transition-all active:scale-90"
                >
                  <RefreshCw size={22} />
                </button>
              </div>

              {/* Card counter */}
              <p className="text-xs text-muted-foreground mt-3">
                {currentIndex + 1} / {cards.length}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Discover;
