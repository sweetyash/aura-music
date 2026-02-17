import { useState, useMemo } from "react";
import { likedTracks } from "@/data/tracks";
import { Heart, Play, Search, ExternalLink, Calendar, X } from "lucide-react";

const langs = ["All", "Telugu", "Tamil", "English"] as const;

const LikedSongs = () => {
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState<(typeof langs)[number]>("All");

  const filtered = useMemo(() => {
    let list = likedTracks;
    if (lang !== "All") list = list.filter((t) => t.language === lang);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q)
      );
    }
    return list;
  }, [query, lang]);

  return (
    <div className="px-4 pt-6 pb-36">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Heart size={22} className="text-primary" fill="currentColor" />
        <h1 className="text-xl font-bold text-foreground">Liked Songs</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {filtered.length} song{filtered.length !== 1 && "s"}
      </p>

      {/* Search */}
      <div className="relative mb-4">
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

      {/* Language filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto hide-scrollbar -mx-4 px-4">
        {langs.map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              lang === l
                ? "gradient-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Track list */}
      <div className="flex flex-col gap-1">
        {filtered.map((track) => (
          <div
            key={track.id}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/60 transition-colors group"
          >
            {/* Cover with play overlay */}
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer">
              <img src={track.cover} alt={track.album} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Play size={16} className="text-foreground" fill="currentColor" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{track.title}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-muted-foreground truncate">{track.artist}</span>
                <span className="text-muted-foreground text-[8px]">●</span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                  <Calendar size={10} />
                  {track.releaseDate}
                </span>
              </div>
            </div>

            {/* Spotify link */}
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

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Heart size={36} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            {query ? "No matches found" : "No liked songs yet"}
          </p>
        </div>
      )}
    </div>
  );
};

export default LikedSongs;
