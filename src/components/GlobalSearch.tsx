import { useState, useRef, useEffect } from "react";
import { Search, X, Play, ExternalLink, Loader2 } from "lucide-react";
import { mockTracks, Track } from "@/data/tracks";

const langColors: Record<string, string> = {
  Telugu: "bg-amber-500/20 text-amber-400",
  Tamil: "bg-rose-500/20 text-rose-400",
  English: "bg-sky-500/20 text-sky-400",
};

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
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(false);
    const t = setTimeout(() => {
      const q = query.toLowerCase();
      setResults(
        mockTracks.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.artist.toLowerCase().includes(q) ||
            t.album.toLowerCase().includes(q) ||
            t.language.toLowerCase().includes(q)
        )
      );
      setLoading(false);
      setSearched(true);
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const handleFocus = () => onActiveChange(true);

  const handleCancel = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
    onActiveChange(false);
    inputRef.current?.blur();
  };

  return (
    <div className="w-full">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div
          className={`relative flex-1 transition-all duration-300 ${
            active ? "scale-100" : "scale-100"
          }`}
        >
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search songs, artists, albums..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            className="w-full h-10 pl-9 pr-9 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {active && (
          <button
            onClick={handleCancel}
            className="text-sm font-medium text-primary whitespace-nowrap animate-fade-in"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Results panel */}
      {active && (
        <div className="mt-4 animate-fade-in">
          {/* Empty state */}
          {!query.trim() && !loading && (
            <div className="text-center py-16">
              <Search size={36} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Search songs, artists, albums
              </p>
            </div>
          )}

          {/* Loading shimmer */}
          {loading && (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <ShimmerRow key={i} />
              ))}
            </div>
          )}

          {/* No results */}
          {searched && !loading && results.length === 0 && (
            <div className="text-center py-16">
              <p className="text-lg font-semibold text-foreground mb-1">No results</p>
              <p className="text-sm text-muted-foreground">
                Try a different search term
              </p>
            </div>
          )}

          {/* Results list */}
          {!loading && results.length > 0 && (
            <div className="flex flex-col gap-1">
              {results.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/60 transition-colors group"
                >
                  {/* Cover */}
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer">
                    <img
                      src={track.cover}
                      alt={track.album}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={16} className="text-foreground" fill="currentColor" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {track.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {track.artist}
                    </p>
                  </div>

                  {/* Language tag */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      langColors[track.language] || "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {track.language}
                  </span>

                  {/* Spotify */}
                  <a
                    href="https://open.spotify.com"
                    target="_blank"
                    rel="noopener noreferrer"
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
