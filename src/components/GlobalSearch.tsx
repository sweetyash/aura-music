import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Play, ExternalLink, Loader2 } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import { useSpotifyApi, SpotifyTrack, getTrackCover, formatDuration } from "@/hooks/useSpotifyApi";

const ShimmerRow = () => (
  <div className="flex items-center gap-3 p-2.5 animate-pulse">
    <div className="w-12 h-12 rounded-lg bg-secondary" />
    <div className="flex-1 space-y-2">
      <div className="h-3.5 w-3/4 rounded bg-secondary" />
      <div className="h-2.5 w-1/2 rounded bg-secondary" />
    </div>
    <div className="w-16 h-5 rounded-full bg-secondary" />
  </div>
);

interface Props {
  active: boolean;
  onActiveChange: (v: boolean) => void;
}

const GlobalSearch = ({ active, onActiveChange }: Props) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isConnected, playTrack } = useSpotify();
  const { search } = useSpotifyApi();

  useEffect(() => {
    if (!query.trim() || query.trim().length < 3 || !isConnected) {
      if (!query.trim()) {
        setResults([]);
        setSearched(false);
      }
      return;
    }
    setLoading(true);
    setSearched(false);
    const t = setTimeout(async () => {
      try {
        const data = await search(query, "track", 10);
        setResults(data.tracks?.items || []);
      } catch (err) {
        console.error("Search error:", err);
        setResults([]);
      }
      setLoading(false);
      setSearched(true);
    }, 500);
    return () => clearTimeout(t);
  }, [query, isConnected, search]);

  const handleFocus = () => onActiveChange(true);
  const handleCancel = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
    onActiveChange(false);
    inputRef.current?.blur();
  };

  const handlePlay = (track: SpotifyTrack) => {
    playTrack(track.uri, track.name, track.artists[0]?.name || "Unknown", getTrackCover(track), track.preview_url, track.duration_ms);
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder={isConnected ? "Search songs, artists, albums..." : "Connect Spotify to search"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            disabled={!isConnected}
            className="w-full h-10 pl-9 pr-9 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary transition-all disabled:opacity-50"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
        {active && (
          <button onClick={handleCancel} className="text-sm font-medium text-primary whitespace-nowrap animate-fade-in">
            Cancel
          </button>
        )}
      </div>

      {active && (
        <div className="mt-4 animate-fade-in">
          {!query.trim() && !loading && (
            <div className="text-center py-16">
              <Search size={36} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Search Spotify's entire catalog</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 5 }).map((_, i) => <ShimmerRow key={i} />)}
            </div>
          )}

          {searched && !loading && results.length === 0 && (
            <div className="text-center py-16">
              <p className="text-lg font-semibold text-foreground mb-1">No results</p>
              <p className="text-sm text-muted-foreground">Try a different search term</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="flex flex-col gap-1">
              {results.map((track) => (
                <div
                  key={track.id}
                  onClick={() => handlePlay(track)}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/60 transition-colors group cursor-pointer"
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={getTrackCover(track)} alt={track.album.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={16} className="text-foreground" fill="currentColor" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{track.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {track.artists.map((a) => a.name).join(", ")} · {track.album.name}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{formatDuration(track.duration_ms)}</span>
                  <a
                    href={`https://open.spotify.com/track/${track.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
