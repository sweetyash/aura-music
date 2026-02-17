import { Track } from "@/data/tracks";
import { Play } from "lucide-react";

const AlbumCard = ({ track }: { track: Track }) => (
  <div className="flex-shrink-0 w-36 group cursor-pointer">
    <div className="relative rounded-lg overflow-hidden mb-2 aspect-square">
      <img src={track.cover} alt={track.album} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      <div className="absolute inset-0 bg-background/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shadow-lg">
          <Play size={18} className="text-primary-foreground ml-0.5" fill="currentColor" />
        </div>
      </div>
    </div>
    <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
    <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
  </div>
);

export default AlbumCard;
