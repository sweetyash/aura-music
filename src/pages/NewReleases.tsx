import { newReleases } from "@/data/tracks";
import SongGrid from "@/components/SongGrid";
import { Disc3 } from "lucide-react";

const NewReleases = () => (
  <SongGrid
    title="New Releases"
    icon={<Disc3 size={22} className="text-primary" />}
    tracks={newReleases}
  />
);

export default NewReleases;
