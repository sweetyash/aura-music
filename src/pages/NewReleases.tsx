import { newReleases } from "@/data/tracks";
import AlbumCard from "@/components/AlbumCard";
import TrackRow from "@/components/TrackRow";
import { Disc3 } from "lucide-react";

const NewReleases = () => (
  <div className="px-4 pt-6 pb-24">
    <div className="flex items-center gap-2 mb-6">
      <Disc3 size={22} className="text-primary" />
      <h1 className="text-xl font-bold text-foreground">New Releases</h1>
    </div>

    <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4 mb-6">
      {newReleases.slice(0, 4).map((t) => (
        <AlbumCard key={t.id} track={t} />
      ))}
    </div>

    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Just Dropped</h2>
    <div className="flex flex-col gap-1">
      {newReleases.map((t) => (
        <TrackRow key={t.id} track={t} />
      ))}
    </div>
  </div>
);

export default NewReleases;
