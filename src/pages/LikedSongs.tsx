import { useState, useEffect, useCallback } from "react";
import { Heart, Play, Search, X, Loader2, Sparkles, Music, Trash2 } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import { useSpotifyApi, SpotifyTrack, getTrackCover, formatDuration } from "@/hooks/useSpotifyApi";
import { useDiscoverLikes, DiscoverLikedTrack } from "@/hooks/useDiscoverLikes";
import { toast } from "@/hooks/use-toast";

type Tab = "discover" | "spotify";

// ─── AI Recommendations based on discover-liked tracks ───────────────────────
const RecommendationsSection = ({ likedTracks }: { likedTracks: DiscoverLikedTrack[] }) => {
  const { search } = useSpotifyApi();
  const { playTrackWithQueue } = useSpotify();
  const [recs, setRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchRecs = useCallback(async () => {
    if (likedTracks.length === 0) return;
    setLoading(true);
    try {
      // Build artist/title seeds from liked tracks
      const seeds = likedTracks.slice(0, 8).map(t => t.artist.split(",")[0].trim());
      const uniqueSeeds = [...new Set(seeds)].slice(0, 5);

      const results = await Promise.all(
        uniqueSeeds.map(artist =>
          search(`artist:${artist}`, "track", 10).catch(() => ({ tracks: { items: [] } }))
        )
      );

      const likedIds = new Set(likedTracks.map(t => t.id));
      const seen = new Set<string>();
      const allRecs = results
        .flatMap((r: any) => r?.tracks?.items || [])
        .filter((t: any) => t?.id && !likedIds.has(t.id) && !seen.has(t.id) && seen.add(t.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, 20);

      setRecs(allRecs);
      setFetched(true);
    } catch (err) {
      console.error("Rec fetch error:", err);
    }
    setLoading(false);
  }, [likedTracks, search]);

  useEffect(() => {
    if (!fetched && likedTracks.length > 0) fetchRecs();
  }, [fetched, likedTracks.length, fetchRecs]);

  const playRec = (track: any, idx: number) => {
    const queueTracks = recs.map(t => ({
      uri: t.uri, title: t.name,
      artist: t.artists?.map((a: any) => a.name).join(", ") || "Unknown",
      cover: t.album?.images?.[0]?.url || "/placeholder.svg",
      previewUrl: t.preview_url,
      durationMs: t.duration_ms,
    }));
    playTrackWithQueue(queueTracks, idx);
  };

  if (likedTracks.length === 0) {
    return (
      <div className="text-center py-10">
        <Sparkles size={36} className="text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Swipe right on songs in Discover to get personalized recommendations here</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">Because you liked these artists</span>
        </div>
        <button
          onClick={() => { setFetched(false); fetchRecs(); }}
          className="text-xs text-primary font-medium"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={22} className="animate-spin text-primary" />
        </div>
      ) : recs.length === 0 ? (
        <div className="text-center py-10">
          <Music size={32} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No recommendations found</p>
          <button onClick={fetchRecs} className="mt-3 text-xs text-primary font-medium">Try Again</button>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {recs.map((t, idx) => (
            <div
              key={t.id}
              onClick={() => playRec(t, idx)}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/60 transition-colors group cursor-pointer"
            >
              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <img src={t.album?.images?.[0]?.url || "/placeholder.svg"} alt={t.album?.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play size={16} className="text-foreground" fill="currentColor" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground truncate">{t.artists?.map((a: any) => a.name).join(", ")}</p>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">{formatDuration(t.duration_ms)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const LikedSongs = () => {
  const { isConnected, playTrackWithQueue, connect } = useSpotify();
  const { getSavedTracks } = useSpotifyApi();
  const { likedTracks, unlikeTrack } = useDiscoverLikes();
  const [tab, setTab] = useState<Tab>("discover");
  const [spotifyTracks, setSpotifyTracks] = useState<{ track: SpotifyTrack }[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isConnected || tab !== "spotify") return;
    setLoading(true);
    getSavedTracks(50)
      .then((data) => setSpotifyTracks(data.items || []))
      .catch((err) => console.error("Saved tracks error:", err))
      .finally(() => setLoading(false));
  }, [isConnected, tab, getSavedTracks]);

  const filteredSpotify = query.trim()
    ? spotifyTracks.filter(({ track: t }) => {
        const q = query.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.artists.some((a) => a.name.toLowerCase().includes(q));
      })
    : spotifyTracks;

  const filteredDiscover = query.trim()
    ? likedTracks.filter(t => {
        const q = query.toLowerCase();
        return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
      })
    : likedTracks;

  const handlePlaySpotify = (t: SpotifyTrack, index: number) => {
    const queueTracks = filteredSpotify.map(({ track }) => ({
      uri: track.uri, title: track.name,
      artist: track.artists[0]?.name || "Unknown",
      cover: getTrackCover(track),
      previewUrl: track.preview_url,
      durationMs: track.duration_ms,
    }));
    playTrackWithQueue(queueTracks, index);
  };

  const handlePlayDiscover = (track: DiscoverLikedTrack, index: number) => {
    const queueTracks = filteredDiscover.map(t => ({
      uri: t.uri, title: t.title, artist: t.artist,
      cover: t.cover, previewUrl: t.previewUrl, durationMs: t.durationMs,
    }));
    playTrackWithQueue(queueTracks, index);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Heart size={48} className="text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-bold text-foreground mb-2">Liked Songs</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">Connect Spotify to see your saved songs</p>
        <button onClick={connect} className="px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20">
          Connect Spotify
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-36">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Heart size={22} className="text-primary" fill="currentColor" />
        <h1 className="text-xl font-bold text-foreground">Liked Songs</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 mt-3">
        <button
          onClick={() => setTab("discover")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            tab === "discover"
              ? "gradient-primary text-primary-foreground shadow-md shadow-primary/20"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          <Heart size={14} fill={tab === "discover" ? "currentColor" : "none"} />
          Discover Likes
          {likedTracks.length > 0 && (
            <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${tab === "discover" ? "bg-primary-foreground/20" : "bg-muted"}`}>
              {likedTracks.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("spotify")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            tab === "spotify"
              ? "gradient-primary text-primary-foreground shadow-md shadow-primary/20"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          <Music size={14} />
          Spotify Liked
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={tab === "discover" ? "Search discover likes..." : "Search liked songs..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-10 pl-9 pr-9 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary transition-shadow"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Discover Likes Tab ── */}
      {tab === "discover" && (
        <>
          {filteredDiscover.length === 0 && !query ? (
            <div className="text-center py-10">
              <Heart size={36} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-base font-semibold text-foreground mb-1">No Discover Likes yet</p>
              <p className="text-sm text-muted-foreground">Swipe right ❤️ on songs in Discover to save them here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1 mb-6">
              {filteredDiscover.map((t, idx) => (
                <div
                  key={t.id}
                  onClick={() => handlePlayDiscover(t, idx)}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/60 transition-colors group cursor-pointer"
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={t.cover} alt={t.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={16} className="text-foreground" fill="currentColor" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.artist}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      unlikeTrack(t.id);
                      toast({ title: "Removed", description: `${t.title} removed from Discover Likes` });
                    }}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={15} />
                  </button>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{formatDuration(t.durationMs)}</span>
                </div>
              ))}
            </div>
          )}

          {/* AI Recommendations */}
          {!query && (
            <div className="mt-2">
              <div className="h-px bg-border mb-5" />
              <p className="text-base font-bold text-foreground mb-4">Recommended For You</p>
              <RecommendationsSection likedTracks={likedTracks} />
            </div>
          )}
        </>
      )}

      {/* ── Spotify Liked Tab ── */}
      {tab === "spotify" && (
        <>
          <p className="text-sm text-muted-foreground mb-3">
            {filteredSpotify.length} song{filteredSpotify.length !== 1 && "s"}
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredSpotify.map(({ track: t }, idx) => (
                <div
                  key={t.id}
                  onClick={() => handlePlaySpotify(t, idx)}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/60 transition-colors group cursor-pointer"
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={getTrackCover(t)} alt={t.album.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={16} className="text-foreground" fill="currentColor" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.artists.map((a) => a.name).join(", ")}</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{formatDuration(t.duration_ms)}</span>
                </div>
              ))}
            </div>
          )}
          {!loading && filteredSpotify.length === 0 && (
            <div className="text-center py-16">
              <Heart size={36} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{query ? "No matches found" : "No liked songs yet"}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LikedSongs;
