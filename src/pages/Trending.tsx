import { trendingTracks } from "@/data/tracks";
import SongGrid from "@/components/SongGrid";
import { Flame } from "lucide-react";

const Trending = () => (
  <SongGrid
    title="Trending Now"
    icon={<Flame size={22} className="text-primary" />}
    tracks={trendingTracks}
  />
);

export default Trending;
