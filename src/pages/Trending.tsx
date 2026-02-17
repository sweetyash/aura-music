import { trendingTracks } from "@/data/tracks";
import TrackRow from "@/components/TrackRow";
import AlbumCard from "@/components/AlbumCard";
import { TrendingUp } from "lucide-react";

const Trending = () => (
  <div className="px-4 pt-6 pb-24">
    <div className="flex items-center gap-2 mb-6">
      <TrendingUp size={22} className="text-primary" />
      <h1 className="text-xl font-bold text-foreground">Trending Now</h1>
    </div>

    {/* Featured row */}
    <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4 mb-6">
      {trendingTracks.slice(0, 4).map((t) => (
        <AlbumCard key={t.id} track={t} />
      ))}
    </div>

    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Tracks</h2>
    <div className="flex flex-col gap-1">
      {trendingTracks.map((t, i) => (
        <div key={t.id} className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}</span>
          <div className="flex-1">
            <TrackRow track={t} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Trending;
