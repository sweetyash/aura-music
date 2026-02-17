import { useState } from "react";
import { Track } from "@/data/tracks";
import { Calendar, Play, Flame } from "lucide-react";

const langTabs = ["All", "Telugu", "Tamil", "English"] as const;

const popularityBadge = (p: number) => {
  if (p >= 90) return { label: "🔥 Hot", cls: "bg-primary/15 text-primary" };
  if (p >= 70) return { label: "⚡ Rising", cls: "bg-amber-500/15 text-amber-400" };
  return { label: "✨ New", cls: "bg-sky-500/15 text-sky-400" };
};

interface Props {
  title: string;
  icon: React.ReactNode;
  tracks: Track[];
}

const SongGrid = ({ title, icon, tracks }: Props) => {
  const [tab, setTab] = useState<(typeof langTabs)[number]>("All");

  const filtered = tab === "All" ? tracks : tracks.filter((t) => t.language === tab);

  return (
    <div className="px-4 pt-6 pb-36">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        {icon}
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
      </div>

      {/* Language Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto hide-scrollbar -mx-4 px-4">
        {langTabs.map((l) => (
          <button
            key={l}
            onClick={() => setTab(l)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              tab === l
                ? "gradient-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Song List */}
      <div className="flex flex-col gap-2">
        {filtered.map((track, i) => {
          const badge = popularityBadge(track.popularity);
          return (
            <div
              key={track.id}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/60 transition-colors group"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Rank */}
              <span className="text-xs font-bold text-muted-foreground w-5 text-right tabular-nums">
                {i + 1}
              </span>

              {/* Cover */}
              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <img src={track.cover} alt={track.album} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play size={16} className="text-foreground" fill="currentColor" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{track.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground truncate">{track.artist}</span>
                  <span className="text-muted-foreground text-[8px]">●</span>
                  <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                    <Calendar size={10} />
                    {track.releaseDate}
                  </span>
                </div>
              </div>

              {/* Popularity Badge */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">No tracks found for {tab}</p>
        </div>
      )}
    </div>
  );
};

export default SongGrid;
