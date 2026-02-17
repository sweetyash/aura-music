import { likedTracks } from "@/data/tracks";
import TrackRow from "@/components/TrackRow";
import { Heart, Play, Shuffle } from "lucide-react";

const LikedSongs = () => (
  <div className="px-4 pt-6 pb-24">
    <div className="flex items-center gap-2 mb-2">
      <Heart size={22} className="text-primary" fill="currentColor" />
      <h1 className="text-xl font-bold text-foreground">Liked Songs</h1>
    </div>
    <p className="text-sm text-muted-foreground mb-6">{likedTracks.length} songs</p>

    <div className="flex gap-3 mb-6">
      <button className="flex items-center gap-2 px-5 py-2.5 rounded-full gradient-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20">
        <Play size={16} fill="currentColor" /> Play All
      </button>
      <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold">
        <Shuffle size={16} /> Shuffle
      </button>
    </div>

    <div className="flex flex-col gap-1">
      {likedTracks.map((t) => (
        <TrackRow key={t.id} track={t} />
      ))}
    </div>
  </div>
);

export default LikedSongs;
