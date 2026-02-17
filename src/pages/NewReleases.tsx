import { useState, useEffect } from "react";
import { Clock, Play, Loader2 } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import { useSpotifyApi, RecentTrack, getTrackCover, formatDuration } from "@/hooks/useSpotifyApi";

const NewReleases = () => {
  const { isConnected, playTrack, connect } = useSpotify();
  const { getRecentlyPlayed } = useSpotifyApi();
  const [tracks, setTracks] = useState<RecentTrack[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected) return;
    setLoading(true);
    getRecentlyPlayed(50)
      .then((data) => setTracks(data.items || []))
      .catch((err) => console.error("Recently played error:", err))
      .finally(() => setLoading(false));
  }, [isConnected, getRecentlyPlayed]);

  const handlePlay = (item: RecentTrack) => {
    const t = item.track;
    playTrack(t.uri, t.name, t.artists[0]?.name || "Unknown", getTrackCover(t));
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Clock size={48} className="text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-bold text-foreground mb-2">Recently Played</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">Connect Spotify to see your listening history</p>
        <button onClick={connect} className="px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20">
          Connect Spotify
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-36">
      <div className="flex items-center gap-2 mb-1">
        <Clock size={22} className="text-primary" />
        <h1 className="text-xl font-bold text-foreground">Recently Played</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">{tracks.length} tracks</p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tracks.map((item, i) => {
            const t = item.track;
            return (
              <div
                key={`${t.id}-${item.played_at}`}
                onClick={() => handlePlay(item)}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/60 transition-colors group cursor-pointer"
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={getTrackCover(t)} alt={t.album.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play size={16} className="text-foreground" fill="currentColor" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.artists.map((a) => a.name).join(", ")}</p>
                </div>
                <span className="text-[11px] text-muted-foreground flex-shrink-0">{formatTime(item.played_at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NewReleases;
