import { useState } from "react";
import { ChevronDown, Heart, ExternalLink } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import album1 from "@/assets/album-1.jpg";

interface ExpandedPlayerProps {
  open: boolean;
  onClose: () => void;
}

const ExpandedPlayer = ({ open, onClose }: ExpandedPlayerProps) => {
  const { nowPlaying } = useSpotify();
  const [liked, setLiked] = useState(false);

  if (!open) return null;

  const cover = nowPlaying?.cover || album1;
  const title = nowPlaying?.title || "No track selected";
  const artist = nowPlaying?.artist || "Connect Spotify";
  const trackId = nowPlaying?.trackId || "";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in slide-in-from-bottom duration-300">
      {/* Background blur cover */}
      <div className="absolute inset-0 overflow-hidden">
        <img src={cover} alt="" className="w-full h-full object-cover scale-110 blur-3xl opacity-30" />
        <div className="absolute inset-0 bg-background/70" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col flex-1 px-6 pt-4 pb-8 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-secondary/60 transition-colors">
            <ChevronDown size={24} className="text-foreground" />
          </button>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Now Playing
          </p>
          <a
            href={trackId ? `https://open.spotify.com/track/${trackId}` : "https://open.spotify.com"}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 -mr-2 rounded-full hover:bg-secondary/60 transition-colors"
          >
            <ExternalLink size={20} className="text-muted-foreground" />
          </a>
        </div>

        {/* Album Art */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
            <img src={cover} alt={title} className="w-full h-full object-cover discover-card-art" />
            <div className="discover-card-glow" />
          </div>
        </div>

        {/* Track Info */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-foreground truncate">{title}</h2>
              <p className="text-sm text-muted-foreground truncate mt-0.5">{artist}</p>
            </div>
            <button onClick={() => setLiked(!liked)} className="p-2 flex-shrink-0">
              <Heart
                size={22}
                className={liked ? "text-primary" : "text-muted-foreground"}
                fill={liked ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>

        {/* Spotify Embed Player */}
        {trackId ? (
          <div className="w-full rounded-xl overflow-hidden flex-1 min-h-0 max-h-[80px]">
            <iframe
              src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`}
              width="100%"
              height="80"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-xl border-0"
              title="Spotify Player"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Select a track to play</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandedPlayer;
