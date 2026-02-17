import { Track } from "@/data/tracks";
import { Play, Heart } from "lucide-react";
import { useState } from "react";

const TrackRow = ({ track }: { track: Track }) => {
  const [liked, setLiked] = useState(track.liked ?? false);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/60 transition-colors group">
      <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
        <img src={track.cover} alt={track.album} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play size={18} className="text-foreground" fill="currentColor" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
      </div>
      <span className="text-xs text-muted-foreground mr-2">{track.duration}</span>
      <button onClick={() => setLiked(!liked)} className="p-1">
        <Heart
          size={18}
          className={liked ? "text-primary" : "text-muted-foreground"}
          fill={liked ? "currentColor" : "none"}
        />
      </button>
    </div>
  );
};

export default TrackRow;
