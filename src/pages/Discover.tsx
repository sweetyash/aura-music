import { useRef, useState, useCallback, useEffect } from "react";
import { Heart, X, Play, Pause, Music, TrendingUp, Loader2, RefreshCw, Disc } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import { useSpotifyApi, SpotifyTrack, getTrackCover, formatDuration } from "@/hooks/useSpotifyApi";
import { useDiscoverLikes } from "@/hooks/useDiscoverLikes";
import GlobalSearch from "@/components/GlobalSearch";
import { toast } from "@/hooks/use-toast";

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
  previewUrl: string | null;
  durationMs: number;
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
    previewUrl: t.preview_url || null,
    durationMs: t.duration_ms,
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
  const { isConnected, isPlaying, nowPlaying, connect, playTrackWithQueue, togglePlayback } = useSpotify();
  const { getTopTracks, getRecentlyPlayed, saveTrack, search } = useSpotifyApi();
  const { likeTrack } = useDiscoverLikes();
  const [cards, setCards] = useState<DiscoverCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const [searchActive, setSearchActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);
  const isDraggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);
  const saveErrorShown = useRef(false);

  // Fetch personalized recommendations
  const fetchCards = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      // Fetch user's top tracks (multiple time ranges) + recently played in parallel
      const [shortTracksRes, mediumTracksRes, longTracksRes, recentRes] = await Promise.all([
        getTopTracks("short_term", 50).catch(() => ({ items: [] })),
        getTopTracks("medium_term", 50).catch(() => ({ items: [] })),
        getTopTracks("long_term", 50).catch(() => ({ items: [] })),
        getRecentlyPlayed(50).catch(() => ({ items: [] })),
      ]);

      const shortTracks: SpotifyTrack[] = shortTracksRes?.items || [];
      const mediumTracks: SpotifyTrack[] = mediumTracksRes?.items || [];
      const longTracks: SpotifyTrack[] = longTracksRes?.items || [];
      const recentTracks: SpotifyTrack[] = (recentRes?.items || []).map((i: any) => i.track).filter(Boolean);

      // Merge all tracks, deduplicate by id
      const seen = new Set<string>();
      const allTracks: SpotifyTrack[] = [...shortTracks, ...mediumTracks, ...longTracks, ...recentTracks]
        .filter(t => t && t.id && !seen.has(t.id) && seen.add(t.id));

      let allCards: DiscoverCard[] = allTracks.map(trackToCard);

      // If not enough, pad with search results based on artists from top tracks
      if (allCards.length < 30) {
        const topArtistNames = [...new Set(allTracks.flatMap(t => t.artists.map(a => a.name)))].slice(0, 5);
        const queries = topArtistNames.length > 0
          ? topArtistNames.map(a => `artist:${a}`)
          : ["top hits 2025", "trending music", "popular songs", "new music friday", "viral hits"];

        const results = await Promise.all(
          queries.slice(0, 5).map(q => search(q, "track", 20).catch(() => ({ tracks: { items: [] } })))
        );
        const existingIds = new Set(allCards.map(c => c.id));
        const searchTracks: SpotifyTrack[] = results
          .flatMap(r => r?.tracks?.items || [])
          .filter((t: any) => t && t.id && !existingIds.has(t.id))
          .filter((t: any, i: number, arr: any[]) => arr.findIndex((a: any) => a.id === t.id) === i);
        allCards = [...allCards, ...searchTracks.map(trackToCard)];
      }

      // Shuffle and set
      allCards = allCards.sort(() => Math.random() - 0.5);
      if (allCards.length > 0) {
        setCards(allCards);
      }
      setCurrentIndex(0);
    } catch (err) {
      console.error("Discover fetch error:", err);
    }
    setLoading(false);
  }, [isConnected, getTopTracks, getRecentlyPlayed, search]);

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

  // Keep card ref in sync for touch handlers
  const cardDataRef = useRef<DiscoverCard | null>(null);
  useEffect(() => { cardDataRef.current = card || null; }, [card]);

  // Keep latest callbacks in refs so touch handlers never go stale
  const likeTrackRef = useRef(likeTrack);
  const saveTrackRef = useRef(saveTrack);
  useEffect(() => { likeTrackRef.current = likeTrack; }, [likeTrack]);
  useEffect(() => { saveTrackRef.current = saveTrack; }, [saveTrack]);

  const doLike = useCallback((c: DiscoverCard) => {
    likeTrackRef.current({
      id: c.id, uri: c.uri, title: c.title, artist: c.artist,
      cover: c.cover, previewUrl: c.previewUrl, durationMs: c.durationMs, likedAt: Date.now(),
    });
    saveTrackRef.current(c.id).catch((err) => {
      // Silently fail — track is already saved locally; avoid alarming the user
      console.warn("[Discover] saveTrack failed (non-critical):", err?.message);
    });
    toast({ title: "❤️ Liked!", description: `${c.title} added to your Discover Likes` });
  }, []);

  // Stable refs for gesture handlers — avoids re-adding touch listeners on every render
  const doLikeRef = useRef(doLike);
  useEffect(() => { doLikeRef.current = doLike; }, [doLike]);

  // Attach touch listeners whenever the card changes (new card in DOM).
  // Using currentIndex ensures listeners are re-attached for each new card.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startPos.current = { x: touch.clientX, y: touch.clientY };
      hasDragged.current = false;
      isDraggingRef.current = true;
      setIsDragging(true);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault(); // Block page scroll — requires non-passive listener
      const touch = e.touches[0];
      const dx = touch.clientX - startPos.current.x;
      const dy = touch.clientY - startPos.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasDragged.current = true;
      const newOffset = { x: dx, y: dy * 0.3 };
      offsetRef.current = newOffset;
      setOffset(newOffset);
    };

    const onTouchEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      const currentOffset = offsetRef.current;
      if (Math.abs(currentOffset.x) > SWIPE_THRESHOLD) {
        const dir = currentOffset.x > 0 ? "right" : "left";
        setExitDir(dir);
        const currentCard = cardDataRef.current;
        if (dir === "right" && currentCard) doLikeRef.current(currentCard);
        setTimeout(() => {
          setCurrentIndex((i) => i + 1);
          setOffset({ x: 0, y: 0 });
          offsetRef.current = { x: 0, y: 0 };
          setExitDir(null);
        }, 350);
      } else {
        setOffset({ x: 0, y: 0 });
        offsetRef.current = { x: 0, y: 0 };
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  // Re-run whenever the current card index changes so each card gets fresh listeners
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, card]);

  const swipeButton = (dir: "left" | "right") => {
    if (dir === "right" && card) doLike(card);
    setExitDir(dir);
    setOffset({ x: dir === "right" ? 300 : -300, y: 0 });
    offsetRef.current = { x: dir === "right" ? 300 : -300, y: 0 };
    setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setOffset({ x: 0, y: 0 });
      offsetRef.current = { x: 0, y: 0 };
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

                {/* Active card — touch handlers are attached via useEffect (non-passive) */}
                <div
                  ref={cardRef}
                  className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing select-none z-10"
                  style={cardStyle}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    startPos.current = { x: e.clientX, y: e.clientY };
                    hasDragged.current = false;
                    isDraggingRef.current = true;
                    setIsDragging(true);
                  }}
                  onMouseMove={(e) => {
                    if (!isDraggingRef.current) return;
                    const dx = e.clientX - startPos.current.x;
                    const dy = e.clientY - startPos.current.y;
                    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasDragged.current = true;
                    const newOffset = { x: dx, y: dy * 0.3 };
                    offsetRef.current = newOffset;
                    setOffset(newOffset);
                  }}
                  onMouseUp={() => {
                    if (!isDraggingRef.current) return;
                    isDraggingRef.current = false;
                    setIsDragging(false);
                    const cur = offsetRef.current;
                    if (Math.abs(cur.x) > SWIPE_THRESHOLD) {
                      const dir = cur.x > 0 ? "right" : "left";
                      setExitDir(dir);
                      if (dir === "right" && cardDataRef.current) doLikeRef.current(cardDataRef.current);
                      setTimeout(() => { setCurrentIndex((i) => i + 1); setOffset({ x: 0, y: 0 }); offsetRef.current = { x: 0, y: 0 }; setExitDir(null); }, 350);
                    } else { setOffset({ x: 0, y: 0 }); offsetRef.current = { x: 0, y: 0 }; }
                  }}
                  onMouseLeave={() => {
                    if (!isDraggingRef.current) return;
                    isDraggingRef.current = false;
                    setIsDragging(false);
                    setOffset({ x: 0, y: 0 });
                    offsetRef.current = { x: 0, y: 0 };
                  }}
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
                              if (hasDragged.current) return;
                              if (isCurrentTrackPlaying) {
                                togglePlayback();
                              } else {
                                // Build queue from remaining cards starting at current index
                                const remainingCards = cards.slice(currentIndex);
                                const queueTracks = remainingCards.map(c => ({
                                  uri: c.uri, title: c.title, artist: c.artist,
                                  cover: c.cover, previewUrl: c.previewUrl, durationMs: c.durationMs,
                                }));
                                playTrackWithQueue(queueTracks, 0);
                              }
                            }}
                            className="flex items-center gap-2"
                          >
                            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center shadow-lg shadow-primary/25">
                              {isCurrentTrackPlaying ? (
                                <Pause size={15} className="text-primary-foreground" fill="currentColor" />
                              ) : (
                                <Play size={15} className="text-primary-foreground ml-0.5" fill="currentColor" />
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {isCurrentTrackPlaying ? `Playing · ${card.duration}` : `Play · ${card.duration}`}
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
