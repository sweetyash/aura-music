import { useState, useEffect } from "react";
import { Heart, Play, Search, X, Loader2 } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import { useSpotifyApi, SpotifyTrack, getTrackCover, formatDuration } from "@/hooks/useSpotifyApi";

const LikedSongs = () => {
  const { isConnected, playTrack, connect } = useSpotify();
  const { getSavedTracks } = useSpotifyApi();
  const [tracks, setTracks] = useState<{ track: SpotifyTrack }[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isConnected) return;
    setLoading(true);
    getSavedTracks(50)
      .then((data) => setTracks(data.items || []))
      .catch((err) => console.error("Saved tracks error:", err))
      .finally(() => setLoading(false));
  }, [isConnected, getSavedTracks]);

  const filtered = query.trim()
    ? tracks.filter(({ track: t }) => {
        const q = query.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.artists.some((a) => a.name.toLowerCase().includes(q));
      })
    : tracks;

  const handlePlay = (t: SpotifyTrack) => {
    playTrack(t.uri, t.name, t.artists[0]?.name || "Unknown", getTrackCover(t), t.preview_url, t.duration_ms);
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
      <div className="flex items-center gap-2 mb-1">
        <Heart size={22} className="text-primary" fill="currentColor" />
        <h1 className="text-xl font-bold text-foreground">Liked Songs</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{filtered.length} song{filtered.length !== 1 && "s"}</p>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search liked songs..."
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {filtered.map(({ track: t }) => (
            <div
              key={t.id}
              onClick={() => handlePlay(t)}
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

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Heart size={36} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">{query ? "No matches found" : "No liked songs yet"}</p>
        </div>
      )}
    </div>
  );
};

export default LikedSongs;
